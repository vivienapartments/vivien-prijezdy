'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { t } from '@/lib/i18n';
import { jeIos, jeStandalone, otevriStejnouStrankuVChrome } from '@/lib/plocha';
import {
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

export const hotovoPoptavka: LText = {
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
  fi: 'Valmista. Tiedustelulomake löytyy puhelimen kotinäytöltä.',
  fr: 'C’est fait. La demande est sur l’écran d’accueil du téléphone.',
  it: 'Fatto. La richiesta è sulla schermata del telefono.',
  pt: 'Feito. O pedido fica no ecrã do telemóvel.',
};

type Ctx = {
  standalone: boolean;
  naPridej: () => void;
  lang: GuideLang;
};

const PlochaCtx = createContext<Ctx | null>(null);

type RootProps = { lang: GuideLang; children: ReactNode };

/**
 * Jednou nastaví manifest. Tlačítko Přidat na plochu může být na začátku i dole.
 * Android: beforeinstallprompt, jinak Chrome (bez návodu). iPhone: krátký návod Safari.
 */
export function PoptavkaPlochaRoot({ lang, children }: RootProps) {
  const [standalone, setStandalone] = useState(true);
  const [ios, setIos] = useState(false);
  const [navod, setNavod] = useState(false);
  const [hotovo, setHotovo] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const tt = useCallback((map: LText) => t(map, lang), [lang]);

  useEffect(() => {
    setStandalone(jeStandalone());
    setIos(jeIos());
    if (jeStandalone()) return;

    const start =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}` || '/poptavka'
        : '/poptavka';
    const manifest = {
      name: 'VIVIEN Club',
      short_name: 'VIVIEN Club',
      start_url: start,
      scope: '/poptavka',
      display: 'standalone',
      background_color: '#12100e',
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
    apple.href = '/prehled/apple-icon.png';

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
      title.setAttribute('data-vivien-poptavka-title', '1');
      document.head.appendChild(title);
    }
    title.content = 'VIVIEN Club';

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

  const naPridej = useCallback(() => {
    void (async () => {
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
          return;
        } catch {
          /* systém */
        }
      }
      otevriStejnouStrankuVChrome();
    })();
  }, [ios]);

  const ctx = useMemo(() => ({ standalone, naPridej, lang }), [standalone, naPridej, lang]);

  return (
    <PlochaCtx.Provider value={ctx}>
      {children}
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
            ) : (
              <>
                <h2 className="pp__plocha-nadpis">{tt(plochaNavodIosNadpis)}</h2>
                <p className="pp__plocha-text">
                  {tt(plochaNavodIosKroky)
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
    </PlochaCtx.Provider>
  );
}

export const plochaVetaDekujeme: LText = {
  cs: 'Mějte nás na ploše telefonu. Další pobyt pak poptáte bez hledání.',
  en: 'Keep us on your phone home screen. You can then request your next stay without searching.',
  de: 'Haben Sie uns auf dem Startbildschirm. Den nächsten Aufenthalt fragen Sie dann ohne Suchen an.',
  pl: 'Miejcie nas na ekranie telefonu. Kolejny pobyt zapytacie wtedy bez szukania.',
  uk: 'Майте нас на екрані телефону. Наступне перебування тоді запитаєте без пошуку.',
  'zh-Hant': '把我們放在手機主畫面。下次入住就不用再找。',
  sv: 'Ha oss på telefonens hemskärm. Nästa vistelse frågar ni då utan att söka.',
  es: 'Téngannos en la pantalla del teléfono. La próxima estancia la piden entonces sin buscar.',
  hu: 'Legyünk a telefon kezdőképernyőjén. A következő tartózkodást akkor keresés nélkül kérheti.',
  da: 'Hav os på telefonens hjemmeskærm. Næste ophold spørger I så om uden at lede.',
  fi: 'Pitäkää meidät puhelimen kotinäytöllä. Seuraavaa majoitusta voi sitten tiedustella ilman etsimistä.',
  fr: 'Gardez-nous sur l’écran d’accueil. Le prochain séjour se demande alors sans chercher.',
  it: 'Teneteci sulla schermata del telefono. Il prossimo soggiorno lo chiedete allora senza cercare.',
  pt: 'Tenha-nos no ecrã do telemóvel. A próxima estadia pede-se então sem procurar.',
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

/** Tlačítko. Může být na začátku i dole. */
export function PoptavkaPlochaTlacitko({
  vyrazne = false,
  sTelefonem = false,
}: {
  vyrazne?: boolean;
  /** Děkujeme věrnosti: zlaté tlačítko s ikonou + popis pod ním. */
  sTelefonem?: boolean;
}) {
  const ctx = useContext(PlochaCtx);
  const [mobil, setMobil] = useState(false);

  useEffect(() => {
    setMobil(jeMobilZarizeni());
  }, []);

  if (!ctx || ctx.standalone || !mobil) return null;
  const popisek = t(plochaPridej, ctx.lang);
  if (sTelefonem) {
    return (
      <div className="pp__plocha-dekujeme">
        <button type="button" className="pp__btn pp__btn--plocha-zlato" onClick={ctx.naPridej}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <rect
              x="7"
              y="2"
              width="10"
              height="20"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path d="M11 18h2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span>{popisek}</span>
        </button>
        <p className="pp__plocha-veta">{t(plochaVetaDekujeme, ctx.lang)}</p>
      </div>
    );
  }
  return (
    <button
      type="button"
      className={vyrazne ? 'pp__btn pp__btn--sms' : 'pp__btn pp__btn--sms pp__btn--mensi'}
      onClick={ctx.naPridej}
    >
      {popisek}
    </button>
  );
}
