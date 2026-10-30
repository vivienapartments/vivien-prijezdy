/** Stupně připomínek: 1 normální → 2 ostřejší → 3 důrazný → Poslední výzva (jen check-in a průvodce). */

import { denPraha, posunDen } from './brana';

export type CasovaZpravaId = 'nerozbalen' | 'denNerozbalen' | 'pruvodce3' | 'nedojezd';

const NAZEV_CAS: Record<CasovaZpravaId, string> = {
  nerozbalen: 'Průvodce nerozbalen',
  denNerozbalen: 'Den příjezdu, průvodce nerozbalen',
  pruvodce3: 'Průvodce, důrazný',
  nedojezd: 'Poslední výzva (nedojezd)',
};

/** Starší názvy v historii, ať se stupeň po nasazení neresetuje. */
const STARE_NAZVY_PRUVODCE = ['Neotevřel průvodce'];

const CHECKIN_NAZEV = 'Vyplňte check-in';
export const CHECKIN_NEDOJEZD_NAZEV = 'Poslední výzva · check-in';

const BRANA_NAZEV = 'Chybí údaje k bráně';
const PRUVODCE3_NAZEV = NAZEV_CAS.pruvodce3;

function pocetZKanalu(historie: { co: string }[], nazvy: string[]): number {
  const platne = new Set(nazvy.flatMap((n) => [`WhatsApp: ${n}`, `SMS: ${n}`]));
  return historie.filter((h) => platne.has(h.co)).length;
}

/** Kolikrát už šla časová / průvodcovská připomínka (WhatsApp i SMS). */
export function pocetCasovychPripoinek(historie: { co: string }[]): number {
  return pocetZKanalu(historie, [...Object.values(NAZEV_CAS), ...STARE_NAZVY_PRUVODCE]);
}

/** Už odešel 3. stupeň průvodce (WhatsApp/SMS: Průvodce, důrazný). */
export function uzOdeslanPruvodce3(historie: { co: string }[]): boolean {
  return pocetZKanalu(historie, [PRUVODCE3_NAZEV]) > 0;
}

/**
 * Další zpráva podle počtu. V den příjezdu aspoň 3. stupeň (žádné měkké zprávy).
 * Poslední výzva až když 3. stupeň (Průvodce, důrazný) už odešel.
 */
export function dalsiCasovaZprava(
  pocetUzPoslanych: number,
  denPrijezdu = false,
  historie: { co: string }[] = [],
): CasovaZpravaId {
  if (denPrijezdu) {
    if (uzOdeslanPruvodce3(historie) || pocetUzPoslanych >= 3) return 'nedojezd';
    return 'pruvodce3';
  }
  if (pocetUzPoslanych <= 0) return 'nerozbalen';
  if (pocetUzPoslanych === 1) return 'denNerozbalen';
  if (pocetUzPoslanych === 2) return 'pruvodce3';
  return 'nedojezd';
}

export function stupenCasoveZpravy(id: CasovaZpravaId): 1 | 2 | 3 | 4 {
  if (id === 'nerozbalen') return 1;
  if (id === 'denNerozbalen') return 2;
  if (id === 'pruvodce3') return 3;
  return 4;
}

export function popisekStupneCasu(id: CasovaZpravaId): string {
  if (id === 'nerozbalen') return '1. stupeň · normální';
  if (id === 'denNerozbalen') return '2. stupeň · ostřejší';
  if (id === 'pruvodce3') return '3. stupeň · důrazný';
  return 'Poslední výzva';
}

export function nazevCasoveZpravy(id: CasovaZpravaId): string {
  return NAZEV_CAS[id];
}

export function pocetCheckinPripoinek(historie: { co: string }[]): number {
  return pocetZKanalu(historie, [CHECKIN_NAZEV]);
}

/** 0× → 1, 1× → 2, 2×+ → 3. Den před / den příjezdu aspoň 3. */
export function stupenCheckinu(pocetUzPoslanych: number, denPredNeboDen: boolean): 1 | 2 | 3 {
  let s: 1 | 2 | 3 = pocetUzPoslanych <= 0 ? 1 : pocetUzPoslanych === 1 ? 2 : 3;
  if (denPredNeboDen) s = 3;
  return s;
}

export function popisekStupneCheckinu(stupen: 1 | 2 | 3 | 'nedojezd'): string {
  if (stupen === 1) return '1. stupeň · normální';
  if (stupen === 2) return '2. stupeň · ostřejší';
  if (stupen === 3) return '3. stupeň · důrazný';
  return 'Poslední výzva';
}

