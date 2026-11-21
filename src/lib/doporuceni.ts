/**
 * Evidence doporučení (PROMPT-77).
 * Osoba má trvalý kód. Doporučení se páruje s rezervací.
 */

import { randomBytes } from 'crypto';
import { doporuceniKlic } from './doporuceni-klic';
import { jeRelayEmail } from './staly-host';
import { normalizujTelefon } from './telefon';
import type { ProcessStore, RezervaceRecord } from './store';

/** Abeceda bez 0 o 1 l i (záměna). */
export const KOD_ABECEDA = '23456789abcdefghjkmnpqrstuvwxyz';

export type Osoba = {
  id: string;
  jmeno: string | null;
  telefony: string[];
  emaily: string[];
  kod: string;
  rezervace: string[];
  vytvoreno: string;
  rucneSpojeno: string[];
};

export type DoporuceniStav = 'poptano' | 'sparovano' | 'zamitnuto' | 'predano' | 'kredit';

export type DoporuceniHistorie = { cas: string; co: string };

export type Doporuceni = {
  id: string;
  doporucitelOsobaId: string | null;
  kod: string;
  poptavkaId: string | null;
  jmeno: string;
  telefon: string;
  email: string | null;
  termin: string;
  stav: DoporuceniStav;
  rezervace: string | null;
  vytvoreno: string;
  historie: DoporuceniHistorie[];
  duvodZamitnuti: string | null;
};

const DEN_MS = 24 * 60 * 60 * 1000;

export function normalizujKod(raw: string | null | undefined): string {
  return (raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12);
}

export function generujKod(delka = 6): string {
  const out: string[] = [];
  while (out.length < delka) {
    const b = randomBytes(1)[0] % KOD_ABECEDA.length;
    out.push(KOD_ABECEDA[b]);
  }
  return out.join('');
}

function novyId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
}

function normalizujEmail(email: string | null | undefined): string | null {
  const e = (email || '').trim().toLowerCase();
  if (!e || !e.includes('@') || jeRelayEmail(e)) return null;
  return e;
}

/** Jen jistý normalizovaný telefon (+…). */
export function jistyTelefon(raw: string | null | undefined, narodnost?: string | null): string | null {
  const t = normalizujTelefon(raw, narodnost);
  if (!t || t.nejisty) return null;
  return t.ulozeny;
}

async function getJson<T>(store: ProcessStore, key: string): Promise<T | null> {
  const raw = await store.getKv(doporuceniKlic(key));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setJson(store: ProcessStore, key: string, value: unknown): Promise<void> {
  await store.setKv(doporuceniKlic(key), JSON.stringify(value));
}

function asOsoba(raw: unknown): Osoba | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : '';
  const kod = typeof r.kod === 'string' ? r.kod : '';
  if (!id || !kod) return null;
  return {
    id,
    jmeno: typeof r.jmeno === 'string' ? r.jmeno : null,
    telefony: Array.isArray(r.telefony) ? r.telefony.filter((x): x is string => typeof x === 'string') : [],
    emaily: Array.isArray(r.emaily) ? r.emaily.filter((x): x is string => typeof x === 'string') : [],
    kod,
    rezervace: Array.isArray(r.rezervace) ? r.rezervace.filter((x): x is string => typeof x === 'string') : [],
    vytvoreno: typeof r.vytvoreno === 'string' ? r.vytvoreno : new Date().toISOString(),
    rucneSpojeno: Array.isArray(r.rucneSpojeno)
      ? r.rucneSpojeno.filter((x): x is string => typeof x === 'string')
      : [],
  };
}

