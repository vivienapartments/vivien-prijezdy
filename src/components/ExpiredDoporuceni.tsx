'use client';

import { useCallback, useEffect, useState } from 'react';
import { doporuceniTexty } from '@/lib/doporuceni-texty';
import type { GuideLang } from '@/lib/types';

const BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '')) ||
  'https://vivien-prijezdy-six.vercel.app';

export function ExpiredDoporuceni({ lang, token }: { lang: GuideLang; token: string }) {
  const t = doporuceniTexty(lang);
  const [kod, setKod] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [cekam, setCekam] = useState(false);

  useEffect(() => {
    if (token === 'nahled') {
      setKod('zkouska');
      return;
    }
    let zruseno = false;
    (async () => {
      try {
        const res = await fetch(`/api/doporuceni/kod?token=${encodeURIComponent(token)}`);
        const json = (await res.json()) as { ok?: boolean; kod?: string };
        if (!zruseno && json.ok && json.kod) setKod(json.kod);
      } catch {
        /* bez kódu tlačítko nefunguje */
      }
    })();
    return () => {
      zruseno = true;
    };
  }, [token]);

  const poslat = useCallback(async () => {
    if (!kod || cekam) return;
    setCekam(true);
    setHlaska(null);
    const url = `${BASE}/poptavka?od=${encodeURIComponent(kod)}&lang=${encodeURIComponent(lang)}`;
    const text = t.zprava;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({ text, url });
          setCekam(false);
          return;
        } catch (err) {
          const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : '';
          if (name === 'AbortError') {
            setCekam(false);
            return;
          }
        }
      }
      const cele = `${text} ${url}`;
      await navigator.clipboard.writeText(cele);
      setHlaska(t.zkopirovano);
    } catch {
      setHlaska(t.zkopirovano);
    } finally {
      setCekam(false);
    }
  }, [kod, cekam, lang, t.zprava, t.zkopirovano]);

  return (
    <div className="pv-expired__celek pv-expired__celek--blizci">
      <p className="pv-expired__nad-male">{t.nadBlizci}</p>
      <p className="pv-expired__otazka">{t.otazka}</p>
      <p className="pv-expired__veta">{t.veta1}</p>
      <button
        type="button"
        className="pv-expired__cta pv-expired__cta--obrys"
        onClick={poslat}
        disabled={!kod || cekam}
      >
        {t.tlacitko}
      </button>
      {hlaska ? <p className="pv-expired__zkopirovano">{hlaska}</p> : null}
    </div>
  );
}
