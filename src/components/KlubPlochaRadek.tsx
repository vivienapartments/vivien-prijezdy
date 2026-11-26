'use client';

/**
 * Přidat na plochu / Poslat do dalšího telefonu na kartě klubu.
 * Vzor: nahled-plocha-uz-ma-3-verze.html sloupce A a B1.
 */

import { useCallback, useEffect, useState } from 'react';
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
  jePwaNainstalovana,
  jeStandalone,
  nactiPlochaStav,
} from '@/lib/plocha';
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

  return (
    <div className="klub-plocha">
      {/* Skrytý helper pro BIP / iOS návod */}
      <div className="klub-plocha__helper" aria-hidden>
        <PridejNaPlochu
          lang={lang}
          token={token}
          jenMobil
          skrytTlacitko
          onReady={(spust) => setSpustPridej(() => spust)}
          onHotovo={prepocitej}
          onUzMate={() => setStav('B')}
        />
      </div>

      {stav === 'A' ? (
        <button
          type="button"
          className="klub-plocha__r klub-plocha__r--A"
          onClick={() => spustPridej?.()}
        >
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
    </div>
  );
}
