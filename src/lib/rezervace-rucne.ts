import { duvod, problemEmailu } from './chyby';
import { nightsBetween } from './dates';
import { oznacRucni, vynechRucni } from './rucni-pole';
import { jazykZPredvolby, normalizujTelefon } from './telefon';
import type { RucniPole } from './store';
import {
  prazdnaRezervace,
  type ProcessStore,
  type RezervaceRecord,
  type RezervaceStav,
} from './store';
import type { AptId, GuideLang } from './types';
import { APT_IDS, GUIDE_LANGS } from './types';

export type StitekRezervace = 'rucne' | 'info';

export type DoplnekRezervace = {
  rezervace: string;
  jmeno?: string | null;
  telefon?: string | null;
  email?: string | null;
  apartman?: AptId | null;
  prijezd?: string | null;
  odjezd?: string | null;
  osob?: number | null;
  noci?: number | null;
  zdroj?: string | null;
  checkinUrl?: string | null;
};

export type NovaRucniRezervace = {
  jmeno?: string | null;
  telefon?: string | null;
  email?: string | null;
  apartman: AptId;
  prijezd: string;
  odjezd: string;
  osob: number;
  pin: string;
  narodnost?: string | null;
  jazyk?: GuideLang | null;
};

const ZDROJE = new Set(['Booking', 'Airbnb', 'přímá']);

function prazdne(value: unknown): boolean {
  return value == null || value === '';
}

function cisloRezervace(raw: string): string | null {
  const ciste = raw.replace(/\s+/g, '');
  return /^\d{4,}$/.test(ciste) ? ciste : null;
}

