import { parseCzechDate } from './dates';

/** Rezervace vytvořené v tento den a později: výchozí režim VIVIEN vybírá (kromě Booking od hranice níž). */
export const POPLATEK_OD = '2026-10-05';

/**
 * Booking.com: od tohoto BH čísla včetně VIVIEN městský poplatek od hosta nevybírá
 * (vybírá Booking). Sarah Bennett = 120260625. Galia 120260623 ještě vybírá VIVIEN.
 */
export const POPLATEK_BOOKING_OD_REZ = 120260625;

export type PoplatekStav = 'ano' | 'ne' | 'neznamo';

export type PoplatekVstup = {
  vytvoreno?: string | null;
  zdroj?: string | null;
  rezervace?: string | null;
};

/** DATE z Better Hotelu. Prázdné nebo nevyplněné → null. */
export function parseDatumVytvoreni(raw: string | null | undefined): string | null {
  const s = (raw || '').trim();
  if (!s || /^\(?\s*DATE\s*\)?$/i.test(s)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return s;
  }
  return parseCzechDate(s.replace(/\s+/g, ''));
}

export function jeZdrojBooking(zdroj: string | null | undefined): boolean {
  return /booking/i.test((zdroj || '').trim());
}

/** Číslo rezervace BH jen z číslic. */
export function cisloRezervaceBh(rezervace: string | null | undefined): number | null {
  const n = Number(String(rezervace || '').replace(/\D/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function denVzniku(vytvoreno: string | null | undefined): string | null {
  return (
    parseDatumVytvoreni(vytvoreno) ||
    (vytvoreno && /^\d{4}-\d{2}-\d{2}$/.test(vytvoreno) ? vytvoreno : null)
  );
}

/**
 * Automatický stav městského poplatku.
 * Ruční volbu majitele řeší zápis přes vynechRucni, ne tato funkce.
 */
export function poplatekProRezervaci(v: PoplatekVstup): PoplatekStav {
  const booking = jeZdrojBooking(v.zdroj);
  const cislo = cisloRezervaceBh(v.rezervace);

  // Booking od Bennett včetně: nevybírat, i bez data vzniku.
  if (booking && cislo != null && cislo >= POPLATEK_BOOKING_OD_REZ) return 'ne';

  const den = denVzniku(v.vytvoreno);
  if (!den) return 'neznamo';
  if (den < POPLATEK_OD) return 'ne';

  // Od 5. 10. 2026.
  if (booking) {
    // Booking bez spolehlivého čísla: nerozhodovat automaticky.
    if (cislo == null) return 'neznamo';
    // Číslo < 120260625 (např. Galia 623) → VIVIEN vybírá.
    return 'ano';
  }

  // Airbnb, přímá a ostatní: dosavadní režim od 5. 10.
  return 'ano';
}

/**
 * Jen podle data (bez zdroje). Pro starší volání a testy.
 * Booking hranici neřeší — tam použijte poplatekProRezervaci.
 */
export function poplatekZData(vytvoreno: string | null | undefined): PoplatekStav {
  const den = denVzniku(vytvoreno);
  if (!den) return 'neznamo';
  return den >= POPLATEK_OD ? 'ano' : 'ne';
}

/**
 * Nejnižší číslo rezervace s automatickým „vybírat“ podle plných pravidel.
 * Slouží jen jako nápověda v přehledu u karet s neznamo.
 */
export function hraniceRezervace(
  zaznamy: { rezervace: string; vytvoreno: string | null; zdroj?: string | null }[],
): number | null {
  let min: number | null = null;
  for (const z of zaznamy) {
    if (poplatekProRezervaci(z) !== 'ano') continue;
    const n = cisloRezervaceBh(z.rezervace);
    if (n == null) continue;
    if (min == null || n < min) min = n;
  }
  return min;
}

export function castkaPoplatku(noci: number | null, osob: number | null): number | null {
  if (!noci || !osob || noci < 1 || osob < 1) return null;
  return noci * osob * 50;
}

/** Box s výzvou k platbě na místě — jen když VIVIEN poplatek vybírá. */
export function ukazatPoplatek(stav: PoplatekStav | null | undefined): boolean {
  return stav === 'ano';
}

/**
 * Box „již v ceně rezervace“ hostovi.
 * Jen u `ne`, a jen když to odpovídá podmínkám (Booking od Bennett,
 * nebo ruční / jiný kanál po 5. 10.). Před 5. 10. hostovi nic netvrdíme.
 * Bez kontextu rezervace box neukazujeme. Neznamo hostovi nic.
 */
export function ukazatPoplatekVCene(
  stav: PoplatekStav | null | undefined,
  v?: PoplatekVstup | null,
): boolean {
  if (stav !== 'ne') return false;
  if (!v) return false;
  if (jeZdrojBooking(v.zdroj)) {
    const n = cisloRezervaceBh(v.rezervace);
    if (n != null && n >= POPLATEK_BOOKING_OD_REZ) return true;
  }
  const den = denVzniku(v.vytvoreno);
  if (den && den < POPLATEK_OD) return false;
  return true;
}

export function poplatekZTokenu(f: number | undefined): PoplatekStav {
  if (f === 0) return 'ne';
  if (f === 1) return 'ano';
  return 'neznamo';
}

export function tokenPoplatku(stav: PoplatekStav | null | undefined): 0 | 1 | undefined {
  if (stav === 'ano') return 1;
  if (stav === 'ne') return 0;
  return undefined;
}

/** Kandidát na korekci uloženého automatického „ano“ u Bookingu od Bennett. */
export function kandidatOpravyPoplatkuBooking(rec: {
  rezervace: string;
  zdroj: string | null;
  poplatek: PoplatekStav;
  stav?: string | null;
}): boolean {
  if (rec.stav === 'zruseno') return false;
  if (!jeZdrojBooking(rec.zdroj)) return false;
  const n = cisloRezervaceBh(rec.rezervace);
  if (n == null || n < POPLATEK_BOOKING_OD_REZ) return false;
  return rec.poplatek === 'ano' || rec.poplatek === 'neznamo';
}
