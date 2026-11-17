import { aptRecord } from './guide-data';
import {
  zpravaPrijatiOdjezdu,
  zpravaPotvrzeniOdjezdu,
  type ZpravaOdjezduData,
} from './odjezd-potvrzeni';
import type { AptId } from './types';
import type { RezervaceRecord } from './store';

export type PotvrzeniPrijezdu = 'osobne' | 'telefon';

export type ZpravaOdNasData = {
  id: 'cas' | 'brana' | 'odjezd-prijati' | 'odjezd';
  nova: boolean;
  nadpis: string;
  /** Obyčejný text. U brány je telefon a stání zvlášť kvůli odkazu tel:. */
  text: string;
  sbalenyTitulek: string;
  telefon?: string;
  stani?: string | number;
};

function textCasu(cas: string | null): string {
  if (!cas) return '';
  if (cas === 'po20') return 'po 20:00';
  if (cas === 'po23') return 'po 23:00';
  return cas;
}

/** Zprávy do průvodce jen když majitel potvrdil (ne u starých Brána OK bez odeslání). */
export function zpravyOdNasZRezervace(rec: RezervaceRecord | null | undefined): ZpravaOdNasData[] {
  if (!rec) return [];
  const out: ZpravaOdNasData[] = [];

  // Dokud pozdní příjezd čeká na schválení, netvrdíme, že je čas potvrzený.
  const pozniCeka = rec.zadostPozdniPrijezd?.stav === 'ceka';
  if (rec.potvrzeniPrijezdu === 'osobne' && rec.casPrijezdu && !pozniCeka) {
    const cas = textCasu(rec.casPrijezdu);
    out.push({
      id: 'cas',
      nova: !rec.zpravaCasPrectena,
      nadpis: 'Váš příjezd je potvrzený',
      text: `S vaším příjezdem v ${cas} počítáme. Budeme na vás čekat před domem a osobně vás přivítáme.`,
      sbalenyTitulek: 'Zpráva k času příjezdu',
    });
  }

  if (rec.zpravaBranaOdeslana && rec.branaRegistrovano && rec.telefonBrana && rec.apartman) {
    let stani: number | string = '';
    try {
      stani = aptRecord(rec.apartman as AptId).stani;
    } catch {
      stani = '';
    }
    out.push({
      id: 'brana',
      nova: !rec.zpravaBranaPrectena,
      nadpis: 'Brána je připravená',
      text: `Vaše číslo je v bráně. Otevřete ji prozvoněním. Stání je č. ${stani}.`,
      sbalenyTitulek: 'Zpráva k parkování',
      telefon: rec.telefonBrana,
      stani,
    });
  }

  if (rec.casOdjezdu && !rec.potvrzeniOdjezdu) {
    const prijati: ZpravaOdjezduData = zpravaPrijatiOdjezdu(
      rec.casOdjezdu,
      rec.casOdjezduZapsanKdy,
      !rec.zpravaOdjezdPrijatiPrectena,
    );
    out.push(prijati);
  }

  if (rec.potvrzeniOdjezdu === 'osobne' && rec.casOdjezdu) {
    const potvrzeni: ZpravaOdjezduData = zpravaPotvrzeniOdjezdu(
      rec.casOdjezdu,
      !rec.zpravaOdjezdPrectena,
    );
    out.push(potvrzeni);
  }

  return out;
}

export function stitekPotvrzeniPrijezdu(v: PotvrzeniPrijezdu | null | undefined): string {
  if (v === 'osobne') return 'Osobně ubytujeme';
  if (v === 'telefon') return 'Jsme na telefonu';
  return 'čeká';
}
