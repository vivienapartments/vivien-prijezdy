import { aptRecord } from './guide-data';
import { t } from './i18n';
import {
  zpravaPrijatiOdjezdu,
  zpravaPotvrzeniOdjezdu,
  type ZpravaOdjezduData,
} from './odjezd-potvrzeni';
import type { AptId, GuideLang } from './types';
import { GUIDE_LANGS } from './types';
import type { RezervaceRecord } from './store';
import {
  ZPRAVA_BRANA_NADPIS,
  ZPRAVA_BRANA_SBALENA,
  ZPRAVA_BRANA_TEXT,
  ZPRAVA_CAS_NADPIS,
  ZPRAVA_CAS_SBALENA,
  ZPRAVA_CAS_TEXT,
  ZPRAVA_PO_20,
  ZPRAVA_PO_23,
} from './zpravy-od-nas-texty';

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

function jazykZRezervace(rec: RezervaceRecord | null | undefined, lang?: GuideLang | null): GuideLang {
  if (lang && GUIDE_LANGS.includes(lang)) return lang;
  if (rec?.jazyk && GUIDE_LANGS.includes(rec.jazyk)) return rec.jazyk;
  return 'en';
}

function textCasu(cas: string | null, lang: GuideLang): string {
  if (!cas) return '';
  if (cas === 'po20') return t(ZPRAVA_PO_20, lang);
  if (cas === 'po23') return t(ZPRAVA_PO_23, lang);
  return cas;
}

/** Zprávy do průvodce jen když majitel potvrdil (ne u starých Brána OK bez odeslání). */
export function zpravyOdNasZRezervace(
  rec: RezervaceRecord | null | undefined,
  lang?: GuideLang | null,
): ZpravaOdNasData[] {
  if (!rec) return [];
  const l = jazykZRezervace(rec, lang);
  const out: ZpravaOdNasData[] = [];

  // Dokud pozdní příjezd čeká na schválení, netvrdíme, že je čas potvrzený.
  const pozniCeka = rec.zadostPozdniPrijezd?.stav === 'ceka';
  if (rec.potvrzeniPrijezdu === 'osobne' && rec.casPrijezdu && !pozniCeka) {
    const cas = textCasu(rec.casPrijezdu, l);
    out.push({
      id: 'cas',
      nova: !rec.zpravaCasPrectena,
      nadpis: t(ZPRAVA_CAS_NADPIS, l),
      text: t(ZPRAVA_CAS_TEXT, l).replaceAll('{{CAS}}', cas),
      sbalenyTitulek: t(ZPRAVA_CAS_SBALENA, l),
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
      nadpis: t(ZPRAVA_BRANA_NADPIS, l),
      text: t(ZPRAVA_BRANA_TEXT, l)
        .replaceAll('{{TELEFON}}', rec.telefonBrana)
        .replaceAll('{{STANI}}', String(stani)),
      sbalenyTitulek: t(ZPRAVA_BRANA_SBALENA, l),
      telefon: rec.telefonBrana,
      stani,
    });
  }

  if (rec.casOdjezdu && !rec.potvrzeniOdjezdu) {
    const prijati: ZpravaOdjezduData = zpravaPrijatiOdjezdu(
      rec.casOdjezdu,
      rec.casOdjezduZapsanKdy,
      !rec.zpravaOdjezdPrijatiPrectena,
      l,
    );
    out.push(prijati);
  }

  if (rec.potvrzeniOdjezdu === 'osobne' && rec.casOdjezdu) {
    const potvrzeni: ZpravaOdjezduData = zpravaPotvrzeniOdjezdu(
      rec.casOdjezdu,
      !rec.zpravaOdjezdPrectena,
      l,
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
