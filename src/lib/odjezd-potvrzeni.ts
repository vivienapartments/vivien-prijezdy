import { casVPraze, denPraha, hodinaPraha, minutaPraha } from './brana';
import type { RezervaceRecord } from './store';

export type PotvrzeniOdjezdu = 'osobne' | 'telefon';

export type ZpravaOdjezduData = {
  id: 'odjezd-prijati' | 'odjezd';
  nova: boolean;
  nadpis: string;
  text: string;
  sbalenyTitulek: string;
};

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

export function textPrijatiCasuOdjezdu(cas: string, kdyZapsano: Date | string | null | undefined): string {
  const kdy = typeof kdyZapsano === 'string' ? new Date(kdyZapsano) : kdyZapsano || new Date();
  const platny = Number.isFinite(kdy.getTime()) ? kdy : new Date();
  if (jeRanniZadaniOdjezdu(platny)) {
    return `Čas ${cas} jsme přijali. Až budeme vzhůru, potvrdíme rozloučení. Bez potvrzení odjeďte sami.`;
  }
  return `Čas ${cas} jsme přijali. Osobní rozloučení vám potvrdíme co nejdříve.`;
}

/** Po klepnutí Osobně (schváleno 17. 11. 2026). */
export function textPotvrzeniOdjezduOsobne(cas: string): string {
  return `V ${cas} s vámi počítáme. Přijdeme se osobně rozloučit.`;
}

export function stitekPotvrzeniOdjezdu(v: PotvrzeniOdjezdu | null | undefined): string {
  if (v === 'osobne') return 'Osobně se rozloučíme';
  if (v === 'telefon') return 'Sami · jsme na telefonu';
  return 'čeká';
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
): ZpravaOdjezduData {
  return {
    id: 'odjezd-prijati',
    nova,
    nadpis: 'Čas odjezdu máme',
    text: textPrijatiCasuOdjezdu(cas, kdyZapsano),
    sbalenyTitulek: 'Zpráva k času odjezdu',
  };
}

export function zpravaPotvrzeniOdjezdu(cas: string, nova = true): ZpravaOdjezduData {
  return {
    id: 'odjezd',
    nova,
    nadpis: 'Rozloučení je potvrzené',
    text: textPotvrzeniOdjezduOsobne(cas),
    sbalenyTitulek: 'Zpráva k odjezdu',
  };
}
