'use client';

import { useMemo, useState } from 'react';
import type { CountryCode } from 'libphonenumber-js';
import type { GuideLang } from '@/lib/types';
import {
  formatujCisloProZobrazeni,
  jePlatnyTelefon,
  naE164,
  placeholderCisla,
  predvolbaProJazyk,
  rozeberVlozene,
  seznamPredvoleb,
  type TelefonPredvolba,
} from '@/lib/poptavka-telefon';

type Props = {
  lang: GuideLang;
  label: string;
  chybaText: string;
  onChangeE164: (e164: string) => void;
  ukazujeChybu: boolean;
  onBlurValidace: () => void;
};

export function TelefonPole(props: Props) {
  const vse = useMemo(() => seznamPredvoleb(), []);
  const [iso, setIso] = useState<CountryCode>(() => predvolbaProJazyk(props.lang));
  const [narodni, setNarodni] = useState('');
  const [otevreno, setOtevreno] = useState(false);
  const [hledani, setHledani] = useState('');

  const aktualni: TelefonPredvolba =
    vse.find((x) => x.iso === iso) ||
    ({ iso, dial: '+420', vlajka: '🇨🇿', nazev: 'Česko' } as TelefonPredvolba);

  const filtrovane = useMemo(() => {
    const q = hledani.trim().toLowerCase();
    if (!q) return vse;
    return vse.filter(
      (x) =>
        x.nazev.toLowerCase().includes(q) ||
        x.dial.includes(q) ||
        x.iso.toLowerCase().includes(q),
    );
  }, [vse, hledani]);

  function syncE164(fmt: string, zeme: CountryCode) {
    props.onChangeE164(naE164(fmt, zeme) || '');
  }

  return (
    <label className="pp__telefon">
      {props.label}
      <div className="pp__telefon-radek">
        <button
          type="button"
          className="pp__telefon-predvolba"
          aria-haspopup="listbox"
          aria-expanded={otevreno}
          onClick={() => setOtevreno((v) => !v)}
        >
          <span aria-hidden="true">{aktualni.vlajka}</span>
          <span>{aktualni.dial}</span>
          <span aria-hidden="true">▾</span>
        </button>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className="pp__telefon-cislo"
          placeholder={placeholderCisla(iso)}
          value={narodni}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw.trim().startsWith('+') || raw.trim().startsWith('00')) {
              const roz = rozeberVlozene(raw, iso);
              setIso(roz.iso);
              setNarodni(roz.narodni);
              syncE164(roz.narodni, roz.iso);
              return;
            }
            const fmt = formatujCisloProZobrazeni(raw, iso);
            setNarodni(fmt);
            syncE164(fmt, iso);
          }}
          onBlur={() => props.onBlurValidace()}
        />
      </div>
      {otevreno ? (
        <div className="pp__telefon-seznam" role="listbox">
          <input
            type="search"
            className="pp__telefon-hledani"
            placeholder="…"
            value={hledani}
            onChange={(e) => setHledani(e.target.value)}
            autoFocus
          />
          <ul>
            {filtrovane.map((x) => (
              <li key={x.iso}>
                <button
                  type="button"
                  className={x.iso === iso ? 'is-on' : undefined}
                  onClick={() => {
                    setIso(x.iso);
                    setOtevreno(false);
                    setHledani('');
                    const fmt = formatujCisloProZobrazeni(narodni, x.iso);
                    setNarodni(fmt);
                    syncE164(fmt, x.iso);
                  }}
                >
                  <span aria-hidden="true">{x.vlajka}</span>
                  <span>{x.nazev}</span>
                  <span>{x.dial}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {props.ukazujeChybu && narodni.trim() !== '' && !jePlatnyTelefon(narodni, iso) ? (
        <p className="pp__chyba pp__telefon-chyba">{props.chybaText}</p>
      ) : null}
      {props.ukazujeChybu && narodni.trim() === '' ? (
        <p className="pp__chyba pp__telefon-chyba">{props.chybaText}</p>
      ) : null}
    </label>
  );
}
