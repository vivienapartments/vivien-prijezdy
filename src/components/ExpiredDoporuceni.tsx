'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  blizciEmail,
  blizciKopie,
  blizciNadpis,
  blizciPodrobnosti,
  blizciPrikladRadek1,
  blizciPrikladRadek2,
  blizciPrikladRadek3,
  blizciPrikladRadek4,
  blizciText,
  blizciWhatsapp,
  blizciZkopirovano,
  tipChybaEmail,
  tipEmailLabel,
  tipJmenoLabel,
  tipLimit,
  tipOdeslat,
  tipOdeslano,
  tipSoukromi,
  tipZpravaWhatsapp,
} from '@/lib/doporuceni-komplet-texty';
import { t } from '@/lib/i18n';
import type { GuideLang } from '@/lib/types';

import { adresaKlub, domenaJesteNebezi } from '@/lib/verejna-adresa';

function baseProTip(): string {
  if (typeof window !== 'undefined') {
    const o = window.location.origin;
    if (o && !domenaJesteNebezi(o)) return o;
  }
  return adresaKlub();
}

function odkazTip(kod: string, lang: GuideLang): string {
  return `${baseProTip()}/poptavka?od=${encodeURIComponent(kod)}&lang=${encodeURIComponent(lang)}`;
}

/** Zvýrazní jednu nebo víc částek zlatě. */
function zlatCastky(text: string, castky: string[]): ReactNode {
  let zbytek = text;
  const casti: ReactNode[] = [];
  let klic = 0;
  for (const castka of castky) {
    const i = zbytek.indexOf(castka);
    if (i < 0) continue;
    if (i > 0) casti.push(<span key={klic++}>{zbytek.slice(0, i)}</span>);
    casti.push(
      <span key={klic++} className="pv-exp__zl">
        {castka}
      </span>,
    );
    zbytek = zbytek.slice(i + castka.length);
  }
  if (zbytek) casti.push(<span key={klic++}>{zbytek}</span>);
  return casti.length ? <>{casti}</> : text;
}

