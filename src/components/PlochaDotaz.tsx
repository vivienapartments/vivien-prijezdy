'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { t } from '@/lib/i18n';
import {
  jeIos,
  jeStandalone,
  nactiPlochaStav,
  ulozPlochaStav,
  type PlochaStav,
} from '@/lib/plocha';
import * as PT from '@/lib/plocha-texty';
import type { GuideLang } from '@/lib/types';

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
};

/**
 * Okno jako u zpráv (parkování / osobní předání).
 * Po Později samostatný box nad osou bez čísla (Přidat · Už neukazovat).
 */
export function usePlochaDotaz({
  lang,
  rezervace = null,
  token = null,
  vypnuto = false,
  blokovano = false,
}: Opts): { overlay: ReactNode; krok: ReactNode; posunOsy: number } {
  const [stav, setStav] = useState<PlochaStav>('nic');
  const [ready, setReady] = useState(false);
  const [navod, setNavod] = useState(false);
  const [hotovoHlaska, setHotovoHlaska] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const tt = (map: Parameters<typeof t>[0]) => t(map, lang);

  useEffect(() => {
    if (vypnuto || jeStandalone()) {
      setStav('hotovo');
      setReady(true);
      return;
    }
    // Náhled: ?plocha=okno znovu ukáže vyskakovací okno.
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('plocha') === 'okno') {
        ulozPlochaStav(rezervace, 'nic');
        setStav('nic');
        setNavod(false);
        setReady(true);
        return;
      }
    } catch {
      /* url */
    }
    setStav(nactiPlochaStav(rezervace));
    setReady(true);
  }, [rezervace, vypnuto]);

  useEffect(() => {
    if (vypnuto || !token) return;
    const enc = encodeURIComponent(token);
    const manifestHref = `/${enc}/manifest.webmanifest`;
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
    apple.href = '/pruvodce/va-logo-192.png';

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
    };
  }, [token, vypnuto]);

  function uloz(next: PlochaStav) {
    setStav(next);
    ulozPlochaStav(rezervace, next);
  }

  async function spustInstalaci() {
    const evt = deferred.current;
    if (evt) {
      try {
        await evt.prompt();
        const volba = await evt.userChoice;
        deferred.current = null;
        if (volba.outcome === 'accepted') {
          uloz('hotovo');
          setNavod(false);
          setHotovoHlaska(true);
          return;
        }
      } catch {
        /* systém */
      }
    }
    setNavod(true);
  }

  function naPozdeji() {
    uloz('později');
    setNavod(false);
  }

  function naSkryt() {
    uloz('skryto');
    setNavod(false);
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

  const ukazOverlay = !blokovano && (stav === 'nic' || navod);
  const ukazKrok = stav === 'později' && !navod;

  const overlay = ukazOverlay ? (
    <div className="pv-zprava-overlay" role="dialog" aria-modal="true" aria-labelledby="pv-plocha-dotaz">
      <div className="pv-zprava-overlay__karta pv-zprava-overlay__karta--prani">
        <p className="pv-zprava-overlay__krok">{tt(PT.plochaOverlayKrok)}</p>
        {navod ? (
          <>
            <h3 className="pv-zprava-overlay__nadpis" id="pv-plocha-dotaz">
              {tt(jeIos() ? PT.plochaNavodIosNadpis : PT.plochaNavodAndroidNadpis)}
            </h3>
            <p className="pv-zprava-overlay__text">
              {tt(jeIos() ? PT.plochaNavodIosKroky : PT.plochaNavodAndroidKroky)
                .split('\n')
                .map((radek, i) => (
                  <span key={i} className="pv-plocha-navod__radek">
                    {radek}
                  </span>
                ))}
            </p>
            <button
              type="button"
              className="pv-zprava-overlay__btn"
              onClick={() => {
                uloz('později');
                setNavod(false);
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
      </div>
    </div>
  ) : null;

  return { overlay, krok, posunOsy: 0 };
}
