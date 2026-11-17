'use client';

import { useEffect, useMemo, useState } from 'react';
import { t } from '@/lib/i18n';
import { plochaSchovat, plochaZobrazit } from '@/lib/plocha-texty';
import { PRANI_POKRACOVAT } from '@/lib/prani-texty';
import type { GuideLang } from '@/lib/types';
import type { ZpravaOdNasData } from '@/lib/zpravy-od-nas';
import {
  ZPRAVA_BRANA_NADPIS,
  ZPRAVA_BRANA_SBALENA,
  ZPRAVA_BRANA_TEXT,
  ZPRAVA_CAS_NADPIS,
  ZPRAVA_CAS_SBALENA,
  ZPRAVA_CAS_TEXT,
  ZPRAVA_OD_NAS_KROK,
} from '@/lib/zpravy-od-nas-texty';

export type ZpravaOdNas = ZpravaOdNasData;

type Props = {
  zpravy: ZpravaOdNas[];
  onPrecteno: (id: ZpravaOdNas['id']) => void;
  lang: GuideLang;
};

/**
 * Potvrzení od nás: nejdřív celá zpráva (C2), po Pokračovat sbalený box.
 * Nové jdou jedna po druhé. Už přečtené znovu nepřekáží.
 */
export function ZpravyOdNas({ zpravy, onPrecteno, lang }: Props) {
  const fronta = useMemo(() => zpravy.filter((z) => z.nova), [zpravy]);
  const [aktivniId, setAktivniId] = useState<ZpravaOdNas['id'] | null>(null);

  useEffect(() => {
    setAktivniId(fronta[0]?.id ?? null);
  }, [fronta]);

  const aktivni = zpravy.find((z) => z.id === aktivniId && z.nova) ?? null;
  const prectene = zpravy.filter((z) => !z.nova);

  return (
    <>
      {prectene.map((z) => (
        <SbalenaZprava key={z.id} zprava={z} lang={lang} />
      ))}

      {aktivni ? (
        <div className="pv-zprava-overlay" role="dialog" aria-modal="true" aria-labelledby={`pv-zprava-${aktivni.id}`}>
          <div className="pv-zprava-overlay__karta">
            <p className="pv-zprava-overlay__krok">{t(ZPRAVA_OD_NAS_KROK, lang)}</p>
            <h3 className="pv-zprava-overlay__nadpis" id={`pv-zprava-${aktivni.id}`}>
              {aktivni.nadpis}
            </h3>
            <p className="pv-zprava-overlay__text">
              <TextZpravy zprava={aktivni} lang={lang} />
            </p>
            <button
              type="button"
              className="pv-zprava-overlay__btn"
              onClick={() => onPrecteno(aktivni.id)}
            >
              {t(PRANI_POKRACOVAT, lang)}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SbalenaZprava({ zprava, lang }: { zprava: ZpravaOdNas; lang: GuideLang }) {
  const [otevreno, setOtevreno] = useState(false);
  return (
    <div className={`pv-zprava-box${otevreno ? ' is-otevreno' : ''}`}>
      <div className="pv-zprava-box__hlavicka">
        <p className="pv-zprava-box__titulek">{zprava.sbalenyTitulek}</p>
        <button
          type="button"
          className="pv-zprava-box__akce"
          onClick={() => setOtevreno((v) => !v)}
        >
          {otevreno ? t(plochaSchovat, lang) : t(plochaZobrazit, lang)}
        </button>
      </div>
      {otevreno ? (
        <div className="pv-zprava-box__telo">
          <p className="pv-zprava-box__nadpis">{zprava.nadpis}</p>
          <p>
            <TextZpravy zprava={zprava} lang={lang} />
          </p>
        </div>
      ) : null}
    </div>
  );
}

function TextZpravy({ zprava, lang }: { zprava: ZpravaOdNas; lang: GuideLang }) {
  if (zprava.id === 'brana' && zprava.telefon) {
    const raw = t(ZPRAVA_BRANA_TEXT, lang).replaceAll('{{STANI}}', String(zprava.stani ?? ''));
    const dil = raw.split('{{TELEFON}}');
    return (
      <>
        {dil[0]}
        <TelefonVTextu cislo={zprava.telefon} />
        {dil[1] || ''}
      </>
    );
  }
  return <>{zprava.text}</>;
}

/** Číslo v jednom kuse, ťuknutelné. Mezery jsou nedělitelné. */
function TelefonVTextu({ cislo }: { cislo: string }) {
  const ciste = cislo.replace(/\s+/g, '');
  const zobraz = formatTelefon(cislo);
  return (
    <a className="pv-phone" href={`tel:${ciste}`}>
      {zobraz}
    </a>
  );
}

function formatTelefon(cislo: string): string {
  const c = cislo.replace(/\s+/g, '');
  if (/^\+420\d{9}$/.test(c)) {
    return `+420\u00a0${c.slice(4, 7)}\u00a0${c.slice(7, 10)}\u00a0${c.slice(10)}`;
  }
  return cislo;
}

export function zpravaCasu(cas: string, lang: GuideLang = 'cs'): ZpravaOdNas {
  return {
    id: 'cas',
    nova: true,
    nadpis: t(ZPRAVA_CAS_NADPIS, lang),
    text: t(ZPRAVA_CAS_TEXT, lang).replaceAll('{{CAS}}', cas),
    sbalenyTitulek: t(ZPRAVA_CAS_SBALENA, lang),
  };
}

export function zpravaBrany(stani: string | number, telefon: string, lang: GuideLang = 'cs'): ZpravaOdNas {
  return {
    id: 'brana',
    nova: true,
    nadpis: t(ZPRAVA_BRANA_NADPIS, lang),
    text: t(ZPRAVA_BRANA_TEXT, lang)
      .replaceAll('{{TELEFON}}', telefon)
      .replaceAll('{{STANI}}', String(stani)),
    sbalenyTitulek: t(ZPRAVA_BRANA_SBALENA, lang),
    telefon,
    stani,
  };
}
