'use client';

/**
 * Přidat na plochu / Poslat do dalšího telefonu na kartě klubu.
 * Vzor: nahled-plocha-uz-ma-3-verze.html sloupce A a B1.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '@/lib/i18n';
import {
  klubPlochaAAkce,
  klubPlochaANadpis,
  klubPlochaAPod,
  klubPlochaBAkce,
  klubPlochaBNadpis,
  klubPlochaBPod,
  klubPlochaSdileniUpozorneni,
} from '@/lib/klub-podekovani-texty';
import {
  jeAndroid,
  jeIos,
  jePwaNainstalovana,
  jeStandalone,
  nactiPlochaStav,
  posliPlochaNaServer,
  ulozPlochaStav,
} from '@/lib/plocha';
import {
  plochaChromeMenuTip,
  plochaNavodIosKroky,
  plochaNavodIosNadpis,
  plochaPridej,
  plochaZavrit,
} from '@/lib/plocha-texty';
import type { GuideLang } from '@/lib/types';
import { PridejNaPlochu } from './PridejNaPlochu';
import './klub-plocha-radek.scss';

type Stav = 'A' | 'B' | 'C';

type Props = {
  lang: GuideLang;
  /** Tajný klíč karty / token pro manifest. */
  token: string;
  odkazKarty: string;
};

/** Windows zkratka .url do Stažených (když prohlížeč nenabídne instalaci PWA). */
function stahniZkratkuPc(url: string) {
  const telo = `[InternetShortcut]\r\nURL=${url}\r\n`;
  const blob = new Blob([telo], { type: 'application/octet-stream' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = 'VIVIEN Klub.url';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1500);
}

function IkTelefonPlus() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M12 8v6M9 11h6" />
    </svg>
  );
}

function IkPoslat() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

