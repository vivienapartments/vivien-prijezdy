'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '@/lib/i18n';
import {
  jeAndroid,
  jeIos,
  jeStandalone,
  maVchromeParam,
  otevriStejnouStrankuVChrome,
} from '@/lib/plocha';
import {
  plochaChromeMenuTip,
  plochaHotovo,
  plochaNavodIosKroky,
  plochaNavodIosNadpis,
  plochaPridej,
  plochaZavrit,
} from '@/lib/plocha-texty';
import type { GuideLang, LText } from '@/lib/types';
import './pridej-na-plochu.scss';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Props = {
  lang: GuideLang;
  /** Token odkazu hosta → skutečný manifest `/{token}/manifest.webmanifest`. */
  token?: string | null;
  /** Jen telefon. Na PC se tlačítko neukáže (výzva z ?plocha=1 ano). */
  jenMobil?: boolean;
  /** Menší / tišší (např. dole u poděkování). */
  tichy?: boolean;
  /** Lokální náhled: tlačítko vždy vidět. */
  nahled?: boolean;
  /** Skrýt volné tlačítko (výzva jen přes překryv / řádek 3). */
  skrytTlacitko?: boolean;
  /** Překryv se zlatým „Přidat na plochu“ (?plocha=1 nebo klepnutí na řádek). */
  vyzva?: boolean;
  onVyzvaZmena?: (otevreno: boolean) => void;
  nazev?: string;
  shortNazev?: string;
};

/** HTTPS manifest hosta. Blob ne (start_url vůči blob: nejde složit). */
function hrefManifestu(token: string | null | undefined): string | null {
  const raw = (token || '').trim();
  if (!raw) return null;
  return `/${encodeURIComponent(raw)}/manifest.webmanifest`;
}

function jeMobilZarizeni(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(max-width: 820px)').matches) return true;
  } catch {
    /* media */
  }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent || '');
}

/**
 * Přidat na plochu.
 * ?plocha=1 / výzva: jen překryv + zlaté tlačítko (žádné automatické spuštění).
 * Android: beforeinstallprompt, jinak Chrome (intent), v Chrome bez smyčky + tip po 3 s.
 * iPhone: krátký návod Safari.
 * Manifest: skutečná HTTPS route `/{token}/manifest.webmanifest` (ne blob).
 */
export function PridejNaPlochu({
  lang,
  token = null,
  jenMobil = true,
  tichy = false,
  nahled = false,
  skrytTlacitko = false,
  vyzva = false,
  onVyzvaZmena,
  shortNazev = 'VIVIEN',
}: Props) {
  const [ready, setReady] = useState(false);
  const [standalone, setStandalone] = useState(true);
  const [mobil, setMobil] = useState(false);
  const [ios, setIos] = useState(false);
  const [hlaska, setHlaska] = useState<'nic' | 'ios' | 'hotovo'>('nic');
  const [tipChrome, setTipChrome] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const tt = useCallback((map: LText) => t(map, lang), [lang]);

  useEffect(() => {
    setStandalone(jeStandalone());
    setIos(jeIos());
    setMobil(jeMobilZarizeni());
    setReady(true);
    if (jeStandalone()) return;

    const manifestHref = hrefManifestu(token);
    let link = document.querySelector<HTMLLinkElement>('link[data-vivien-pridej-manifest]');
    if (manifestHref) {
      if (!link) {
        link = document.createElement('link');
        link.rel = 'manifest';
        link.setAttribute('data-vivien-pridej-manifest', '1');
        document.head.appendChild(link);
      }
      link.href = manifestHref;
    } else if (link) {
      link.remove();
    }

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
      setTipChrome(false);
    }
    window.addEventListener('beforeinstallprompt', onBip);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
    };
  }, [token, shortNazev]);

  /**
   * Tip do menu jen když už jsme v plném Chrome (`vchrome=1`)
   * a BIP nepřijde do 3 s. V Custom Tabu tip nedává smysl.
   */
  useEffect(() => {
    if (!vyzva || !ready) return;
    if (jeIos() || jeStandalone()) return;
    if (!maVchromeParam()) return;
    if (deferred.current) {
      setTipChrome(false);
      return;
    }
    setTipChrome(false);
    const tmr = window.setTimeout(() => {
      if (!deferred.current) setTipChrome(true);
    }, 3000);
    return () => window.clearTimeout(tmr);
  }, [vyzva, ready]);

  async function spustInstalaci() {
    if (ios || jeIos()) {
      setHlaska('ios');
      onVyzvaZmena?.(false);
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
          onVyzvaZmena?.(false);
          return;
        }
        return;
      } catch {
        /* systém */
      }
    }
    // Custom Tab / Gmail / Seznam: vždy intent do Chrome (smyčku drží vchrome=1).
    if (jeAndroid() && !maVchromeParam()) {
      otevriStejnouStrankuVChrome({ plocha: true });
      return;
    }
    setTipChrome(true);
  }

  function zavritVyzvu() {
    onVyzvaZmena?.(false);
  }

  if (!nahled && (!ready || standalone)) return null;
  if (!nahled && !vyzva && jenMobil && !mobil) return null;

  const ukazTlacitko = !skrytTlacitko && !vyzva;
  const ukazVyzvu = vyzva && hlaska === 'nic';

  return (
    <>
      {ukazTlacitko ? (
        <button
          type="button"
          className={`pv-pridej-plochu${tichy ? ' pv-pridej-plochu--tichy' : ''}`}
          onClick={() => void spustInstalaci()}
        >
          {tt(plochaPridej)}
        </button>
      ) : null}

      {ukazVyzvu ? (
        <div className="pv-pridej-overlay" role="dialog" aria-modal="true">
          <div className="pv-pridej-karta">
            <button
              type="button"
              className="pv-pridej-zlato"
              onClick={() => void spustInstalaci()}
            >
              {tt(plochaPridej)}
            </button>
            {tipChrome ? <p className="pv-pridej-tip">{tt(plochaChromeMenuTip)}</p> : null}
            <button type="button" className="pv-pridej-zavrit-link" onClick={zavritVyzvu}>
              {tt(plochaZavrit)}
            </button>
          </div>
        </div>
      ) : null}

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