function datum(raw: string | null | undefined): string | null {
  const s = (raw || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function zdroj(raw: string | null | undefined): string | null {
  const s = (raw || '').trim();
  if (!s) return null;
  if (ZDROJE.has(s)) return s;
  if (/booking/i.test(s)) return 'Booking';
  if (/air\s*bn/i.test(s)) return 'Airbnb';
  if (/přím|prima|direct/i.test(s)) return 'přímá';
  return s;
}

/** Doplní jen prázdná pole. Co už v záznamu je, zůstane. Hostovi se nic neposílá. */
export async function doplnRezervaci(
  store: ProcessStore,
  vstup: DoplnekRezervace,
  opts: { stitek: StitekRezervace; historie: string; chybi?: string[]; nahradJmeno?: boolean },
): Promise<{ ok: true; nova: boolean } | { ok: false; error: string }> {
  const id = cisloRezervace(vstup.rezervace);
  if (!id) return { ok: false, error: 'Číslo rezervace napište číslicemi.' };

  const email = (vstup.email || '').trim();
  if (email && problemEmailu(email)) return { ok: false, error: 'E-mail má špatný tvar.' };

  const prijezd = datum(vstup.prijezd);
  const odjezd = datum(vstup.odjezd);
  if ((vstup.prijezd && !prijezd) || (vstup.odjezd && !odjezd)) {
    return { ok: false, error: 'Datum je ve špatném tvaru.' };
  }
  if (prijezd && odjezd && !nightsBetween(prijezd, odjezd)) {
    return { ok: false, error: 'Odjezd je dřív než příjezd.' };
  }

  const apartman = vstup.apartman && APT_IDS.includes(vstup.apartman) ? vstup.apartman : null;
  const osob = vstup.osob && Number.isFinite(vstup.osob) && vstup.osob > 0 ? Math.floor(vstup.osob) : null;
  const jmeno = (vstup.jmeno || '').replace(/\s+/g, ' ').trim();
  const tel = vstup.telefon ? normalizujTelefon(vstup.telefon) : null;
  const noci = prijezd && odjezd ? nightsBetween(prijezd, odjezd) : vstup.noci && vstup.noci > 0 ? Math.floor(vstup.noci) : null;

  const now = new Date().toISOString();
  const prev = await store.getRezervace(id);
  const patch: Partial<RezervaceRecord> = {};

  function poloz<K extends keyof RezervaceRecord>(key: K, value: RezervaceRecord[K] | null) {
    if (prazdne(value)) return;
    if (prev && !prazdne(prev[key])) return;
    patch[key] = value as never;
  }

  if (opts.nahradJmeno && jmeno) {
    patch.jmeno = jmeno;
    patch.krestni = jmeno.split(' ')[0] || null;
  } else {
    poloz('jmeno', jmeno || null);
    poloz('krestni', jmeno ? jmeno.split(' ')[0] : null);
  }
  poloz('emailHosta', email || null);
  poloz('apartman', apartman);
  poloz('prijezd', prijezd);
  poloz('odjezd', odjezd);
  poloz('noci', noci);
  poloz('osob', osob);
  poloz('zdroj', zdroj(vstup.zdroj));
  if (vstup.checkinUrl && /^https:\/\//i.test(vstup.checkinUrl)) poloz('checkinUrl', vstup.checkinUrl);
  if (tel && !prev?.telefonRezervace) {
    patch.telefonRezervace = tel.ulozeny;
    patch.telefonRezervaceWa = tel.wa;
    patch.telefonRezervacePuvodni = tel.puvodni;
  }

  const cisloProJazyk = patch.telefonRezervace || prev?.telefonRezervace || null;
  if (cisloProJazyk && prazdne(prev?.jazyk)) patch.jazyk = jazykZPredvolby(cisloProJazyk);

  const od = opts.stitek === 'info' ? 'potvrzeni' : 'rezervace';
  const chraneny = prev ? vynechRucni(prev, patch, od) : patch;

  const nova = !prev;
  if (nova) {
    patch.stav = 'bez_checkinu' satisfies RezervaceStav;
    patch.stitek = opts.stitek;
    patch.otevrenoPocet = 0;
    if (opts.chybi?.length) patch.duvody = [duvod('neuplne', `Nepřečteno: ${opts.chybi.join(', ')}.`)];
  }

  if (Object.keys(chraneny).length === 0) return { ok: true, nova: false };

  const zaklad = prev ?? prazdnaRezervace(id, now);
  const rec: RezervaceRecord = {
    ...zaklad,
    ...chraneny,
    rezervace: id,
    posledniPokus: now,
    historie: [...zaklad.historie, { cas: now, co: opts.historie }].slice(-40),
  };
  if (opts.stitek === 'rucne') {
    const pole: RucniPole[] = [];
    if (chraneny.jmeno) pole.push('jmeno');
    if (chraneny.emailHosta) pole.push('emailHosta');
    if (chraneny.apartman) pole.push('apartman');
    if (chraneny.prijezd) pole.push('prijezd');
    if (chraneny.odjezd) pole.push('odjezd');
    if (chraneny.noci) pole.push('noci');
    if (chraneny.osob) pole.push('osob');
    if (chraneny.jazyk) pole.push('jazyk');
    if (chraneny.telefonRezervace) pole.push('telefonRezervace');
    if (chraneny.checkinUrl) pole.push('checkinUrl');
    if (pole.length) rec.rucniZnacky = oznacRucni(rec, pole, now);
  }
  await store.setRezervace(id, rec);
  return { ok: true, nova };
}

function prekryvTerminu(
  aPrijezd: string,
  aOdjezd: string,
  bPrijezd: string | null,
  bOdjezd: string | null,
): boolean {
  if (!bPrijezd || !bOdjezd) return false;
  return aPrijezd < bOdjezd && aOdjezd > bPrijezd;
}

/** Unikátní číslo jen z číslic: 9 + YYYYMMDD + pořadí. */
export async function noveCisloRucni(store: ProcessStore, ted = new Date()): Promise<string> {
  const y = ted.getUTCFullYear();
  const m = String(ted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ted.getUTCDate()).padStart(2, '0');
  const prefix = `9${y}${m}${d}`;
  const list = await store.listRezervace();
  let max = 0;
  for (const e of list) {
    const id = e.id || e.record?.rezervace || '';
    if (!id.startsWith(prefix)) continue;
    const n = Number(id.slice(prefix.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(2, '0')}`;
}

export function najdiPrekryv(
  list: { record: RezervaceRecord }[],
  apartman: AptId,
  prijezd: string,
  odjezd: string,
  kromeId?: string,
): RezervaceRecord | null {
  for (const e of list) {
    const r = e.record;
    if (!r || r.stav === 'zruseno') continue;
    if (kromeId && r.rezervace === kromeId) continue;
    if (r.apartman !== apartman) continue;
    if (prekryvTerminu(prijezd, odjezd, r.prijezd, r.odjezd)) return r;
  }
  return null;
}

/**
 * Nová ruční rezervace s PINem. Hostovi se nic neposílá.
 * Při překryvu bez potvrzení vrátí varování.
 */
export async function vytvorRucniRezervaci(
  store: ProcessStore,
  vstup: NovaRucniRezervace,
  opts: { potvrdPrekryv?: boolean } = {},
): Promise<
  | { ok: true; rezervace: string }
  | { ok: false; error: string; prekryv?: { apartman: string; jmeno: string } }
> {
  if (!APT_IDS.includes(vstup.apartman)) return { ok: false, error: 'Vyberte apartmán.' };
  const prijezd = datum(vstup.prijezd);
  const odjezd = datum(vstup.odjezd);
  if (!prijezd || !odjezd) return { ok: false, error: 'Datum je ve špatném tvaru.' };
  const noci = nightsBetween(prijezd, odjezd);
  if (!noci) return { ok: false, error: 'Odjezd musí být po příjezdu.' };
  const osob = Number.isFinite(vstup.osob) && vstup.osob > 0 ? Math.floor(vstup.osob) : 0;
  if (!osob) return { ok: false, error: 'Doplňte počet osob.' };
  const pin = (vstup.pin || '').trim();
  if (!/^\d{3,12}$/.test(pin)) return { ok: false, error: 'PIN napište číslicemi.' };
  const email = (vstup.email || '').trim();
  if (email && problemEmailu(email)) return { ok: false, error: 'E-mail má špatný tvar.' };
  const jmeno = (vstup.jmeno || '').replace(/\s+/g, ' ').trim();
  const jazyk =
    vstup.jazyk && GUIDE_LANGS.includes(vstup.jazyk)
      ? vstup.jazyk
      : vstup.telefon
        ? jazykZPredvolby(normalizujTelefon(vstup.telefon)?.ulozeny || null)
        : null;

  const list = await store.listRezervace();
  const prekryv = najdiPrekryv(list, vstup.apartman, prijezd, odjezd);
  if (prekryv && !opts.potvrdPrekryv) {
    return {
      ok: false,
      error: `${vstup.apartman} je v tomto termínu obsazený (${(prekryv.jmeno || 'host').split(/\s+/).pop()})`,
      prekryv: { apartman: vstup.apartman, jmeno: prekryv.jmeno || 'host' },
    };
  }

  const id = await noveCisloRucni(store);
  const now = new Date().toISOString();
  const tel = vstup.telefon ? normalizujTelefon(vstup.telefon, vstup.narodnost) : null;
  const jazykHotovo = jazyk || (tel ? jazykZPredvolby(tel.ulozeny) : null);
  const pole: RucniPole[] = ['apartman', 'prijezd', 'odjezd', 'noci', 'osob', 'accessPin'];
  if (jmeno) pole.push('jmeno');
  if (email) pole.push('emailHosta');
  if (jazykHotovo) pole.push('jazyk');
  if (tel) pole.push('telefonRezervace');

  const rec: RezervaceRecord = {
    ...prazdnaRezervace(id, now),
    jmeno: jmeno || null,
    krestni: jmeno ? jmeno.split(' ')[0] : null,
    emailHosta: email || null,
    apartman: vstup.apartman,
    prijezd,
    odjezd,
    noci,
    osob,
    accessPin: pin,
    zdroj: 'přímá',
    stitek: 'rucne',
    stav: 'bez_checkinu',
    narodnost: (vstup.narodnost || '').trim().toUpperCase() || null,
    jazyk: jazykHotovo,
    poplatek: 'ano',
    telefonRezervace: tel?.ulozeny || null,
    telefonRezervaceWa: tel?.wa || null,
    telefonRezervacePuvodni: tel?.puvodni || null,
    rucniZnacky: pole.map((p) => ({ pole: p, cas: now })),
    historie: [{ cas: now, co: 'Přidáno ručně' }],
    posledniPokus: now,
  };
  await store.setRezervace(id, rec);
  return { ok: true, rezervace: id };
}
