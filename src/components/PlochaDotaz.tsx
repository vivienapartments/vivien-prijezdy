'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { t } from '@/lib/i18n';
import {
  jeIos,
  jeStandalone,
  nactiPlochaStav,
  otevriStejnouStrankuVChrome,
  ulozPlochaStav,
  type PlochaStav,
} from '@/lib/plocha';
import * as PT from '@/lib/plocha-texty';
import type { GuideLang } from '@/lib/types';

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
};

/**
 * Okno přes celou obrazovku, jako u osobního předání / zpráv.
 * Nejdřív Ano / Později. Po Později box v průvodci.
 */
export function usePlochaDotaz({
  lang,
  rezervace = null,
  token = null,
  vypnuto = false,
  blokovano = false,
  jenMobil = true,
}: Opts): { overlay: ReactNode; krok: ReactNode; posunOsy: number } {
  const [stav, setStav] = useState<PlochaStav>('nic');
  const [ready, setReady] = useState(false);
  /** nic = hlavní dotaz; ios = krátký návod Safari; null = zavřeno */
  const [poAno, setPoAno] = useState<'nic' | 'ios' | null>(null);
  const [hotovoHlaska, setHotovoHlaska] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const tt = (map: Parameters<typeof t>[0]) => t(map, lang);

  useEffect(() => {
    if (vypnuto || jeStandalone()) {
      setStav('hotovo');
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
        setReady(true);
        return;
      }
    } catch {
      /* url */
    }
    if (jenMobil && !jeMobilZarizeni()) {
      setStav('hotovo');
      setReady(true);
      return;
    }
    setStav(nactiPlochaStav(rezervace));
    setReady(true);
  }, [rezervace, vypnuto, jenMobil]);

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
  }

  function naSkryt() {
    uloz('skryto');
    setPoAno(null);
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

  const ukazOverlay = !blokovano && (stav === 'nic' || poAno != null);
  const ukazKrok = stav === 'později' && poAno == null;

  const overlay = ukazOverlay ? (
    <div className="pv-zprava-overlay" role="dialog" aria-modal="true" aria-labelledby="pv-plocha-dotaz">
      <div className="pv-zprava-overlay__karta pv-zprava-overlay__karta--prani">
        <p className="pv-zprava-overlay__krok">{tt(PT.plochaOverlayKrok)}</p>
        {poAno === 'ios' ? (
          <>
            <h3 className="pv-zprava-overlay__nadpis" id="pv-plocha-dotaz">
              {tt(PT.plochaNavodIosNadpis)}
            </h3>
            <p className="pv-zprava-overlay__text pv-plocha-navod">{tt(PT.plochaNavodIosKroky)}</p>
            <button
              type="button"
              className="pv-zprava-overlay__btn"
              onClick={() => {
                uloz('později');
                setPoAno(null);
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
