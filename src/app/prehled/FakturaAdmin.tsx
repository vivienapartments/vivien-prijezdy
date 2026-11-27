'use client';

import { useEffect, useState } from 'react';
import { FakturaFormular, type VysledekUlozeni } from '@/components/FakturaHosta';
import { TlacitkoWhatsApp } from '@/components/TlacitkoWhatsApp';
import {
  coChybiNaFakture,
  fakturaProNovyPobyt,
  fakturyKeVystaveni,
  fakturyPozdeji,
  maUdajeFirmy,
  sestavZpravuFaktury,
  shrnutiFaktury,
  vychoziTypFaktury,
  type AresVysledek,
  type FakturaDokladVolby,
  type FakturaUdaje,
  type FakturaVstup,
} from '@/lib/faktura';
import {
  FAKTURA_MAJITEL,
  FAKTURA_ZPRAVA_BEZ_PRUVODCE,
  FAKTURA_ZPRAVA_HOSTOVI,
} from '@/lib/faktura-texty';
import type { PrehledRadek } from '@/lib/prehled';
import { LANG_LABELS, type GuideLang } from '@/lib/types';
import { zpravaFakturaDoplnit } from '@/lib/whatsapp-zprava';

function jazykZpravy(row: PrehledRadek): GuideLang {
  return (row.jazyk as GuideLang) || 'cs';
}

function zpravaProHosta(row: PrehledRadek, checkinUrl?: string | null) {
  const lang = jazykZpravy(row);
  return sestavZpravuFaktury(
    FAKTURA_ZPRAVA_HOSTOVI[lang] || FAKTURA_ZPRAVA_HOSTOVI.en,
    FAKTURA_ZPRAVA_BEZ_PRUVODCE[lang] || FAKTURA_ZPRAVA_BEZ_PRUVODCE.en,
    row.odkaz,
    checkinUrl ?? row.checkinUrl,
  );
}

/** Tlačítka „Zpráva o faktuře“ + WhatsApp na kartě. */
export function FakturaZpravaTlacitka({
  row,
  checkinUrl,
  userAgent,
  onHlaska,
}: {
  row: PrehledRadek;
  checkinUrl?: string | null;
  userAgent: string;
  onHlaska: (text: string) => void;
}) {
  const lang = jazykZpravy(row);
  const vysledek = zpravaProHosta(row, checkinUrl);
  const wa = row.telefonWa || row.jinyTelefonWa;

  function kopiruj() {
    if (!vysledek.ok) {
      onHlaska(FAKTURA_MAJITEL.chybi_checkin_odkaz);
      return;
    }
    void navigator.clipboard.writeText(vysledek.text).then(
      () => onHlaska(FAKTURA_MAJITEL.zkopirovano),
      () => onHlaska(vysledek.text),
    );
  }

  return (
    <div className="ph-faktura__zprava">
      <p className="ph-faktura__jazyk">Jazyk zprávy: {LANG_LABELS[lang]}</p>
      <span className="ph-odjezdy__akce">
        <button type="button" className="ph-kopie" onClick={kopiruj}>
          {FAKTURA_MAJITEL.tlacitko_zprava}
        </button>
        {vysledek.ok && wa ? (
          <TlacitkoWhatsApp wa={wa} zprava={vysledek.text} userAgent={userAgent}>
            {FAKTURA_MAJITEL.tlacitko_whatsapp}
          </TlacitkoWhatsApp>
        ) : null}
      </span>
    </div>
  );
}

type ZmenaFaktury = (
  rezervace: string,
  faktura: FakturaUdaje | null,
  opts?: { fakturaNeprebirat?: boolean },
) => void;
type ZmenaCeny = (rezervace: string, cenaPobytu: number) => void;
type ZmenaMeny = (rezervace: string, mena: 'CZK' | 'EUR') => void | Promise<void>;

type Spolecne = {
  ukazka: boolean;
  userAgent: string;
  onZmena: ZmenaFaktury;
  onCenaPobytu?: ZmenaCeny;
  onMena?: ZmenaMeny;
  onHlaska: (text: string) => void;
};

type OdpovedAkce = {
  ok?: boolean;
  error?: string;
  faktura?: FakturaUdaje | null;
  fakturaNeprebirat?: boolean;
  ares?: AresVysledek;
  cenaPobytu?: number | null;
  zpravaWa?: string;
  email?: string;
  odkaz?: string;
};

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

function dnesIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function plusDny(ymd: string, dny: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dny));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** Záloha: za týden, nejpozději den příjezdu. */
function splatnostZalohyUi(prijezd: string | null | undefined, dnes: string): string {
  const tyden = plusDny(dnes, 7);
  if (prijezd && /^\d{4}-\d{2}-\d{2}$/.test(prijezd) && prijezd < tyden) return prijezd;
  return tyden;
}

