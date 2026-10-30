/** Stupně připomínek: 1 normální → 2 ostřejší → 3 důrazný → Poslední výzva (jen check-in a průvodce). */

import { posunDen } from './brana';

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

function pocetZKanalu(historie: { co: string }[], nazvy: string[]): number {
  const platne = new Set(nazvy.flatMap((n) => [`WhatsApp: ${n}`, `SMS: ${n}`]));
  return historie.filter((h) => platne.has(h.co)).length;
}

/** Kolikrát už šla časová / průvodcovská připomínka (WhatsApp i SMS). */
export function pocetCasovychPripoinek(historie: { co: string }[]): number {
  return pocetZKanalu(historie, [...Object.values(NAZEV_CAS), ...STARE_NAZVY_PRUVODCE]);
}

/** Další zpráva podle počtu už odeslaných časových připomínek. */
export function dalsiCasovaZprava(pocetUzPoslanych: number): CasovaZpravaId {
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

/** Check-in chybí, 3. stupeň už odešel, den před nebo den příjezdu, nezrušeno, nepředáno. */
export function ukazatCheckinNedojezd(opts: {
  stav: string;
  prijezd: string | null;
  dnes: string;
  predano?: string;
  historie: { co: string }[];
}): boolean {
  if (opts.stav === 'zruseno' || opts.predano) return false;
  if (opts.stav !== 'bez_checkinu' && opts.stav !== 'neodeslano') return false;
  if (!opts.prijezd || !opts.dnes) return false;
  if (opts.dnes !== opts.prijezd && opts.dnes !== posunDen(opts.prijezd, -1)) return false;
  return pocetCheckinPripoinek(opts.historie) >= 3;
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
