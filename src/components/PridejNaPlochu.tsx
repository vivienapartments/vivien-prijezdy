'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '@/lib/i18n';
import { jeIos, jeStandalone, otevriStejnouStrankuVChrome } from '@/lib/plocha';
import {
  plochaHotovo,
  plochaNavodIosKroky,
  plochaNavodIosNadpis,
  plochaPridej,
  plochaZavrit,
} from '@/lib/plocha-texty';
import type { GuideLang, LText } from '@/lib/types';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Props = {
  lang: GuideLang;
  /** Jen telefon. Na PC se tlačítko neukáže. */
  jenMobil?: boolean;
  /** Menší / tišší (např. dole u poděkování). */
  tichy?: boolean;
  /** Lokální náhled: tlačítko vždy vidět. */
  nahled?: boolean;
  nazev?: string;
  shortNazev?: string;
};

function jeMobilZarizeni(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(max-width: 820px)').matches) return true;
  } catch {
    /* media */
  }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent || '');
}

const IKONY = [
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
] as const;

/**
 * Tlačítko Přidat na plochu (Děkujeme / tiše).
 * Android: beforeinstallprompt, jinak rovnou Chrome (žádný návod).
 * iPhone: krátký návod Safari.
 */
export function PridejNaPlochu({
  lang,
  jenMobil = true,
  tichy = false,
  nahled = false,
  nazev = 'VIVIEN průvodce',
  shortNazev = 'VIVIEN',
}: Props) {
  const [ready, setReady] = useState(false);
  const [standalone, setStandalone] = useState(true);
  const [mobil, setMobil] = useState(false);
  const [ios, setIos] = useState(false);
  const [hlaska, setHlaska] = useState<'nic' | 'ios' | 'hotovo'>('nic');
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const tt = useCallback((map: LText) => t(map, lang), [lang]);

  useEffect(() => {
    setStandalone(jeStandalone());
    setIos(jeIos());
    setMobil(jeMobilZarizeni());
    setReady(true);
    if (jeStandalone()) return;

    const start =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}` || '/'
        : '/';
    const manifest = {
      name: nazev,
      short_name: shortNazev,
      start_url: start,
      scope: '/',
      display: 'standalone',
      background_color: '#1c1712',
      theme_color: '#1c1712',
      lang: 'cs',
      icons: [...IKONY],
    };
    const blobUrl = URL.createObjectURL(
      new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }),
    );
    let link = document.querySelector<HTMLLinkElement>('link[data-vivien-pridej-manifest]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      link.setAttribute('data-vivien-pridej-manifest', '1');
      document.head.appendChild(link);
    }
    link.href = blobUrl;

    let apple = document.querySelector<HTMLLinkElement>('link[data-vivien-pridej-apple]');
    if (!apple) {
      apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.setAttribute('data-vivien-pridej-apple', '1');
      document.head.appendChild(apple);
    }
    apple.href = '/prehled/apple-icon.png';

    let capable = document.querySelector<HTMLMetaElement>('meta[data-vivien-pridej-capable]');
    if (!capable) {
      capable = document.createElement('meta');
      capable.name = 'apple-mobile-web-app-capable';
      capable.content = 'yes';
      capable.setAttribute('data-vivien-pridej-capable', '1');
      document.head.appendChild(capable);
    }

    let title = document.querySelector<HTMLMetaElement>('meta[data-vivien-pridej-title]');
    if (!title) {
      title = document.createElement('meta');
      title.name = 'apple-mobile-web-app-title';
      title.content = shortNazev;
      title.setAttribute('data-vivien-pridej-title', '1');
      document.head.appendChild(title);
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
      URL.revokeObjectURL(blobUrl);
    };
  }, [nazev, shortNazev]);

  async function naPridej() {
    if (ios || jeIos()) {
      setHlaska('ios');
      return;
    }
    const evt = deferred.current;
    if (evt) {
      try {
        await evt.prompt();
        const volba = await evt.userChoice;
        deferred.current = null;
        if (volba.outcome === 'accepted') {
          setHlaska('hotovo');
          return;
        }
        return;
      } catch {
        /* systém */
      }
    }
    otevriStejnouStrankuVChrome();
  }

  if (!nahled && (!ready || standalone)) return null;
  if (!nahled && jenMobil && !mobil) return null;

  return (
    <>
      <button
        type="button"
        className={`pv-pridej-plochu${tichy ? ' pv-pridej-plochu--tichy' : ''}`}
        onClick={() => void naPridej()}
      >
        {tt(plochaPridej)}
      </button>

      {hlaska !== 'nic' ? (
        <div className="pv-pridej-overlay" role="dialog" aria-modal="true">
          <div className="pv-pridej-karta">
            {hlaska === 'hotovo' ? (
              <>
                <h2 className="pv-pridej-nadpis">{tt(plochaHotovo)}</h2>
                <button type="button" className="pv-pridej-ok" onClick={() => setHlaska('nic')}>
                  {tt(plochaZavrit)}
                </button>
              </>
            ) : (
              <>
                <h2 className="pv-pridej-nadpis">{tt(plochaNavodIosNadpis)}</h2>
                <p className="pv-pridej-text">
                  {tt(plochaNavodIosKroky)
                    .split('\n')
                    .map((radek, i) => (
                      <span key={i} className="pv-pridej-radek">
                        {radek}
                      </span>
                    ))}
                </p>
                <button type="button" className="pv-pridej-ok" onClick={() => setHlaska('nic')}>
                  {tt(plochaZavrit)}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
