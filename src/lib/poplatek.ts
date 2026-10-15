import { parseCzechDate } from './dates';

/** Rezervace vytvořené v tento den a později poplatek platí. Starší ho mají v ceně. */
export const POPLATEK_OD = '2026-10-05';

export type PoplatekStav = 'ano' | 'ne' | 'neznamo';

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

export function poplatekZData(vytvoreno: string | null | undefined): PoplatekStav {
  const den = parseDatumVytvoreni(vytvoreno) || (vytvoreno && /^\d{4}-\d{2}-\d{2}$/.test(vytvoreno) ? vytvoreno : null);
  if (!den) return 'neznamo';
  return den >= POPLATEK_OD ? 'ano' : 'ne';
}

/** Nejnižší číslo rezervace, která vznikla 5. 10. 2026 nebo později. Vyšší číslo bez data poplatek vybírá. */
export function hraniceRezervace(zaznamy: { rezervace: string; vytvoreno: string | null }[]): number | null {
  let min: number | null = null;
  for (const z of zaznamy) {
    if (poplatekZData(z.vytvoreno) !== 'ano') continue;
    const n = Number(String(z.rezervace).replace(/\D/g, ''));
    if (!Number.isFinite(n) || n <= 0) continue;
    if (min == null || n < min) min = n;
  }
  return min;
}

export function castkaPoplatku(noci: number | null, osob: number | null): number | null {
  if (!noci || !osob || noci < 1 || osob < 1) return null;
  return noci * osob * 50;
}

/** Neznámé datum se chová jako dnes: box se ukáže. Schová se jen když víme, že poplatek neplatí. */
export function ukazatPoplatek(stav: PoplatekStav | null | undefined): boolean {
  return stav !== 'ne';
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