function asDoporuceni(raw: unknown): Doporuceni | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : '';
  const kod = typeof r.kod === 'string' ? r.kod : '';
  if (!id || !kod) return null;
  const stav =
    r.stav === 'poptano' ||
    r.stav === 'sparovano' ||
    r.stav === 'zamitnuto' ||
    r.stav === 'predano' ||
    r.stav === 'kredit'
      ? r.stav
      : 'poptano';
  return {
    id,
    doporucitelOsobaId: typeof r.doporucitelOsobaId === 'string' ? r.doporucitelOsobaId : null,
    kod,
    poptavkaId: typeof r.poptavkaId === 'string' ? r.poptavkaId : null,
    jmeno: typeof r.jmeno === 'string' ? r.jmeno : '',
    telefon: typeof r.telefon === 'string' ? r.telefon : '',
    email: typeof r.email === 'string' ? r.email : null,
    termin: typeof r.termin === 'string' ? r.termin : '',
    stav,
    rezervace: typeof r.rezervace === 'string' ? r.rezervace : null,
    vytvoreno: typeof r.vytvoreno === 'string' ? r.vytvoreno : new Date().toISOString(),
    historie: Array.isArray(r.historie)
      ? r.historie
          .filter((h): h is DoporuceniHistorie => Boolean(h) && typeof h === 'object')
          .map((h) => ({
            cas: typeof h.cas === 'string' ? h.cas : '',
            co: typeof h.co === 'string' ? h.co : '',
          }))
          .filter((h) => h.cas && h.co)
      : [],
    duvodZamitnuti: typeof r.duvodZamitnuti === 'string' ? r.duvodZamitnuti : null,
  };
}

export async function nactiOsobu(store: ProcessStore, osobaId: string): Promise<Osoba | null> {
  return asOsoba(await getJson(store, `osoba:${osobaId}`));
}

export async function nactiOsobuPodleKodu(store: ProcessStore, kodRaw: string): Promise<Osoba | null> {
  const kod = normalizujKod(kodRaw);
  if (!kod) return null;
  const osobaId = await store.getKv(doporuceniKlic(`od:${kod}`));
  if (!osobaId) return null;
  return nactiOsobu(store, osobaId);
}

export async function nactiDoporuceni(store: ProcessStore, id: string): Promise<Doporuceni | null> {
  return asDoporuceni(await getJson(store, `doporuceni:${id}`));
}

async function ulozOsobu(store: ProcessStore, osoba: Osoba): Promise<void> {
  await setJson(store, `osoba:${osoba.id}`, osoba);
  await store.setKv(doporuceniKlic(`od:${osoba.kod}`), osoba.id);
  for (const tel of osoba.telefony) {
    await store.setKv(doporuceniKlic(`osoba-tel:${tel}`), osoba.id);
  }
  for (const em of osoba.emaily) {
    await store.setKv(doporuceniKlic(`osoba-email:${em}`), osoba.id);
  }
}

async function unikarniKod(store: ProcessStore): Promise<string> {
  for (let i = 0; i < 40; i += 1) {
    const kod = generujKod(6);
    const existuje = await store.getKv(doporuceniKlic(`od:${kod}`));
    if (!existuje) return kod;
  }
  throw new Error('Nepodařilo se vygenerovat unikátní kód doporučení');
}

async function seznamDoporuceniIds(store: ProcessStore): Promise<string[]> {
  const raw = await getJson<string[]>(store, 'doporuceni:seznam');
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string');
}

async function pridejDoSeznamu(store: ProcessStore, id: string): Promise<void> {
  const list = await seznamDoporuceniIds(store);
  if (list.includes(id)) return;
  await setJson(store, 'doporuceni:seznam', [id, ...list].slice(0, 5000));
}

export type NajdiOsobuVstup = {
  rezervaceId: string;
  jmeno?: string | null;
  telefon?: string | null;
  email?: string | null;
  narodnost?: string | null;
  /** Existující osobaId na kartě. */
  osobaId?: string | null;
};

/**
 * Najde nebo založí osobu pro rezervaci (telefon → e-mail → nová).
 * Připíše rezervaci a vrátí osobu s kódem.
 */
