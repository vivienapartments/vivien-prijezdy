'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { klicJazykHostaPotvrzen } from '@/lib/jazyk-hosta';
import {
  jeIos,
  jeStandalone,
  nactiPlochaStav,
  otevriStejnouStrankuVChrome,
  ulozPlochaStav,
  type PlochaStav,
} from '@/lib/plocha';
import * as PT from '@/lib/plocha-texty';
import {
  doporucitelUiTexty,
  POPTAVKA_JAZYKY,
  vlajkaJazyka,
} from '@/lib/poptavka-doporucitel-ui';
import type { GuideLang } from '@/lib/types';
import { GUIDE_LANGS, LANG_LABELS } from '@/lib/types';

function jeMobilZarizeni(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(max-width: 820px)').matches) return true;
  } catch {
    /* media */
  }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent || '');
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Opts = {
  lang: GuideLang;
  rezervace?: string | null;
  token?: string | null;
  vypnuto?: boolean;
  blokovano?: boolean;
  /** Jen telefon. Na PC se okno neukáže (kromě ?plocha=okno). */
  jenMobil?: boolean;
  /**
   * true = jazyk známe (Booking/Airbnb / uložený), na jazyk se neptáme.
   * false = nejdřív výběr jazyka, pak nabídka plochy.
   */
  jazykZnamy?: boolean;
  onJazyk?: (lang: GuideLang) => void;
};

/**
 * Okno přes celou obrazovku, jako u osobního předání / zpráv.
 * Když neznáme jazyk: nejdřív jazyk, pak Ano / Později na plochu.
 */