export function KlubPlochaRadek({ lang, token, odkazKarty }: Props) {
  const [stav, setStav] = useState<Stav>('A');
  const [sdileni, setSdileni] = useState(false);
  const [spustPridej, setSpustPridej] = useState<(() => void) | null>(null);
  /**
   * Návod jen iPhone (rozhodnuto: Android nikdy návod, BIP / Chrome).
   * pc = výběr tlačítek v náhledu na počítači.
   * chrome = tip menu (Android bez BIP).
   * zkratka = PC: stažená .url zkratka do Stažených.
   */
  const [navod, setNavod] = useState<'nic' | 'ios' | 'pc' | 'chrome' | 'zkratka'>('nic');
  const [portalOk, setPortalOk] = useState(false);
  /** Ref, ať setTimeout po klepnutí PC nevidí starou hodnotu ze state. */
  const volbaPcRef = useRef(false);

  const prepocitej = useCallback(async () => {
    if (jeStandalone()) {
      setStav('C');
      return;
    }
    const lokal = nactiPlochaStav(token);
    const nainst = await jePwaNainstalovana();
    if (nainst || lokal === 'hotovo') setStav('B');
    else setStav('A');
  }, [token]);

  useEffect(() => {
    void prepocitej();
  }, [prepocitej]);

  useEffect(() => {
    setPortalOk(typeof document !== 'undefined');
  }, []);

  /** Stabilní callback – jinak PridejNaPlochu v useEffect spustí nekonečnou smyčku setState. */
  const onReady = useCallback((spust: () => void) => {
    setSpustPridej(() => spust);
  }, []);
  const onUzMate = useCallback(() => setStav('B'), []);
  const onTipChrome = useCallback(() => {
    if (volbaPcRef.current) {
      volbaPcRef.current = false;
      const url =
        odkazKarty.startsWith('http')
          ? odkazKarty
          : `${window.location.origin}/klub?k=${encodeURIComponent(token)}`;
      stahniZkratkuPc(url);
      ulozPlochaStav(token, 'hotovo');
      posliPlochaNaServer(token);
      setNavod('zkratka');
      setStav('B');
      return;
    }
    setNavod('chrome');
  }, [odkazKarty, token]);

  const klepPridej = useCallback(() => {
    /** Android: jen instalace, bez návodu. iPhone: návod Safari. */
    if (jeIos()) {
      setNavod('ios');
      return;
    }
    if (jeAndroid()) {
      setNavod('nic');
      spustPridej?.();
      return;
    }
    /** Počítač (náhled): tlačítka Android / PC / iPhone / Zavřít. */
    setNavod('pc');
  }, [spustPridej]);

  const spustAndroid = useCallback(() => {
    volbaPcRef.current = false;
    setNavod('nic');
    window.setTimeout(() => {
      spustPridej?.();
    }, 0);
  }, [spustPridej]);

  const spustPc = useCallback(() => {
    volbaPcRef.current = true;
    setNavod('nic');
    window.setTimeout(() => {
      spustPridej?.();
    }, 0);
  }, [spustPridej]);

  const poslat = useCallback(async () => {
    const url = odkazKarty;
    const text = `${t(klubPlochaSdileniUpozorneni, lang)}\n${url}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'VIVIEN Klub', text, url });
        return;
      }
    } catch {
      /* zrušeno / nepodporováno → panel */
    }
    setSdileni((v) => !v);
  }, [lang, odkazKarty]);

  const wa = () => {
    const msg = encodeURIComponent(`${t(klubPlochaSdileniUpozorneni, lang)}\n${odkazKarty}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener,noreferrer');
  };
  const sms = () => {
    const msg = encodeURIComponent(`${t(klubPlochaSdileniUpozorneni, lang)} ${odkazKarty}`);
    window.location.href = `sms:?&body=${msg}`;
  };
  const kopie = async () => {
    try {
      await navigator.clipboard.writeText(odkazKarty);
    } catch {
      /* ignore */
    }
  };

  const overlay =
    navod !== 'nic' && portalOk
      ? createPortal(
          <div
            className="klub-plocha-navod"
            role="dialog"
            aria-modal="true"
            aria-labelledby="klub-plocha-navod-h"
          >
            <div className="klub-plocha-navod__karta">
              {navod === 'ios' ? (
                <>
                  <h2 className="klub-plocha-navod__h" id="klub-plocha-navod-h">
                    {t(plochaNavodIosNadpis, lang)}
                  </h2>
                  <p className="klub-plocha-navod__text">
                    {t(plochaNavodIosKroky, lang)
                      .split('\n')
                      .map((radek, i) => (
                        <span key={i} className="klub-plocha-navod__radek">
                          {radek}
                        </span>
                      ))}
                  </p>
                </>
              ) : null}
              {navod === 'chrome' ? (
                <>
                  <h2 className="klub-plocha-navod__h" id="klub-plocha-navod-h">
                    {t(plochaPridej, lang)}
                  </h2>
                  <p className="klub-plocha-navod__tip">{t(plochaChromeMenuTip, lang)}</p>
                </>
              ) : null}
              {navod === 'zkratka' ? (
                <>
                  <h2 className="klub-plocha-navod__h" id="klub-plocha-navod-h">
                    {t(plochaPridej, lang)}
                  </h2>
                  <p className="klub-plocha-navod__text">
                    Zkratka je ve Stažených souborech. Přetáhněte ji na plochu.
                  </p>
                </>
              ) : null}
              {navod === 'pc' ? (
                <>
                  <h2 className="klub-plocha-navod__h" id="klub-plocha-navod-h">
                    {t(plochaPridej, lang)}
                  </h2>
                  <button
                    type="button"
                    className="klub-plocha-navod__ok"
                    onClick={spustAndroid}
                  >
                    Přidat na plochu Android
                  </button>
                  <button type="button" className="klub-plocha-navod__ok" onClick={spustPc}>
                    Přidat na plochu PC
                  </button>
                  <button
                    type="button"
                    className="klub-plocha-navod__vedlejsi"
                    onClick={() => setNavod('ios')}
                  >
                    Ukázat návod pro iPhone
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className={navod === 'ios' ? 'klub-plocha-navod__ok' : 'klub-plocha-navod__zavrit'}
                onClick={() => setNavod('nic')}
              >
                {t(plochaZavrit, lang)}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="klub-plocha">
      {/* Skrytý helper jen pro BIP / manifest. Návod je v portálu výše. */}
      <div className="klub-plocha__helper" aria-hidden>
        <PridejNaPlochu
          lang={lang}
          token={token}
          manifestHref={`/klub/manifest.webmanifest?k=${encodeURIComponent(token)}`}
          jenMobil
          skrytTlacitko
          onReady={onReady}
          onHotovo={prepocitej}
          onUzMate={onUzMate}
          onTipChrome={onTipChrome}
        />
      </div>

      {stav === 'A' ? (
        <button type="button" className="klub-plocha__r klub-plocha__r--A" onClick={klepPridej}>
          <IkTelefonPlus />
          <div>
            <b>{t(klubPlochaANadpis, lang)}</b>
            <span>{t(klubPlochaAPod, lang)}</span>
          </div>
          <i>{t(klubPlochaAAkce, lang)}</i>
        </button>
      ) : null}

      {stav === 'B' ? (
        <button type="button" className="klub-plocha__r klub-plocha__r--B1" onClick={() => void poslat()}>
          <IkPoslat />
          <div>
            <b>{t(klubPlochaBNadpis, lang)}</b>
            <span>{t(klubPlochaBPod, lang)}</span>
          </div>
          <i>{t(klubPlochaBAkce, lang)}</i>
        </button>
      ) : null}

      {stav === 'C' ? (
        <button type="button" className="klub-plocha__r klub-plocha__r--B1" onClick={() => void poslat()}>
          <IkPoslat />
          <div>
            <b>{t(klubPlochaBNadpis, lang)}</b>
          </div>
          <i>{t(klubPlochaBAkce, lang)}</i>
        </button>
      ) : null}

      {sdileni ? (
        <div className="klub-plocha__share">
          <p>{t(klubPlochaSdileniUpozorneni, lang)}</p>
          <button type="button" onClick={wa}>
            WhatsApp
          </button>
          <button type="button" onClick={sms}>
            SMS
          </button>
          <button type="button" onClick={() => void kopie()}>
            Kopírovat
          </button>
        </div>
      ) : null}

      {overlay}
    </div>
  );
}
