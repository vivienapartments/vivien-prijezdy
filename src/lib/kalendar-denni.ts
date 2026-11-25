/**
 * Denní kalendář: ceny + obsazenost z xlsx, obsazenost i z rezervací průvodce.
 */
import * as XLSX from 'xlsx';
import { APT_IDS, type AptId } from './types';
import { POPTAVKA_SLEVA_PCT } from './poptavka';

export type AptDen = {
  cena: number | null;
  obsazeno: boolean;
  bezPrijezdu: boolean;
};

export type DenKalendare = Record<AptId, AptDen>;

export type KalendarDenni = Record<string, DenKalendare>;

export type KalendarMeta = {
  cenyNahrano: string | null;
  obsazenostNahrano: string | null;
  /** Výchozí true. */
  cenyZapnuto: boolean;
  zdrojCen: 'xlsx' | 'bh-api';
  posledniRezervace: string | null;
};

export const PRAZDNA_META: KalendarMeta = {
  cenyNahrano: null,
  obsazenostNahrano: null,
  cenyZapnuto: true,
  zdrojCen: 'xlsx',
  posledniRezervace: null,
};

function excelDatumNaYmd(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}-${String(v.getUTCDate()).padStart(2, '0')}`;
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    const epoch = Date.UTC(1899, 11, 30);
    const d = new Date(epoch + v * 86400000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return null;
}

function prazdnyDen(): DenKalendare {
  const d = {} as DenKalendare;
  for (const id of APT_IDS) {
    d[id] = { cena: null, obsazeno: false, bezPrijezdu: false };
  }
  return d;
}

export function zajistiDen(mapa: KalendarDenni, ymd: string): DenKalendare {
  if (!mapa[ymd]) mapa[ymd] = prazdnyDen();
  return mapa[ymd];
}

function jeObsazenoStav(raw: string): boolean {
  const s = raw.toUpperCase();
  return s.includes('OBSAZ') || s.includes('NEDOSTUP');
}

function jeBezPrijezdu(raw: string): boolean {
  const s = raw.toUpperCase();
  return (
    (s.includes('OMEZEN') || s.includes('VOLNO S OMEZEN')) && !jeObsazenoStav(s)
  );
}

function jeVolnoStav(raw: string): boolean {
  const s = raw.toUpperCase();
  return s.includes('VOLNO') || s.includes('DOSTUP') || s === '';
}

/** Parsuje list s hlavičkou Datum / Den / V1…V5 (řádek hlavičky se hledá). */
function parsujListApt(
  sheet: XLSX.WorkSheet,
  onBunka: (ymd: string, apt: AptId, raw: string, cislo: number | null) => void,
): void {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true }) as unknown[][];
  let header = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const c0 = String(rows[i]?.[0] ?? '');
    if (/datum/i.test(c0)) {
      header = i;
      break;
    }
  }
  if (header < 0) return;
  for (let i = header + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const ymd = excelDatumNaYmd(r[0]);
    if (!ymd) continue;
    for (let a = 0; a < 5; a++) {
      const apt = APT_IDS[a];
      const cell = r[a + 2];
      const cislo = typeof cell === 'number' && Number.isFinite(cell) ? cell : null;
      const raw = cell == null ? '' : String(cell).trim();
      onBunka(ymd, apt, raw, cislo);
    }
  }
}

export function parsujCenyXlsx(buf: ArrayBuffer | Buffer): KalendarDenni {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const name =
    wb.SheetNames.find((n) => /denn[ií].*cen/i.test(n) || /ceny/i.test(n)) || wb.SheetNames[0];
  const sh = wb.Sheets[name];
  const out: KalendarDenni = {};
  parsujListApt(sh, (ymd, apt, _raw, cislo) => {
    const den = zajistiDen(out, ymd);
    den[apt] = { ...den[apt], cena: cislo != null && cislo > 0 ? Math.round(cislo) : null };
  });
  return out;
}

export function parsujObsazenostXlsx(buf: ArrayBuffer | Buffer): KalendarDenni {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const out: KalendarDenni = {};
  for (const name of wb.SheetNames) {
    const sh = wb.Sheets[name];
    parsujListApt(sh, (ymd, apt, raw) => {
      const den = zajistiDen(out, ymd);
      if (jeObsazenoStav(raw)) {
        den[apt] = { ...den[apt], obsazeno: true, bezPrijezdu: false };
      } else if (jeBezPrijezdu(raw)) {
        den[apt] = { ...den[apt], obsazeno: false, bezPrijezdu: true };
      } else if (jeVolnoStav(raw) || raw) {
        den[apt] = { ...den[apt], obsazeno: false, bezPrijezdu: den[apt].bezPrijezdu };
      }
    });
  }
  return out;
}

/** Pozná typ xlsx podle názvů listů. */
export function rozpoznajXlsx(buf: ArrayBuffer | Buffer): 'ceny' | 'obsazenost' | null {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const names = wb.SheetNames.join(' | ');
  if (/denn[ií].*cen|ceny/i.test(names)) return 'ceny';
  if (/screenshot|obsazen|dostupn|termín|termin/i.test(names)) return 'obsazenost';
  return null;
}

export function sloucitKalendar(zaklad: KalendarDenni, patch: KalendarDenni, pole: 'cena' | 'obsazenost'): KalendarDenni {
  const out: KalendarDenni = { ...zaklad };
  for (const [ymd, den] of Object.entries(patch)) {
    const cil = zajistiDen(out, ymd);
    for (const apt of APT_IDS) {
      const p = den[apt];
      if (!p) continue;
      if (pole === 'cena') {
        cil[apt] = { ...cil[apt], cena: p.cena };
      } else {
        cil[apt] = {
          ...cil[apt],
          obsazeno: p.obsazeno,
          bezPrijezdu: p.bezPrijezdu,
        };
      }
    }
  }
  return out;
}

export type RezProKalendar = {
  prijezd: string | null;
  odjezd: string | null;
  apartman: AptId | null;
  stav?: string | null;
  zkusebni?: boolean;
};

/** Noci od příjezdu do dne před odjezdem. */
export function nociPobytu(prijezd: string, odjezd: string): string[] {
  const out: string[] = [];
  let t = Date.parse(`${prijezd}T12:00:00Z`);
  const konec = Date.parse(`${odjezd}T12:00:00Z`);
  if (!Number.isFinite(t) || !Number.isFinite(konec) || konec <= t) return out;
  while (t < konec) {
    const d = new Date(t);
    out.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
    );
    t += 86400000;
  }
  return out;
}

/**
 * Aplikuje rezervace z průvodce na kalendář (OR s tabulkou).
 * Storno neblokuje. Bez apartmánu = +1 do součtu obsazených (značka `_bezApt`).
 */
export function aplikujRezervace(
  mapa: KalendarDenni,
  rezervace: RezProKalendar[],
): { mapa: KalendarDenni; bezAptPoDnech: Record<string, number> } {
  const out: KalendarDenni = { ...mapa };
  const bezAptPoDnech: Record<string, number> = {};
  for (const r of rezervace) {
    if (r.zkusebni) continue;
    if (r.stav === 'zruseno') continue;
    if (!r.prijezd || !r.odjezd) continue;
    const noci = nociPobytu(r.prijezd, r.odjezd);
    if (!r.apartman) {
      for (const d of noci) bezAptPoDnech[d] = (bezAptPoDnech[d] || 0) + 1;
      continue;
    }
    for (const d of noci) {
      const den = zajistiDen(out, d);
      den[r.apartman] = { ...den[r.apartman], obsazeno: true };
    }
  }
  return { mapa: out, bezAptPoDnech };
}

export function denPlno(den: DenKalendare | undefined, bezApt = 0): boolean {
  if (!den) return false;
  let obs = bezApt;
  for (const id of APT_IDS) {
    if (den[id]?.obsazeno) obs += 1;
  }
  return obs >= 5;
}

/** Má apartmán v dané noci platnou cenu. */
export function maCenuNoci(den: DenKalendare | undefined, apt: AptId): boolean {
  const c = den?.[apt]?.cena;
  return typeof c === 'number' && c > 0;
}

/** Volné apartmány (ne obsazené) s cenou. Bez ceny se nenabízejí. */
export function volneApty(den: DenKalendare | undefined): AptId[] {
  if (!den) return [];
  return APT_IDS.filter((id) => !den[id]?.obsazeno && maCenuNoci(den, id));
}

export function minCenaVolnych(den: DenKalendare | undefined): number | null {
  const volne = volneApty(den);
  let min: number | null = null;
  for (const id of volne) {
    const c = den?.[id]?.cena;
    if (c == null || c <= 0) continue;
    if (min == null || c < min) min = c;
  }
  return min;
}

/** Den nejde zvolit jako příjezd: všechny volné mají bezPrijezdu (nebo plno). */
export function denBezPrijezdu(den: DenKalendare | undefined, bezApt = 0): boolean {
  if (denPlno(den, bezApt)) return true;
  const volne = volneApty(den);
  if (!volne.length) return true;
  return volne.every((id) => den?.[id]?.bezPrijezdu);
}

export function slevaPctCastka(suma: number, pct = POPTAVKA_SLEVA_PCT): number {
  return Math.round(suma * (1 - pct / 100));
}

export type CenaPobytu = {
  apt: AptId;
  suma: number;
  seSlevou: number;
};

/** Apartmány volné ve všech nocích termínu a s cenou za každou noc. */
export function aptyVolneVeTerminu(
  mapa: KalendarDenni,
  prijezd: string,
  odjezd: string,
): AptId[] {
  const noci = nociPobytu(prijezd, odjezd);
  if (!noci.length) return [];
  return APT_IDS.filter((id) =>
    noci.every((d) => {
      const b = mapa[d]?.[id];
      return Boolean(b) && !b.obsazeno && maCenuNoci(mapa[d], id);
    }),
  );
}

/** Kolik nocí v kuse je apartmán volný od příjezdu (max 60). Bez ceny noc končí. */
export function dosahNociApartmanu(mapa: KalendarDenni, prijezd: string, apt: AptId): number {
  let n = 0;
  for (let i = 0; i < 60; i++) {
    const den = posunYmd(prijezd, i);
    const b = mapa[den]?.[apt];
    if (!b || b.obsazeno || !maCenuNoci(mapa[den], apt)) break;
    n += 1;
  }
  return n;
}

/** Nejdelší dosah ze všech apartmánů (kolik nocí jde v jednom apt). */
export function maxDosahNoci(mapa: KalendarDenni, prijezd: string): number {
  let max = 0;
  for (const id of APT_IDS) {
    const d = dosahNociApartmanu(mapa, prijezd, id);
    if (d > max) max = d;
  }
  return max;
}

/** Možné dny odjezdu = příjezd+1 … příjezd+dosah. */
export function mozneDnyOdjezdu(mapa: KalendarDenni, prijezd: string): string[] {
  const dosah = maxDosahNoci(mapa, prijezd);
  const out: string[] = [];
  for (let i = 1; i <= dosah; i++) out.push(posunYmd(prijezd, i));
  return out;
}

/** Možné odjezdy jen v jednom apartmánu. */
export function mozneDnyOdjezduApartmanu(
  mapa: KalendarDenni,
  prijezd: string,
  apt: AptId,
): string[] {
  const dosah = dosahNociApartmanu(mapa, prijezd, apt);
  const out: string[] = [];
  for (let i = 1; i <= dosah; i++) out.push(posunYmd(prijezd, i));
  return out;
}

function posunYmd(ymd: string, dnu: number): string {
  const t = Date.parse(`${ymd}T12:00:00Z`) + dnu * 86_400_000;
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** 3 nejbližší volné termíny stejné délky (před i po). */
export function nejblizsiVolneTerminy(
  mapa: KalendarDenni,
  prijezd: string,
  odjezd: string,
  apt?: AptId | null,
  max = 3,
): { prijezd: string; odjezd: string }[] {
  const noci = nociPobytu(prijezd, odjezd).length;
  if (noci < 1) return [];
  const out: { prijezd: string; odjezd: string }[] = [];
  for (let vzd = 1; vzd <= 120 && out.length < max; vzd++) {
    const davka: { prijezd: string; odjezd: string }[] = [];
    for (const smer of [1, -1] as const) {
      const p = posunYmd(prijezd, smer * vzd);
      const o = posunYmd(p, noci);
      const volne = aptyVolneVeTerminu(mapa, p, o);
      if (apt ? volne.includes(apt) : volne.length > 0) {
        if (!davka.some((x) => x.prijezd === p && x.odjezd === o)) {
          davka.push({ prijezd: p, odjezd: o });
        }
      }
    }
    for (const t of davka) {
      if (out.length >= max) break;
      if (!out.some((x) => x.prijezd === t.prijezd && x.odjezd === t.odjezd)) out.push(t);
    }
  }
  return out.slice(0, max);
}

export function cenaApartmanuZaPobyt(
  mapa: KalendarDenni,
  apt: AptId,
  prijezd: string,
  odjezd: string,
): number | null {
  const noci = nociPobytu(prijezd, odjezd);
  if (!noci.length) return null;
  let suma = 0;
  for (const d of noci) {
    const c = mapa[d]?.[apt]?.cena;
    if (c == null || c <= 0) return null;
    suma += c;
  }
  return suma;
}

export function nejlevnejsiVolnyPobyt(
  mapa: KalendarDenni,
  prijezd: string,
  odjezd: string,
  kandidati?: AptId[],
  slevaPct: number = POPTAVKA_SLEVA_PCT,
): CenaPobytu | null {
  const apty = (kandidati && kandidati.length ? kandidati : aptyVolneVeTerminu(mapa, prijezd, odjezd)).filter(
    (id) => aptyVolneVeTerminu(mapa, prijezd, odjezd).includes(id),
  );
  let best: CenaPobytu | null = null;
  for (const apt of apty) {
    const suma = cenaApartmanuZaPobyt(mapa, apt, prijezd, odjezd);
    if (suma == null) continue;
    const seSlevou = slevaPct > 0 ? slevaPctCastka(suma, slevaPct) : suma;
    if (!best || suma < best.suma) best = { apt, suma, seSlevou };
  }
  return best;
}

export function terminPresPlnyDen(
  mapa: KalendarDenni,
  prijezd: string,
  odjezd: string,
  bezAptPoDnech: Record<string, number> = {},
): boolean {
  const noci = nociPobytu(prijezd, odjezd);
  return noci.some((d) => denPlno(mapa[d], bezAptPoDnech[d] || 0));
}

export function nactiKalendarDenni(raw: unknown): KalendarDenni {
  if (!raw || typeof raw !== 'object') return {};
  const out: KalendarDenni = {};
  for (const [ymd, den] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || !den || typeof den !== 'object') continue;
    const cil = prazdnyDen();
    for (const id of APT_IDS) {
      const b = (den as Record<string, unknown>)[id];
      if (!b || typeof b !== 'object') continue;
      const o = b as Record<string, unknown>;
      cil[id] = {
        cena: typeof o.cena === 'number' && o.cena > 0 ? Math.round(o.cena) : null,
        obsazeno: Boolean(o.obsazeno),
        bezPrijezdu: Boolean(o.bezPrijezdu),
      };
    }
    out[ymd] = cil;
  }
  return out;
}

export function nactiKalendarMeta(raw: unknown): KalendarMeta {
  if (!raw || typeof raw !== 'object') return { ...PRAZDNA_META };
  const o = raw as Record<string, unknown>;
  return {
    cenyNahrano: typeof o.cenyNahrano === 'string' ? o.cenyNahrano : null,
    obsazenostNahrano: typeof o.obsazenostNahrano === 'string' ? o.obsazenostNahrano : null,
    cenyZapnuto: o.cenyZapnuto === false ? false : true,
    zdrojCen: o.zdrojCen === 'bh-api' ? 'bh-api' : 'xlsx',
    posledniRezervace: typeof o.posledniRezervace === 'string' ? o.posledniRezervace : null,
  };
}
