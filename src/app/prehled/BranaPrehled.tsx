'use client';

import { useState } from 'react';
import { apartmanPozice, denKonce, jeVolna, jmenoNaPozici, prazdnaBrana, stavParkovani, textKonce, type BranaSlot, type NahledBrany } from '@/lib/brana';
import type { PrehledRadek } from '@/lib/prehled';
import { textTelefonu } from '@/lib/telefon';

type RadkaProps = {
  row: PrehledRadek;
  sloty: BranaSlot[];
  pripravena: boolean;
  potvrzena: boolean;
  ukazka: boolean;
  cekam: boolean;
  onSloty: (sloty: BranaSlot[]) => void;
  onHlaska: (text: string) => void;
};

function hostZ(row: PrehledRadek) {
  return {
    rezervace: row.rezervace,
    apartman: row.apartman,
    prijezd: row.prijezd,
    odjezd: row.odjezd,
    zpusob: row.zpusobPrijezdu,
    telefonBrana: row.telefonBrana,
    branaRegistrovano: row.branaRegistrovano,
    zruseno: row.stav === 'zruseno',
  };
}

export function ParkovaniRadek({ row, sloty, pripravena, potvrzena, ukazka, cekam, onSloty, onHlaska }: RadkaProps) {
  const [sms, setSms] = useState('');
  const [druhe, setDruhe] = useState('');
  const [dotaz, setDotaz] = useState(false);
  const [nahled, setNahled] = useState<NahledBrany | null>(null);
  const [nahledDruhe, setNahledDruhe] = useState<string | undefined>(undefined);
  const [odpoved, setOdpoved] = useState('');
  const [chybaOdpovedi, setChybaOdpovedi] = useState('');
  const stav = stavParkovani(hostZ(row), sloty, new Date());

  async function zavolej(akce: string, extra?: { druhe?: string; odpoved?: string }) {
    if (ukazka) {
      onHlaska('V náhledu se SMS neotevře.');
      return null;
    }
    onHlaska('');
    const res = await fetch('/api/prehled/brana', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        akce,
        rezervace: row.rezervace,
        pozice: nahled?.pozice ?? stav.pozice ?? undefined,
        druhe: extra?.druhe,
        odpoved: extra?.odpoved,
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      odkaz?: string;
      text?: string;
      sloty?: BranaSlot[];
      nahled?: NahledBrany;
    } | null;
    if (!res.ok || !json?.ok) {
      const hlaska = json?.error || 'Bránu se nepodařilo připravit.';
      if (akce === 'odpoved') setChybaOdpovedi(hlaska);
      else onHlaska(hlaska);
      return null;
    }
    if (json.sloty) onSloty(json.sloty);
    return json;
  }

  async function ukazNahled(druh: 'zapis' | 'zneplatnit', extra?: { druhe?: string }) {
    setChybaOdpovedi('');
    if (ukazka) {
      onHlaska('V náhledu se SMS neotevře.');
      return;
    }
    const json = await zavolej(druh === 'zneplatnit' ? 'nahled-zneplatnit' : 'nahled', extra);
    if (json?.nahled) {
      setNahled(json.nahled);
      setNahledDruhe(extra?.druhe);
    }
  }

  async function otevriSms(extra?: { druhe?: string }) {
    const json = await zavolej(nahled?.druh === 'zneplatnit' ? 'zneplatnit' : 'sms', extra);
    if (json?.odkaz) {
      setSms(json.text || '');
      setNahled(null);
      window.location.href = json.odkaz;
    }
  }

  async function kopirovat() {
    if (!sms) return;
    try {
      await navigator.clipboard.writeText(sms);
      onHlaska('SMS je ve schránce. Heslo je jen v ní.');
    } catch {
      onHlaska('SMS se nepodařilo zkopírovat.');
    }
  }

  const smsAkce = stav.akce === 'registrovat' || stav.akce === 'upravit';
  const muzeZneplatnit = stav.ton === 'zelena' && stav.pozice != null && stav.akce === 'nic';

  return (
    <div className={`ph-parkovani ph-parkovani--${stav.ton}`}>
      <div>{stav.text}</div>
      {stav.tlacitko ? (
        <button
          type="button"
          disabled={cekam || stav.neaktivni || (smsAkce && !ukazka && (!potvrzena || !pripravena))}
          onClick={() => {
            if (stav.akce === 'potvrdit') void zavolej('potvrdit');
            else void ukazNahled('zapis');
          }}
        >
          {stav.tlacitko}
        </button>
      ) : null}
      {nahled ? (
        <div className="ph-parkovani__dotaz">
          {nahled.druh === 'zneplatnit' ? (
            <p>
              Pozice {nahled.pozice}: v bráně nastavíme konec na teď, {nahled.konec}.
            </p>
          ) : (
            <p>
              Pozice {nahled.pozice}: zapíšeme <span className="ph-tel">{nahled.telefon}</span> do {nahled.konec}.
              {nahled.staryTelefon ? (
                <>
                  {' '}
                  Teď tam je <span className="ph-tel">{nahled.staryTelefon}</span> do {nahled.staryKonec}.
                </>
              ) : null}
            </p>
          )}
          <button type="button" disabled={cekam} onClick={() => void otevriSms(nahledDruhe ? { druhe: nahledDruhe } : undefined)}>
            Otevřít SMS
          </button>
          <button type="button" onClick={() => setNahled(null)}>
            Nechat
          </button>
        </div>
      ) : null}
      {sms ? (
        <button type="button" onClick={() => void kopirovat()}>
          Zkopírovat SMS
        </button>
      ) : null}
      {smsAkce && !potvrzena && !ukazka ? (
        <div className="ph-parkovani__poznamka">Nejdřív dole potvrďte, že stav brány souhlasí.</div>
      ) : null}
      {smsAkce && potvrzena && !pripravena && !ukazka ? (
        <div className="ph-parkovani__poznamka">Doplňte BRANA_HESLO a BRANA_CISLO.</div>
      ) : null}
      {stav.zrusit ? (
        dotaz ? (
          <div className="ph-parkovani__dotaz">
            Brána o tom neví, číslo v ní platí dál do {textKonce(sloty.find((s) => s.pozice === stav.pozice)?.konec || null)}.
            <button type="button" disabled={cekam} onClick={() => void zavolej('zrusit').then(() => setDotaz(false))}>
              Zrušit parkování
            </button>
            <button type="button" onClick={() => setDotaz(false)}>
              Nechat
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setDotaz(true)}>
            Zrušit parkování
          </button>
        )
      ) : null}
      {stav.akce === 'potvrdit' ? (
        <label className="ph-parkovani__druhe">
          Vložit odpověď brány
          <span>
            <input value={odpoved} onChange={(e) => setOdpoved(e.target.value)} autoComplete="off" />
            <button
              type="button"
              disabled={cekam || !odpoved.trim()}
              onClick={() => {
                void zavolej('odpoved', { odpoved }).then((json) => {
                  if (json) setOdpoved('');
                });
              }}
            >
              Porovnat
            </button>
          </span>
          {chybaOdpovedi ? <span className="ph-parkovani__chyba">{chybaOdpovedi}</span> : null}
        </label>
      ) : null}
      {muzeZneplatnit ? (
        <button type="button" disabled={cekam} onClick={() => void ukazNahled('zneplatnit')}>
          Zneplatnit v bráně
        </button>
      ) : null}
      {stav.druhe ? (
        <label className="ph-parkovani__druhe">
          Druhé číslo
          <span>
            <input value={druhe} onChange={(e) => setDruhe(e.target.value)} inputMode="tel" autoComplete="off" />
            <button type="button" disabled={cekam || !druhe.trim()} onClick={() => void ukazNahled('zapis', { druhe })}>
              Přidat na další pozici
            </button>
          </span>
        </label>
      ) : null}
    </div>
  );
}

