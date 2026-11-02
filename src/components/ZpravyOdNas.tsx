'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ZpravaOdNasData } from '@/lib/zpravy-od-nas';

export type ZpravaOdNas = ZpravaOdNasData;

type Props = {
  zpravy: ZpravaOdNas[];
  onPrecteno: (id: ZpravaOdNas['id']) => void;
};

/**
 * Potvrzení od nás: nejdřív celá zpráva (C2), po Pokračovat sbalený box.
 * Nové jdou jedna po druhé. Už přečtené znovu nepřekáží.
 */
export function ZpravyOdNas({ zpravy, onPrecteno }: Props) {
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
        <SbalenaZprava key={z.id} zprava={z} />
      ))}

      {aktivni ? (
        <div className="pv-zprava-overlay" role="dialog" aria-modal="true" aria-labelledby={`pv-zprava-${aktivni.id}`}>
          <div className="pv-zprava-overlay__karta">
            <p className="pv-zprava-overlay__krok">Zpráva od nás</p>
            <h3 className="pv-zprava-overlay__nadpis" id={`pv-zprava-${aktivni.id}`}>
              {aktivni.nadpis}
            </h3>
            <p className="pv-zprava-overlay__text">
              <TextZpravy zprava={aktivni} />
            </p>
            <button
              type="button"
              className="pv-zprava-overlay__btn"
              onClick={() => onPrecteno(aktivni.id)}
            >
              Pokračovat
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SbalenaZprava({ zprava }: { zprava: ZpravaOdNas }) {
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
          {otevreno ? 'Schovat' : 'Zobrazit'}
        </button>
      </div>
      {otevreno ? (
        <div className="pv-zprava-box__telo">
          <p className="pv-zprava-box__nadpis">{zprava.nadpis}</p>
          <p>
            <TextZpravy zprava={zprava} />
          </p>
        </div>
      ) : null}
    </div>
  );
}

function TextZpravy({ zprava }: { zprava: ZpravaOdNas }) {
  if (zprava.id === 'brana' && zprava.telefon) {
    return (
      <>
        Vaše číslo <TelefonVTextu cislo={zprava.telefon} /> je v bráně. Otevřete ji prozvoněním. Stání
        je č.&nbsp;{zprava.stani}.
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

export function zpravaCasu(cas: string): ZpravaOdNas {
  return {
    id: 'cas',
    nova: true,
    nadpis: 'Váš příjezd je potvrzený',
    text: `S vaším příjezdem v ${cas} počítáme. Budeme na vás čekat před domem a osobně vás přivítáme.`,
    sbalenyTitulek: 'Zpráva k času příjezdu',
  };
}

export function zpravaBrany(stani: string | number, telefon: string): ZpravaOdNas {
  return {
    id: 'brana',
    nova: true,
    nadpis: 'Brána je připravená',
    text: `Vaše číslo je v bráně. Otevřete ji prozvoněním. Stání je č. ${stani}.`,
    sbalenyTitulek: 'Zpráva k parkování',
    telefon,
    stani,
  };
}
