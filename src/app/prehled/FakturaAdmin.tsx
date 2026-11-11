'use client';

import { useState } from 'react';
import { FakturaFormular, type VysledekUlozeni } from '@/components/FakturaHosta';
import { TlacitkoWhatsApp } from '@/components/TlacitkoWhatsApp';
import {
  coChybiNaFakture,
  fakturyKeVystaveni,
  fakturyPozdeji,
  type AresVysledek,
  type FakturaUdaje,
  type FakturaVstup,
} from '@/lib/faktura';
import { FAKTURA_MAJITEL } from '@/lib/faktura-texty';
import type { PrehledRadek } from '@/lib/prehled';
import { zpravaFakturaDoplnit } from '@/lib/whatsapp-zprava';

type ZmenaFaktury = (rezervace: string, faktura: FakturaUdaje | null) => void;

type Spolecne = {
  ukazka: boolean;
  userAgent: string;
  onZmena: ZmenaFaktury;
  onHlaska: (text: string) => void;
};

type OdpovedAkce = { ok?: boolean; error?: string; faktura?: FakturaUdaje | null; ares?: AresVysledek };

async function posliAkci(rezervace: string, akce: string, extra: Record<string, unknown> = {}): Promise<OdpovedAkce> {
  try {
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace, akce, ...extra }),
    });
    const json = (await res.json().catch(() => null)) as OdpovedAkce | null;
    return res.ok && json?.ok ? json : { ok: false, error: json?.error || 'Nepodařilo se uložit.' };
  } catch {
    return { ok: false, error: 'Nepodařilo se uložit.' };
  }
}

function pole(f: FakturaUdaje): { nazev: string; hodnota: string }[] {
  return [
    { nazev: 'Název', hodnota: f.nazev || '' },
    { nazev: 'IČO', hodnota: f.ico || '' },
    { nazev: 'DIČ', hodnota: f.dic || '' },
    { nazev: 'Adresa', hodnota: f.adresa || '' },
    { nazev: 'Země', hodnota: f.zeme || '' },
    { nazev: 'E-mail', hodnota: f.email || '' },
    { nazev: 'Poznámka', hodnota: f.poznamka || '' },
  ].filter((p) => p.hodnota);
}

function kopiruj(nazev: string, hodnota: string, onHlaska: (text: string) => void) {
  void navigator.clipboard.writeText(hodnota).then(
    () => onHlaska(`${nazev} je ve schránce.`),
    () => onHlaska(hodnota),
  );
}

/** Údaje z faktury s tlačítky Kopírovat a akcemi majitele. */
function FakturaObsah({ row, faktura, ukazka, userAgent, onZmena, onHlaska }: Spolecne & { row: PrehledRadek; faktura: FakturaUdaje }) {
  const [cekam, setCekam] = useState(false);
  const chybi = coChybiNaFakture(faktura);
  const wa = row.telefonWa || row.jinyTelefonWa;

  async function akce(nazev: 'faktura-hotovo' | 'faktura-vratit') {
    if (cekam) return;
    if (ukazka) {
      onZmena(row.rezervace, { ...faktura, hotovo: nazev === 'faktura-hotovo' ? new Date().toISOString() : null });
      return;
    }
    setCekam(true);
    const json = await posliAkci(row.rezervace, nazev);
    setCekam(false);
    if (!json.ok || !json.faktura) {
      onHlaska(json.error || 'Nepodařilo se uložit.');
      return;
    }
    onZmena(row.rezervace, json.faktura);
  }

  return (
    <>
      <ul className="ph-faktura__pole">
        {pole(faktura).map((p) => (
          <li key={p.nazev}>
            <span className="ph-faktura__nazev">{p.nazev}</span>
            <span className="ph-faktura__hodnota">{p.hodnota}</span>
            <button type="button" className="ph-kopie" onClick={() => kopiruj(p.nazev, p.hodnota, onHlaska)}>
              Kopírovat
            </button>
          </li>
        ))}
      </ul>
      <p className="ph-faktura__kdo">{faktura.zadal === 'majitel' ? 'Zadal majitel' : 'Zadal host'}</p>
      <span className="ph-odjezdy__akce">
        {faktura.hotovo ? (
          <button type="button" className="ph-kopie" disabled={cekam} onClick={() => void akce('faktura-vratit')}>
            {FAKTURA_MAJITEL.tlacitko_vratit}
          </button>
        ) : (
          <button type="button" className="ph-ulozit" disabled={cekam} onClick={() => void akce('faktura-hotovo')}>
            {FAKTURA_MAJITEL.tlacitko_hotovo}
          </button>
        )}
        {chybi.length && !faktura.hotovo ? (
          <TlacitkoWhatsApp
            wa={wa}
            zprava={zpravaFakturaDoplnit(chybi)}
            userAgent={userAgent}
            onPredOtevrenim={async () => {
              if (!ukazka) await posliAkci(row.rezervace, 'faktura-whatsapp');
            }}
          >
            Doplnit údaje
          </TlacitkoWhatsApp>
        ) : null}
      </span>
    </>
  );
}