type TabulkaProps = {
  sloty: BranaSlot[];
  radky: PrehledRadek[];
  ukazka: boolean;
  potvrzena: boolean;
  onPotvrzeno: () => void;
  onSloty: (sloty: BranaSlot[]) => void;
  onHost: (id: string) => void;
  onHlaska: (text: string) => void;
};

type RadekUlozeni = { pozice: number; telefon: string; konec: string; rezervace: string; uvolnit: boolean };

export function BranaTabulka({ sloty, radky, ukazka, potvrzena, onPotvrzeno, onSloty, onHost, onHlaska }: TabulkaProps) {
  const [uprava, setUprava] = useState<number | null>(null);
  const [telefon, setTelefon] = useState('');
  const [konec, setKonec] = useState('');
  const [host, setHost] = useState('');
  const [dotaz, setDotaz] = useState('');
  const prazdne = sloty.every((s) => !s.telefon && s.stav === 'prazdna');
  const now = new Date();

  function stavRadku(slot: BranaSlot): { text: string; ton: string } {
    if (jeVolna(slot, now) && (slot.telefon || slot.konec)) return { text: 'vypršelo', ton: 'seda' };
    if (jeVolna(slot, now)) return { text: 'prázdné', ton: 'seda' };
    if (slot.stav === 'ceka') return { text: 'čeká na potvrzení', ton: 'oranzova' };
    return { text: 'platí', ton: 'zelena' };
  }

  async function uloz(kUlozeni: RadekUlozeni[]) {
    if (ukazka) {
      onHlaska('V náhledu se stav brány neukládá.');
      return;
    }
    const res = await fetch('/api/prehled/brana', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce: 'ulozit', radky: kUlozeni }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; sloty?: BranaSlot[] } | null;
    if (!res.ok || !json?.ok || !json.sloty) {
      onHlaska(json?.error || 'Stav brány se neuložil.');
      return;
    }
    onSloty(json.sloty);
    onHlaska('Stav brány je uložený. Bráně se nic neposlalo.');
    setUprava(null);
    setDotaz('');
  }

  return (
    <section className="ph-brana-sekce" id="brana">
      <h2>Brána parkoviště</h2>
      {potvrzena ? null : (
        <div className="ph-brana-souhlas">
          <p>Registrace je zavřená, dokud tenhle stav nepotvrdíte.</p>
          <button
            type="button"
            onClick={() => {
              if (ukazka) {
                onHlaska('V náhledu se stav brány neukládá.');
                return;
              }
              void fetch('/api/prehled/brana', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ akce: 'souhlas' }),
              })
                .then(async (res) => {
                  const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
                  if (!res.ok || !json?.ok) {
                    onHlaska(json?.error || 'Stav brány se nepotvrdil.');
                    return;
                  }
                  onPotvrzeno();
                  onHlaska('Stav brány je potvrzený. Teď jde registrace.');
                })
                .catch(() => onHlaska('Stav brány se nepotvrdil.'));
            }}
          >
            Stav brány souhlasí
          </button>
        </div>
      )}
      <div className="ph-brana-tabulka">
        {sloty.map((slot) => {
          const stav = stavRadku(slot);
          const apt = radky.find((r) => r.rezervace === slot.rezervace)?.apartman || apartmanPozice(slot.pozice);
          const konecText = textKonce(slot.konec);
          return (
            <div key={slot.pozice} className="ph-brana-radek">
              <div className="ph-brana-radek__hlava">
                <span>{slot.pozice}</span>
                <span>{apt || ''}</span>
                <span className={`ph-brana-stav ph-brana-stav--${stav.ton}`}>{stav.text}</span>
              </div>
              {slot.rezervace ? (
                <button type="button" className="ph-brana-host" onClick={() => onHost(slot.rezervace || '')}>
                  {jmenoNaPozici(slot, radky)}
                </button>
              ) : null}
              {slot.telefon ? <div className="ph-tel">{textTelefonu(slot.telefon)}</div> : null}
              {konecText ? <div>do {konecText}</div> : null}
              <button
                type="button"
                onClick={() => {
                  setUprava(slot.pozice);
                  setTelefon(slot.telefon || '');
                  setKonec(denKonce(slot.konec));
                  setHost(slot.rezervace || '');
                  setDotaz('');
                }}
              >
                Upravit
              </button>
              {uprava === slot.pozice ? (
                <div className="ph-brana-uprava">
                  <label>
                    Telefon
                    <input value={telefon} onChange={(e) => setTelefon(e.target.value)} inputMode="tel" />
                  </label>
                  <label>
                    Konec
                    <input value={konec} onChange={(e) => setKonec(e.target.value)} placeholder="2026-10-18" />
                  </label>
                  <label>
                    Rezervace
                    <input value={host} onChange={(e) => setHost(e.target.value)} />
                  </label>
                  {dotaz === `rucne-${slot.pozice}` ? (
                    <p>
                      Uložit opravu pozice {slot.pozice}? Bráně se nic nepošle.
                      <button type="button" onClick={() => void uloz([{ pozice: slot.pozice, telefon, konec, rezervace: host, uvolnit: false }])}>
                        Uložit
                      </button>
                      <button type="button" onClick={() => setDotaz('')}>
                        Nechat
                      </button>
                    </p>
                  ) : (
                    <button type="button" onClick={() => setDotaz(`rucne-${slot.pozice}`)}>
                      Uložit opravu
                    </button>
                  )}
                  {dotaz === `volno-${slot.pozice}` ? (
                    <p>
                      Uvolnit pozici {slot.pozice} v přehledu? V bráně číslo zůstane až do konce. Mazací příkaz se neposílá.
                      <button type="button" onClick={() => void uloz([{ pozice: slot.pozice, telefon: '', konec: '', rezervace: '', uvolnit: true }])}>
                        Uvolnit
                      </button>
                      <button type="button" onClick={() => setDotaz('')}>
                        Nechat
                      </button>
                    </p>
                  ) : (
                    <button type="button" onClick={() => setDotaz(`volno-${slot.pozice}`)}>
                      Uvolnit v přehledu
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {prazdne ? <NastaveniBrany onUloz={uloz} /> : null}
    </section>
  );
}

function NastaveniBrany({ onUloz }: { onUloz: (radky: RadekUlozeni[]) => Promise<void> }) {
  const [radky, setRadky] = useState(() => prazdnaBrana().map((s) => ({ pozice: s.pozice, telefon: '', konec: '', rezervace: '' })));
  const [dotaz, setDotaz] = useState(false);
  return (
    <form
      className="ph-brana-nastaveni"
      onSubmit={(e) => {
        e.preventDefault();
        setDotaz(true);
      }}
    >
      <h3>Nastavit stav brány</h3>
      <p>Jednou přepište dnešních 20 pozic. Bráně se nic nepošle.</p>
      {radky.map((r, i) => (
        <div key={r.pozice} className="ph-brana-nastaveni__radek">
          <span>{r.pozice}</span>
          <input
            aria-label={`Telefon ${r.pozice}`}
            value={r.telefon}
            onChange={(e) => setRadky((prev) => prev.map((x, n) => (n === i ? { ...x, telefon: e.target.value } : x)))}
          />
          <input
            aria-label={`Konec ${r.pozice}`}
            placeholder="2026-10-18"
            value={r.konec}
            onChange={(e) => setRadky((prev) => prev.map((x, n) => (n === i ? { ...x, konec: e.target.value } : x)))}
          />
          <input
            aria-label={`Host ${r.pozice}`}
            placeholder="rezervace"
            value={r.rezervace}
            onChange={(e) => setRadky((prev) => prev.map((x, n) => (n === i ? { ...x, rezervace: e.target.value } : x)))}
          />
        </div>
      ))}
      {dotaz ? (
        <p>
          Uložit těchto 20 pozic do přehledu? Bráně se nic nepošle.
          <button type="button" onClick={() => void onUloz(radky.map((r) => ({ ...r, uvolnit: !r.telefon.trim() })))}>
            Uložit
          </button>
          <button type="button" onClick={() => setDotaz(false)}>
            Nechat
          </button>
        </p>
      ) : (
        <button type="submit">Uložit stav brány</button>
      )}
    </form>
  );
}