export async function najdiNeboVytvorOsobu(
  store: ProcessStore,
  vstup: NajdiOsobuVstup,
): Promise<Osoba> {
  const tel = jistyTelefon(vstup.telefon, vstup.narodnost);
  const email = normalizujEmail(vstup.email);
  const now = new Date().toISOString();

  let osoba: Osoba | null = null;
  if (vstup.osobaId) osoba = await nactiOsobu(store, vstup.osobaId);

  if (!osoba && tel) {
    const id = await store.getKv(doporuceniKlic(`osoba-tel:${tel}`));
    if (id) osoba = await nactiOsobu(store, id);
  }
  if (!osoba && email) {
    const id = await store.getKv(doporuceniKlic(`osoba-email:${email}`));
    if (id) osoba = await nactiOsobu(store, id);
  }

  if (!osoba) {
    const id = novyId('o');
    const kod = await unikarniKod(store);
    osoba = {
      id,
      jmeno: (vstup.jmeno || '').trim() || null,
      telefony: tel ? [tel] : [],
      emaily: email ? [email] : [],
      kod,
      rezervace: [vstup.rezervaceId],
      vytvoreno: now,
      rucneSpojeno: [],
    };
    await ulozOsobu(store, osoba);
    return osoba;
  }

  let zmena = false;
  if (vstup.rezervaceId && !osoba.rezervace.includes(vstup.rezervaceId)) {
    osoba = { ...osoba, rezervace: [...osoba.rezervace, vstup.rezervaceId] };
    zmena = true;
  }
  if (tel && !osoba.telefony.includes(tel)) {
    osoba = { ...osoba, telefony: [...osoba.telefony, tel] };
    zmena = true;
  }
  if (email && !osoba.emaily.includes(email)) {
    osoba = { ...osoba, emaily: [...osoba.emaily, email] };
    zmena = true;
  }
  if (!osoba.jmeno && (vstup.jmeno || '').trim()) {
    osoba = { ...osoba, jmeno: (vstup.jmeno || '').trim() };
    zmena = true;
  }
  if (zmena) await ulozOsobu(store, osoba);
  return osoba;
}

export type VytvorDoporuceniVstup = {
  kod: string;
  poptavkaId: string | null;
  jmeno: string;
  telefon: string;
  email?: string | null;
  prijezd: string;
  odjezd: string;
};

export type VytvorDoporuceniVysledek = {
  doporuceni: Doporuceni;
  doporucitel: Osoba | null;
  telegramPoznamka: string;
  slevaPct: number | null;
};

/** Počet nových doporučení na kód za posledních 7 dní (včetně právě vytvářeného). */
async function pocetZa7Dni(store: ProcessStore, kod: string, ted: number): Promise<number> {
  const ids = await seznamDoporuceniIds(store);
  let n = 0;
  for (const id of ids) {
    const d = await nactiDoporuceni(store, id);
    if (!d || d.kod !== kod) continue;
    const t = Date.parse(d.vytvoreno);
    if (Number.isFinite(t) && ted - t <= 7 * DEN_MS) n += 1;
  }
  return n;
}

export async function vytvorDoporuceni(
  store: ProcessStore,
  vstup: VytvorDoporuceniVstup,
): Promise<VytvorDoporuceniVysledek> {
  const kod = normalizujKod(vstup.kod);
  const doporucitel = kod ? await nactiOsobuPodleKodu(store, kod) : null;
  const now = new Date().toISOString();
  const tel = jistyTelefon(vstup.telefon) || (vstup.telefon || '').trim();
  const email = normalizujEmail(vstup.email);
  const termin =
    vstup.prijezd && vstup.odjezd ? `${vstup.prijezd}→${vstup.odjezd}` : vstup.prijezd || '';

  let stav: DoporuceniStav = 'poptano';
  let duvodZamitnuti: string | null = null;
  let telegramPoznamka: string;
  let slevaPct: number | null = 5;

  if (!doporucitel) {
    telegramPoznamka = `Doporučení: neznámý kód ${kod || vstup.kod}.`;
  } else {
    const stejnyTel = Boolean(tel && doporucitel.telefony.includes(tel));
    const stejnyEmail = Boolean(email && doporucitel.emaily.includes(email));
    if (stejnyTel || stejnyEmail) {
      stav = 'zamitnuto';
      duvodZamitnuti = 'sám sobě';
      slevaPct = null;
      telegramPoznamka = 'Doporučení zamítnuto: stejná osoba jako doporučitel.';
    } else {
      telegramPoznamka = `Doporučení od: ${doporucitel.jmeno || 'host'} (kód ${doporucitel.kod}).`;
    }
  }

  const id = novyId('d');
  const doporuceni: Doporuceni = {
    id,
    doporucitelOsobaId: doporucitel?.id || null,
    kod: kod || normalizujKod(vstup.kod) || 'neznam',
    poptavkaId: vstup.poptavkaId,
    jmeno: (vstup.jmeno || '').trim(),
    telefon: tel,
    email,
    termin,
    stav,
    rezervace: null,
    vytvoreno: now,
    historie: [{ cas: now, co: stav === 'zamitnuto' ? 'Zamítnuto: sám sobě' : 'Poptávka' }],
    duvodZamitnuti,
  };

  await setJson(store, `doporuceni:${id}`, doporuceni);
  await pridejDoSeznamu(store, id);

  if (doporucitel && stav === 'poptano') {
    const pocet = await pocetZa7Dni(store, doporucitel.kod, Date.now());
    if (pocet > 5) {
      telegramPoznamka += `\nZkontroluj kód ${doporucitel.kod}, mnoho poptávek.`;
    }
  }

  return { doporuceni, doporucitel, telegramPoznamka, slevaPct };
}

