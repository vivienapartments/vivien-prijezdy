'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { NIKOL_PHONE } from '@/lib/constants';
import { doporuceniTexty } from '@/lib/doporuceni-texty';
import { expiredVyhodyTexty, zlatSlevaVTextu } from '@/lib/expired-vyhody-texty';
import { t, toTelHref } from '@/lib/i18n';
import { jeStandalone, nactiPlochaStav } from '@/lib/plocha';
import { plochaPridej } from '@/lib/plocha-texty';
import { poptavkaTextyVernost } from '@/lib/poptavka-texty-vernost';
import {
  expiredCta,
  expiredDopis,
  expiredHelp,
  expiredNadpis,
  expiredPodpis,
  expiredZavolat,
} from '@/lib/texts';
import type { GuideLang } from '@/lib/types';
import { PridejNaPlochu } from './PridejNaPlochu';
import './expired-final.scss';

const BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '')) ||
  'https://vivien-prijezdy-six.vercel.app';

function klicNavrat(token: string | undefined): string {
  return `vivien-exp-navrat:${token || 'x'}`;
}

/** Budoucí měření: host klepl na výzvu a sjel k výhodám. */
function zaznamSjelKVyhodam(): void {
  /* připraveno pro pozdější měření */
}

function IkonaKalendar() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function IkonaTelefon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

function IkonaDarek() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12v9H4v-9" />
      <path d="M2 7h20v5H2z" />
      <path d="M12 21V7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function podSZlatem(text: string): ReactNode {
  const z = zlatSlevaVTextu(text);
  if (!z) return text;
  return (
    <>
      {z.pred}
      <span className="pv-exp__zl">{z.sleva}</span>
      {z.po}
    </>
  );
}