export function usePlochaDotaz({
  lang,
  rezervace = null,
  token = null,
  vypnuto = false,
  blokovano = false,
  jenMobil = true,
  jazykZnamy = true,
  onJazyk,
}: Opts): { overlay: ReactNode; krok: ReactNode; posunOsy: number } {
  const [stav, setStav] = useState<PlochaStav>('nic');
  const [ready, setReady] = useState(false);
  /** nic = hlavní dotaz; ios = krátký návod Safari; null = zavřeno */
  const [poAno, setPoAno] = useState<'nic' | 'ios' | null>(null);
  const [hotovoHlaska, setHotovoHlaska] = useState(false);
  const [jazykOk, setJazykOk] = useState(true);
  const [jazykVolba, setJazykVolba] = useState<GuideLang>(lang);
  /**
   * Dočasný jazyk jen pro návod „Přidat na plochu“ (pomoc majitele u Fina aj.).
   * null = jazyk hosta. Celý průvodce ani uložený jazyk se nemění.
   */
  const [navodLang, setNavodLang] = useState<GuideLang | null>(null);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const plochaLang = navodLang ?? lang;
  const tt = (map: Parameters<typeof t>[0]) => t(map, plochaLang);

  useEffect(() => {
    setJazykVolba(lang);
    setNavodLang(null);
  }, [lang]);

  function vratJazykHosta() {
    setNavodLang(null);
  }

  function volbaNavodu(next: GuideLang) {
    setNavodLang(next === lang ? null : next);
  }

  const vyberJazykaNavodu = (
    <label className="pv-plocha-navod-jazyk">
      <span className="pv-plocha-navod-jazyk__stitek">Jazyk návodu</span>
      <span className="pv-plocha-navod-jazyk__ramecek">
        <span className="pv-plocha-navod-jazyk__hodnota" aria-hidden="true">
          {LANG_LABELS[plochaLang]}
          <b>▾</b>
        </span>
        <select
          className="pv-plocha-navod-jazyk__select"
          value={plochaLang}
          aria-label="Jazyk návodu Přidat na plochu"
          onChange={(e) => volbaNavodu(e.target.value as GuideLang)}
        >
          {GUIDE_LANGS.map((l) => (
            <option key={l} value={l}>
              {LANG_LABELS[l]}
            </option>
          ))}
        </select>
      </span>
    </label>
  );

  useEffect(() => {
    if (vypnuto || jeStandalone()) {
      setStav('hotovo');
      setJazykOk(true);
      setReady(true);
      return;
    }
    // Náhled: ?plocha=okno znovu ukáže vyskakovací okno (i na PC).
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('plocha') === 'okno') {
        ulozPlochaStav(rezervace, 'nic');
        setStav('nic');
        setPoAno(null);
        const silaJazyk = q.get('jazyk') === '1' || jazykZnamy === false;
        if (silaJazyk) {
          try {
            sessionStorage.removeItem(klicJazykHostaPotvrzen(rezervace));
          } catch {
            /* ss */
          }
          setJazykOk(false);
        } else {
          setJazykOk(true);
        }
        setReady(true);
        return;
      }
    } catch {
      /* url */
    }
    if (jenMobil && !jeMobilZarizeni()) {
      setStav('hotovo');
      setJazykOk(true);
      setReady(true);
      return;
    }
    setStav(nactiPlochaStav(rezervace));
    if (jazykZnamy) {
      setJazykOk(true);
    } else {
      let ok = false;
      try {
        ok = sessionStorage.getItem(klicJazykHostaPotvrzen(rezervace)) === '1';
      } catch {
        /* ss */
      }
      setJazykOk(ok);
    }
    setReady(true);
  }, [rezervace, vypnuto, jenMobil, jazykZnamy]);

  useEffect(() => {
    if (vypnuto || jeStandalone()) return;

    const start = token
      ? `/${encodeURIComponent(token)}`
      : typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}` || '/'
        : '/';
    const manifestHref = token
      ? `/${encodeURIComponent(token)}/manifest.webmanifest`
      : URL.createObjectURL(
          new Blob(
            [
              JSON.stringify({
                name: 'VIVIEN průvodce',
                short_name: 'VIVIEN',
                start_url: start,
                scope: '/',
                display: 'standalone',
                background_color: '#1c1712',
                theme_color: '#1c1712',
                lang: 'cs',
                icons: [
                  { src: '/prehled/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                  { src: '/prehled/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                  {
                    src: '/prehled/icon-192-maskable.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'maskable',
                  },
                  {
                    src: '/prehled/icon-512-maskable.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable',
                  },
                ],
              }),
            ],
            { type: 'application/manifest+json' },
          ),
        );

    let link = document.querySelector<HTMLLinkElement>('link[data-vivien-plocha-manifest]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      link.setAttribute('data-vivien-plocha-manifest', '1');
      document.head.appendChild(link);
    }
    link.href = manifestHref;

    let apple = document.querySelector<HTMLLinkElement>('link[data-vivien-plocha-apple]');
    if (!apple) {
      apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.setAttribute('data-vivien-plocha-apple', '1');
      document.head.appendChild(apple);
    }
    apple.href = '/prehled/apple-icon.png';

    let meta = document.querySelector<HTMLMetaElement>('meta[data-vivien-plocha-capable]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-capable';
      meta.content = 'yes';
      meta.setAttribute('data-vivien-plocha-capable', '1');
      document.head.appendChild(meta);
    }

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw-pruvodce.js', { scope: '/' }).catch(() => undefined);
    }

    function onBip(e: Event) {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
    }
    window.addEventListener('beforeinstallprompt', onBip);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      if (!token && manifestHref.startsWith('blob:')) URL.revokeObjectURL(manifestHref);
    };
  }, [token, vypnuto]);

  function uloz(next: PlochaStav) {
    setStav(next);
    ulozPlochaStav(rezervace, next);
  }

  async function spustInstalaci() {
    if (jeIos()) {
      setPoAno('ios');
      return;
    }
    const evt = deferred.current;
    if (evt) {
      try {
        await evt.prompt();
        const volba = await evt.userChoice;
        deferred.current = null;
        if (volba.outcome === 'accepted') {
          uloz('hotovo');
          setPoAno(null);
          vratJazykHosta();
          setHotovoHlaska(true);
          return;
        }
        return;
      } catch {
        /* systém */
      }
    }
    otevriStejnouStrankuVChrome();
  }

  function naPozdeji() {
    uloz('později');
    setPoAno(null);
    vratJazykHosta();
  }

  function naSkryt() {
    uloz('skryto');
    setPoAno(null);
    vratJazykHosta();
  }

  function potvrdJazyk() {
    const vybrany = GUIDE_LANGS.includes(jazykVolba) ? jazykVolba : 'cs';
    try {
      sessionStorage.setItem(klicJazykHostaPotvrzen(rezervace), '1');
    } catch {
      /* ss */
    }
    onJazyk?.(vybrany);
    if (token) {
      void fetch('/api/pruvodce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, akce: 'jazyk', jazyk: vybrany }),
      }).catch(() => undefined);
    }
    setJazykOk(true);
  }

  if (!ready || vypnuto || stav === 'hotovo' || stav === 'skryto') {
    const overlay =
      hotovoHlaska ? (
        <div className="pv-zprava-overlay" role="dialog" aria-modal="true" aria-labelledby="pv-plocha-hotovo">
          <div className="pv-zprava-overlay__karta">
            <p className="pv-zprava-overlay__krok">{tt(PT.plochaOverlayKrok)}</p>
            <h3 className="pv-zprava-overlay__nadpis" id="pv-plocha-hotovo">
              {tt(PT.plochaHotovo)}
            </h3>
            <button type="button" className="pv-zprava-overlay__btn" onClick={() => setHotovoHlaska(false)}>
              {tt(PT.plochaZavrit)}
            </button>
          </div>
        </div>
      ) : null;
    return { overlay, krok: null, posunOsy: 0 };
  }

  const ukazOverlay = !blokovano && (stav === 'nic' || poAno != null || !jazykOk);
  const ukazKrok = stav === 'později' && poAno == null && jazykOk;
  const uiJazyk = doporucitelUiTexty(jazykVolba);

  const overlay = ukazOverlay ? (
    <div className="pv-zprava-overlay" role="dialog" aria-modal="true" aria-labelledby="pv-plocha-dotaz">
      <div className="pv-zprava-overlay__karta pv-zprava-overlay__karta--prani">
        <p className="pv-zprava-overlay__krok">{tt(PT.plochaOverlayKrok)}</p>
        {!jazykOk ? (
          <>
            <h3 className="pv-zprava-overlay__nadpis" id="pv-plocha-dotaz">
              {uiJazyk.vyberteJazyk}
            </h3>
            <label className="pv-plocha-jazyk">
              <span className="pv-plocha-jazyk__nahled" aria-hidden="true">
                {vlajkaJazyka(jazykVolba)} {uiJazyk.nazevJazyka}
                <b>▾</b>
              </span>
              <select
                className="pv-plocha-jazyk__select"
                value={jazykVolba}
                onChange={(e) => setJazykVolba(e.target.value as GuideLang)}
              >
                {POPTAVKA_JAZYKY.map((l) => (
                  <option key={l} value={l}>
                    {vlajkaJazyka(l)} {doporucitelUiTexty(l).nazevJazyka}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="pv-zprava-overlay__btn" onClick={potvrdJazyk}>
              {jazykVolba === 'cs'
                ? 'Pokračovat'
                : jazykVolba === 'de'
                  ? 'Weiter'
                  : jazykVolba === 'pl'
                    ? 'Dalej'
                    : 'Continue'}
            </button>
          </>
        ) : poAno === 'ios' ? (
          <>
            <h3 className="pv-zprava-overlay__nadpis" id="pv-plocha-dotaz">
              {tt(PT.plochaNavodIosNadpis)}
            </h3>
            <p className="pv-zprava-overlay__text pv-plocha-navod">{tt(PT.plochaNavodIosKroky)}</p>
            {vyberJazykaNavodu}
            <button
              type="button"
              className="pv-zprava-overlay__btn"
              onClick={() => {
                uloz('později');
                setPoAno(null);
                vratJazykHosta();
              }}
            >
              {tt(PT.plochaZavrit)}
            </button>
          </>
        ) : (
          <>
            <h3 className="pv-zprava-overlay__nadpis" id="pv-plocha-dotaz">
              {tt(PT.plochaPolozkaNadpis)}
            </h3>
            <p className="pv-zprava-overlay__text">{tt(PT.plochaDotaz)}</p>
            {vyberJazykaNavodu}
            <div className="pv-plocha-dotaz__btns">
              <button type="button" className="pv-zprava-overlay__btn" onClick={() => void spustInstalaci()}>
                {tt(PT.plochaAno)}
              </button>
              <button type="button" className="pv-plocha-dotaz__pozdeji" onClick={naPozdeji}>
                {tt(PT.plochaPozdeji)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  /** Samostatný box (bez čísla osy), s Přidat / Už neukazovat. */
  const krok = ukazKrok ? (
    <div className="pv-plocha-box" id="pv-plocha">
      <p className="pv-plocha-polozka__nadpis">{tt(PT.plochaPolozkaNadpis)}</p>
      <p className="pv-plocha-polozka__veta">{tt(PT.plochaPolozkaVeta)}</p>
      <div className="pv-plocha-polozka__akce">
        <button type="button" className="pv-plocha-polozka__ano" onClick={() => void spustInstalaci()}>
          {tt(PT.plochaPridej)}
        </button>
        <button type="button" className="pv-plocha-polozka__skryt" onClick={naSkryt}>
          {tt(PT.plochaSkryt)}
        </button>
        {vyberJazykaNavodu}
      </div>
    </div>
  ) : null;

  return { overlay, krok, posunOsy: 0 };
}
