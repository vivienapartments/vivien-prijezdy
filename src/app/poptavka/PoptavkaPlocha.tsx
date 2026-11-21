'use client';

import { useEffect, useRef, useState } from 'react';
import { t } from '@/lib/i18n';
import { jeIos, jeStandalone } from '@/lib/plocha';
import {
  plochaIosNedostupneNadpis,
  plochaIosNedostupneText,
  plochaNavodAndroidKroky,
  plochaNavodAndroidNadpis,
  plochaPridej,
  plochaZavrit,
} from '@/lib/plocha-texty';
import type { GuideLang, LText } from '@/lib/types';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const hotovoPoptavka: LText = {
  cs: 'Hotovo. Poptávku najdete na ploše telefonu.',
  en: 'Done. You will find the request form on your phone home screen.',
  de: 'Fertig. Die Anfrage finden Sie auf dem Startbildschirm.',
  pl: 'Gotowe. Zapytanie znajdziecie na ekranie telefonu.',
  uk: 'Готово. Запит буде на екрані телефону.',
  'zh-Hant': '完成。詢問表單會出現在手機主畫面。',
  sv: 'Klart. Förfrågan finns på telefonens hemskärm.',
  es: 'Listo. La solicitud estará en la pantalla del teléfono.',
  hu: 'Kész. A kérés a telefon kezdőképernyőjén lesz.',
  da: 'Færdig. Forespørgslen ligger på telefonens hjemmeskærm.',
  fr: 'C’est fait. La demande est sur l’écran d’accueil du téléphone.',
  it: 'Fatto. La richiesta è sulla schermata del telefono.',
  pt: 'Feito. O pedido fica no ecrã do telemóvel.',
};

type Props = { lang: GuideLang };

/**
 * Tlačítko Přidat na plochu u poptávky.
 * Android: beforeinstallprompt / návod. iPhone: omluva (Apple to z odkazu nepovoluje).
 */
export function PoptavkaPlocha({ lang }: Props) {
  const [standalone, setStandalone] = useState(true);
  const [ios, setIos] = useState(false);
  const [navod, setNavod] = useState(false);
  const [hotovo, setHotovo] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const tt = (map: LText) => t(map, lang);

  useEffect(() => {
    setStandalone(jeStandalone());
    setIos(jeIos());
    if (jeStandalone()) return;

    const start =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}` || '/poptavka'
        : '/poptavka';
    const manifest = {
      name: 'VIVIEN poptávka',
      short_name: 'VIVIEN',
      start_url: start,
      scope: '/poptavka',
      display: 'standalone',
      background_color: '#12100e',
      theme_color: '#1c1712',
      lang: 'cs',
      icons: [
        {
          src: '/pruvodce/va-logo-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
      ],
    };
    const blobUrl = URL.createObjectURL(
      new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }),
    );
    let link = document.querySelector<HTMLLinkElement>('link[data-vivien-poptavka-manifest]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      link.setAttribute('data-vivien-poptavka-manifest', '1');
      document.head.appendChild(link);
    }
    link.href = blobUrl;

    let apple = document.querySelector<HTMLLinkElement>('link[data-vivien-poptavka-apple]');
    if (!apple) {
      apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.setAttribute('data-vivien-poptavka-apple', '1');
      document.head.appendChild(apple);
    }
    apple.href = '/pruvodce/va-logo-192.png';

    let capable = document.querySelector<HTMLMetaElement>('meta[data-vivien-poptavka-capable]');
    if (!capable) {
      capable = document.createElement('meta');
      capable.name = 'apple-mobile-web-app-capable';
      capable.content = 'yes';
      capable.setAttribute('data-vivien-poptavka-capable', '1');
      document.head.appendChild(capable);
    }

    let title = document.querySelector<HTMLMetaElement>('meta[data-vivien-poptavka-title]');
    if (!title) {
      title = document.createElement('meta');
      title.name = 'apple-mobile-web-app-title';
      title.content = 'VIVIEN';
      title.setAttribute('data-vivien-poptavka-title', '1');
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
  }, []);

  async function naPridej() {
    if (ios || jeIos()) {
      setNavod(true);
      return;
    }
    const evt = deferred.current;
    if (evt) {
      try {
        await evt.prompt();
        const volba = await evt.userChoice;
        deferred.current = null;
        if (volba.outcome === 'accepted') {
          setNavod(false);
          setHotovo(true);
          return;
        }
      } catch {
        /* systém */
      }
    }
    setNavod(true);
  }

  if (standalone) return null;

  return (
    <>
      <button type="button" className="pp__btn pp__btn--sms pp__btn--mensi" onClick={() => void naPridej()}>
        {tt(plochaPridej)}
      </button>

      {navod || hotovo ? (
        <div className="pp__plocha-overlay" role="dialog" aria-modal="true">
          <div className="pp__plocha-karta">
            {hotovo ? (
              <>
                <h2 className="pp__plocha-nadpis">{tt(hotovoPoptavka)}</h2>
                <button type="button" className="pp__btn pp__btn--hlavni" onClick={() => setHotovo(false)}>
                  {tt(plochaZavrit)}
                </button>
              </>
            ) : ios ? (
              <>
                <h2 className="pp__plocha-nadpis">{tt(plochaIosNedostupneNadpis)}</h2>
                <p className="pp__plocha-text">{tt(plochaIosNedostupneText)}</p>
                <button type="button" className="pp__btn pp__btn--hlavni" onClick={() => setNavod(false)}>
                  {tt(plochaZavrit)}
                </button>
              </>
            ) : (
              <>
                <h2 className="pp__plocha-nadpis">{tt(plochaNavodAndroidNadpis)}</h2>
                <p className="pp__plocha-text">
                  {tt(plochaNavodAndroidKroky)
                    .split('\n')
                    .map((radek, i) => (
                      <span key={i} className="pp__plocha-radek">
                        {radek}
                      </span>
                    ))}
                </p>
                <button type="button" className="pp__btn pp__btn--hlavni" onClick={() => setNavod(false)}>
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
