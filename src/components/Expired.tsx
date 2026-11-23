'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  radek1Nadpis,
  radek1Pod,
  radek2Nadpis,
  radek2Pod,
  radek3Nadpis,
  radek3Pod,
  vyhodyUvod,
} from '@/lib/doporuceni-komplet-texty';
import { zlatSlevaVTextu } from '@/lib/expired-vyhody-texty';
import { t } from '@/lib/i18n';
import { jeStandalone, nactiPlochaStav } from '@/lib/plocha';
import { poptavkaTextyVernost } from '@/lib/poptavka-texty-vernost';
import {
  expiredDopis,
  expiredHelp,
  expiredNadpis,
  expiredPodpis,
  expiredZaloha,
  expiredZavolat,
} from '@/lib/texts';
import { textBuildVerze } from '@/lib/build-verze';
import type { GuideLang } from '@/lib/types';
import { ExpiredDoporuceni } from './ExpiredDoporuceni';
import { KontaktTelefony } from './KontaktTelefony';
import { PridejNaPlochu } from './PridejNaPlochu';
import './expired-final.scss';

function klicNavrat(token: string | undefined): string {
  return `vivien-exp-navrat:${token || 'x'}`;
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

function nowrapSleva(text: string): ReactNode {
  const m = text.match(/^(.*?)(5\s*%)(.*)$/);
  if (!m) return podSZlatem(text);
  return (
    <>
      {m[1]}
      <span className="pv-exp__nowrap">{podSZlatem(m[2])}</span>
      {m[3]}
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
  const vernostNadpis = poptavkaTextyVernost(lang).nadpis;
  const seznamRef = useRef<HTMLDivElement | null>(null);
  const doporucitRef = useRef<HTMLDivElement | null>(null);
  const [rezim, setRezim] = useState<'nacitam' | 'prvni' | 'dalsi'>('nacitam');
  const [skrytPlochu, setSkrytPlochu] = useState(false);
  const [kod, setKod] = useState<string | null>(null);
  const [jmeno, setJmeno] = useState('');
  /** Překryv „Přidat na plochu“ (?plocha=1 nebo klepnutí na řádek 3). Bez automatického spuštění. */
  const [vyzvaPlocha, setVyzvaPlocha] = useState(false);

  const jeNahled = token === 'nahled';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const forceDalsi = params.get('dalsi') === '1';
    /** Jen test: vždy první návštěva, nic se do paměti neukládá. */
    const forcePoprve = params.get('poprve') === '1';
    const chcePlochu = params.get('plocha') === '1';
    const standalone = jeStandalone();
    const plochaHotovo = nactiPlochaStav(token) === 'hotovo';
    /* dalsi=1 = náhled návratu z ikony na ploše → jako standalone (bez „Přidat na plochu“) */
    setSkrytPlochu(standalone || plochaHotovo || (forceDalsi && !forcePoprve));
    if (chcePlochu && !standalone && !plochaHotovo) setVyzvaPlocha(true);

    if (forcePoprve) {
      setRezim('prvni');
      return;
    }

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
      setJmeno('Zkouška');
      return;
    }
    let zruseno = false;
    (async () => {
      try {
        const res = await fetch(`/api/doporuceni/kod?token=${encodeURIComponent(token)}`);
        const json = (await res.json()) as { ok?: boolean; kod?: string; jmeno?: string };
        if (!zruseno && json.ok && json.kod) setKod(json.kod);
        if (!zruseno && json.jmeno) setJmeno(json.jmeno);
      } catch {
        /* bez kódu řádek doporučení nefunguje */
      }
    })();
    return () => {
      zruseno = true;
    };
  }, [token]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#doporucit') return;
    const tmr = window.setTimeout(() => {
      document.getElementById('doporucit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(tmr);
  }, [rezim, kod]);

  const otevritVyzvuPlocha = useCallback(() => {
    setVyzvaPlocha(true);
  }, []);

  const sjelKDoporuceni = useCallback(() => {
    doporucitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  /* Věrnostní poptávka. Zkouška /nahled → ?zkouska=1. Ostrý host → ?t=token. */
  const poptavkaHref =
    !token || token === 'nahled'
      ? '/poptavka?zkouska=1'
      : `/poptavka?t=${encodeURIComponent(token)}`;

  if (rezim === 'nacitam') {
    return <main className="pv-exp" aria-busy="true" />;
  }

  const prvni = rezim === 'prvni';
  const cisloPlocha = 3;
  const cisloDarek = 2;

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
            <p className="pv-exp__vyzva">{t(vyhodyUvod, lang)}</p>
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
            <p className="pv-exp__dalsi-veta">{t(vyhodyUvod, lang)}</p>
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
              <span className="pv-exp__radek-nadpis pv-exp__nowrap">{t(radek1Nadpis, lang)}</span>
              <span className="pv-exp__radek-pod pv-exp__nowrap">{nowrapSleva(t(radek1Pod, lang))}</span>
            </span>
            <span className="pv-exp__sip" aria-hidden="true">
              ›
            </span>
          </a>

          <button type="button" className="pv-exp__radek" onClick={sjelKDoporuceni} disabled={!kod}>
            <span className="pv-exp__ik">
              <span className="pv-exp__cislo">{cisloDarek}</span>
              <IkonaDarek />
            </span>
            <span className="pv-exp__radek-text">
              <span className="pv-exp__radek-nadpis pv-exp__nowrap">{t(radek2Nadpis, lang)}</span>
              <span className="pv-exp__radek-pod pv-exp__nowrap">{t(radek2Pod, lang)}</span>
            </span>
            <span className="pv-exp__sip" aria-hidden="true">
              ›
            </span>
          </button>

          {!skrytPlochu ? (
            <button type="button" className="pv-exp__radek" onClick={otevritVyzvuPlocha}>
              <span className="pv-exp__ik">
                <span className="pv-exp__cislo">{cisloPlocha}</span>
                <IkonaTelefon />
              </span>
              <span className="pv-exp__radek-text">
                <span className="pv-exp__radek-nadpis pv-exp__nowrap">{t(radek3Nadpis, lang)}</span>
                <span className="pv-exp__radek-pod pv-exp__nowrap">{t(radek3Pod, lang)}</span>
              </span>
              <span className="pv-exp__sip" aria-hidden="true">
                ›
              </span>
            </button>
          ) : null}
        </div>

        <div ref={doporucitRef}>
          <ExpiredDoporuceni
            lang={lang}
            token={token || 'nahled'}
            kod={kod}
            jmenoPredvypln={jmeno}
          />
        </div>

        <div className="pv-exp__pomoc">
          <p className="pv-exp__pomoc-otazka">{t(expiredHelp, lang)}</p>
          <KontaktTelefony
            className="pv-exp__kontakty"
            zavolat={t(expiredZavolat, lang)}
            zaloha={t(expiredZaloha, lang)}
          />
        </div>
        <p className="pv-exp__verze" aria-hidden="true">
          {textBuildVerze()}
        </p>

        {!skrytPlochu ? (
          <PridejNaPlochu
            lang={lang}
            jenMobil={false}
            nahled={jeNahled}
            skrytTlacitko
            vyzva={vyzvaPlocha}
            onVyzvaZmena={setVyzvaPlocha}
            nazev="VIVIEN průvodce"
            shortNazev="VIVIEN"
          />
        ) : null}
      </div>
    </main>
  );
}