function odkazDokladu(
  row: PrehledRadek,
  lang: 'cs' | 'en',
  castka: string,
  typ: 'zalohova' | 'faktura',
  vystaveno: string,
  splatnost: string,
  odberatel: 'firma' | 'host',
  volby: {
    bezHosta: boolean;
    bezEmailu: boolean;
    bezPoznamky: boolean;
    poznamka: string;
    zpusobUhrady: 'kartou' | 'prevodem' | 'hotove';
  },
): string {
  const q = new URLSearchParams({ rezervace: row.rezervace, lang, typ, odberatel });
  const cista = castka.trim().replace(/\s+/g, '').replace(',', '.');
  if (cista) q.set('castka', cista);
  if (/^\d{4}-\d{2}-\d{2}$/.test(vystaveno)) q.set('vystaveno', vystaveno);
  if (/^\d{4}-\d{2}-\d{2}$/.test(splatnost)) q.set('splatnost', splatnost);
  if (odberatel === 'firma' && volby.bezHosta) q.set('bezHosta', '1');
  if (volby.bezEmailu) q.set('bezEmailu', '1');
  if (volby.bezPoznamky) q.set('bezPoznamky', '1');
  else if (volby.poznamka.trim()) q.set('poznamka', volby.poznamka.trim());
  if (typ === 'faktura') q.set('zpusob', volby.zpusobUhrady);
  return `/api/prehled/faktura-doklad?${q.toString()}`;
}

