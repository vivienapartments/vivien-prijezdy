'use client';

import { useState } from 'react';
import {
  optionDrive,
  optionPozde,
  poznamkaDrive,
  skupinaDrive,
  skupinaPozde,
  textStavu,
  vety,
  type OknoPohled,
} from '@/lib/okno-pobytu';
import type { GuideLang } from '@/lib/types';

type Props = {
  lang: GuideLang;
  token: string | null;
  cteni: boolean;
  okno: OknoPohled;
};

const PRAZDNO = '';

export function OknoHosta({ lang, token, cteni, okno }: Props) {
  const t = vety(lang);
  const prijezd = textStavu(lang, 'prijezd', okno.zadostPrijezd);
  const odjezd = textStavu(lang, 'odjezd', okno.zadostOdjezd);
  const [casPrijezd, setCasPrijezd] = useState(PRAZDNO);
  const [casOdjezd, setCasOdjezd] = useState(PRAZDNO);
  const [zeleny, setZeleny] = useState(PRAZDNO);
  const [cekam, setCekam] = useState(false);
  const [hotovo, setHotovo] = useState('');

  async function poslat(tela: {
    casPrijezd?: string;
    casOdjezd?: string;
    od?: string;
    zrusit?: 'prijezd' | 'odjezd' | 'oboji';
  }) {
    if (cteni || !token) {
      setHotovo(t.cekaPrijezd.replaceAll('{cas}', tela.casPrijezd || tela.casOdjezd || ''));
      return;
    }
    setCekam(true);
    try {
      const res = await fetch('/api/pruvodce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, akce: 'okno', ...tela }),
      });
      if (!res.ok) return;
      window.location.reload();
    } finally {
      setCekam(false);
    }
  }

  const muzePoslat = Boolean(casPrijezd || casOdjezd);

  return (
    <>
      {okno.zeleny ? (
        <section className="pv-odjezd pv-okno--zeleny" id="pripraveno" lang={lang}>
          <h2>{t.sekce}</h2>
          <p>{t.zeleny}</p>
          {okno.slotyZelene.length ? (
            <label>
              <select id="pripraveno-cas" value={zeleny} onChange={(e) => setZeleny(e.target.value)}>
                <option value={PRAZDNO}>—</option>
                <optgroup label={skupinaDrive(lang)}>
                  {okno.slotyZelene.map((cas) => (
                    <option key={cas} value={cas}>
                      {optionDrive(cas)}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          ) : null}
          <p className="pv-odjezd__poznamka">{poznamkaDrive(lang)}</p>
          <button type="button" disabled={cekam || !zeleny} onClick={() => void poslat({ casPrijezd: zeleny, od: 'pripraveno' })}>
            {t.pozadat}
          </button>
          {hotovo ? <p>{hotovo}</p> : null}
        </section>
      ) : null}
      {okno.sekcePrijezd || okno.sekceOdjezd ? (
        <section className="pv-odjezd" id="drivejsi" lang={lang}>
          <h2>{t.sekce}</h2>
          <p>{t.cenik}</p>
          {prijezd?.kratce ? <p>{prijezd.kratce}</p> : null}
          {prijezd?.veta ? <p>{prijezd.veta}</p> : null}
          {odjezd?.kratce ? <p>{odjezd.kratce}</p> : null}
          {odjezd?.veta ? <p>{odjezd.veta}</p> : null}
          {okno.zadostPrijezd?.stav === 'ceka' ? (
            <button type="button" disabled={cekam} onClick={() => void poslat({ zrusit: 'prijezd' })}>
              {t.zrusit}
            </button>
          ) : null}
          {okno.zadostOdjezd?.stav === 'ceka' ? (
            <button type="button" disabled={cekam} onClick={() => void poslat({ zrusit: 'odjezd' })}>
              {t.zrusit}
            </button>
          ) : null}
          {okno.sekcePrijezd && okno.zadostPrijezd?.stav !== 'potvrzeno' && okno.zadostPrijezd?.stav !== 'ceka' && okno.slotyPrijezd.length ? (
            <label>
              <select id="drivejsi-cas" value={casPrijezd} onChange={(e) => setCasPrijezd(e.target.value)}>
                <option value={PRAZDNO}>—</option>
                <optgroup label={skupinaDrive(lang)}>
                  {okno.slotyPrijezd.map((cas) => (
                    <option key={cas} value={cas}>
                      {optionDrive(cas)}
                    </option>
                  ))}
                </optgroup>
              </select>
              <span className="pv-odjezd__poznamka">{poznamkaDrive(lang)}</span>
            </label>
          ) : null}
          {okno.sekceOdjezd && okno.zadostOdjezd?.stav !== 'potvrzeno' && okno.zadostOdjezd?.stav !== 'ceka' && okno.slotyOdjezd.length ? (
            <label>
              <select id="pozdejsi" value={casOdjezd} onChange={(e) => setCasOdjezd(e.target.value)}>
                <option value={PRAZDNO}>—</option>
                <optgroup label={skupinaPozde(lang)}>
                  {okno.slotyOdjezd.map((cas) => (
                    <option key={cas} value={cas}>
                      {optionPozde(cas)}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          ) : null}
          {muzePoslat ? (
            <button
              type="button"
              disabled={cekam}
              onClick={() =>
                void poslat({
                  casPrijezd: casPrijezd || undefined,
                  casOdjezd: casOdjezd || undefined,
                })
              }
            >
              {t.odeslat}
            </button>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
