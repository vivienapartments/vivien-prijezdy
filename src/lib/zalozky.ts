import { casVPraze, hodinaPraha, minutaPraha } from './brana';
import { PREVZETI_NEZNAMY_HODINA, PREVZETI_PO_HODINACH } from './constants';
import type { RezervaceRecord } from './store';

export type Zalozka = 'prijezdy' | 'dnes' | 'dluhy' | 'hledat';
export type FiltrHledani = '' | 'dnes' | 'zitra' | 'tyden' | 'minule' | 'dluh';

export type HostOdjezdu = {
  odjezd: string | null;
  casOdjezdu: string | null;
  prevzatoKdy: string | null;
  stav: string;
};

export type HostHledani = {
  rezervace: string;
  jmeno: string;
  apartman: string | null;
  prijezd: string | null;
  odjezd: string | null;
  stav: string;
  dluhKc: number;
};

const HODINA = /^([01]\d|2[0-3]):[0-5]\d$/;

export function bezDiakritiky(raw: string): string {
  return (raw || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function casPrevzetiText(iso: string | null): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(t));
  const hod = parts.find((p) => p.type === 'hour')?.value || '';
  const min = parts.find((p) => p.type === 'minute')?.value || '';
  return hod && min ? `${hod}:${min}` : '';
}

/** Ve 12:01 už host s odjezdem v 10:00 v dnešních odjezdech není. Bez času mizí ve 12:00. */
export function casPrevzetiVyprsel(casOdjezdu: string | null, dnes: string, now: Date): boolean {
  if (casOdjezdu && HODINA.test(casOdjezdu)) {
    const [h, m] = casOdjezdu.split(':').map(Number);
    const od = casVPraze(dnes, h, m);
    const limit = od.getTime() + PREVZETI_PO_HODINACH * 60 * 60 * 1000;
    return now.getTime() >= limit;
  }
  const hodina = hodinaPraha(now);
  return hodina > PREVZETI_NEZNAMY_HODINA || (hodina === PREVZETI_NEZNAMY_HODINA && minutaPraha(now) >= 0);
}

export function jeVDnesnichOdjezdech(h: HostOdjezdu, dnes: string, now: Date): boolean {
  if (h.stav === 'zruseno' || h.prevzatoKdy) return false;
  if (h.odjezd !== dnes) return false;
  return !casPrevzetiVyprsel(h.casOdjezdu, dnes, now);
}

export function jeHostOdjetly(h: HostOdjezdu, dnes: string, now: Date): boolean {
  if (h.stav === 'zruseno') return false;
  if (h.prevzatoKdy) return true;
  if (h.odjezd && h.odjezd < dnes) return true;
  if (h.odjezd === dnes && casPrevzetiVyprsel(h.casOdjezdu, dnes, now)) return true;
  return false;
}

export function uzOdjel(rec: { prevzatoKdy?: string | null; odjezd?: string | null }, dnes: string): boolean {
  if (rec.prevzatoKdy) return true;
  return Boolean(rec.odjezd && rec.odjezd < dnes);
}

export function oznacPrevzeti(rec: RezervaceRecord, now = new Date(), auto = false): RezervaceRecord {
  const kdy = now.toISOString();
  return {
    ...rec,
    prevzatoKdy: kdy,
    prevzatoAuto: auto,
    historie: [...rec.historie, { cas: kdy, co: auto ? 'Odjel automaticky' : 'Převzato' }].slice(-40),
  };
}

export function vratPrevzeti(rec: RezervaceRecord, now = new Date()): RezervaceRecord {
  const pred = casPrevzetiText(rec.prevzatoKdy) || 'odjel';
  return {
    ...rec,
    prevzatoKdy: null,
    prevzatoAuto: false,
    historie: [...rec.historie, { cas: now.toISOString(), co: `Vrácen odjezd. Předtím ${pred}.` }].slice(-40),
  };
}

export type DluhHost = { odjezd: string | null; kc: number };

export function seradNedoplatky<T extends DluhHost>(list: T[], dnes: string): T[] {
  return [...list].sort((a, b) => {
    const aDnes = a.odjezd === dnes ? 0 : 1;
    const bDnes = b.odjezd === dnes ? 0 : 1;
    if (aDnes !== bDnes) return aDnes - bDnes;
    return (b.odjezd || '').localeCompare(a.odjezd || '');
  });
}

export function sklonHostu(n: number): string {
  if (n === 1) return 'host';
  if (n >= 2 && n <= 4) return 'hosté';
  return 'hostů';
}