function FakturaPolozka({
  row,
  faktura,
  onOtevriKartu,
  ...spolecne
}: Spolecne & { row: PrehledRadek; faktura: FakturaUdaje; onOtevriKartu: (rezervace: string) => void }) {
  return (
    <li className="ph-faktura__polozka">
      <div className="ph-faktura__hlava">
        <button type="button" className="ph-dnesek__odkaz" onClick={() => onOtevriKartu(row.rezervace)}>
          {row.jmeno || 'Host'}
        </button>
        {' · '}
        {row.apartman || 'bez apartmánu'}
        {' · '}
        {row.termin}
        {row.stav === 'zruseno' ? <span className="ph-faktura__zruseno">Zrušeno</span> : null}
      </div>
      <FakturaObsah row={row} faktura={faktura} {...spolecne} />
    </li>
  );
}

/** Domů, záložka Příjezdy. Červené tlačítko jen pro odjezd dnes a dřív, klidnější seznam pro budoucí odjezdy. */
export function FakturyDomu({
  radky,
  dnes,
  onOtevriKartu,
  ...spolecne
}: Spolecne & { radky: PrehledRadek[]; dnes: string; onOtevriKartu: (rezervace: string) => void }) {
  const [otevreno, setOtevreno] = useState(false);
  const [pozdejiOtevreno, setPozdejiOtevreno] = useState(false);
  const keVystaveni = fakturyKeVystaveni(radky, dnes);
  const pozdeji = fakturyPozdeji(radky, dnes);

  return (
    <>
      {keVystaveni.length ? (
        <section id="faktury" className="ph-domu-radek">
          <button
            type="button"
            className="ph-domu-radek__souhrn is-akce"
            aria-expanded={otevreno}
            onClick={() => setOtevreno((v) => !v)}
          >
            Faktury k vystavení · {keVystaveni.length} {otevreno ? '▴' : '▸'}
          </button>
          {otevreno ? (
            <ul className="ph-faktura__seznam">
              {keVystaveni.map((row) =>
                row.faktura ? (
                  <FakturaPolozka
                    key={row.rezervace}
                    row={row}
                    faktura={row.faktura}
                    onOtevriKartu={onOtevriKartu}
                    {...spolecne}
                  />
                ) : null,
              )}
            </ul>
          ) : null}
        </section>
      ) : null}
      {pozdeji.length ? (
        <section id="faktury-pozdeji" className="ph-domu-radek">
          <button
            type="button"
            className="ph-domu-radek__souhrn"
            aria-expanded={pozdejiOtevreno}
            onClick={() => setPozdejiOtevreno((v) => !v)}
          >
            Faktury před odjezdem · {pozdeji.length} {pozdejiOtevreno ? '▴' : '▸'}
          </button>
          {pozdejiOtevreno ? (
            <ul className="ph-faktura__seznam">
              {pozdeji.map((row) =>
                row.faktura ? (
                  <FakturaPolozka
                    key={row.rezervace}
                    row={row}
                    faktura={row.faktura}
                    onOtevriKartu={onOtevriKartu}
                    {...spolecne}
                  />
                ) : null,
              )}
            </ul>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

/** Štítek na kartě hosta. Jen když faktura čeká. */
export function FakturaStitek({ faktura, onClick }: { faktura: FakturaUdaje | null; onClick: () => void }) {
  if (!faktura || faktura.hotovo) return null;
  return (
    <button type="button" className="ph-prani-stitek" onClick={onClick}>
      {FAKTURA_MAJITEL.stitek_karty}
    </button>
  );
}

/** Sekce Faktura v detailu karty. Majitel tu údaje zadá nebo upraví. */
export function FakturaDetail({ row, ...spolecne }: Spolecne & { row: PrehledRadek }) {
  const { ukazka, onZmena, onHlaska } = spolecne;
  const [uprava, setUprava] = useState(false);
  const [cekam, setCekam] = useState(false);
  const faktura = row.faktura;

  async function ares(ico: string): Promise<AresVysledek | null> {
    if (ukazka) return null;
    const json = await posliAkci(row.rezervace, 'faktura-ares', { ico });
    return json.ok ? (json.ares ?? null) : null;
  }

  async function ulozit(vstup: FakturaVstup): Promise<VysledekUlozeni> {
    if (ukazka) {
      onZmena(row.rezervace, {
        typ: vstup.typ === 'zahranici' ? 'zahranici' : 'cz',
        ico: vstup.ico || undefined,
        nazev: vstup.nazev || undefined,
        adresa: vstup.adresa || undefined,
        zeme: vstup.zeme || undefined,
        dic: vstup.dic || undefined,
        email: vstup.email || undefined,
        poznamka: vstup.poznamka || undefined,
        zadal: 'majitel',
        kdy: new Date().toISOString(),
        hotovo: faktura?.hotovo ?? null,
      });
      setUprava(false);
      return null;
    }
    const json = await posliAkci(row.rezervace, 'faktura-ulozit', { faktura: vstup });
    if (!json.ok || !json.faktura) return { duvod: 'chyba', text: json.error };
    onZmena(row.rezervace, json.faktura);
    setUprava(false);
    return null;
  }

  async function smazat() {
    if (cekam || !window.confirm('Smazat údaje na fakturu?')) return;
    if (ukazka) {
      onZmena(row.rezervace, null);
      return;
    }
    setCekam(true);
    const json = await posliAkci(row.rezervace, 'faktura-smazat');
    setCekam(false);
    if (!json.ok) {
      onHlaska(json.error || 'Nepodařilo se smazat.');
      return;
    }
    onZmena(row.rezervace, null);
  }

  if (uprava || !faktura) {
    return (
      <div className="ph-faktura">
        {uprava ? (
          <FakturaFormular
            lang="cs"
            initial={faktura}
            email={row.email.includes('@') ? row.email : ''}
            ares={ares}
            onUlozit={ulozit}
            onZrusit={() => setUprava(false)}
          />
        ) : (
          <button type="button" className="ph-ulozit" onClick={() => setUprava(true)}>
            {FAKTURA_MAJITEL.karta_tlacitko}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="ph-faktura">
      <FakturaObsah row={row} faktura={faktura} {...spolecne} />
      <span className="ph-odjezdy__akce">
        {faktura.hotovo ? null : (
          <button type="button" className="ph-kopie" onClick={() => setUprava(true)}>
            Upravit
          </button>
        )}
        <button type="button" className="ph-kopie" disabled={cekam} onClick={() => void smazat()}>
          Smazat údaje
        </button>
      </span>
    </div>
  );
}
