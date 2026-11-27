'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '@/lib/i18n';
import {
  jeAndroid,
  jeIos,
  jePwaNainstalovana,
  jeStandalone,
  maVchromeParam,
  otevriStejnouStrankuVChrome,
  posliPlochaNaServer,
  ulozPlochaStav,
} from '@/lib/plocha';
import {
  plochaChromeMenuTip,
  plochaDokoncit,
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
  /** Vlastní cesta k manifestu (např. karta Clubu `/klub/manifest.webmanifest?k=`). */
  manifestHref?: string | null;
  /** Scope service workeru. Club: `/klub`, ať se neplete s Adminem. */
  swScope?: string | null;
  /** Jen telefon. Na PC se tlačítko neukáže (výzva z ?plocha=1 ano). */
  jenMobil?: boolean;
  /** Menší / tišší (např. dole u poděkování). */
  tichy?: boolean;
  /** Lokální náhled: tlačítko vždy vidět. */
  nahled?: boolean;
  /** Skrýt volné tlačítko (výzva jen přes překryv / řádek 3). */
  skrytTlacitko?: boolean;
  /** Překryv se zlatým „Přidat na plochu“ (?plocha=1). */
  vyzva?: boolean;
  onVyzvaZmena?: (otevreno: boolean) => void;
  /** Po úspěšném přidání / tiché zjištění instalace. */
  onHotovo?: () => void;
  /** Klepnutí zjistilo, že už je na ploše → hlášku ukáže Expired. */
  onUzMate?: () => void;
  /** Řádek 3: spustí instalaci rovnou, bez našeho překryvu. */
  onReady?: (spust: () => void) => void;
  /** Když Chrome nenabídne BIP (typicky PC náhled), ať rodič ukáže tip. */
  onTipChrome?: () => void;
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
 * Hlášku „už máte“ ukazuje jen Expired (onUzMate / ?plocha=1).
 * Manifest: HTTPS `/{token}/manifest.webmanifest`.
 */
export function PridejNaPlochu({
  lang,
  token = null,
  manifestHref = null,
  swScope = null,
  jenMobil = true,
  tichy = false,
  nahled = false,
  skrytTlacitko = false,
  vyzva = false,
  onVyzvaZmena,
  onHotovo,
  onUzMate,
  onReady,
  onTipChrome,
  shortNazev = 'VIVIEN',
}: Props) {
  const [ready, setReady] = useState(false);
  const [standalone, setStandalone] = useState(true);
  const [mobil, setMobil] = useState(false);
  const [ios, setIos] = useState(false);
  const [vchrome, setVchrome] = useState(false);
  const [hlaska, setHlaska] = useState<'nic' | 'ios'>('nic');
  const [tipChrome, setTipChrome] = useState(false);
  const [portalOk, setPortalOk] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const tt = useCallback((map: LText) => t(map, lang), [lang]);

  useEffect(() => {
    setPortalOk(typeof document !== 'undefined');
  }, []);

  const ukazTipChrome = useCallback(() => {
    setTipChrome(true);
    onTipChrome?.();
  }, [onTipChrome]);

  const oznacHotovo = useCallback(() => {
    ulozPlochaStav(token, 'hotovo');
    posliPlochaNaServer(token);
    deferred.current = null;
    setTipChrome(false);
    onVyzvaZmena?.(false);
    onHotovo?.();
  }, [token, onVyzvaZmena, onHotovo]);

  const spustInstalaci = useCallback(async () => {
    if (ios || jeIos()) {
      setHlaska('ios');
      onVyzvaZmena?.(false);
      return;
    }
    if (await jePwaNainstalovana()) {
      ulozPlochaStav(token, 'hotovo');
      posliPlochaNaServer(token);
      onVyzvaZmena?.(false);
      onUzMate?.();
      onHotovo?.();
      return;
    }
    const evt = deferred.current;
    if (evt) {
      try {
        await evt.prompt();
        const volba = await evt.userChoice;
        deferred.current = null;
        if (volba.outcome === 'accepted') {
          oznacHotovo();
          return;
        }
        return;
      } catch {
        /* systém */
      }
    }
    if (jeAndroid() && !maVchromeParam()) {
      otevriStejnouStrankuVChrome({ plocha: true });
      return;
    }
    ukazTipChrome();
  }, [ios, token, onVyzvaZmena, onHotovo, onUzMate, oznacHotovo, ukazTipChrome]);

  useEffect(() => {
    setStandalone(jeStandalone());
    setIos(jeIos());
    setMobil(jeMobilZarizeni());
    setVchrome(maVchromeParam());
    setReady(true);
    if (jeStandalone()) {
      ulozPlochaStav(token, 'hotovo');
      posliPlochaNaServer(token);
      onHotovo?.();
      return;
    }

    let zruseno = false;
    void (async () => {
      const nainstalovano = await jePwaNainstalovana();
      if (zruseno || !nainstalovano) return;
      /* Bez vlastního překryvu „už máte“ — to dělá jen Expired. */
      ulozPlochaStav(token, 'hotovo');
      posliPlochaNaServer(token);
      onVyzvaZmena?.(false);
      onHotovo?.();
    })();

    const href = (manifestHref || '').trim() || hrefManifestu(token);
    let link = document.querySelector<HTMLLinkElement>('link[data-vivien-pridej-manifest]');
    if (href) {
      if (!link) {
        link = document.createElement('link');
        link.rel = 'manifest';
        link.setAttribute('data-vivien-pridej-manifest', '1');
        document.head.appendChild(link);
      }
      link.href = href;
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
      const scope = (swScope || '').trim() || '/';
      void navigator.serviceWorker.register('/sw-pruvodce.js', { scope }).catch(() => undefined);
    }

    function onBip(e: Event) {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setTipChrome(false);
    }
    function onAppInstalled() {
      oznacHotovo();
    }
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      zruseno = true;
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [token, manifestHref, swScope, shortNazev, onHotovo, onVyzvaZmena, oznacHotovo]);

  useEffect(() => {
    if (!ready) return;
    onReady?.(() => {
      void spustInstalaci();
    });
  }, [ready, onReady, spustInstalaci]);

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
      if (!deferred.current) ukazTipChrome();
    }, 3000);
    return () => window.clearTimeout(tmr);
  }, [vyzva, ready, ukazTipChrome]);

  function zavritVyzvu() {
    onVyzvaZmena?.(false);
  }

  if (!nahled && (!ready || standalone)) return null;
  /** Na PC skryj volné tlačítko, ale překryv (iOS návod / tip Chrome) po klepnutí z karty ukaž. */
  if (!nahled && !vyzva && jenMobil && !mobil && hlaska === 'nic' && !tipChrome) return null;

  const ukazTlacitko = !skrytTlacitko && !vyzva && hlaska === 'nic';
  const ukazVyzvu = vyzva && hlaska === 'nic';
  const tlacitkoText = vchrome ? tt(plochaDokoncit) : tt(plochaPridej);
  /** Překryvy vždy do body. Jinak je clip u skrytého helperu na kartě schová. */
  const prekryvy =
    portalOk &&
    createPortal(
      <>
        {ukazVyzvu ? (
          <div className="pv-pridej-overlay" role="dialog" aria-modal="true">
            <div className="pv-pridej-karta">
              <button
                type="button"
                className="pv-pridej-zlato"
                onClick={() => void spustInstalaci()}
              >
                {tlacitkoText}
              </button>
              {tipChrome ? <p className="pv-pridej-tip">{tt(plochaChromeMenuTip)}</p> : null}
              <button type="button" className="pv-pridej-zavrit-link" onClick={zavritVyzvu}>
                {tt(plochaZavrit)}
              </button>
            </div>
          </div>
        ) : null}

        {hlaska === 'ios' ? (
          <div className="pv-pridej-overlay" role="dialog" aria-modal="true">
            <div className="pv-pridej-karta">
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
            </div>
          </div>
        ) : null}

        {tipChrome && !ukazVyzvu && hlaska === 'nic' && !onTipChrome ? (
          <div className="pv-pridej-overlay" role="dialog" aria-modal="true">
            <div className="pv-pridej-karta">
              <p className="pv-pridej-tip">{tt(plochaChromeMenuTip)}</p>
              <button type="button" className="pv-pridej-ok" onClick={() => setTipChrome(false)}>
                {tt(plochaZavrit)}
              </button>
            </div>
          </div>
        ) : null}
      </>,
      document.body,
    );

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
      {prekryvy}
    </>
  );
}