export function formatKc(kc: number): string {
  const text = new Intl.NumberFormat('cs-CZ').format(kc).replace(/[\u00a0\u202f]/g, ' ');
  return `${text} Kč`;
}

export function textStarychDluhu(pocet: number, kc: number): string | null {
  if (pocet <= 0 || kc <= 0) return null;
  return `Starší nedoplatky: ${pocet} ${sklonHostu(pocet)}, ${formatKc(kc)}`;
}

export function textHromadne(pocet: number, kc: number): string {
  return `Označit ${pocet} ${sklonHostu(pocet)} (${formatKc(kc)}) jako zaplacené?`;
}

export function jePondeli(now: Date): boolean {
  const den = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Prague', weekday: 'short' }).format(now);
  return den === 'Mon';
}

export function otisk(polozky: { id: string; kc: number }[]): string {
  return polozky
    .map((p) => `${p.id}:${p.kc}`)
    .sort()
    .join('|');
}

/** Červené jen když je na záložce něco, co tenhle člověk ještě neviděl. */
export function jeNove(otiskNyni: string, videne: string | null): boolean {
  if (!otiskNyni) return false;
  return otiskNyni !== (videne || '');
}

export function vychoziZalozka(
  ulozena: { den: string; zalozka: string } | null,
  dnes: string,
  zUrl: string | null,
): Zalozka {
  if (zUrl === 'prijezdy' || zUrl === 'dnes' || zUrl === 'dluhy' || zUrl === 'hledat') return zUrl;
  if (ulozena && ulozena.den === dnes && (ulozena.zalozka === 'prijezdy' || ulozena.zalozka === 'dnes' || ulozena.zalozka === 'dluhy' || ulozena.zalozka === 'hledat')) {
    return ulozena.zalozka;
  }
  return 'prijezdy';
}

function denVTydnu(ymd: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd);
}

function vTydnu(datum: string | null, dnes: string): boolean {
  if (!datum || !denVTydnu(datum) || !denVTydnu(dnes)) return false;
  const [y, m, d] = dnes.split('-').map(Number);
  const den = new Date(Date.UTC(y, m - 1, d));
  const wd = den.getUTCDay();
  const zpet = wd === 0 ? 6 : wd - 1;
  const pondeli = new Date(den);
  pondeli.setUTCDate(den.getUTCDate() - zpet);
  const nedele = new Date(pondeli);
  nedele.setUTCDate(pondeli.getUTCDate() + 6);
  const iso = (dt: Date) => dt.toISOString().slice(0, 10);
  return datum >= iso(pondeli) && datum <= iso(nedele);
}

function datumyHosta(h: HostHledani): string[] {
  return [h.prijezd, h.odjezd].filter((d): d is string => Boolean(d));
}

function sediDatum(dotaz: string, datum: string): boolean {
  const [y, m, d] = datum.split('-');
  const kratce = `${Number(d)}.${Number(m)}.`;
  const sRokem = `${Number(d)}.${Number(m)}.${y}`;
  const cisty = dotaz.replace(/\s/g, '');
  return cisty === kratce || cisty === `${kratce}` || cisty.startsWith(kratce) || cisty === sRokem || cisty === datum;
}

function vzdalenost(h: HostHledani, dnes: string): number {
  const datum = h.prijezd || h.odjezd;
  if (!datum) return Number.MAX_SAFE_INTEGER;
  return Math.abs(Date.parse(datum) - Date.parse(dnes));
}

export function hledejHosty(hoste: HostHledani[], dotaz: string, filtr: FiltrHledani, dnes: string, zitra: string): HostHledani[] {
  const q = bezDiakritiky(dotaz);
  const ven = hoste.filter((h) => {
    if (filtr === 'dnes' && h.prijezd !== dnes && h.odjezd !== dnes) return false;
    if (filtr === 'zitra' && h.prijezd !== zitra && h.odjezd !== zitra) return false;
    if (filtr === 'tyden' && !datumyHosta(h).some((d) => vTydnu(d, dnes))) return false;
    if (filtr === 'minule' && !(h.odjezd && h.odjezd < dnes)) return false;
    if (filtr === 'dluh' && h.dluhKc <= 0) return false;
    if (!q) return true;
    const jmeno = bezDiakritiky(h.jmeno);
    const apartman = bezDiakritiky(h.apartman || '');
    if (jmeno.includes(q) || h.rezervace.toLowerCase().includes(q) || apartman.includes(q)) return true;
    return datumyHosta(h).some((d) => sediDatum(q, d));
  });
  return ven.sort((a, b) => vzdalenost(a, dnes) - vzdalenost(b, dnes) || a.rezervace.localeCompare(b.rezervace));
}
