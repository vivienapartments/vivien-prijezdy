import { PRIPLATEK_DO, PRIPLATEK_KROK_MIN } from './constants';
import { CAS_PO_23, jeCasSPriplatkem } from './priplatek-prijezd';
import { normalizujTelefon } from './telefon';
import type { RezervaceRecord } from './store';

function casyOdDo(odMin: number, doMin: number, krok: number): string[] {
  const out: string[] = [];
  for (let m = odMin; m <= doMin; m += krok) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    out.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return out;
}

/** Půlhodiny od 14:00 do 23:00. Po 20:00 je u času příplatek. */
export const CASY_VYBERU = casyOdDo(14 * 60, PRIPLATEK_DO, PRIPLATEK_KROK_MIN);

/** Volba „Po 20:00“. V přehledu se ukáže jako pozdní příjezd. */
export const CAS_PO_20 = 'po20';

export type ZpusobPrijezdu = 'auto' | 'pesky';

/** nic = další kroky se nevykreslí. cele = majitel odemkl, kódy pořád jen po předání. */
export type UrovenPruvodce = 'nic' | 'pesky' | 'auto' | 'cele';

export type VstupHosta = {
  cas: string | null;
  zpusob: ZpusobPrijezdu | null;
  telefonBrana: string | null;
  spz: string | null;
  spzPujcene: boolean;
  souhlas: boolean;
  odemceno: boolean;
};

export type ChybejiciKrok = 'cas' | 'zpusob' | 'pravidla';

export function jeCasHosta(cas: string | null | undefined): boolean {
  if (!cas) return false;
  return cas === CAS_PO_20 || cas === CAS_PO_23 || (CASY_VYBERU as readonly string[]).includes(cas) || jeCasSPriplatkem(cas);
}

export function normalizujSpz(raw: string): { ok: true; spz: string } | { ok: false } {
  const spz = raw.toUpperCase().replace(/[\s\-–—]/g, '');
  if (!/^[A-Z0-9]{2,10}$/.test(spz)) return { ok: false };
  return { ok: true, spz };
}

/** Telefon pro bránu musí být jisté číslo s předvolbou. Nejisté se neuloží. */
export function telefonProBranu(
  raw: string,
  narodnost?: string | null,
): { ok: true; ulozeny: string; wa: string | null } | { ok: false } {
  const tel = normalizujTelefon(raw, narodnost);
  if (!tel || tel.nejisty || !tel.ulozeny.startsWith('+')) return { ok: false };
  return { ok: true, ulozeny: tel.ulozeny, wa: tel.wa };
}

/** Auto je hotové, až je telefon pro bránu a SPZ, nebo poznámka že SPZ přijde později. */
export function zpusobJeHotovy(v: {
  zpusob: ZpusobPrijezdu | null;
  telefonBrana: string | null;
  spz: string | null;
  spzPujcene: boolean;
}): boolean {
  if (v.zpusob === 'pesky') return true;
  return v.zpusob === 'auto' && Boolean(v.telefonBrana) && Boolean(v.spz || v.spzPujcene);
}

/** Čas, způsob příjezdu a souhlas. Chybí-li jedna věc, průvodce zůstane zavřený. */
export function pruvodceRozbalen(v: {
  cas: string | null;
  zpusob: ZpusobPrijezdu | null;
  telefonBrana: string | null;
  spz: string | null;
  spzPujcene: boolean;
  souhlas: boolean;
}): boolean {
  return casOtevria(v.cas) && zpusobJeHotovy(v) && v.souhlas;
}

export function chybejiciKroky(v: {
  cas: string | null;
  zpusob: ZpusobPrijezdu | null;
  telefonBrana: string | null;
  spz: string | null;
  spzPujcene: boolean;
  souhlas: boolean;
}): ChybejiciKrok[] {
  const out: ChybejiciKrok[] = [];
  if (!casOtevria(v.cas)) out.push('cas');
  if (!zpusobJeHotovy(v)) out.push('zpusob');
  if (!v.souhlas) out.push('pravidla');
  return out;
}

/**
 * Další kroky průvodce. Den příjezdu sám nic neotevře.
 * Bez času, způsobu nebo souhlasu zůstane zavřený. Auto bez telefonu a SPZ taky.
 */
export function urovenPruvodce(v: VstupHosta): UrovenPruvodce {
  if (v.odemceno) return 'cele';
  if (!pruvodceRozbalen(v)) return 'nic';
  if (v.zpusob === 'pesky') return 'pesky';
  if (v.zpusob === 'auto') return 'auto';
  return 'nic';
}

export function vstupZRezervace(rec: RezervaceRecord | null): VstupHosta {
  return {
    cas: rec?.casPrijezdu && jeCasHosta(rec.casPrijezdu) ? rec.casPrijezdu : rec?.casPrijezdu || null,
    zpusob: rec?.zpusobPrijezdu === 'auto' || rec?.zpusobPrijezdu === 'pesky' ? rec.zpusobPrijezdu : null,
    telefonBrana: rec?.telefonBrana || null,
    spz: rec?.spz || null,
    spzPujcene: Boolean(rec?.spzPujcene),
    souhlas: Boolean(rec?.souhlasPravidel),
    odemceno: Boolean(rec?.pruvodceOdemcen),
  };
}

/** Majitelův ruční čas (třeba 11:00) průvodce taky otevře, když je způsob vyplněný. */
export function casOtevria(cas: string | null): boolean {
  if (!cas) return false;
  if (jeCasHosta(cas)) return true;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(cas);
}

export function urovenZRezervace(rec: RezervaceRecord | null): UrovenPruvodce {
  return urovenPruvodce(vstupZRezervace(rec));
}

const OKNO_MS = 10 * 60 * 1000;
const LIMIT = 8;

export function smiUlozit(znacky: string[], ted = Date.now()): boolean {
  const nedavno = znacky.filter((z) => {
    const t = Date.parse(z);
    return Number.isFinite(t) && t >= ted - OKNO_MS;
  });
  return nedavno.length < LIMIT;
}

export type VysledekUlozeni =
  | { ok: true; uroven: UrovenPruvodce }
  | { ok: false; duvod: 'token' | 'cas' | 'telefon' | 'spz' | 'zpusob' | 'souhlas' | 'limit' | 'chybi' };
