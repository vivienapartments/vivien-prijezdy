import { duvod, problemEmailu } from './chyby';
import { nightsBetween } from './dates';
import { jazykZPredvolby, normalizujTelefon } from './telefon';
import {
  prazdnaRezervace,
  type ProcessStore,
  type RezervaceRecord,
  type RezervaceStav,
} from './store';
import type { AptId } from './types';
import { APT_IDS } from './types';

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

  const nova = !prev;
  if (nova) {
    patch.stav = 'bez_checkinu' satisfies RezervaceStav;
    patch.stitek = opts.stitek;
    patch.otevrenoPocet = 0;
    if (opts.chybi?.length) patch.duvody = [duvod('neuplne', `Nepřečteno: ${opts.chybi.join(', ')}.`)];
  }

  if (Object.keys(patch).length === 0) return { ok: true, nova: false };

  const zaklad = prev ?? prazdnaRezervace(id, now);
  const rec: RezervaceRecord = {
    ...zaklad,
    ...patch,
    rezervace: id,
    posledniPokus: now,
    historie: [...zaklad.historie, { cas: now, co: opts.historie }].slice(-40),
  };
  await store.setRezervace(id, rec);
  return { ok: true, nova };
}
