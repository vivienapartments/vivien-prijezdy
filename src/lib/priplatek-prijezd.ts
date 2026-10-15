/** Příplatek za příjezd po 20:00 a za další výjezd. Částky jsou v constants.ts a tady. */

import { PRIPLATEK_DO, PRIPLATEK_KC, PRIPLATEK_KROK_MIN, PRIPLATEK_OD } from './constants';

export const CEKANI_MINUT = 10;

/** Když host nedorazí a jedeme znovu. */
export const VYJEZD_CASTKA = 300;

export type VyjezdPolozka = {
  id: string;
  kdy: string;
  castka: number;
};

export function novyVyjezd(kdy: string, castka = VYJEZD_CASTKA): VyjezdPolozka {
  return { id: `${kdy}-${Math.random().toString(36).slice(2, 8)}`, kdy, castka };
}

export function vratPosledniVyjezd(seznam: VyjezdPolozka[]): VyjezdPolozka[] {
  return seznam.slice(0, -1);
}

export function soucetVyjezdu(seznam: { castka: number }[]): number {
  return seznam.reduce((soucet, polozka) => soucet + polozka.castka, 0);
}

export const CAS_PO_23 = 'po23';

export type PriplatekCasu =
  | { stav: 'nic'; kc: 0 }
  | { stav: 'castka'; kc: number }
  | { stav: 'domluva' }
  | { stav: 'neznamo' };

function minutyCasu(cas: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(cas.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 0 do 20:00 včetně. Pak 100 Kč za každou započatou půlhodinu. Po 23:00 jen po domluvě. */
export function priplatekCasu(cas: string | null | undefined): PriplatekCasu {
  const text = (cas || '').trim();
  if (!text) return { stav: 'neznamo' };
  if (text === 'po23' || text === CAS_PO_23 || /^po\s*23/i.test(text)) return { stav: 'domluva' };
  if (text === 'po20' || /^po\s*20/i.test(text)) return { stav: 'neznamo' };
  const min = minutyCasu(text);
  if (min == null) return { stav: 'neznamo' };
  if (min <= PRIPLATEK_OD) return { stav: 'nic', kc: 0 };
  if (min > PRIPLATEK_DO) return { stav: 'domluva' };
  const kroky = Math.ceil((min - PRIPLATEK_OD) / PRIPLATEK_KROK_MIN);
  return { stav: 'castka', kc: kroky * PRIPLATEK_KC };
}

export function priplatekProCas(cas: string): number | null {
  const vysledek = priplatekCasu(cas);
  return vysledek.stav === 'castka' ? vysledek.kc : null;
}

export function jeCasSPriplatkem(cas: string): boolean {
  return priplatekProCas(cas) != null;
}

export function casZMinut(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function popisekCasu(cas: string): string {
  if (cas === 'po20') return 'po 20:00';
  if (cas === CAS_PO_23) return 'po 23:00';
  return cas;
}
