'use client';

/**
 * Přidat na plochu / Poslat do dalšího telefonu na kartě klubu.
 * Vzor: nahled-plocha-uz-ma-3-verze.html sloupce A a B1.
 */

import { useCallback, useEffect, useState } from 'react';
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
  jeIos,
  jeStandalone,
  nactiPlochaStav,
  ulozPlochaStav,
  zjistiPwaNaPlose,
} from '@/lib/plocha';
import {
  plochaChromeMenuTip,
  plochaNavodIosKroky,
  plochaNavodIosNadpis,
  plochaPridej,
  plochaUzMate,
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

/** Odkaz z e-mailu „Přidat na plochu“ (`?plocha=1`). */
function chcePlochuZUrl(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('plocha') === '1';
  } catch {
    return false;
  }
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
   * chrome = tip menu (Android/PC bez BIP). Hosté PC nepoužívají; PC jen Chrome s logem.
   */
  const [navod, setNavod] = useState<'nic' | 'ios' | 'chrome'>('nic');
  const [portalOk, setPortalOk] = useState(false);
  /** Z e-mailu (?plocha=1): zlatý překryv jako u průvodce po odjezdu. */
  const [zMailu, setZMailu] = useState(false);
  const [stavHotov, setStavHotov] = useState(false);

  const prepocitej = useCallback(async () => {
    if (jeStandalone()) {
      setStav('C');
      setStavHotov(true);
      return;
    }
    const lokal = nactiPlochaStav(token);
    const zjisteni = await zjistiPwaNaPlose();
    // Chrome ví, že ikona není → smaž staré „hotovo“ z dřívější zkoušky.
    if (zjisteni === 'ano') setStav('B');
    else if (zjisteni === 'ne') {
      if (lokal === 'hotovo') ulozPlochaStav(token, 'nic');
      setStav('A');
    } else {
      setStav(lokal === 'hotovo' ? 'B' : 'A');
    }
    setStavHotov(true);
  }, [token]);

  useEffect(() => {
    void prepocitej();
  }, [prepocitej]);

  useEffect(() => {
    setPortalOk(typeof document !== 'undefined');
    if (chcePlochuZUrl()) setZMailu(true);
  }, []);

  /** Stabilní callback – jinak PridejNaPlochu v useEffect spustí nekonečnou smyčku setState. */
  const onReady = useCallback((spust: () => void) => {
    setSpustPridej(() => spust);
  }, []);
  const onUzMate = useCallback(() => {
    setStav('B');
    setZMailu(false);
  }, []);
  const onVyzvaZmena = useCallback((otevreno: boolean) => {
    if (!otevreno) setZMailu(false);
  }, []);
  const onHotovoZMailu = useCallback(() => {
    setZMailu(false);
    void prepocitej();
  }, [prepocitej]);
  const onTipChrome = useCallback(() => {
    setNavod('chrome');
  }, []);

  const vyzvaZMailu = zMailu && stavHotov && stav === 'A';
  const uzMateZMailu = zMailu && stavHotov && (stav === 'B' || stav === 'C');

  const klepPridej = useCallback(() => {
    /** Android: instalace. iPhone: návod Safari. PC: Chrome s logem (ne .url zkratka). */
    if (jeIos()) {
      setNavod('ios');
      return;
    }
    setNavod('nic');
    spustPridej?.();
  }, [spustPridej]);

  const poslat = useCallback(async () => {
    const url = odkazKarty;
    const text = `${t(klubPlochaSdileniUpozorneni, lang)}\n${url}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'VIVIEN Club', text, url });
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

  const uzMateOverlay =
    uzMateZMailu && portalOk
      ? createPortal(
          <div
            className="klub-plocha-navod"
            role="dialog"
            aria-modal="true"
            aria-labelledby="klub-plocha-uz-h"
          >
            <div className="klub-plocha-navod__karta">
              <p className="klub-plocha-navod__text" id="klub-plocha-uz-h">
                {t(plochaUzMate, lang)}
              </p>
              <button
                type="button"
                className="klub-plocha-navod__ok"
                onClick={() => setZMailu(false)}
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
      {/* Skrytý helper jen pro BIP / manifest. Návod je v portálu výše.
          Z e-mailu (?plocha=1) ukáže zlatý překryv Přidat na plochu. */}
      <div className="klub-plocha__helper" aria-hidden>
        <PridejNaPlochu
          lang={lang}
          token={token}
          manifestHref={`/klub/manifest.webmanifest?k=${encodeURIComponent(token)}`}
          swScope="/"
          shortNazev="VIVIEN Club"
          jenMobil
          skrytTlacitko
          vyzva={vyzvaZMailu}
          onVyzvaZmena={onVyzvaZmena}
          onReady={onReady}
          onHotovo={onHotovoZMailu}
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
      {uzMateOverlay}
    </div>
  );
}
