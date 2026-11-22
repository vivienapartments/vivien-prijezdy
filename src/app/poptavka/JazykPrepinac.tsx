'use client';

import { useEffect, useRef, useState } from 'react';
import {
  doporucitelUiTexty,
  POPTAVKA_JAZYKY,
  vlajkaJazyka,
} from '@/lib/poptavka-doporucitel-ui';
import type { GuideLang } from '@/lib/types';

type Props = {
  lang: GuideLang;
  onLang: (l: GuideLang) => void;
};

const ZKRATKA: Record<GuideLang, string> = {
  cs: 'CS',
  en: 'EN',
  de: 'DE',
  pl: 'PL',
  uk: 'UK',
  'zh-Hant': 'ZH',
  es: 'ES',
  fr: 'FR',
  it: 'IT',
  pt: 'PT',
  sv: 'SV',
  hu: 'HU',
  da: 'DA',
};

export function JazykPrepinac(props: Props) {
  const [otevreno, setOtevreno] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!otevreno) return;
    function mimo(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOtevreno(false);
    }
    document.addEventListener('mousedown', mimo);
    return () => document.removeEventListener('mousedown', mimo);
  }, [otevreno]);

  return (
    <div className="pp__lang" ref={ref}>
      <button
        type="button"
        className="pp__lang-btn"
        aria-haspopup="listbox"
        aria-expanded={otevreno}
        onClick={() => setOtevreno((v) => !v)}
      >
        <span aria-hidden="true">🌐</span>
        <span>{ZKRATKA[props.lang]}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {otevreno ? (
        <ul className="pp__lang-seznam" role="listbox">
          {POPTAVKA_JAZYKY.map((l) => (
            <li key={l}>
              <button
                type="button"
                className={l === props.lang ? 'is-on' : undefined}
                onClick={() => {
                  props.onLang(l);
                  setOtevreno(false);
                }}
              >
                <span aria-hidden="true">{vlajkaJazyka(l)}</span>
                <span>{doporucitelUiTexty(l).nazevJazyka}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
