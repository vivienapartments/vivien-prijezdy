'use client';

import { useState } from 'react';
import { denPraha } from '@/lib/brana';
import { casyPozde, popisekOdjezd } from '@/lib/okno-pobytu';
import { jeHodina, slotsOdjezdu, TEXT_ODJEZDU, ukazatRamecekOdjezdu, zobrazCas } from '@/lib/odjezd';
import type { GuideLang } from '@/lib/types';

type Props = {
  lang: GuideLang;
  den: string | null;
  cas: string | null;
  rucni: boolean;
  token: string | null;
  cteni: boolean;
  /** Nejpozdější nabízený čas. Výchozí je 14:00. */
  nejpozdeji?: string;
};

export function OdjezdRamecek({ lang, den, cas, rucni, token, cteni, nejpozdeji = '14:00' }: Props) {
  const [ulozeny, setUlozeny] = useState(jeHodina(cas) ? cas : '');
  const [otevreno, setOtevreno] = useState(!jeHodina(cas));
  const [vyber, setVyber] = useState(jeHodina(cas) ? cas : slotsOdjezdu()[0]);
  const [cekam, setCekam] = useState(false);
  const [chyba, setChyba] = useState('');
  if (!ukazatRamecekOdjezdu(den)) return null;
  const text = TEXT_ODJEZDU[lang] || TEXT_ODJEZDU.en;
  const nadpis = den === denPraha(new Date()) ? text.nadpisDnes : text.nadpisZitra;
  const zamceno = rucni && Boolean(ulozeny);

  async function ulozit() {
    if (cteni || !token) {
      setUlozeny(vyber);
      setOtevreno(false);
      return;
    }
    setCekam(true);
    setChyba('');
    const res = await fetch('/api/pruvodce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, akce: 'odjezd', cas: vyber }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; cas?: string } | null;
    setCekam(false);
    if (!res.ok || !json?.ok) {
      setChyba(text.poznamka);
      return;
    }
    const hotovo = jeHodina(json.cas) ? json.cas : vyber;
    setUlozeny(hotovo);
    setVyber(hotovo);
    setOtevreno(false);
  }

  if (ulozeny && !otevreno) {
    return (
      <div className="pv-odjezd pv-odjezd--radek">
        <p>
          {text.radek} {zobrazCas(ulozeny)}
          {zamceno ? null : (
            <>
              {' · '}
              <button type="button" className="pv-odjezd__zmenit" onClick={() => setOtevreno(true)}>
                {text.zmenit}
              </button>
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <section className="pv-odjezd" lang={lang}>
      <h2>{nadpis}</h2>
      <label>
        <select value={vyber} onChange={(e) => setVyber(e.target.value)}>
          {slotsOdjezdu().map((slot) => (
            <option key={slot} value={slot}>
              {zobrazCas(slot)}
            </option>
          ))}
          {casyPozde(nejpozdeji).map((slot) => (
            <option key={slot} value={slot}>
              {popisekOdjezd(lang, slot)}
            </option>
          ))}
        </select>
        <span className="pv-cenik">
          {casyPozde(nejpozdeji).map((slot) => (
            <button key={slot} type="button" className={vyber === slot ? 'is-on' : ''} onClick={() => setVyber(slot)}>
              {popisekOdjezd(lang, slot)}
            </button>
          ))}
        </span>
      </label>
      <p className="pv-odjezd__poznamka">{text.poznamka}</p>
      <button type="button" disabled={cekam || zamceno} onClick={() => void ulozit()}>
        {text.ulozit}
      </button>
      {chyba ? <p className="pv-odjezd__poznamka">{chyba}</p> : null}
    </section>
  );
}
