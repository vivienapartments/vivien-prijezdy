'use client';

import { useState } from 'react';
import { denPraha } from '@/lib/brana';
import { casyPozde, optionPozde, posunDen, skupinaOdjezd, skupinaPozde } from '@/lib/okno-pobytu';
import { CHECKOUT } from '@/lib/constants';
import { jeHodina, slotsOdjezdu, TEXT_ODJEZDU, ukazatRamecekOdjezdu, zobrazCas } from '@/lib/odjezd';
import type { GuideLang } from '@/lib/types';

type Props = {
  lang: GuideLang;
  den: string | null;
  cas: string | null;
  rucni: boolean;
  token: string | null;
  cteni: boolean;
  /** Po předání je volba odjezdu po celý pobyt. */
  ubytovan?: boolean;
  /** Nejpozdější nabízený čas. Výchozí je 14:00. */
  nejpozdeji?: string;
};

export function OdjezdRamecek({
  lang,
  den,
  cas,
  rucni,
  token,
  cteni,
  ubytovan = false,
  nejpozdeji = '14:00',
}: Props) {
  const bezne = slotsOdjezdu();
  const pozde = casyPozde(nejpozdeji);
  const [ulozeny, setUlozeny] = useState(jeHodina(cas) ? cas : '');
  const [otevreno, setOtevreno] = useState(!jeHodina(cas));
  /** Bez volby je standardní check-out 10:00. Nic placeného se nepředvolí. */
  const [vyber, setVyber] = useState(jeHodina(cas) ? cas : CHECKOUT);
  const [cekam, setCekam] = useState(false);
  const [chyba, setChyba] = useState('');
  if (!ukazatRamecekOdjezdu(den, new Date(), ubytovan)) return null;
  const text = TEXT_ODJEZDU[lang] || TEXT_ODJEZDU.en;
  const dnes = denPraha(new Date());
  const nadpis =
    den === dnes ? text.nadpisDnes : den === posunDen(dnes, 1) ? text.nadpisZitra : text.nadpisJindy;
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
          <optgroup label={skupinaOdjezd(lang)}>
            {bezne.map((slot) => (
              <option key={slot} value={slot}>
                {zobrazCas(slot)}
              </option>
            ))}
          </optgroup>
          {pozde.length ? (
            <optgroup label={skupinaPozde(lang)}>
              {pozde.map((slot) => (
                <option key={slot} value={slot}>
                  {optionPozde(slot)}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </label>
      <p className="pv-odjezd__poznamka">{text.poznamka}</p>
      <button type="button" disabled={cekam || zamceno} onClick={() => void ulozit()}>
        {text.ulozit}
      </button>
      {chyba ? <p className="pv-odjezd__poznamka">{chyba}</p> : null}
    </section>
  );
}