export function Expired({
  lang = 'cs',
  token,
}: {
  lang?: GuideLang;
  token?: string;
}) {
  const tel = NIKOL_PHONE.replace(/ /g, '\u00a0');
  const v = expiredVyhodyTexty(lang);
  const d = doporuceniTexty(lang);
  const vernostNadpis = poptavkaTextyVernost(lang).nadpis;
  const seznamRef = useRef<HTMLDivElement | null>(null);
  const plochaBtnRef = useRef<HTMLDivElement | null>(null);
  const [rezim, setRezim] = useState<'nacitam' | 'prvni' | 'dalsi'>('nacitam');
  const [skrytPlochu, setSkrytPlochu] = useState(false);
  const [kod, setKod] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [cekamSdil, setCekamSdil] = useState(false);

  const jeNahled = token === 'nahled';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const forceDalsi = params.get('dalsi') === '1';
    const standalone = jeStandalone();
    const plochaHotovo = nactiPlochaStav(token) === 'hotovo';
    /* dalsi=1 = náhled návratu z ikony na ploše → jako standalone (bez „Přidat na plochu“) */
    setSkrytPlochu(standalone || plochaHotovo || forceDalsi);

    if (jeNahled && !forceDalsi) {
      setRezim('prvni');
      return;
    }
    if (jeNahled && forceDalsi) {
      setRezim('dalsi');
      return;
    }

    const klic = klicNavrat(token);
    let videno = false;
    try {
      videno = Boolean(window.localStorage.getItem(klic));
    } catch {
      /* paměť */
    }
    if (standalone || videno || forceDalsi) {
      setRezim('dalsi');
    } else {
      setRezim('prvni');
      try {
        window.localStorage.setItem(klic, '1');
      } catch {
        /* paměť */
      }
    }
  }, [token, jeNahled]);

  useEffect(() => {
    if (!token) return;
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
        /* bez kódu řádek 3 nefunguje */
      }
    })();
    return () => {
      zruseno = true;
    };
  }, [token]);

  const sjelKVyhodam = useCallback(() => {
    zaznamSjelKVyhodam();
    seznamRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const poptavkaHref = token
    ? `/poptavka?t=${encodeURIComponent(token)}`
    : '/poptavka';

  const pridejNaPlochu = useCallback(() => {
    const btn = plochaBtnRef.current?.querySelector('button');
    if (btn instanceof HTMLButtonElement) btn.click();
  }, []);

  const poslatOdkaz = useCallback(async () => {
    if (!kod || cekamSdil) return;
    setCekamSdil(true);
    setHlaska(null);
    const url = `${BASE}/poptavka?od=${encodeURIComponent(kod)}&lang=${encodeURIComponent(lang)}`;
    const text = d.zprava;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({ text, url });
          setCekamSdil(false);
          return;
        } catch (err) {
          const name =
            err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : '';
          if (name === 'AbortError') {
            setCekamSdil(false);
            return;
          }
        }
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setHlaska(d.zkopirovano);
    } catch {
      setHlaska(d.zkopirovano);
    } finally {
      setCekamSdil(false);
    }
  }, [kod, cekamSdil, lang, d.zprava, d.zkopirovano]);

  if (rezim === 'nacitam') {
    return <main className="pv-exp" aria-busy="true" />;
  }

  const prvni = rezim === 'prvni';
  const cisloPlocha = 2;
  const cisloDarek = skrytPlochu ? 2 : 3;

  return (
    <main className="pv-exp">
      <div className="pv-exp__karta">
        {prvni ? (
          <>
            <div className="pv-exp__prvni">
              <div className="pv-exp__foto" role="img" aria-label="VIVIEN Apartments" />
              <div className="pv-exp__obsah">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="pv-exp__logo"
                  src="/pruvodce/va-logo-192.png"
                  width={66}
                  height={66}
                  alt="VIVIEN Apartments"
                />
                <h1 className="pv-exp__h1">{t(expiredNadpis, lang)}</h1>
                <p className="pv-exp__dopis">{t(expiredDopis, lang)}</p>
                <p className="pv-exp__podpis">{t(expiredPodpis, lang)}</p>
              </div>
            </div>
            <button type="button" className="pv-exp__vyzva" onClick={sjelKVyhodam}>
              {v.vyzva}{' '}
              <span className="pv-exp__sipka" aria-hidden="true">
                ⌄
              </span>
            </button>
          </>
        ) : (
          <div className="pv-exp__dalsi">
            <div className="pv-exp__foto pv-exp__foto--mala" role="img" aria-label="VIVIEN Apartments" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="pv-exp__logo"
              src="/pruvodce/va-logo-192.png"
              width={66}
              height={66}
              alt="VIVIEN Apartments"
            />
            <h1 className="pv-exp__h1 pv-exp__h1--dalsi">{vernostNadpis}</h1>
            <p className="pv-exp__dalsi-veta">{v.dalsiVeta}</p>
            <p className="pv-exp__podpis">{t(expiredPodpis, lang)}</p>
          </div>
        )}

        <div className="pv-exp__seznam" id="vyhody" ref={seznamRef}>
          <a className="pv-exp__radek" href={poptavkaHref}>
            <span className="pv-exp__ik">
              <span className="pv-exp__cislo">1</span>
              <IkonaKalendar />
            </span>
            <span className="pv-exp__radek-text">
              <span className="pv-exp__radek-nadpis">{t(expiredCta, lang)}</span>
              <span className="pv-exp__radek-pod">{podSZlatem(v.radek1Pod)}</span>
            </span>
            <span className="pv-exp__sip" aria-hidden="true">
              ›
            </span>
          </a>

          {!skrytPlochu ? (
            <button type="button" className="pv-exp__radek" onClick={pridejNaPlochu}>
              <span className="pv-exp__ik">
                <span className="pv-exp__cislo">{cisloPlocha}</span>
                <IkonaTelefon />
              </span>
              <span className="pv-exp__radek-text">
                <span className="pv-exp__radek-nadpis">{t(plochaPridej, lang)}</span>
                <span className="pv-exp__radek-pod">{v.radek2Pod}</span>
              </span>
              <span className="pv-exp__sip" aria-hidden="true">
                ›
              </span>
            </button>
          ) : null}

          <button
            type="button"
            className="pv-exp__radek"
            onClick={() => void poslatOdkaz()}
            disabled={!kod || cekamSdil}
          >
            <span className="pv-exp__ik">
              <span className="pv-exp__cislo">{cisloDarek}</span>
              <IkonaDarek />
            </span>
            <span className="pv-exp__radek-text">
              <span className="pv-exp__radek-nadpis">{v.radek3Nadpis}</span>
              <span className="pv-exp__radek-pod">{d.otazka}</span>
            </span>
            <span className="pv-exp__sip" aria-hidden="true">
              ›
            </span>
          </button>
        </div>

        {hlaska ? <p className="pv-exp__hlaska">{hlaska}</p> : null}

        <div className="pv-exp__pomoc">
          <p className="pv-exp__pomoc-otazka">{t(expiredHelp, lang)}</p>
          <a className="pv-exp__pomoc-tel" href={toTelHref(NIKOL_PHONE)}>
            {t(expiredZavolat, lang)} · {tel}
          </a>
        </div>

        {!skrytPlochu ? (
          <div className="pv-exp__plocha-skryte" ref={plochaBtnRef} aria-hidden="true">
            <PridejNaPlochu
              lang={lang}
              jenMobil={false}
              nahled={jeNahled}
              tichy
              nazev="VIVIEN průvodce"
              shortNazev="VIVIEN"
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}