export async function listOtevrenaDoporuceni(
  store: ProcessStore,
  opts: { dnu?: number; ted?: Date } = {},
): Promise<Doporuceni[]> {
  const dnu = opts.dnu ?? 60;
  const ted = (opts.ted || new Date()).getTime();
  const ids = await seznamDoporuceniIds(store);
  const out: Doporuceni[] = [];
  for (const id of ids) {
    const d = await nactiDoporuceni(store, id);
    if (!d || d.stav !== 'poptano') continue;
    const t = Date.parse(d.vytvoreno);
    if (!Number.isFinite(t) || ted - t > dnu * DEN_MS) continue;
    out.push(d);
  }
  return out;
}

function shodaKontaktu(d: Doporuceni, rec: RezervaceRecord): boolean {
  const telRec =
    jistyTelefon(rec.telefon, rec.narodnost) || jistyTelefon(rec.telefonRezervace, rec.narodnost);
  const telDop = jistyTelefon(d.telefon) || (d.telefon.startsWith('+') ? d.telefon : null);
  if (telRec && telDop && telRec === telDop) return true;
  const emailRec = normalizujEmail(rec.emailHosta);
  const emailDop = normalizujEmail(d.email);
  if (emailRec && emailDop && emailRec === emailDop) return true;
  return false;
}

export type SparovaniVysledek =
  | { ok: true; doporuceni: Doporuceni; doporucitel: Osoba | null }
  | { ok: false; duvod: 'nic' | 'vice' | 'uz' };

/**
 * Automatické spárování: přesně jedna shoda telefon/e-mail u otevřených doporučení (60 dní).
 */
export async function zkusSparovatRezervaci(
  store: ProcessStore,
  rec: RezervaceRecord,
  opts: { dnu?: number; ted?: Date } = {},
): Promise<SparovaniVysledek> {
  if (rec.doporucenoOd) return { ok: false, duvod: 'uz' };
  const otevrena = await listOtevrenaDoporuceni(store, { dnu: opts.dnu ?? 60, ted: opts.ted });
  const shody = otevrena.filter((d) => shodaKontaktu(d, rec));
  if (shody.length === 0) return { ok: false, duvod: 'nic' };
  if (shody.length > 1) return { ok: false, duvod: 'vice' };
  return sparujRucne(store, shody[0].id, rec.rezervace);
}

export async function sparujRucne(
  store: ProcessStore,
  doporuceniId: string,
  rezervaceId: string,
): Promise<SparovaniVysledek> {
  const d = await nactiDoporuceni(store, doporuceniId);
  if (!d) return { ok: false, duvod: 'nic' };
  const rec = await store.getRezervace(rezervaceId);
  if (!rec) return { ok: false, duvod: 'nic' };

  const now = new Date().toISOString();
  const dalsi: Doporuceni = {
    ...d,
    stav: 'sparovano',
    rezervace: rezervaceId,
    historie: [...d.historie, { cas: now, co: `Spárováno s ${rezervaceId}` }].slice(-40),
  };
  await setJson(store, `doporuceni:${d.id}`, dalsi);

  const patch: RezervaceRecord = {
    ...rec,
    doporucenoOd: d.doporucitelOsobaId,
    historie: [...rec.historie, { cas: now, co: 'Spárováno s doporučením' }].slice(-40),
    posledniPokus: now,
  };
  await store.setRezervace(rezervaceId, patch);

  const doporucitel = d.doporucitelOsobaId ? await nactiOsobu(store, d.doporucitelOsobaId) : null;
  return { ok: true, doporuceni: dalsi, doporucitel };
}

export async function zrusSparovani(
  store: ProcessStore,
  doporuceniId: string,
): Promise<Doporuceni | null> {
  const d = await nactiDoporuceni(store, doporuceniId);
  if (!d || !d.rezervace) return d;
  const now = new Date().toISOString();
  const rec = await store.getRezervace(d.rezervace);
  if (rec) {
    await store.setRezervace(d.rezervace, {
      ...rec,
      doporucenoOd: null,
      historie: [...rec.historie, { cas: now, co: 'Zrušeno spárování doporučení' }].slice(-40),
      posledniPokus: now,
    });
  }
  const dalsi: Doporuceni = {
    ...d,
    stav: 'poptano',
    rezervace: null,
    historie: [...d.historie, { cas: now, co: 'Zrušeno spárování' }].slice(-40),
  };
  await setJson(store, `doporuceni:${d.id}`, dalsi);
  return dalsi;
}