/** Vyplňte check-in odeslaný den před příjezdem nebo v den příjezdu (= už to byl 3. stupeň). */
export function checkin3OdeslanVOkne(
  historie: { co: string; cas?: string }[],
  prijezd: string,
): boolean {
  const denPred = posunDen(prijezd, -1);
  const platne = new Set([`WhatsApp: ${CHECKIN_NAZEV}`, `SMS: ${CHECKIN_NAZEV}`]);
  return historie.some((h) => {
    if (!platne.has(h.co) || !h.cas) return false;
    const den = denPraha(new Date(h.cas));
    return den === prijezd || den === denPred;
  });
}

/**
 * Check-in chybí, den před / den příjezdu, a 3. stupeň (Vyplňte check-in) už v tom okně odešel.
 * Počet zpráv nestačí: den předem se 3. stupeň vynutí i po jedné starší zprávě.
 */
export function ukazatCheckinNedojezd(opts: {
  stav: string;
  prijezd: string | null;
  dnes: string;
  predano?: string;
  historie: { co: string; cas?: string }[];
}): boolean {
  if (opts.stav === 'zruseno' || opts.predano) return false;
  if (opts.stav !== 'bez_checkinu' && opts.stav !== 'neodeslano') return false;
  if (!opts.prijezd || !opts.dnes) return false;
  if (opts.dnes !== opts.prijezd && opts.dnes !== posunDen(opts.prijezd, -1)) return false;
  return checkin3OdeslanVOkne(opts.historie, opts.prijezd);
}

export function pocetBranaPripoinek(historie: { co: string }[]): number {
  return pocetZKanalu(historie, [BRANA_NAZEV]);
}

/** 0 → 1, 1 → 2, 2+ → 3. V den příjezdu aspoň 3. */
export function stupenBrany(pocetUzPoslanych: number, denPrijezdu: boolean): 1 | 2 | 3 {
  let s: 1 | 2 | 3 = pocetUzPoslanych <= 0 ? 1 : pocetUzPoslanych === 1 ? 2 : 3;
  if (denPrijezdu) s = 3;
  return s;
}

export function popisekStupneBrany(stupen: 1 | 2 | 3): string {
  return popisekStupneCheckinu(stupen);
}

export type DruhVyzvy = 'checkin' | 'pruvodce' | 'brana';

const NAZVY_VYZVY: Record<DruhVyzvy, string[]> = {
  checkin: [CHECKIN_NAZEV],
  pruvodce: [...Object.values(NAZEV_CAS), ...STARE_NAZVY_PRUVODCE],
  brana: [BRANA_NAZEV],
};

const POSLEDNI_VYZVY: Partial<Record<DruhVyzvy, string[]>> = {
  checkin: [CHECKIN_NEDOJEZD_NAZEV],
  pruvodce: [NAZEV_CAS.nedojezd],
};

function datumVyzvyPraha(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    day: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date(t));
  const den = parts.find((p) => p.type === 'day')?.value || '';
  const mes = parts.find((p) => p.type === 'month')?.value || '';
  if (!den || !mes) return '';
  return `${den}. ${mes}.`;
}

function posledniCasNazvu(historie: { co: string; cas?: string }[], nazvy: string[]): string | null {
  const platne = new Set(nazvy.flatMap((n) => [`WhatsApp: ${n}`, `SMS: ${n}`]));
  let last: string | null = null;
  for (const h of historie) {
    if (!platne.has(h.co) || !h.cas) continue;
    if (!last || h.cas > last) last = h.cas;
  }
  return last;
}

/** Kolikrát už šla výzva (plný text na kartu, krátký do štítku). */
export function textVyzvy(
  druh: DruhVyzvy,
  historie: { co: string; cas?: string }[],
): { plny: string; kratky: string } {
  const posledniNazvy = POSLEDNI_VYZVY[druh];
  if (posledniNazvy && pocetZKanalu(historie, posledniNazvy) > 0) {
    return { plny: 'Poslední výzva', kratky: 'Poslední výzva' };
  }
  const n =
    druh === 'checkin'
      ? pocetCheckinPripoinek(historie)
      : druh === 'brana'
        ? pocetBranaPripoinek(historie)
        : pocetCasovychPripoinek(historie);
  if (n <= 0) return { plny: 'zatím bez výzvy', kratky: 'bez výzvy' };
  const cislo = `${n}. výzva`;
  const cas = posledniCasNazvu(historie, NAZVY_VYZVY[druh]);
  const datum = cas ? datumVyzvyPraha(cas) : '';
  return {
    plny: datum ? `${cislo} · ${datum}` : cislo,
    kratky: cislo,
  };
}
