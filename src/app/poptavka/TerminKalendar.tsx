'use client';

import { useMemo, useState } from 'react';
import { formatDatumPoptavky } from '@/lib/poptavka-texty';
import type { GuideLang } from '@/lib/types';

function parseYmd(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Pondělí = 0 … Neděle = 6 */
function weekdayMon0(d: Date): number {
  return (d.getDay() + 6) % 7;
}

const DNY: Record<string, string[]> = {
  cs: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
};

function dnyLang(lang: GuideLang): string[] {
  return DNY[lang] || DNY.en;
}

const MESIC: Record<string, Intl.DateTimeFormat> = {};

function nazevMesice(d: Date, lang: GuideLang): string {
  const key = lang === 'zh-Hant' ? 'zh-Hant' : lang;
  if (!MESIC[key]) {
    MESIC[key] = new Intl.DateTimeFormat(key, { month: 'long', year: 'numeric' });
  }
  return MESIC[key].format(d);
}

type Props = {
  label: string;
  value: string;
  min: string;
  lang: GuideLang;
  zavritLabel: string;
  onChange: (ymd: string) => void;
};

export function TerminPole({ label, value, min, lang, zavritLabel, onChange }: Props) {
  const [otevreno, setOtevreno] = useState(false);
  const minDate = parseYmd(min) || new Date();
  const selected = parseYmd(value);
  const [kurz, setKurz] = useState(() => startOfMonth(selected || minDate));

  function otevri() {
    setKurz(startOfMonth(selected || minDate));
    setOtevreno(true);
  }

  const bunky = useMemo(() => {
    const first = startOfMonth(kurz);
    const pad = weekdayMon0(first);
    const daysInMonth = new Date(kurz.getFullYear(), kurz.getMonth() + 1, 0).getDate();
    const cells: ({ ymd: string; day: number; disabled: boolean } | null)[] = [];
    for (let i = 0; i < pad; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(kurz.getFullYear(), kurz.getMonth(), day);
      const ymd = toYmd(d);
      const disabled = ymd < min;
      cells.push({ ymd, day, disabled });
    }
    return cells;
  }, [kurz, min]);

  const text = value ? formatDatumPoptavky(value, lang) : '—';

  return (
    <label className="pp__termin-pole">
      {label}
      <button type="button" className="pp__termin-tlacitko" onClick={otevri}>
        {text}
      </button>
      {otevreno ? (
        <div className="pp__kalendar" role="dialog" aria-modal="true" aria-label={label}>
          <div className="pp__kalendar-vnitr">
            <div className="pp__kalendar-hlavicka">
              <button
                type="button"
                className="pp__chip"
                onClick={() => setKurz((k) => addMonths(k, -1))}
                aria-label="←"
              >
                ←
              </button>
              <span className="pp__kalendar-mesic">{nazevMesice(kurz, lang)}</span>
              <button
                type="button"
                className="pp__chip"
                onClick={() => setKurz((k) => addMonths(k, 1))}
                aria-label="→"
              >
                →
              </button>
            </div>
            <div className="pp__kalendar-dny">
              {dnyLang(lang).map((d) => (
                <span key={d} className="pp__kalendar-den-nazev">
                  {d}
                </span>
              ))}
              {bunky.map((c, i) =>
                c ? (
                  <button
                    key={c.ymd}
                    type="button"
                    className={`pp__kalendar-den${c.ymd === value ? ' is-on' : ''}${c.disabled ? ' is-off' : ''}`}
                    disabled={c.disabled}
                    onClick={() => {
                      onChange(c.ymd);
                      setOtevreno(false);
                    }}
                  >
                    {c.day}
                  </button>
                ) : (
                  <span key={`e-${i}`} className="pp__kalendar-den is-empty" />
                ),
              )}
            </div>
            <button type="button" className="pp__btn pp__btn--sms" onClick={() => setOtevreno(false)}>
              {zavritLabel}
            </button>
          </div>
        </div>
      ) : null}
    </label>
  );
}