function parsujCastku(raw: string): number | null {
  const n = Math.round(Number(raw.trim().replace(/\s+/g, '').replace(',', '.')) * 100) / 100;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function pole(f: FakturaUdaje): { nazev: string; hodnota: string }[] {
  return [
    { nazev: 'Název', hodnota: f.nazev || '' },
    { nazev: f.typ === 'zahranici' ? 'Registrační číslo' : 'IČO', hodnota: f.ico || '' },
    { nazev: 'DIČ', hodnota: f.dic || '' },
    { nazev: 'Adresa', hodnota: f.adresa || '' },
    { nazev: 'Země', hodnota: f.zeme || '' },
  ].filter((p) => p.hodnota);
}

function kopiruj(nazev: string, hodnota: string, onHlaska: (text: string) => void) {
  void navigator.clipboard.writeText(hodnota).then(
    () => onHlaska(`${nazev} je ve schránce.`),
    () => onHlaska(hodnota),
  );
}

/** Údaje z faktury s tlačítky Kopírovat a akcemi majitele. */
function FakturaObsah({
  row,
  faktura,
  ukazka,
  userAgent,
  onZmena,
  onCenaPobytu,
  onMena,
  onHlaska,
}: Spolecne & { row: PrehledRadek; faktura: FakturaUdaje }) {
  const [cekam, setCekam] = useState(false);
  const [cena, setCena] = useState(row.cenaPobytu != null ? String(row.cenaPobytu) : '');
  const [castkaFirma, setCastkaFirma] = useState(row.cenaPobytu != null ? String(row.cenaPobytu) : '');
  const [castkaHost, setCastkaHost] = useState('');
  const [odberatel, setOdberatel] = useState<'firma' | 'host'>('firma');
  const [bezHosta, setBezHosta] = useState(false);
  const [bezEmailu, setBezEmailu] = useState(false);
  const [bezPoznamky, setBezPoznamky] = useState(false);
  const [poznamka, setPoznamka] = useState(faktura.poznamka || '');
  const [editujePoznamku, setEditujePoznamku] = useState(false);
  const v = faktura.dokladVolby;
  const [typ, setTyp] = useState<'zalohova' | 'faktura'>(v?.typDokladu || 'faktura');
  const [zpusobUhrady, setZpusobUhrady] = useState<'kartou' | 'prevodem' | 'hotove'>(
    v?.zpusobUhrady || 'prevodem',
  );
  const [vystaveno, setVystaveno] = useState(dnesIso());
  const [splatnost, setSplatnost] = useState(dnesIso());
  const chybi = coChybiNaFakture(faktura);
  const wa = row.telefonWa || row.jinyTelefonWa;
  const langDokladu = row.jazyk === 'cs' ? 'cs' : 'en';
  const celkemPobytu = parsujCastku(cena) ?? row.cenaPobytu ?? null;
  const emailKarty = (faktura.email || '').trim();
  const emailHosta = (row.email || '').trim();
  const emailJeHostuv =
    Boolean(emailKarty && emailHosta && emailKarty.toLowerCase() === emailHosta.toLowerCase());

  useEffect(() => {
    const c = row.cenaPobytu != null ? String(row.cenaPobytu) : '';
    const volby = faktura.dokladVolby;
    setCena(c);
    setCastkaFirma(c);
    setCastkaHost('');
    setOdberatel(volby?.odberatel || 'firma');
    setBezHosta(volby?.bezHosta === true);
    setBezEmailu(volby?.bezEmailu === true);
    setBezPoznamky(volby?.bezPoznamky === true);
    setPoznamka(faktura.poznamka || '');
    setEditujePoznamku(false);
    const dnes = dnesIso();
    const typDokladu = volby?.typDokladu || 'faktura';
    setTyp(typDokladu);
    setZpusobUhrady(volby?.zpusobUhrady || 'prevodem');
    setVystaveno(dnes);
    setSplatnost(typDokladu === 'zalohova' ? splatnostZalohyUi(row.prijezd, dnes) : dnes);
    // Jen při přepnutí hosta. Uložení voleb nesmí mazat částky.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.rezervace]);

  useEffect(() => {
    const c = row.cenaPobytu != null ? String(row.cenaPobytu) : '';
    setCena(c);
    setCastkaFirma(c);
  }, [row.cenaPobytu, row.rezervace]);

  useEffect(() => {
    setPoznamka(faktura.poznamka || '');
  }, [faktura.poznamka, row.rezervace]);

  function aktualniVolby(
    prepis: Partial<FakturaDokladVolby> = {},
  ): FakturaDokladVolby {
    return {
      typDokladu: prepis.typDokladu ?? typ,
      zpusobUhrady: prepis.zpusobUhrady ?? zpusobUhrady,
      odberatel: prepis.odberatel ?? odberatel,
      bezHosta: prepis.bezHosta ?? bezHosta,
      bezEmailu: prepis.bezEmailu ?? bezEmailu,
      bezPoznamky: prepis.bezPoznamky ?? bezPoznamky,
    };
  }

  async function ulozVolby(prepis: Partial<FakturaDokladVolby> = {}) {
    const dokladVolby = aktualniVolby(prepis);
    if (ukazka) {
      onZmena(row.rezervace, { ...faktura, dokladVolby });
      return;
    }
    const json = await posliAkci(row.rezervace, 'faktura-doklad-volby', {
      typ: dokladVolby.typDokladu,
      zpusobUhrady: dokladVolby.zpusobUhrady,
      odberatel: dokladVolby.odberatel,
      bezHosta: dokladVolby.bezHosta,
      bezEmailu: dokladVolby.bezEmailu,
      bezPoznamky: dokladVolby.bezPoznamky,
    });
    if (!json.ok || !json.faktura) {
      onHlaska(json.error || 'Nastavení dokladu se neuložilo.');
      return;
    }
    onZmena(row.rezervace, json.faktura);
  }

  function zvolOdberatele(kdo: 'firma' | 'host') {
    setOdberatel(kdo);
    if (kdo === 'host') setBezHosta(false);
    void ulozVolby({ odberatel: kdo, bezHosta: kdo === 'host' ? false : bezHosta });
  }

  function volbyDokladu() {
    return {
      bezHosta,
      bezEmailu: bezEmailu || (odberatel === 'firma' && emailJeHostuv),
      bezPoznamky,
      poznamka,
      zpusobUhrady,
    };
  }

  function zmenCastkuFirma(raw: string) {
    setCastkaFirma(raw);
    const dil = parsujCastku(raw);
    if (celkemPobytu == null || dil == null) {
      setCastkaHost('');
      return;
    }
    const zbytek = Math.round((celkemPobytu - dil) * 100) / 100;
    setCastkaHost(zbytek > 0 ? String(zbytek) : '');
  }

  function zmenCastkuHost(raw: string) {
    setCastkaHost(raw);
    const dil = parsujCastku(raw);
    if (celkemPobytu == null || dil == null) {
      setCastkaFirma(celkemPobytu != null ? String(celkemPobytu) : '');
      return;
    }
    const zbytek = Math.round((celkemPobytu - dil) * 100) / 100;
    setCastkaFirma(zbytek >= 0 ? String(zbytek) : '');
  }

  function zvolTyp(dalsi: 'zalohova' | 'faktura') {
    setTyp(dalsi);
    const dnes = dnesIso();
    setVystaveno(dnes);
    setSplatnost(dalsi === 'zalohova' ? splatnostZalohyUi(row.prijezd, dnes) : dnes);
    void ulozVolby({ typDokladu: dalsi });
  }

  function zvolZpusob(jak: 'kartou' | 'prevodem' | 'hotove') {
    setZpusobUhrady(jak);
    void ulozVolby({ zpusobUhrady: jak });
  }

  async function ulozNeboEditujPoznamku() {
    if (!editujePoznamku) {
      setEditujePoznamku(true);
      return;
    }
    const text = poznamka.trim().slice(0, 500);
    setPoznamka(text);
    setEditujePoznamku(false);
    if (ukazka) {
      onZmena(row.rezervace, {
        ...faktura,
        ...(text ? { poznamka: text } : {}),
        ...(!text ? { poznamka: undefined } : {}),
      });
      return;
    }
    setCekam(true);
    const json = await posliAkci(row.rezervace, 'faktura-poznamka', { poznamka: text });
    setCekam(false);
    if (!json.ok || !json.faktura) {
      onHlaska(json.error || 'Poznámka se neuložila.');
      return;
    }
    onZmena(row.rezervace, json.faktura);
    onHlaska('Poznámka je uložená.');
  }

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

  async function ulozCenu() {
    const castka = Math.round(Number(cena.trim().replace(/\s+/g, '').replace(',', '.')) * 100) / 100;
    if (!Number.isFinite(castka) || castka <= 0) {
      onHlaska('Zadejte částku pobytu.');
      return;
    }
    if (ukazka) {
      onCenaPobytu?.(row.rezervace, castka);
      onHlaska('Cena pobytu je uložená.');
      return;
    }
    setCekam(true);
    const json = await posliAkci(row.rezervace, 'cena-pobytu', { castka });
    setCekam(false);
    if (!json.ok || json.cenaPobytu == null) {
      onHlaska(json.error || 'Nepodařilo se uložit cenu.');
      return;
    }
    onCenaPobytu?.(row.rezervace, json.cenaPobytu);
    onHlaska('Cena pobytu je uložená.');
  }

  function castkaProDoklad(): string {
    return odberatel === 'host' ? castkaHost || cena : castkaFirma || cena;
  }

  function otevriDoklad(lang: 'cs' | 'en') {
    if (ukazka) {
      onHlaska('Náhled dokladu je v ostrém přehledu u rezervace.');
      return;
    }
    window.open(
      odkazDokladu(row, lang, castkaProDoklad(), typ, vystaveno, splatnost, odberatel, volbyDokladu()),
      '_blank',
      'noopener,noreferrer',
    );
  }

  function teloDokladu() {
    return {
      typ,
      odberatel,
      bezHosta: odberatel === 'firma' && bezHosta,
      bezEmailu: bezEmailu || (odberatel === 'firma' && emailJeHostuv),
      bezPoznamky,
      poznamkaDokladu: bezPoznamky ? '' : poznamka,
      zpusobUhrady: typ === 'faktura' ? zpusobUhrady : 'prevodem',
      lang: langDokladu,
      castka: castkaProDoklad(),
      vystaveno,
      splatnost,
      origin: window.location.origin,
    };
  }

  async function posliDokladEmailem() {
    if (cekam) return;
    if (ukazka) {
      onHlaska('Ostrý e-mail jde jen z přehledu u rezervace.');
      return;
    }
    setCekam(true);
    const json = await posliAkci(row.rezervace, 'faktura-doklad-email', teloDokladu());
    setCekam(false);
    if (!json.ok) {
      onHlaska(json.error || FAKTURA_MAJITEL.doklad_chybi_email);
      return;
    }
    onHlaska(
      json.email
        ? `${FAKTURA_MAJITEL.doklad_email_ok} (${json.email})`
        : FAKTURA_MAJITEL.doklad_email_ok,
    );
  }

  async function posliDokladWhatsApp() {
    if (cekam) return;
    if (ukazka) {
      onHlaska('WhatsApp s dokladem jde jen z přehledu u rezervace.');
      return;
    }
    if (!wa) {
      onHlaska(FAKTURA_MAJITEL.doklad_chybi_telefon);
      return;
    }
    setCekam(true);
    const json = await posliAkci(row.rezervace, 'faktura-doklad-whatsapp', teloDokladu());
    setCekam(false);
    if (!json.ok || !json.zpravaWa) {
      onHlaska(json.error || 'Nepodařilo se připravit zprávu.');
      return;
    }
    const url = `https://wa.me/${wa}?text=${encodeURIComponent(json.zpravaWa)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onHlaska(FAKTURA_MAJITEL.doklad_wa_ok);
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
        <li>
          <span className="ph-faktura__nazev">Cena pobytu</span>
          <span className="ph-faktura__hodnota ph-faktura__volby">
            <button
              type="button"
              className={row.mena !== 'EUR' ? 'ph-ulozit' : 'ph-kopie'}
              disabled={cekam}
              onClick={() => void onMena?.(row.rezervace, 'CZK')}
            >
              Kč
            </button>
            <button
              type="button"
              className={row.mena === 'EUR' ? 'ph-ulozit' : 'ph-kopie'}
              disabled={cekam}
              onClick={() => void onMena?.(row.rezervace, 'EUR')}
            >
              €
            </button>
          </span>
          <span className="ph-faktura__hodnota">
            <input
              className="ph-input"
              inputMode="decimal"
              value={cena}
              onChange={(e) => setCena(e.target.value)}
              placeholder={row.mena === 'EUR' ? 'např. 180' : 'např. 1034,46'}
              aria-label="Cena pobytu"
            />
          </span>
          <button type="button" className="ph-kopie" disabled={cekam} onClick={() => void ulozCenu()}>
            Uložit cenu
          </button>
          <span className="ph-faktura__napoveda">
            {row.mena === 'EUR'
              ? 'Na dokladu bude částka v eurech. Po odjezdu ji tu můžete kdykoli změnit.'
              : 'Na dokladu bude částka v korunách. Po odjezdu ji tu můžete kdykoli změnit.'}
            {!cena.trim() && row.cenaPobytu == null
              ? ' Cena přijde z check-inu nebo z mailu Nová rezervace. U starších karet ji doplňte ručně a uložte.'
              : ''}
          </span>
        </li>
        <li>
          <span className="ph-faktura__nazev">Typ dokladu</span>
          <span className="ph-faktura__hodnota ph-faktura__volby">
            <button
              type="button"
              className={typ === 'faktura' ? 'ph-ulozit' : 'ph-kopie'}
              onClick={() => zvolTyp('faktura')}
            >
              Po odjezdu
            </button>
            <button
              type="button"
              className={typ === 'zalohova' ? 'ph-ulozit' : 'ph-kopie'}
              onClick={() => zvolTyp('zalohova')}
            >
              Zálohová
            </button>
          </span>
        </li>
        {typ === 'faktura' ? (
          <li>
            <span className="ph-faktura__nazev">Forma úhrady</span>
            <span className="ph-faktura__hodnota ph-faktura__volby ph-faktura__volby--tri">
              <button
                type="button"
                className={zpusobUhrady === 'kartou' ? 'ph-ulozit' : 'ph-kopie'}
                onClick={() => zvolZpusob('kartou')}
              >
                Kartou
              </button>
              <button
                type="button"
                className={zpusobUhrady === 'prevodem' ? 'ph-ulozit' : 'ph-kopie'}
                onClick={() => zvolZpusob('prevodem')}
              >
                Převodem
              </button>
              <button
                type="button"
                className={zpusobUhrady === 'hotove' ? 'ph-ulozit' : 'ph-kopie'}
                onClick={() => zvolZpusob('hotove')}
              >
                Hotově
              </button>
            </span>
          </li>
        ) : null}
        <li>
          <span className="ph-faktura__nazev">Odběratel</span>
          <span className="ph-faktura__hodnota ph-faktura__volby">
            <button
              type="button"
              className={odberatel === 'firma' ? 'ph-ulozit' : 'ph-kopie'}
              onClick={() => zvolOdberatele('firma')}
            >
              Firma
            </button>
            <button
              type="button"
              className={odberatel === 'host' ? 'ph-ulozit' : 'ph-kopie'}
              onClick={() => zvolOdberatele('host')}
            >
              Host
            </button>
          </span>
        </li>
        {odberatel === 'firma' ? (
          <li>
            <span className="ph-faktura__nazev">Jméno hosta</span>
            <span className="ph-faktura__hodnota ph-faktura__volby">
              <button
                type="button"
                className={!bezHosta ? 'ph-ulozit' : 'ph-kopie'}
                onClick={() => {
                  setBezHosta(false);
                  void ulozVolby({ bezHosta: false });
                }}
              >
                Uvést
              </button>
              <button
                type="button"
                className={bezHosta ? 'ph-ulozit' : 'ph-kopie'}
                onClick={() => {
                  setBezHosta(true);
                  void ulozVolby({ bezHosta: true });
                }}
              >
                Neuvést
              </button>
            </span>
          </li>
        ) : null}
        <li>
          <span className="ph-faktura__nazev">E-mail na dokladu</span>
          <span className="ph-faktura__hodnota">
            {emailKarty || (odberatel === 'host' ? emailHosta : '') || '—'}
            {odberatel === 'firma' && emailJeHostuv ? (
              <span className="ph-faktura__napoveda">Je to e-mail hosta. Na doklad firmy se nedá.</span>
            ) : null}
          </span>
          <span className="ph-faktura__hodnota ph-faktura__volby">
            <button
              type="button"
              className={!bezEmailu ? 'ph-ulozit' : 'ph-kopie'}
              onClick={() => {
                setBezEmailu(false);
                void ulozVolby({ bezEmailu: false });
              }}
              disabled={odberatel === 'firma' && emailJeHostuv}
            >
              Uvést
            </button>
            <button
              type="button"
              className={bezEmailu || (odberatel === 'firma' && emailJeHostuv) ? 'ph-ulozit' : 'ph-kopie'}
              onClick={() => {
                setBezEmailu(true);
                void ulozVolby({ bezEmailu: true });
              }}
            >
              Neuvést
            </button>
          </span>
        </li>
        <li>
          <span className="ph-faktura__nazev">Poznámka</span>
          {editujePoznamku ? (
            <span className="ph-faktura__hodnota">
              <input
                className="ph-input"
                value={poznamka}
                onChange={(e) => setPoznamka(e.target.value)}
                placeholder="text na doklad"
                aria-label="Poznámka na doklad"
              />
            </span>
          ) : (
            <span className="ph-faktura__hodnota">{poznamka.trim() || '—'}</span>
          )}
          <button
            type="button"
            className="ph-kopie"
            disabled={cekam}
            onClick={() => void ulozNeboEditujPoznamku()}
          >
            {editujePoznamku ? 'Hotovo' : 'Upravit'}
          </button>
          <span className="ph-faktura__hodnota ph-faktura__volby">
            <button
              type="button"
              className={!bezPoznamky ? 'ph-ulozit' : 'ph-kopie'}
              onClick={() => {
                setBezPoznamky(false);
                void ulozVolby({ bezPoznamky: false });
              }}
            >
              Na dokladu
            </button>
            <button
              type="button"
              className={bezPoznamky ? 'ph-ulozit' : 'ph-kopie'}
              onClick={() => {
                setBezPoznamky(true);
                void ulozVolby({ bezPoznamky: true });
              }}
            >
              Neuvést
            </button>
          </span>
        </li>
        <li>
          <span className="ph-faktura__nazev">Částka firma</span>
          <span className="ph-faktura__hodnota">
            <input
              className="ph-input"
              inputMode="decimal"
              value={castkaFirma}
              onChange={(e) => zmenCastkuFirma(e.target.value)}
              placeholder="část pro firmu"
              aria-label="Částka pro firmu"
            />
          </span>
        </li>
        <li>
          <span className="ph-faktura__nazev">Částka host</span>
          <span className="ph-faktura__hodnota">
            <input
              className="ph-input"
              inputMode="decimal"
              value={castkaHost}
              onChange={(e) => zmenCastkuHost(e.target.value)}
              placeholder="zbytek pro hosta"
              aria-label="Částka pro hosta"
            />
          </span>
        </li>
        <li>
          <span className="ph-faktura__nazev">Vystaveno</span>
          <span className="ph-faktura__hodnota">
            <input
              type="date"
              className="ph-input"
              value={vystaveno}
              onChange={(e) => setVystaveno(e.target.value)}
              aria-label="Datum vystavení"
            />
          </span>
        </li>
        <li>
          <span className="ph-faktura__nazev">Splatnost</span>
          <span className="ph-faktura__hodnota">
            <input
              type="date"
              className="ph-input"
              value={splatnost}
              onChange={(e) => setSplatnost(e.target.value)}
              aria-label="Datum splatnosti"
            />
          </span>
          <button type="button" className="ph-ulozit" onClick={() => otevriDoklad(langDokladu)}>
            OK · náhled
          </button>
        </li>
      </ul>
      <p className="ph-faktura__kdo">
        {faktura.zadal === 'majitel' ? 'Zadal majitel' : 'Zadal host'}
        {typ === 'zalohova'
          ? ' · zálohová má platební QR'
          : ' · po odjezdu uhrazeno, odkaz + QR na rezervaci'}
        {odberatel === 'host' ? ' · odběratel host' : ' · odběratel firma'}
        {odberatel === 'firma' && bezHosta ? ' · bez jména hosta' : ''}
        {bezEmailu || (odberatel === 'firma' && emailJeHostuv) ? ' · bez e-mailu' : ''}
        {bezPoznamky ? ' · bez poznámky' : ''}
      </p>
      <div className="ph-faktura__akce">
        <div className="ph-faktura__radek">
          <button type="button" className="ph-ulozit" onClick={() => otevriDoklad(langDokladu)}>
            Náhled dokladu
          </button>
          <button type="button" className="ph-kopie" onClick={() => otevriDoklad(langDokladu === 'cs' ? 'en' : 'cs')}>
            {langDokladu === 'cs' ? 'Náhled anglicky' : 'Náhled česky'}
          </button>
        </div>
        <div className="ph-faktura__radek">
          <button type="button" className="ph-ulozit" disabled={cekam} onClick={() => void posliDokladEmailem()}>
            E-mailem
          </button>
          <button type="button" className="ph-kopie" disabled={cekam} onClick={() => void posliDokladWhatsApp()}>
            WhatsApp
          </button>
        </div>
        <div
          className={
            chybi.length && !faktura.hotovo ? 'ph-faktura__radek' : 'ph-faktura__radek ph-faktura__radek--jedna'
          }
        >
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
        </div>
      </div>
    </>
  );
}

function FakturaPolozka({
  row,
  faktura,
  onOtevriKartu,
  ...spolecne
}: Spolecne & { row: PrehledRadek; faktura: FakturaUdaje; onOtevriKartu: (rezervace: string) => void }) {
  const [otevreno, setOtevreno] = useState(false);
  return (
    <li className={`ph-faktura__polozka${otevreno ? ' is-otevreno' : ''}`}>
      <button
        type="button"
        className="ph-faktura__souhrn"
        aria-expanded={otevreno}
        onClick={() => setOtevreno((v) => !v)}
      >
        <span className="ph-faktura__souhrn-text">
          <strong>{row.jmeno || 'Host'}</strong>
          {' · '}
          {row.apartman || 'bez apartmánu'}
          {' · '}
          {row.termin}
          {row.stav === 'zruseno' ? <span className="ph-faktura__zruseno">Zrušeno</span> : null}
        </span>
        <span className="ph-faktura__sipka" aria-hidden="true">
          {otevreno ? '▴' : '▸'}
        </span>
      </button>
      {otevreno ? (
        <div className="ph-faktura__telo">
          <button type="button" className="ph-dnesek__odkaz ph-faktura__karta" onClick={() => onOtevriKartu(row.rezervace)}>
            Otevřít kartu
          </button>
          <FakturaObsah row={row} faktura={faktura} {...spolecne} />
        </div>
      ) : null}
    </li>
  );
}

/** Domů, záložka Příjezdy. Červené tlačítko jen pro odjezd dnes a dřív, klidnější seznam pro budoucí odjezdy. */
export function FakturyDomu({
  radky,
  dnes,
  onOtevriKartu,
  vychoziOtevreno = false,
  jen = 'vse',
  ...spolecne
}: Spolecne & {
  radky: PrehledRadek[];
  dnes: string;
  onOtevriKartu: (rezervace: string) => void;
  vychoziOtevreno?: boolean;
  /** Nahoře jen k vystavení dnes; dole jen před odjezdem; vse = obojí. */
  jen?: 'aktualni' | 'pozdeji' | 'vse';
}) {
  const [otevreno, setOtevreno] = useState(vychoziOtevreno);
  const [pozdejiOtevreno, setPozdejiOtevreno] = useState(false);
  const keVystaveni = fakturyKeVystaveni(radky, dnes);
  const pozdeji = fakturyPozdeji(radky, dnes);
  const ukazAktualni = jen !== 'pozdeji';
  const ukazPozdeji = jen !== 'aktualni';

  useEffect(() => {
    if (vychoziOtevreno) setOtevreno(true);
  }, [vychoziOtevreno]);

  return (
    <>
      {ukazAktualni && keVystaveni.length ? (
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
      {ukazPozdeji && pozdeji.length ? (
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

/** Štítek na kartě hosta. Jen když faktura čeká. U zrušené rezervace ne. */
export function FakturaStitek({
  faktura,
  zruseno = false,
  onClick,
}: {
  faktura: FakturaUdaje | null;
  zruseno?: boolean;
  onClick: () => void;
}) {
  if (zruseno || !faktura || faktura.hotovo) return null;
  return (
    <button type="button" className="ph-prani-stitek" onClick={onClick}>
      {FAKTURA_MAJITEL.stitek_karty}
    </button>
  );
}

/** Sekce Faktura v detailu karty. Majitel tu údaje zadá nebo upraví. */
export function FakturaDetail({
  row,
  checkinUrl,
  ...spolecne
}: Spolecne & { row: PrehledRadek; checkinUrl?: string | null }) {
  const { ukazka, userAgent, onZmena, onHlaska } = spolecne;
  const [uprava, setUprava] = useState(false);
  const [cekam, setCekam] = useState(false);
  const faktura = row.faktura;
  const hostJazyk = jazykZpravy(row);

  async function ares(ico: string): Promise<AresVysledek | null> {
    if (ukazka) return null;
    const json = await posliAkci(row.rezervace, 'faktura-ares', { ico });
    return json.ok ? (json.ares ?? null) : null;
  }

  async function ulozit(vstup: FakturaVstup): Promise<VysledekUlozeni> {
    if (ukazka) {
      onZmena(
        row.rezervace,
        {
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
          dokladVolby: {
            typDokladu: 'faktura',
            zpusobUhrady: 'prevodem',
            odberatel: 'firma',
            bezHosta: false,
            bezEmailu: false,
            bezPoznamky: false,
          },
        },
        { fakturaNeprebirat: false },
      );
      setUprava(false);
      return null;
    }
    const json = await posliAkci(row.rezervace, 'faktura-ulozit', { faktura: vstup });
    if (!json.ok || !json.faktura) return { duvod: 'chyba', text: json.error };
    onZmena(row.rezervace, json.faktura, { fakturaNeprebirat: false });
    setUprava(false);
    return null;
  }

  async function odepnout() {
    if (cekam || !window.confirm('Odepínat firmu z této karty? Doklad půjde znovu až po novém uložení.')) {
      return;
    }
    if (ukazka) {
      onZmena(row.rezervace, null, { fakturaNeprebirat: true });
      return;
    }
    setCekam(true);
    const json = await posliAkci(row.rezervace, 'faktura-smazat');
    setCekam(false);
    if (!json.ok) {
      onHlaska(json.error || 'Nepodařilo se odepínat.');
      return;
    }
    onZmena(row.rezervace, null, { fakturaNeprebirat: true });
  }

  async function pripnoutZMinula() {
    const zMinula = row.stalyHost?.fakturaZMinula;
    if (!zMinula || cekam) return;
    if (ukazka) {
      onZmena(row.rezervace, fakturaProNovyPobyt(zMinula, new Date().toISOString()), {
        fakturaNeprebirat: false,
      });
      onHlaska('Firma z minulého pobytu je připnutá.');
      return;
    }
    setCekam(true);
    const json = await posliAkci(row.rezervace, 'faktura-prebirat', { faktura: zMinula });
    setCekam(false);
    if (!json.ok || !json.faktura) {
      onHlaska(json.error || 'Nepodařilo se připnout firmu.');
      return;
    }
    onZmena(row.rezervace, json.faktura, { fakturaNeprebirat: false });
    onHlaska('Firma z minulého pobytu je připnutá.');
  }

  const firmaZMinula = row.stalyHost?.fakturaZMinula || null;

  if (uprava || !faktura) {
    return (
      <div className="ph-faktura">
        <FakturaZpravaTlacitka
          row={row}
          checkinUrl={checkinUrl}
          userAgent={userAgent}
          onHlaska={onHlaska}
        />
        {!faktura && row.fakturaNeprebirat && firmaZMinula ? (
          <p className="ph-hlaska">
            Firma je na této kartě odepnutá
            {shrnutiFaktury(firmaZMinula) ? ` (${shrnutiFaktury(firmaZMinula)})` : ''}.
          </p>
        ) : null}
        {uprava ? (
          <FakturaFormular
            lang="cs"
            initial={faktura}
            email={row.email.includes('@') ? row.email : ''}
            vychoziTyp={vychoziTypFaktury(hostJazyk)}
            ares={ares}
            onUlozit={ulozit}
            onZrusit={() => setUprava(false)}
          />
        ) : (
          <span className="ph-odjezdy__akce">
            <button type="button" className="ph-ulozit" onClick={() => setUprava(true)}>
              {FAKTURA_MAJITEL.karta_tlacitko}
            </button>
            {!faktura && row.fakturaNeprebirat && firmaZMinula ? (
              <button type="button" className="ph-kopie" disabled={cekam} onClick={() => void pripnoutZMinula()}>
                Připínat firmu z minulosti
              </button>
            ) : null}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="ph-faktura">
      <FakturaZpravaTlacitka
        row={row}
        checkinUrl={checkinUrl}
        userAgent={userAgent}
        onHlaska={onHlaska}
      />
      {maUdajeFirmy(faktura) ? (
        <p className="ph-hlaska">
          Firma je na kartě. Doklad standardně na firmu (účetní e-mail u údajů). Jde přepnout na hosta.
        </p>
      ) : null}
      <FakturaObsah row={row} faktura={faktura} {...spolecne} />
      <span className="ph-odjezdy__akce">
        {faktura.hotovo ? null : (
          <button type="button" className="ph-kopie" onClick={() => setUprava(true)}>
            Upravit
          </button>
        )}
        <button type="button" className="ph-kopie" disabled={cekam} onClick={() => void odepnout()}>
          Odepínat firmu
        </button>
      </span>
    </div>
  );
}
