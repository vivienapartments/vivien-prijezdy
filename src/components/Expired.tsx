'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  dalsiNadpis,
  dalsiVeta,
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
import { jePwaNainstalovana, jeStandalone, nactiPlochaStav, posliPlochaNaServer, ulozPlochaStav } from '@/lib/plocha';
import { plochaUzMate, plochaUzMateRadek, plochaZavrit } from '@/lib/plocha-texty';
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
import './pridej-na-plochu.scss';

function klicNavrat(token: string | undefined): string {
  return `vivien-exp-navrat:${token || 'x'}`;
}

/** Počet návratů v režimu „další“ (zařízení). */
function klicNavratyPocet(token: string | undefined): string {
  return `vivien-pv-navraty:${token || 'x'}`;
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
  const seznamRef = useRef<HTMLDivElement | null>(null);
  const doporucitRef = useRef<HTMLDivElement | null>(null);
  const spustPlochuRef = useRef<(() => void) | null>(null);
  const [rezim, setRezim] = useState<'nacitam' | 'prvni' | 'dalsi'>('nacitam');
  const [plochaHotovo, setPlochaHotovo] = useState(false);
  const [kod, setKod] = useState<string | null>(null);
  const [jmeno, setJmeno] = useState('');
  /** Překryv jen z ?plocha=1. Řádek 3 spouští instalaci rovnou. */
  const [vyzvaPlocha, setVyzvaPlocha] = useState(false);
  const [hlaskaUzPlocha, setHlaskaUzPlocha] = useState(false);
  /** Počet návratů (1–3 = blízké vidět, od 4 schovat). */
  const [navratPocet, setNavratPocet] = useState(1);
  const [blizciVynutit, setBlizciVynutit] = useState(false);
  const [hashDoporucit, setHashDoporucit] = useState(false);

  const jeNahled = token === 'nahled';

  const poHotovePloše = useCallback(() => {
    setPlochaHotovo(true);
    setVyzvaPlocha(false);
  }, []);

  const onPlochaReady = useCallback((spust: () => void) => {
    spustPlochuRef.current = spust;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const forceDalsi = params.get('dalsi') === '1';
    const forcePoprve = params.get('poprve') === '1';
    const chcePlochu = params.get('plocha') === '1';
    const standalone = jeStandalone();
    const localHotovo = nactiPlochaStav(token) === 'hotovo';
    const hotovo = standalone || localHotovo;
    setPlochaHotovo(hotovo || (forceDalsi && !forcePoprve));
    setHashDoporucit(window.location.hash === '#doporucit');

    if (chcePlochu && hotovo) {
      setHlaskaUzPlocha(true);
    } else if (chcePlochu && !hotovo) {
      setVyzvaPlocha(true);
    }

    let zruseno = false;
    void (async () => {
      const nainstalovano = await jePwaNainstalovana();
      if (zruseno || !nainstalovano) return;
      ulozPlochaStav(token, 'hotovo');
      posliPlochaNaServer(token);
      setPlochaHotovo(true);
      setVyzvaPlocha(false);
      if (chcePlochu) setHlaskaUzPlocha(true);
    })();

    if (forcePoprve) {
      setRezim('prvni');
      setNavratPocet(1);
    } else if (jeNahled && !forceDalsi) {
      setRezim('prvni');
      setNavratPocet(1);
    } else if (jeNahled && forceDalsi) {
      setRezim('dalsi');
      setNavratPocet(1);
    } else {
      const klic = klicNavrat(token);
      let videno = false;
      try {
        videno = Boolean(window.localStorage.getItem(klic));
      } catch {
        /* paměť */
      }
      if (standalone || videno || forceDalsi) {
        setRezim('dalsi');
        /* ?dalsi=1 a ?poprve=1 počítadlo nemění. */
        if (!forceDalsi && !forcePoprve) {
          const klicPocet = klicNavratyPocet(token);
          let dalsi = 1;
          try {
            const raw = window.localStorage.getItem(klicPocet);
            const pred = raw ? parseInt(raw, 10) : 0;
            dalsi = (Number.isFinite(pred) ? pred : 0) + 1;
            window.localStorage.setItem(klicPocet, String(dalsi));
          } catch {
            dalsi = 1;
          }
          setNavratPocet(dalsi);
        } else {
          setNavratPocet(1);
        }
      } else {
        setRezim('prvni');
        setNavratPocet(1);
        try {
          window.localStorage.setItem(klic, '1');
        } catch {
          /* paměť */
        }
      }
    }

    return () => {
      zruseno = true;
    };
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
    setHashDoporucit(true);
    setBlizciVynutit(true);
    const tmr = window.setTimeout(() => {
      document.getElementById('doporucit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(tmr);
  }, [rezim, kod]);

  const spustPlochuPrimo = useCallback(() => {
    if (nactiPlochaStav(token) === 'hotovo' || jeStandalone()) {
      setPlochaHotovo(true);
      setHlaskaUzPlocha(true);
      return;
    }
    const fn = spustPlochuRef.current;
    if (fn) fn();
    else setVyzvaPlocha(true);
  }, [token]);

  const sjelKDoporuceni = useCallback(() => {
    setBlizciVynutit(true);
    window.setTimeout(() => {
      doporucitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }, []);

  const poptavkaHref =
    !token || token === 'nahled'
      ? '/poptavka?zkouska=1'
      : `/poptavka?t=${encodeURIComponent(token)}`;

  if (rezim === 'nacitam') {
    return <main className="pv-exp" aria-busy="true" />;
  }

  const prvni = rezim === 'prvni';
  const cisla = prvni;
  const ukazBlizci = hashDoporucit || blizciVynutit || navratPocet <= 3 || prvni;

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
            <h1 className="pv-exp__h1 pv-exp__h1--dalsi">{t(dalsiNadpis, lang)}</h1>
            <p className="pv-exp__dalsi-veta">{t(dalsiVeta, lang)}</p>
          </div>
        )}

        <div className="pv-exp__seznam" id="vyhody" ref={seznamRef}>
          <a className="pv-exp__radek" href={poptavkaHref}>
            <span className="pv-exp__ik">
              {cisla ? <span className="pv-exp__cislo">1</span> : null}
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
              {cisla ? <span className="pv-exp__cislo">2</span> : null}
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

          {plochaHotovo && prvni ? (
            <div className="pv-exp__radek pv-exp__radek--tichy" aria-live="polite">
              <span className="pv-exp__ik">
                {cisla ? <span className="pv-exp__cislo">3</span> : null}
                <IkonaTelefon />
              </span>
              <span className="pv-exp__radek-text">
                <span className="pv-exp__radek-nadpis pv-exp__nowrap">{t(plochaUzMateRadek, lang)}</span>
              </span>
            </div>
          ) : null}
          {!plochaHotovo ? (
            <button type="button" className="pv-exp__radek" onClick={spustPlochuPrimo}>
              <span className="pv-exp__ik">
                {cisla ? <span className="pv-exp__cislo">3</span> : null}
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
          {ukazBlizci ? (
            <ExpiredDoporuceni
              lang={lang}
              token={token || 'nahled'}
              kod={kod}
              jmenoPredvypln={jmeno}
              forceEmail={hashDoporucit}
            />
          ) : null}
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

        <PridejNaPlochu
          lang={lang}
          token={token && token !== 'nahled' ? token : null}
          jenMobil={false}
          nahled={jeNahled}
          skrytTlacitko
          vyzva={vyzvaPlocha && !plochaHotovo}
          onVyzvaZmena={setVyzvaPlocha}
          onHotovo={poHotovePloše}
          onReady={onPlochaReady}
          shortNazev="VIVIEN"
        />

        {hlaskaUzPlocha ? (
          <div className="pv-pridej-overlay" role="dialog" aria-modal="true">
            <div className="pv-pridej-karta">
              <p className="pv-pridej-text">{t(plochaUzMate, lang)}</p>
              <button type="button" className="pv-pridej-ok" onClick={() => setHlaskaUzPlocha(false)}>
                {t(plochaZavrit, lang)}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
