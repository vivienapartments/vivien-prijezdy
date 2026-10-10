import apartmanyJson from '@/data/apartmany.json';
import type { ProcessStore, RezervaceRecord, RezervaceStav } from './store';
import type { AptId, GuideLang } from './types';

export type PrehledRadek = {
  rezervace: string;
  apartman: AptId | null;
  apartmanNazev: string;
  prijezd: string | null;
  odjezd: string | null;
  termin: string;
  jmeno: string;
  email: string;
  stav: RezervaceStav;
  stavText: string;
  coSeStalo: string;
  posledniPokus: string;
  posledniPokusText: string;
  historie: { cas: string; co: string }[];
  noci: number | null;
  osob: number | null;
  jazyk: GuideLang | null;
  accessPin: string | null;
};

type AptRow = { id: AptId; nazev: { cs: string; en: string } };
const apartmany = (apartmanyJson as { apartmany: AptRow[] }).apartmany;

/** U zrušené rezervace se znovu neposílá. Odkaz na průvodce zůstává. */
export function nabidnoutOdeslani(stav: RezervaceStav): boolean {
  return stav !== 'zruseno';
}

/** Už odeslaný průvodce se znovu posílá jen po této otázce. */
export function dotazPredOdeslanimZnovu(stav: RezervaceStav): string | null {
  if (stav === 'odeslano' || stav === 'odeslano_s_vyhradou') {
    return 'Host už průvodce dostal. Opravdu poslat znovu?';
  }
  return null;
}

export const STAV_TEXT: Record<RezervaceStav, string> = {
  odeslano: 'Odesláno',
  odeslano_s_vyhradou: 'Odesláno s výhradou',
  neodeslano: 'Neodesláno',
  vraceno: 'Vráceno',
  bez_checkinu: 'Bez check-inu',
  zruseno: 'Zrušeno',
};

export function dnesVPraze(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function czDen(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return ymd;
  return `${Number(d)}. ${Number(m)}.`;
}

export function terminText(prijezd: string | null, odjezd: string | null): string {
  if (prijezd && odjezd) return `${czDen(prijezd)} – ${czDen(odjezd)}`;
  if (prijezd) return czDen(prijezd);
  return '—';
}

function aptNazev(id: AptId | null): string {
  if (!id) return '—';
  const a = apartmany.find((x) => x.id === id);
  return a ? `${a.nazev.cs} (${id})` : id;
}

function casText(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  return new Intl.DateTimeFormat('cs-CZ', {
    timeZone: 'Europe/Prague',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(t);
}

export function radekZRezervace(rec: RezervaceRecord): PrehledRadek {
  const vety = rec.duvody.map((d) => d.veta).filter(Boolean);
  const coSeStalo =
    vety.join(' ') ||
    (rec.stav === 'odeslano' || rec.stav === 'odeslano_s_vyhradou' ? 'Průvodce odeslán.' : '—');
  return {
    rezervace: rec.rezervace,
    apartman: rec.apartman,
    apartmanNazev: aptNazev(rec.apartman),
    prijezd: rec.prijezd,
    odjezd: rec.odjezd,
    termin: terminText(rec.prijezd, rec.odjezd),
    jmeno: rec.jmeno?.trim() || '—',
    email: rec.emailHosta?.trim() || '—',
    stav: rec.stav,
    stavText: STAV_TEXT[rec.stav],
    coSeStalo,
    posledniPokus: rec.posledniPokus,
    posledniPokusText: casText(rec.posledniPokus),
    historie: rec.historie,
    noci: rec.noci,
    osob: rec.osob,
    jazyk: rec.jazyk,
    accessPin: rec.accessPin,
  };
}

/** Nejbližší příjezd nahoře. Bez data až nakonec. */
export function seradRadky(rows: PrehledRadek[], now = new Date()): PrehledRadek[] {
  const today = Date.parse(dnesVPraze(now));
  return [...rows].sort((a, b) => {
    const da = a.prijezd ? Date.parse(a.prijezd) : Number.POSITIVE_INFINITY;
    const db = b.prijezd ? Date.parse(b.prijezd) : Number.POSITIVE_INFINITY;
    const va = Number.isFinite(da) ? Math.abs(da - today) : Number.POSITIVE_INFINITY;
    const vb = Number.isFinite(db) ? Math.abs(db - today) : Number.POSITIVE_INFINITY;
    if (va !== vb) return va - vb;
    if (da !== db) return da - db;
    return a.rezervace < b.rezervace ? -1 : 1;
  });
}

export async function buildPrehled(store: ProcessStore, now = new Date()): Promise<PrehledRadek[]> {
  const entries = await store.listRezervace();
  return seradRadky(
    entries.map(({ record }) => radekZRezervace(record)),
    now,
  );
}

export function souhrnDnes(rows: PrehledRadek[], now = new Date()): { prijezdy: number; neodeslano: number } {
  const dnes = dnesVPraze(now);
  const dnesni = rows.filter((r) => r.prijezd === dnes);
  return {
    prijezdy: dnesni.length,
    neodeslano: dnesni.filter((r) => r.stav === 'neodeslano').length,
  };
}
