import { casVPraze, denPraha, hodinaPraha, minutaPraha } from './brana';
import { jeHodina } from './odjezd';
import { t } from './i18n';
import type { RezervaceRecord } from './store';
import type { GuideLang } from './types';
import { GUIDE_LANGS } from './types';
import {
  ZPRAVA_ODJEZD_OSOBNE_NADPIS,
  ZPRAVA_ODJEZD_OSOBNE_SBALENA,
  ZPRAVA_ODJEZD_OSOBNE_TEXT,
  ZPRAVA_ODJEZD_PRIJATI_DEN,
  ZPRAVA_ODJEZD_PRIJATI_NADPIS,
  ZPRAVA_ODJEZD_PRIJATI_RANO,
  ZPRAVA_ODJEZD_PRIJATI_SBALENA,
} from './zpravy-od-nas-texty';

export type PotvrzeniOdjezdu = 'osobne' | 'telefon';

export type ZpravaOdjezduData = {
  id: 'odjezd-prijati' | 'odjezd';
  nova: boolean;
  nadpis: string;
  text: string;
  sbalenyTitulek: string;
};

function langOk(lang?: GuideLang | null): GuideLang {
  return lang && GUIDE_LANGS.includes(lang) ? lang : 'en';
}

/** Minuty od půlnoci v Praze. */
function minutyPraha(now: Date): number {
  return hodinaPraha(now) * 60 + minutaPraha(now);
}

/** 21:30–6:45 Praha: tichý režim (push / „spíme“). */
export function jeTichyRezimOdjezdu(now = new Date()): boolean {
  const m = minutyPraha(now);
  return m >= 21 * 60 + 30 || m < 6 * 60 + 45;
}

/** V tichém režimu host dostane hlášku „až budeme vzhůru“. */
export function jeRanniZadaniOdjezdu(now = new Date()): boolean {
  return jeTichyRezimOdjezdu(now);
}

/** Do odjezdu zbývá méně než 2 hodiny → budíček i v tichém režimu. */
export function odjezdDoDvouHodin(
  rec: Pick<RezervaceRecord, 'odjezd' | 'casOdjezdu'>,
  now = new Date(),
): boolean {
  if (!rec.odjezd || !rec.casOdjezdu) return false;
  if (!/^\d{2}:\d{2}$/.test(rec.casOdjezdu)) return false;
  if (rec.odjezd !== denPraha(now)) return false;
  const [hh, mm] = rec.casOdjezdu.split(':').map(Number);
  const cil = casVPraze(rec.odjezd, hh, mm).getTime();
  const zbyva = cil - now.getTime();
  return zbyva >= 0 && zbyva <= 2 * 60 * 60 * 1000;
}

export function odlozitPushCasuOdjezdu(
  rec: Pick<RezervaceRecord, 'odjezd' | 'casOdjezdu'>,
  now = new Date(),
): boolean {
  if (!jeTichyRezimOdjezdu(now)) return false;
  if (odjezdDoDvouHodin(rec, now)) return false;
  return true;
}

export function textPrijatiCasuOdjezdu(
  cas: string,
  kdyZapsano: Date | string | null | undefined,
  lang?: GuideLang | null,
): string {
  const l = langOk(lang);
  const kdy = typeof kdyZapsano === 'string' ? new Date(kdyZapsano) : kdyZapsano || new Date();
  const platny = Number.isFinite(kdy.getTime()) ? kdy : new Date();
  const mapa = jeRanniZadaniOdjezdu(platny) ? ZPRAVA_ODJEZD_PRIJATI_RANO : ZPRAVA_ODJEZD_PRIJATI_DEN;
  return t(mapa, l).replaceAll('{{CAS}}', cas);
}

/** Po klepnutí Osobně (schváleno 17. 11. 2026). */
export function textPotvrzeniOdjezduOsobne(cas: string, lang?: GuideLang | null): string {
  return t(ZPRAVA_ODJEZD_OSOBNE_TEXT, langOk(lang)).replaceAll('{{CAS}}', cas);
}

export function stitekPotvrzeniOdjezdu(v: PotvrzeniOdjezdu | null | undefined): string {
  if (v === 'osobne') return 'Osobně se rozloučíme';
  if (v === 'telefon') return 'Sami · jsme na telefonu';
  return 'čeká';
}

/**
 * Domů i karta: Osobně / Sami (nebo schválení pozdějšího času),
 * jakmile je čas odjezdu. Nečeká se na den před odjezdem.
 */
export function cekaPotvrzeniRozlouceni(
  row: Pick<RezervaceRecord, 'casOdjezdu' | 'potvrzeniOdjezdu' | 'zadostOdjezd'>,
): boolean {
  if (row.zadostOdjezd?.stav === 'ceka') return true;
  if (row.potvrzeniOdjezdu) return false;
  return jeHodina(row.casOdjezdu);
}

/** Pole po novém / smazaném čase odjezdu (reset potvrzení a hlášek). */
export function polePoCasuOdjezdu(
  cas: string | null,
  predchozi: string | null,
  now = new Date(),
): Partial<RezervaceRecord> {
  if (!cas) {
    return {
      casOdjezduZapsanKdy: null,
      potvrzeniOdjezdu: null,
      potvrzeniOdjezduKdy: null,
      zpravaOdjezdPrectena: null,
      zpravaOdjezdPrijatiPrectena: null,
      casOdjezduPushCeka: null,
    };
  }
  if (predchozi === cas) {
    return { casOdjezduZapsanKdy: now.toISOString() };
  }
  return {
    casOdjezduZapsanKdy: now.toISOString(),
    potvrzeniOdjezdu: null,
    potvrzeniOdjezduKdy: null,
    zpravaOdjezdPrectena: null,
    zpravaOdjezdPrijatiPrectena: null,
  };
}

export function zpravaPrijatiOdjezdu(
  cas: string,
  kdyZapsano: Date | string | null | undefined,
  nova = true,
  lang?: GuideLang | null,
): ZpravaOdjezduData {
  const l = langOk(lang);
  return {
    id: 'odjezd-prijati',
    nova,
    nadpis: t(ZPRAVA_ODJEZD_PRIJATI_NADPIS, l),
    text: textPrijatiCasuOdjezdu(cas, kdyZapsano, l),
    sbalenyTitulek: t(ZPRAVA_ODJEZD_PRIJATI_SBALENA, l),
  };
}

export function zpravaPotvrzeniOdjezdu(
  cas: string,
  nova = true,
  lang?: GuideLang | null,
): ZpravaOdjezduData {
  const l = langOk(lang);
  return {
    id: 'odjezd',
    nova,
    nadpis: t(ZPRAVA_ODJEZD_OSOBNE_NADPIS, l),
    text: textPotvrzeniOdjezduOsobne(cas, l),
    sbalenyTitulek: t(ZPRAVA_ODJEZD_OSOBNE_SBALENA, l),
  };
}
