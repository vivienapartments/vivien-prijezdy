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
import { klubZapnut } from './klub-klic';
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
 * Najde nebo založí kartu klienta ze skutečného kontaktu (ne relay).
 * Volat u potvrzené přímé / po check-inu.
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
): Promise<KlientKarta | null> {
  if (!klubZapnut()) return null;
  const email = emailOk(vstup.email);
  const telefon = telefonOk(vstup.telefon);
  if (!email && !telefon) return null;

  const id = (await najdiKlientIndex(store, 'tel', telefon)) || (await najdiKlientIndex(store, 'email', email));
  if (id) {
    const exist = await nactiKlientPodleId(store, id);
    if (exist) {
      if (vstup.rezervace && !exist.rezervace.includes(vstup.rezervace)) {
        exist.rezervace = [...exist.rezervace, vstup.rezervace].slice(-40);
        if (!exist.role.includes('host')) exist.role = [...exist.role, 'host'];
        await ulozKlientKartu(store, exist);
      }
      try {
        const { pripojUtratuCekaKeKarte } = await import('./klub-utrata-ceka');
        await pripojUtratuCekaKeKarte(store, exist);
      } catch {
        /* ignore */
      }
      return exist;
    }
  }

  const cele = (vstup.jmeno || '').trim();
  const casti = cele.split(/\s+/).filter(Boolean);
  const jmeno = casti[0] || '';
  const prijmeni = casti.slice(1).join(' ');
  const nova: KlientKarta = {
    id: `k${Date.now().toString(36)}${randomBytes(3).toString('hex')}`,
    kod: kodZJmena(cele || email || telefon),
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
    rezervace: vstup.rezervace ? [vstup.rezervace] : [],
    firma: null,
    utrataKc: 0,
    utrataRucne: [],
    urovenId: 'host',
    kredit: [],
    kreditKc: 0,
    dopKodPuvod: null,
    poznamka: '',
    zalozil: 'automat-prima',
    slevaBehem: [],
    slevaKontrola: null,
    podekovaniVidel: null,
  };
  await ulozKlientKartu(store, nova);
  try {
    const { pripojUtratuCekaKeKarte } = await import('./klub-utrata-ceka');
    await pripojUtratuCekaKeKarte(store, nova);
  } catch {
    /* čekající útrata nesmí shodit kartu */
  }
  return nova;
}

export async function pridejUtratuPoPredani(
  store: ProcessStore,
  rec: RezervaceRecord,
): Promise<{ ok: boolean; castka: number; klientId: string | null }> {
  if (!smíPripsatUtratu(rec)) return { ok: false, castka: 0, klientId: null };
  const castka = castkaUtratyZRezervace(rec);
  const klient = await sparujNeboVytvorKlienta(store, {
    jmeno: rec.jmeno,
    email: rec.emailHosta,
    telefon: rec.telefon || rec.telefonRezervace,
    rezervace: rec.rezervace,
    jazyk: rec.jazyk || 'cs',
  });
  if (!klient) return { ok: false, castka, klientId: null };
  const uz = klient.utrataRucne.some((u) => u.poznamka.includes(`rez:${rec.rezervace}`));
  if (uz) return { ok: true, castka: 0, klientId: klient.id };
  const polozka: KlientUtrataRucne = {
    id: `u${randomBytes(4).toString('hex')}`,
    castka,
    kdy: new Date().toISOString(),
    poznamka: `rez:${rec.rezervace} ACC_PRICE`,
  };
  klient.utrataRucne = [...klient.utrataRucne, polozka];
  klient.utrataKc = klient.utrataRucne.reduce((s, u) => s + u.castka, 0);
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
      const novy = await sparujNeboVytvorKlienta(store, {
        jmeno: s.host,
        email: vzor?.email,
        telefon: vzor?.telefon,
      });
      if (novy) {
        await pridejUtratuRucne(store, novy.id, s.utrata, 'import-bh-xlsx');
        zapsano += 1;
      }
    }
  }
  return { zapsano };
}
