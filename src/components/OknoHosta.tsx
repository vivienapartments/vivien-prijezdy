'use client';

import { useState } from 'react';
import { popisekDrive, popisekOdjezd, textStavu, vety, type OknoPohled } from '@/lib/okno-pobytu';
import type { GuideLang } from '@/lib/types';

type Props = {
  lang: GuideLang;
  token: string | null;
  cteni: boolean;
  okno: OknoPohled;
};

export function OknoHosta({ lang, token, cteni, okno }: Props) {
  const t = vety(lang);
  const prijezd = textStavu(lang, 'prijezd', okno.zadostPrijezd);
  const odjezd = textStavu(lang, 'odjezd', okno.zadostOdjezd);
  const [casPrijezd, setCasPrijezd] = useState(okno.slotyPrijezd[0] || '');
  const [casOdjezd, setCasOdjezd] = useState(okno.slotyOdjezd[0] || '');
  const [zeleny, setZeleny] = useState(okno.slotyZelene[0] || '');
  const [cekam, setCekam] = useState(false);
  const [hotovo, setHotovo] = useState('');

  async function poslat(tela: { casPrijezd?: string; casOdjezd?: string; od?: string }) {
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

  return (
    <>
      {okno.zeleny ? (
        <section className="pv-odjezd pv-okno--zeleny" id="pripraveno" lang={lang}>
          <h2>{t.sekce}</h2>
          <p>{t.zeleny}</p>
          <span className="pv-cenik">
            {okno.slotyZelene.map((cas) => (
              <button key={cas} type="button" className={zeleny === cas ? 'is-on' : ''} onClick={() => setZeleny(cas)}>
                {popisekDrive(lang, cas)}
              </button>
            ))}
          </span>
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
          {okno.sekcePrijezd && okno.zadostPrijezd?.stav !== 'potvrzeno' ? (
            <label>
              <span className="pv-cenik" id="drivejsi-cas">
                {okno.slotyPrijezd.map((cas) => (
                  <button key={cas} type="button" className={casPrijezd === cas ? 'is-on' : ''} onClick={() => setCasPrijezd(cas)}>
                    {popisekDrive(lang, cas)}
                  </button>
                ))}
              </span>
            </label>
          ) : null}
          {okno.sekceOdjezd && okno.zadostOdjezd?.stav !== 'potvrzeno' ? (
            <label>
              <span className="pv-cenik" id="pozdejsi">
                {okno.slotyOdjezd.map((cas) => (
                  <button key={cas} type="button" className={casOdjezd === cas ? 'is-on' : ''} onClick={() => setCasOdjezd(cas)}>
                    {popisekOdjezd(lang, cas)}
                  </button>
                ))}
              </span>
            </label>
          ) : null}
          <button
            type="button"
            disabled={cekam}
            onClick={() =>
              void poslat({
                casPrijezd: okno.sekcePrijezd ? casPrijezd : undefined,
                casOdjezd: okno.sekceOdjezd ? casOdjezd : undefined,
              })
            }
          >
            {t.odeslat}
          </button>
        </section>
      ) : null}
    </>
  );
}
