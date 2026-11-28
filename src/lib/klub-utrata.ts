/**
 * Útrata klubu (dávka 2): párování rezervace → klient:*, připsání po převzetí zpět (odjezd),
 * náhled importu z BH xlsx (jen přímé).
 */

import * as XLSX from 'xlsx';
import {
  nactiKlientPodleId,
  normalizujKlientKod,
  ulozKlientKartu,
  type KlientKarta,
  type KlientUtrataRucne,
} from './klient-karta';
import { urovenZUtraty, type KlubPravidla } from './klub-pravidla';
import { klubPovolenProZkousku, klubZapnut, klubKlic } from './klub-klic';
import { jeRelayEmail } from './staly-host';
import { normalizujTelefon } from './telefon';
import type { ProcessStore, RezervaceRecord } from './store';
import { smíUtrataKlubu } from './zdroj-rezervace';
import { randomBytes } from 'crypto';

function emailOk(e: string | null | undefined): string {
  const t = (e || '').trim().toLowerCase();
  if (!t || !t.includes('@') || jeRelayEmail(t)) return '';
  return t;
}

function telefonOk(raw: string | null | undefined): string {
  const t = normalizujTelefon(raw, null);
  if (!t || t.nejisty) return '';
  return t.ulozeny;
}

/** Platný e-mail (ne relay) nebo jistý telefon. */
export function klientMaKontakt(email?: string | null, telefon?: string | null): boolean {
  return Boolean(emailOk(email) || telefonOk(telefon));
}

export type SparujVysledek = {
  karta: KlientKarta;
  /** Právě vznikla nová karta. */
  nova: boolean;
  /** Bez platného e-mailu i telefonu. */
  bezKontaktu: boolean;
};

/**
 * Po vzniku rezervace: tiše založ / propoj kartu. Nic hostovi neposílá.
 * Platí pro všechny zdroje (Booking, Airbnb, přímá).
 */
export async function zajistiKartuPoNoveRezervaci(
  store: ProcessStore,
  rec: Pick<
    RezervaceRecord,
    'jmeno' | 'emailHosta' | 'telefon' | 'telefonRezervace' | 'rezervace' | 'jazyk'
  >,
): Promise<SparujVysledek | null> {
  if (!klubPovolenProZkousku()) return null;
  return sparujNeboVytvorKlienta(store, {
    jmeno: rec.jmeno,
    email: rec.emailHosta,
    telefon: rec.telefon || rec.telefonRezervace,
    rezervace: rec.rezervace,
    jazyk: rec.jazyk || 'cs',
  });
}

/** Před poděkováním: karta musí existovat a být propojená s pobytem. */
export async function zajistiKartuProPodekovani(
  store: ProcessStore,
  vstup: {
    jmeno?: string | null;
    email?: string | null;
    telefon?: string | null;
    rezervace?: string | null;
    jazyk?: KlientKarta['jazyk'];
  },
): Promise<{ ok: true; karta: KlientKarta; nova: boolean } | { ok: false; duvod: string }> {
  if (!klubPovolenProZkousku()) {
    return { ok: false, duvod: 'Club je vypnutý, kartu nelze připravit.' };
  }
  try {
    const spar = await sparujNeboVytvorKlienta(store, vstup);
    if (!spar?.karta?.tajnyKlic) {
      return { ok: false, duvod: 'Club kartu se nepodařilo připravit (chybí jméno i rezervace).' };
    }
    return { ok: true, karta: spar.karta, nova: spar.nova };
  } catch (err) {
    const duvod = err instanceof Error ? err.message : 'neznámá chyba';
    return { ok: false, duvod: `Club kartu se nepodařilo připravit (${duvod}).` };
  }
}

