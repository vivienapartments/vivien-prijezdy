'use client';

import { useState } from 'react';
import { PARKING_OWNER_PHONE } from '@/lib/constants';
import { popisekDrive, popisekOdjezd, vety, type ObjednatNahled } from '@/lib/okno-pobytu';
import { GUIDE_LANGS, LANG_LABELS, type GuideLang } from '@/lib/types';

type Odpoved =
  | { ok: true; nahled: ObjednatNahled }
  | { ok: false; duvod: 'chybi' | 'nesedi' | 'blok'; veta: string };

const TELEFON = PARKING_OWNER_PHONE;

export function ObjednatForm({ vychozi }: { vychozi: GuideLang }) {
  const [lang, setLang] = useState<GuideLang>(vychozi);
  const [rezervace, setRezervace] = useState('');
  const [prijmeni, setPrijmeni] = useState('');
  const [nahled, setNahled] = useState<ObjednatNahled | null>(null);
  const [chyba, setChyba] = useState<Odpoved | null>(null);
  const [casPrijezd, setCasPrijezd] = useState('');
  const [casOdjezd, setCasOdjezd] = useState('');
  const [cekam, setCekam] = useState(false);
  const t = vety(lang);

  async function poslat(navic: Record<string, string | boolean> = {}) {
    setCekam(true);
    setChyba(null);
    try {
      const res = await fetch('/api/objednat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace, prijmeni, lang, ...navic }),
      });
      const json = (await res.json()) as Odpoved;
      if (!json.ok) {
        setNahled(null);
        setChyba(json);
        return;
      }
      setNahled(json.nahled);
      setCasPrijezd('');
      setCasOdjezd('');
    } finally {
      setCekam(false);
    }
  }

  const stav = (kod: ObjednatNahled['prijezd']) =>
    kod === 'ceka' ? t.stavCeka : kod === 'potvrzeno' ? t.stavPotvrzeno : kod === 'nelze' ? t.stavNelze : '';

  return (
    <main className="obj" lang={lang}>
      <label className="obj-jazyk">
        <select value={lang} onChange={(e) => setLang(e.target.value as GuideLang)}>
          {GUIDE_LANGS.map((id) => (
            <option key={id} value={id}>
              {LANG_LABELS[id]}
            </option>
          ))}
        </select>
      </label>
      <h1>{t.sekce}</h1>
      <p>{t.cenik}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void poslat();
        }}
      >
        <label>
          {lang === 'cs' ? 'Číslo rezervace' : 'Reservation number'}
          <input value={rezervace} onChange={(e) => setRezervace(e.target.value)} inputMode="numeric" autoComplete="off" />
        </label>
        <label>
          {lang === 'cs' ? 'Příjmení' : 'Surname'}
          <input value={prijmeni} onChange={(e) => setPrijmeni(e.target.value)} autoComplete="family-name" />
        </label>
        <button type="submit" disabled={cekam}>
          {lang === 'cs' ? 'Pokračovat' : 'Continue'}
        </button>
      </form>
      {chyba && !chyba.ok && chyba.duvod === 'chybi' ? (
        <p>
          {chyba.veta}{' '}
          <a href={`tel:${TELEFON.replace(/\s/g, '')}`} style={{ whiteSpace: 'nowrap' }}>
            {TELEFON.replace(/ /g, '\u00a0')}
          </a>
          .
        </p>
      ) : null}
      {chyba && !chyba.ok && chyba.duvod !== 'chybi' ? <p>{chyba.veta}</p> : null}
      {nahled ? (
        <section>
          <h2>{nahled.apartman}</h2>
          <p>{nahled.termin}</p>
          <p>
            {nahled.casPrijezdu}
            {stav(nahled.prijezd) ? ` · ${stav(nahled.prijezd)}` : ''}
          </p>
          <p>
            {nahled.casOdjezdu}
            {stav(nahled.odjezd) ? ` · ${stav(nahled.odjezd)}` : ''}
          </p>
          {nahled.muzeMenitPrijezd ? (
            <span className="pv-cenik">
              {nahled.slotyPrijezd.map((cas) => (
                <button key={cas} type="button" className={casPrijezd === cas ? 'is-on' : ''} onClick={() => setCasPrijezd(cas)}>
                  {popisekDrive(lang, cas)}
                </button>
              ))}
            </span>
          ) : null}
          {nahled.muzeMenitOdjezd ? (
            <span className="pv-cenik">
              {nahled.slotyOdjezd.map((cas) => (
                <button key={cas} type="button" className={casOdjezd === cas ? 'is-on' : ''} onClick={() => setCasOdjezd(cas)}>
                  {popisekOdjezd(lang, cas)}
                </button>
              ))}
            </span>
          ) : null}
          {nahled.muzeMenitPrijezd || nahled.muzeMenitOdjezd ? (
            <button
              type="button"
              disabled={cekam || (!casPrijezd && !casOdjezd)}
              onClick={() => void poslat({ prijezd: casPrijezd, odjezd: casOdjezd })}
            >
              {t.odeslat}
            </button>
          ) : null}
          {nahled.prijezd === 'ceka' ? (
            <button type="button" disabled={cekam} onClick={() => void poslat({ zrusitPrijezd: true })}>
              {t.zrusit}
            </button>
          ) : null}
          {nahled.odjezd === 'ceka' ? (
            <button type="button" disabled={cekam} onClick={() => void poslat({ zrusitOdjezd: true })}>
              {t.zrusit}
            </button>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