export function ExpiredDoporuceni({
  lang,
  token,
  kod,
  jmenoPredvypln,
  forceEmail = false,
}: {
  lang: GuideLang;
  token: string;
  kod: string | null;
  jmenoPredvypln: string;
  /** Z e-mailu #doporucit: formulář hned otevřený. */
  forceEmail?: boolean;
}) {
  const [ukazEmail, setUkazEmail] = useState(false);
  const [ukazPodrobnosti, setUkazPodrobnosti] = useState(false);
  const [emailKam, setEmailKam] = useState('');
  const [jmeno, setJmeno] = useState(jmenoPredvypln);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [cekam, setCekam] = useState(false);

  useEffect(() => {
    if (jmenoPredvypln && !jmeno) setJmeno(jmenoPredvypln);
  }, [jmenoPredvypln, jmeno]);

  /** Z e-mailu s #doporucit rovnou otevři formulář. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (forceEmail || window.location.hash === '#doporucit') setUkazEmail(true);
  }, [forceEmail]);

  const poslatWhatsapp = useCallback(() => {
    if (!kod) return;
    const url = odkazTip(kod, lang);
    const text = `${tipZpravaWhatsapp(lang)} ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }, [kod, lang]);

  const kopirovat = useCallback(async () => {
    if (!kod) return;
    setChyba(null);
    const url = odkazTip(kod, lang);
    const text = `${tipZpravaWhatsapp(lang)} ${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setHlaska(t(blizciZkopirovano, lang));
    } catch {
      setHlaska(t(blizciZkopirovano, lang));
    }
  }, [kod, lang]);

  const odeslatEmail = useCallback(async () => {
    if (!kod || cekam) return;
    setCekam(true);
    setChyba(null);
    setHlaska(null);
    try {
      const res = await fetch('/api/doporuceni/tip-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token === 'nahled' ? undefined : token,
          kod: token === 'nahled' ? kod : undefined,
          email: emailKam.trim(),
          jmeno: jmeno.trim(),
          lang,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; duvod?: string };
      if (!res.ok || !json.ok) {
        if (json.duvod === 'email') setChyba(t(tipChybaEmail, lang));
        else if (json.duvod === 'limit') setChyba(t(tipLimit, lang));
        else setChyba(t(tipChybaEmail, lang));
        return;
      }
      setHlaska(t(tipOdeslano, lang));
      setUkazEmail(false);
      setEmailKam('');
    } catch {
      setChyba(t(tipChybaEmail, lang));
    } finally {
      setCekam(false);
    }
  }, [kod, cekam, token, emailKam, jmeno, lang]);

  const emailForm = ukazEmail ? (
    <form
      className="pv-exp__tip-form"
      onSubmit={(e) => {
        e.preventDefault();
        void odeslatEmail();
      }}
    >
      <label className="pv-exp__tip-label">
        {t(tipEmailLabel, lang)}
        <input
          type="email"
          className="pv-exp__tip-input"
          value={emailKam}
          onChange={(e) => setEmailKam(e.target.value)}
          autoComplete="email"
          required
        />
      </label>
      <label className="pv-exp__tip-label">
        {t(tipJmenoLabel, lang)}
        <input
          type="text"
          className="pv-exp__tip-input"
          value={jmeno}
          onChange={(e) => setJmeno(e.target.value)}
          autoComplete="given-name"
          required
        />
      </label>
      <button type="submit" className="pv-exp__tip-odeslat" disabled={cekam || !kod}>
        {t(tipOdeslat, lang)}
      </button>
      <p className="pv-exp__tip-soukromi">{t(tipSoukromi, lang)}</p>
    </form>
  ) : null;

  return (
    <section className="pv-exp__blizci" id="doporucit">
      <h2 className="pv-exp__blizci-h">{t(blizciNadpis, lang)}</h2>
      <p className="pv-exp__blizci-text">{t(blizciText, lang)}</p>

      <button
        type="button"
        className={`pv-exp__blizci-podrobnosti${ukazPodrobnosti ? ' is-otevreno' : ''}`}
        aria-expanded={ukazPodrobnosti}
        onClick={() => setUkazPodrobnosti((v) => !v)}
      >
        <span className="pv-exp__blizci-podrobnosti-q" aria-hidden="true">
          ?
        </span>
        {t(blizciPodrobnosti, lang)}
      </button>

      {ukazPodrobnosti ? (
        <div className="pv-exp__blizci-priklad">
          <span className="pv-exp__blizci-priklad-radek">{t(blizciPrikladRadek1, lang)}</span>
          <span className="pv-exp__blizci-priklad-radek">
            {zlatCastky(t(blizciPrikladRadek2, lang), ['3\u00a0800\u00a0Kč'])}
          </span>
          <span className="pv-exp__blizci-priklad-radek">
            {zlatCastky(t(blizciPrikladRadek3, lang), ['200\u00a0Kč'])}
          </span>
          <span className="pv-exp__blizci-priklad-radek">
            {zlatCastky(t(blizciPrikladRadek4, lang), ['5\u00a0%', '200\u00a0Kč'])}
          </span>
        </div>
      ) : null}

      <div className="pv-exp__blizci-akce">
        <button
          type="button"
          className="pv-exp__blizci-btn pv-exp__blizci-btn--hlavni"
          disabled={!kod}
          onClick={() => {
            setUkazEmail((v) => !v);
            setChyba(null);
            setHlaska(null);
          }}
        >
          {t(blizciEmail, lang)}
        </button>
        {emailForm}
        <button
          type="button"
          className="pv-exp__blizci-btn"
          disabled={!kod}
          onClick={poslatWhatsapp}
        >
          {t(blizciWhatsapp, lang)}
        </button>
        <button type="button" className="pv-exp__blizci-btn" disabled={!kod} onClick={() => void kopirovat()}>
          {t(blizciKopie, lang)}
        </button>
      </div>

      {hlaska ? <p className="pv-exp__hlaska">{hlaska}</p> : null}
      {chyba ? <p className="pv-exp__tip-chyba">{chyba}</p> : null}
    </section>
  );
}