function normalizujJmeno(jmeno: string | null | undefined): string {
  return (jmeno || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function jePrimaZdroj(zdroj: string | null | undefined): boolean {
  return /přím|prim[aá]|direct|^web$/i.test(String(zdroj || '').trim());
}

/** Zaplaceno: SALDO 0, nebo majitel označil platbu v aplikaci. */
export function jeZaplacenoProUtratu(rec: Pick<RezervaceRecord, 'saldoKc' | 'zaplaceno' | 'platby'>): boolean {
  if (rec.saldoKc === 0) return true;
  if (rec.zaplaceno) return true;
  if (Array.isArray(rec.platby) && rec.platby.some((p) => (p.kc || 0) > 0)) return true;
  return false;
}

/** Útrata = ACC_PRICE / cenaPobytu (bez poplatku z pobytu). */
export function castkaUtratyZRezervace(rec: Pick<RezervaceRecord, 'cenaPobytu'>): number {
  const c = rec.cenaPobytu;
  if (typeof c !== 'number' || !Number.isFinite(c) || c <= 0) return 0;
  return Math.round(c);
}

const UTRATA_OD = '2026-05-01';

/**
 * Kolik útraty by se při propojení / založení přičetlo.
 * Booking a Airbnb = 0. Před 1. 5. 2026 = 0.
 * Když je částka už na kartě (rez: v poznámce, nebo pobyt už v rezervace karty), = 0.
 */
export function castkaUtratyPriPropojeni(
  rec: Pick<RezervaceRecord, 'zdroj' | 'prijezd' | 'cenaPobytu' | 'rezervace'>,
  karta: Pick<KlientKarta, 'rezervace' | 'utrataRucne'> | null,
): number {
  if (!jePrimaZdroj(rec.zdroj)) return 0;
  const prijezd = String(rec.prijezd || '').slice(0, 10);
  if (prijezd && prijezd < UTRATA_OD) return 0;
  const castka = castkaUtratyZRezervace(rec);
  if (castka <= 0) return 0;
  if (!karta) return castka;
  const rezId = String(rec.rezervace || '').trim();
  if (rezId && karta.rezervace.includes(rezId)) return 0;
  if (rezId && karta.utrataRucne.some((u) => u.poznamka.includes(`rez:${rezId}`))) return 0;
  return castka;
}

/** Normalizace jména pro porovnání (bez diakritiky). */
export function normalizujJmenoKlubu(jmeno: string | null | undefined): string {
  return normalizujJmeno(jmeno);
}

/** Podobné jméno: stejné celé, nebo stejné příjmení + stejné křestní. */
export function jmenaPodobnaKlubu(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizujJmeno(a);
  const nb = normalizujJmeno(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ca = na.split(' ').filter(Boolean);
  const cb = nb.split(' ').filter(Boolean);
  if (ca.length < 2 || cb.length < 2) return false;
  const krestniA = ca[0];
  const prijmeniA = ca[ca.length - 1];
  const krestniB = cb[0];
  const prijmeniB = cb[cb.length - 1];
  return krestniA === krestniB && prijmeniA === prijmeniB;
}

export function smíPripsatUtratu(rec: RezervaceRecord): boolean {
  if (!klubZapnut()) return false;
  /** Útrata až po odjezdu (převzetí / předání zpět), ne při příjezdu. */
  if (!rec.prevzatoKdy) return false;
  if (!smíUtrataKlubu(rec)) return false;
  if (!jePrimaZdroj(rec.zdroj)) return false;
  if (!jeZaplacenoProUtratu(rec)) return false;
  return castkaUtratyZRezervace(rec) > 0;
}

async function najdiKlientIndex(
  store: ProcessStore,
  druh: 'tel' | 'email',
  hodnota: string,
): Promise<string | null> {
  if (!hodnota) return null;
  const { klubKlic } = await import('./klub-klic');
  const raw = await store.getKv(klubKlic(`klient-index:${druh}:${hodnota}`));
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { id?: string };
    return o.id || null;
  } catch {
    return null;
  }
}

function kodZJmena(jmeno: string): string {
  const casti = normalizujJmeno(jmeno).split(' ').filter(Boolean);
  const zaklad = (casti[0] || 'HOST').replace(/[^a-z]/g, '').toUpperCase().slice(0, 8) || 'HOST';
  const cislo = String((Date.now() % 90) + 10);
  return normalizujKlientKod(`${zaklad}${cislo}`);
}

/**
 * Najde nebo založí věrnostní kartu a vždy propojí pobyt (klient-index:rez).
 * Kartu jde založit i bez e-mailu/telefonu (jméno + rezervace).
 * Zapnutí: klubPovolenProZkousku (ostrý Club nebo zkušební test:).
 */
export async function sparujNeboVytvorKlienta(
  store: ProcessStore,
  vstup: {
    jmeno?: string | null;
    email?: string | null;
    telefon?: string | null;
    rezervace?: string | null;
    jazyk?: KlientKarta['jazyk'];
  },
): Promise<SparujVysledek | null> {
  if (!klubPovolenProZkousku()) return null;
  const email = emailOk(vstup.email);
  const telefon = telefonOk(vstup.telefon);
  const rezId = String(vstup.rezervace || '').trim();
  const cele = (vstup.jmeno || '').trim();
  if (!email && !telefon && !cele && !rezId) return null;

  let id: string | null = null;
  if (rezId) {
    const raw = await store.getKv(klubKlic(`klient-index:rez:${rezId}`));
    if (raw) {
      try {
        const o = JSON.parse(raw) as { id?: string };
        if (o.id) id = o.id;
      } catch {
        /* ignore */
      }
    }
  }
  if (!id) {
    id =
      (await najdiKlientIndex(store, 'tel', telefon)) ||
      (await najdiKlientIndex(store, 'email', email));
  }

  if (id) {
    const exist = await nactiKlientPodleId(store, id);
    if (exist) {
      if (rezId && !exist.rezervace.includes(rezId)) {
        exist.rezervace = [...exist.rezervace, rezId].slice(-40);
      }
      if (!exist.role.includes('host')) exist.role = [...exist.role, 'host'];
      if (email && !exist.email) exist.email = email;
      if (telefon && !exist.telefon) exist.telefon = telefon;
      /** Vždy uložit: i když rezervace už v poli je, musí vzniknout klient-index:rez. */
      await ulozKlientKartu(store, exist);
      try {
        const { pripojUtratuCekaKeKarte } = await import('./klub-utrata-ceka');
        await pripojUtratuCekaKeKarte(store, exist);
      } catch {
        /* ignore */
      }
      return {
        karta: exist,
        nova: false,
        bezKontaktu: !klientMaKontakt(exist.email, exist.telefon),
      };
    }
  }

  const casti = cele.split(/\s+/).filter(Boolean);
  const jmeno = casti[0] || (rezId ? 'Host' : '');
  const prijmeni = casti.slice(1).join(' ');
  const bezKontaktu = !email && !telefon;
  const nova: KlientKarta = {
    id: `k${Date.now().toString(36)}${randomBytes(3).toString('hex')}`,
    kod: kodZJmena(cele || email || telefon || rezId || 'HOST'),
    tajnyKlic: randomBytes(18).toString('base64url'),
    datumZalozeni: new Date().toISOString(),
    typ: 'host',
    role: ['host'],
    stav: 'aktivni',
    jmeno,
    prijmeni,
    email,
    telefon,
    jazyk: vstup.jazyk || 'cs',
    rezervace: rezId ? [rezId] : [],
    firma: null,
    utrataKc: 0,
    utrataRucne: [],
    urovenId: 'host',
    kredit: [],
    kreditKc: 0,
    dopKodPuvod: null,
    poznamka: bezKontaktu ? 'Bez kontaktu. Doplň e-mail nebo telefon z check-inu.' : '',
    zalozil: 'automat-prima',
    slevaBehem: [],
    slevaKontrola: null,
    podekovaniVidel: null,
    podekovaniVarianta: null,
    podekovaniVariantaPobyt: null,
    podekovaniVariantaPred: null,
  };
  await ulozKlientKartu(store, nova);
  try {
    const { pripojUtratuCekaKeKarte } = await import('./klub-utrata-ceka');
    await pripojUtratuCekaKeKarte(store, nova);
  } catch {
    /* čekající útrata nesmí shodit kartu */
  }
  return { karta: nova, nova: true, bezKontaktu };
}

export async function pridejUtratuPoPredani(
  store: ProcessStore,
  rec: RezervaceRecord,
): Promise<{ ok: boolean; castka: number; klientId: string | null }> {
  if (!smíPripsatUtratu(rec)) return { ok: false, castka: 0, klientId: null };
  const castka = castkaUtratyZRezervace(rec);
  const spar = await sparujNeboVytvorKlienta(store, {
    jmeno: rec.jmeno,
    email: rec.emailHosta,
    telefon: rec.telefon || rec.telefonRezervace,
    rezervace: rec.rezervace,
    jazyk: rec.jazyk || 'cs',
  });
  if (!spar) return { ok: false, castka, klientId: null };
  const klient = spar.karta;
  const uz = klient.utrataRucne.some((u) => u.poznamka.includes(`rez:${rec.rezervace}`));
  if (uz) return { ok: true, castka: 0, klientId: klient.id };
  const polozka: KlientUtrataRucne = {
    id: `u${randomBytes(4).toString('hex')}`,
    castka,
    kdy: new Date().toISOString(),
    poznamka: `rez:${rec.rezervace} ACC_PRICE`,
  };
  klient.utrataRucne = [...klient.utrataRucne, polozka];
  const soucet = klient.utrataRucne.reduce((s, u) => s + Math.max(0, u.castka), 0);
  klient.utrataKc = Math.max(klient.utrataKc || 0, soucet);
  if (!klient.rezervace.includes(rec.rezervace)) {
    klient.rezervace = [...klient.rezervace, rec.rezervace].slice(-40);
  }
  await ulozKlientKartu(store, klient);
  return { ok: true, castka, klientId: klient.id };
}

/**
 * Po převzetí apartmánu zpět (odjezd): spáruj klienta, připiš útratu a odměnu.
 * Volá se z ručního i automatického převzetí. Nesmí shodit převzetí.
 */
export async function pridejKlubPoPrevzeti(
  store: ProcessStore,
  rec: RezervaceRecord,
): Promise<void> {
  if (!klubZapnut()) return;
  await sparujNeboVytvorKlienta(store, {
    jmeno: rec.jmeno,
    email: rec.emailHosta,
    telefon: rec.telefon || rec.telefonRezervace,
    rezervace: rec.rezervace,
    jazyk: rec.jazyk || 'cs',
  });
  await pridejUtratuPoPredani(store, rec);
  try {
    const { pridejOdmenuPoPredani } = await import('./klub-odmena');
    await pridejOdmenuPoPredani(store, rec);
  } catch {
    /* odměna nesmí shodit převzetí */
  }
}

export async function pridejUtratuRucne(
  store: ProcessStore,
  klientId: string,
  castka: number,
  poznamka: string,
): Promise<KlientKarta | null> {
  if (!klubZapnut()) return null;
  const k = await nactiKlientPodleId(store, klientId);
  if (!k) return null;
  const c = Math.round(Number(castka) || 0);
  if (c === 0) return k;
  k.utrataRucne = [
    ...k.utrataRucne,
    {
      id: `u${randomBytes(4).toString('hex')}`,
      castka: c,
      kdy: new Date().toISOString(),
      poznamka: (poznamka || 'ruční').slice(0, 200),
    },
  ];
  k.utrataKc = k.utrataRucne.reduce((s, u) => s + u.castka, 0);
  await ulozKlientKartu(store, k);
  return k;
}

/**
 * Označí rezervace jako už započtené v ruční útratě (castka 0).
 * Nepřičítá peníze. Blokuje další přičtení přes Předáno zpět i seznam „chybí útrata“.
 */
export async function oznacUtratuZapoctenouVRucni(
  store: ProcessStore,
  klientId: string,
  rezervaceIds: string[],
): Promise<KlientKarta | null> {
  if (!klubZapnut()) return null;
  const k = await nactiKlientPodleId(store, klientId);
  if (!k) return null;
  const ted = new Date().toISOString();
  let zmena = false;
  for (const rezId of rezervaceIds) {
    const id = String(rezId || '').trim();
    if (!id) continue;
    if (k.utrataRucne.some((u) => u.poznamka.includes(`rez:${id}`))) continue;
    k.utrataRucne = [
      ...k.utrataRucne,
      {
        id: `u${randomBytes(4).toString('hex')}`,
        castka: 0,
        kdy: ted,
        poznamka: `rez:${id} započteno v ruční útratě`,
      },
    ];
    if (!k.rezervace.includes(id)) {
      k.rezervace = [...k.rezervace, id].slice(-40);
    }
    zmena = true;
  }
  if (!zmena) return k;
  /** Součet jen kladných položek; nula u značek. Když je utrataKc vyšší (starý zápis), necháme ji. */
  const soucet = k.utrataRucne.reduce((s, u) => s + Math.max(0, u.castka), 0);
  k.utrataKc = Math.max(k.utrataKc || 0, soucet);
  await ulozKlientKartu(store, k);
  return k;
}

export type ImportUtrataRadek = {
  jmeno: string;
  telefon: string;
  email: string;
  castka: number;
  agentura: string;
  prima: boolean;
  klientId: string | null;
  klientNazev: string | null;
};

export type ImportUtrataNahled = {
  radky: ImportUtrataRadek[];
  souhrn: {
    host: string;
    pocet: number;
    utrata: number;
    uroven: string;
    klientId: string | null;
  }[];
  primaHoste: { jmeno: string; telefon: string; email: string; utrata: number }[];
};

function bunka(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const hit = Object.keys(row).find((x) => x.trim().toLowerCase() === k.toLowerCase());
    if (hit != null && row[hit] != null) return String(row[hit]).trim();
  }
  return '';
}

/** Náhled importu útraty z BH exportu (xlsx). Zápis až po potvrzení. */
export function nahledImportuUtratyXlsx(
  buf: Buffer,
  klienti: KlientKarta[],
  pravidla: KlubPravidla,
): ImportUtrataNahled {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const radky: ImportUtrataRadek[] = [];

  for (const row of rows) {
    const agentura = bunka(row, 'agentura', 'agency', 'channel', 'zdroj', 'source');
    const jmeno = bunka(row, 'jméno', 'jmeno', 'name', 'guest', 'host');
    const telefon = bunka(row, 'telefon', 'phone', 'tel');
    const email = bunka(row, 'email', 'e-mail');
    const cenaRaw = bunka(row, 'cena', 'price', 'acc_price', 'total', 'částka', 'castka');
    const castka = Number(String(cenaRaw).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    const prima =
      !agentura ||
      /přím|prim|direct|web|email|telefon|phone|recepce|vivien/i.test(agentura);
    if (/booking|airbnb|expedia/i.test(agentura)) continue;
    if (!prima || castka <= 0) continue;

    const telN = telefonOk(telefon);
    const emN = emailOk(email);
    const klient =
      klienti.find((k) => (telN && telefonOk(k.telefon) === telN) || (emN && emailOk(k.email) === emN)) ||
      null;

    radky.push({
      jmeno,
      telefon: telN || telefon,
      email: emN || email,
      castka: Math.round(castka),
      agentura,
      prima: true,
      klientId: klient?.id || null,
      klientNazev: klient ? `${klient.jmeno} ${klient.prijmeni}`.trim() : null,
    });
  }

  const mapa = new Map<string, { host: string; pocet: number; utrata: number; klientId: string | null }>();
  for (const r of radky) {
    const klic = r.klientId || r.telefon || r.email || r.jmeno;
    const cur = mapa.get(klic) || {
      host: r.klientNazev || r.jmeno || klic,
      pocet: 0,
      utrata: 0,
      klientId: r.klientId,
    };
    cur.pocet += 1;
    cur.utrata += r.castka;
    mapa.set(klic, cur);
  }

  const souhrn = [...mapa.values()].map((s) => ({
    ...s,
    uroven: urovenZUtraty(s.utrata, pravidla).nazevHost,
  }));

  const primaHoste = souhrn.map((s) => {
    const vzor = radky.find((r) => (r.klientId || r.telefon || r.email || r.jmeno) && (r.klientNazev || r.jmeno) === s.host) || radky[0];
    return {
      jmeno: s.host,
      telefon: vzor?.telefon || '',
      email: vzor?.email || '',
      utrata: s.utrata,
    };
  });

  return { radky, souhrn, primaHoste };
}

export async function potvrdImportUtraty(
  store: ProcessStore,
  nahled: ImportUtrataNahled,
): Promise<{ zapsano: number }> {
  if (!klubZapnut()) return { zapsano: 0 };
  let zapsano = 0;
  for (const s of nahled.souhrn) {
    if (s.klientId) {
      const k = await pridejUtratuRucne(store, s.klientId, s.utrata, 'import-bh-xlsx');
      if (k) zapsano += 1;
    } else {
      const vzor = nahled.radky.find((r) => (r.klientNazev || r.jmeno) === s.host);
      const spar = await sparujNeboVytvorKlienta(store, {
        jmeno: s.host,
        email: vzor?.email,
        telefon: vzor?.telefon,
      });
      if (spar) {
        await pridejUtratuRucne(store, spar.karta.id, s.utrata, 'import-bh-xlsx');
        zapsano += 1;
      }
    }
  }
  return { zapsano };
}