/**
 * Spojí dvě osoby. Zůstává kód starší. Druhý kód přesměruje na ni.
 */
export async function spojOsoby(
  store: ProcessStore,
  zustavaId: string,
  miziId: string,
): Promise<Osoba | null> {
  if (zustavaId === miziId) return nactiOsobu(store, zustavaId);
  const a = await nactiOsobu(store, zustavaId);
  const b = await nactiOsobu(store, miziId);
  if (!a || !b) return null;

  const [starsi, mladsi] =
    Date.parse(a.vytvoreno) <= Date.parse(b.vytvoreno) ? [a, b] : [b, a];

  const sloucená: Osoba = {
    ...starsi,
    jmeno: starsi.jmeno || mladsi.jmeno,
    telefony: [...new Set([...starsi.telefony, ...mladsi.telefony])],
    emaily: [...new Set([...starsi.emaily, ...mladsi.emaily])],
    rezervace: [...new Set([...starsi.rezervace, ...mladsi.rezervace])],
    rucneSpojeno: [
      ...new Set([...starsi.rucneSpojeno, ...mladsi.rucneSpojeno, mladsi.id, mladsi.kod]),
    ],
  };

  await ulozOsobu(store, sloucená);
  // Starý kód mladší osoby dál ukazuje na sloučenou.
  await store.setKv(doporuceniKlic(`od:${mladsi.kod}`), sloucená.id);
  await setJson(store, `osoba:${mladsi.id}`, {
    ...mladsi,
    // Zachovat záznam, ale odkazovat na sloučení (nic nemazat).
    rucneSpojeno: [...new Set([...mladsi.rucneSpojeno, `→${sloucená.id}`])],
  });

  for (const rezId of mladsi.rezervace) {
    const rec = await store.getRezervace(rezId);
    if (rec && rec.osobaId === mladsi.id) {
      await store.setRezervace(rezId, { ...rec, osobaId: sloucená.id });
    }
    if (rec && rec.doporucenoOd === mladsi.id) {
      await store.setRezervace(rezId, {
        ...(await store.getRezervace(rezId))!,
        doporucenoOd: sloucená.id,
      });
    }
  }

  const ids = await seznamDoporuceniIds(store);
  for (const id of ids) {
    const d = await nactiDoporuceni(store, id);
    if (!d) continue;
    if (d.doporucitelOsobaId === mladsi.id) {
      await setJson(store, `doporuceni:${id}`, { ...d, doporucitelOsobaId: sloucená.id });
    }
  }

  return sloucená;
}

/** Po založení rezervace: zkus spárovat a případně Telegram. */
export async function poNoveRezervaci(
  store: ProcessStore,
  rec: RezervaceRecord,
): Promise<{ telegram: string | null }> {
  const vysledek = await zkusSparovatRezervaci(store, rec);
  if (!vysledek.ok) return { telegram: null };
  const kdo = vysledek.doporucitel?.jmeno || 'doporučitele';
  const host = rec.jmeno || rec.krestni || 'Host';
  return {
    telegram: `${host} spárován s doporučením od ${kdo}. Kredit vznikne po předání.`,
  };
}

/** Kolik hostů osoba přivedla (spárovaná doporučení). */
export async function privedlHosty(
  store: ProcessStore,
  osobaId: string,
): Promise<{ jmena: string[]; pocet: number }> {
  const ids = await seznamDoporuceniIds(store);
  const jmena: string[] = [];
  for (const id of ids) {
    const d = await nactiDoporuceni(store, id);
    if (!d || d.doporucitelOsobaId !== osobaId) continue;
    if (d.stav === 'poptano' || d.stav === 'zamitnuto') continue;
    jmena.push(d.jmeno || d.rezervace || id);
  }
  return { jmena, pocet: jmena.length };
}

export function textTelegramSparovani(host: string, doporucitel: string): string {
  return `${host} spárován s doporučením od ${doporucitel}. Kredit vznikne po předání.`;
}
