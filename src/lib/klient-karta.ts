/**
 * Karta klienta (VIVIEN Klub, dávka 1).
 * Klíče: klient:{id}, klient-klic:{tajny}, indexy tel/email/ico/kod.
 * Migrace z dop:* = kopie, originál beze změny.
 */

import { randomBytes } from 'crypto';
import { doporuceniKlic } from './doporuceni-klic';
import { klubKlic } from './klub-klic';
import {
  sloucitPravidla,
  urovenZUtraty,
  VYCHOZI_KLUB_PRAVIDLA,
  type KlubPravidla,
} from './klub-pravidla';
import type { SlevaBehemZaznam, SlevaKontrolaStav } from './klub-sleva-kontrola';
import { jeRelayEmail } from './staly-host';
import { normalizujTelefon } from './telefon';
import type { ProcessStore } from './store';
import type { GuideLang } from './types';

function generujTajnyKlic(): string {
  return randomBytes(18).toString('base64url');
}

/** Minimální tvar karty doporučitele pro migraci (kopie). */
type DopProMigraci = {
  kod: string;
  tajnyKlic: string;
  datumZalozeni: string;
  typ: KlientTyp;
  stav?: string;
  jmeno?: string;
  prijmeni?: string;
  email?: string;
  telefon?: string;
  jazyk?: GuideLang;
  rezervace?: string[];
  firma?: {
    ico?: string;
    dic?: string;
    nazev?: string;
    sidlo?: string;
    platceDph?: boolean;
  } | null;
  penize?: { kVyplate?: number };
  poznamka?: string;
  zalozil?: string;
};

export type KlientTyp = 'host' | 'osoba' | 'firma';
export type KlientRole = 'host' | 'doporucitel' | 'firma';
export type KlientStav = 'aktivni' | 'pozastavena' | 'zrusena';

export type KlientKredit = {
  id: string;
  castka: number;
  vznik: string;
  platnostDo: string;
  zdroj: string;
  pouzito: number;
};

export type KlientUtrataRucne = {
  id: string;
  castka: number;
  kdy: string;
  poznamka: string;
};

export type KlientKarta = {
  id: string;
  kod: string;
  tajnyKlic: string;
  datumZalozeni: string;
  typ: KlientTyp;
  role: KlientRole[];
  stav: KlientStav;
  jmeno: string;
  prijmeni: string;
  email: string;
  telefon: string;
  jazyk: GuideLang;
  rezervace: string[];
  firma: {
    ico: string;
    dic: string;
    nazev: string;
    sidlo: string;
    platceDph: boolean;
  } | null;
  utrataKc: number;
  utrataRucne: KlientUtrataRucne[];
  urovenId: string;
  kredit: KlientKredit[];
  kreditKc: number;
  dopKodPuvod: string | null;
  poznamka: string;
  zalozil: string;
  /** Rezervace se slevou z očekávané úrovně během pobytu. */
  slevaBehem: SlevaBehemZaznam[];
  /** Upozornění majiteli po stornu / nepředání. */
  slevaKontrola: SlevaKontrolaStav | null;
  /** ISO – první otevření poděkování na kartě. */
  podekovaniVidel: string | null;
  /** Id textu poděkování (1 / 2 / d1–d5) pro aktuální pobyt. */
  podekovaniVarianta: string | null;
  /** Klíč pobytu, ke kterému patří podekovaniVarianta. */
  podekovaniVariantaPobyt: string | null;
  /** Předchozí varianta (ať se u 3+ neopakuje hned po sobě). */
  podekovaniVariantaPred: string | null;
};

export type MigraceVysledek = {
  ok: boolean;
  zkopirovano: number;
  kolizeKodu: number;
  bezKontaktu: number;
  rezervovanePreskocene: number;
  chyby: string[];
};

async function getJson<T>(store: ProcessStore, key: string): Promise<T | null> {
  const raw = await store.getKv(klubKlic(key));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setJson(store: ProcessStore, key: string, value: unknown): Promise<void> {
  await store.setKv(klubKlic(key), JSON.stringify(value));
}

async function getDopJson<T>(store: ProcessStore, key: string): Promise<T | null> {
  const raw = await store.getKv(doporuceniKlic(key));
  if (!raw) {
    const raw2 = await store.getKv(key);
    if (!raw2) return null;
    try {
      return JSON.parse(raw2) as T;
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function novyId(): string {
  return `k${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
}

export function normalizujKlientKod(raw: string): string {
  return (raw || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16);
}

function emailOk(e: string): string {
  const t = e.trim().toLowerCase();
  if (!t || !t.includes('@') || jeRelayEmail(t)) return '';
  return t;
}

function telefonOk(raw: string): string {
  const t = normalizujTelefon(raw, null);
  if (!t || t.nejisty) return '';
  return t.ulozeny;
}

function maKontakt(email: string, telefon: string): boolean {
  return Boolean(emailOk(email) || telefonOk(telefon));
}

function prazdnaKarta(
  cast: Partial<KlientKarta> & Pick<KlientKarta, 'id' | 'kod' | 'typ'>,
): KlientKarta {
  const role: KlientRole[] =
    cast.role && cast.role.length
      ? cast.role
      : cast.typ === 'firma'
        ? ['firma']
        : cast.typ === 'host'
          ? ['host', 'doporucitel']
          : ['doporucitel'];
  return {
    id: cast.id,
    kod: cast.kod,
    tajnyKlic: cast.tajnyKlic || generujTajnyKlic(),
    datumZalozeni: cast.datumZalozeni || new Date().toISOString(),
    typ: cast.typ,
    role,
    stav: cast.stav || 'aktivni',
    jmeno: cast.jmeno || '',
    prijmeni: cast.prijmeni || '',
    email: cast.email || '',
    telefon: cast.telefon || '',
    jazyk: cast.jazyk || 'cs',
    rezervace: cast.rezervace || [],
    firma: cast.firma ?? null,
    utrataKc: typeof cast.utrataKc === 'number' ? cast.utrataKc : 0,
    utrataRucne: cast.utrataRucne || [],
    urovenId: cast.urovenId || 'host',
    kredit: cast.kredit || [],
    kreditKc: typeof cast.kreditKc === 'number' ? cast.kreditKc : 0,
    dopKodPuvod: cast.dopKodPuvod ?? null,
    poznamka: cast.poznamka || '',
    zalozil: cast.zalozil || '',
    slevaBehem: Array.isArray(cast.slevaBehem) ? cast.slevaBehem : [],
    slevaKontrola: cast.slevaKontrola ?? null,
    podekovaniVidel:
      typeof cast.podekovaniVidel === 'string' ? cast.podekovaniVidel : null,
    podekovaniVarianta:
      typeof cast.podekovaniVarianta === 'string' ? cast.podekovaniVarianta : null,
    podekovaniVariantaPobyt:
      typeof cast.podekovaniVariantaPobyt === 'string' ? cast.podekovaniVariantaPobyt : null,
    podekovaniVariantaPred:
      typeof cast.podekovaniVariantaPred === 'string' ? cast.podekovaniVariantaPred : null,
  };
}

function asKarta(raw: unknown): KlientKarta | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : '';
  const kod = typeof r.kod === 'string' ? r.kod : '';
  if (!id || !kod) return null;
  return prazdnaKarta({
    ...(r as Partial<KlientKarta>),
    id,
    kod,
    typ: (r.typ as KlientTyp) || 'osoba',
  });
}

async function pridejDoSeznamu(store: ProcessStore, id: string): Promise<void> {
  const list = (await getJson<string[]>(store, 'klient-seznam')) || [];
  if (!list.includes(id)) {
    list.unshift(id);
    await setJson(store, 'klient-seznam', list.slice(0, 5000));
  }
}

async function ulozIndexy(store: ProcessStore, karta: KlientKarta): Promise<void> {
  await setJson(store, `klient-kod:${normalizujKlientKod(karta.kod)}`, { id: karta.id });
  await setJson(store, `klient-klic:${karta.tajnyKlic}`, { id: karta.id });
  const tel = telefonOk(karta.telefon);
  if (tel) await setJson(store, `klient-index:tel:${tel}`, { id: karta.id });
  const em = emailOk(karta.email);
  if (em) await setJson(store, `klient-index:email:${em}`, { id: karta.id });
  const ico = (karta.firma?.ico || '').replace(/\D/g, '');
  if (ico) await setJson(store, `klient-index:ico:${ico}`, { id: karta.id });
  for (const rez of karta.rezervace || []) {
    const id = String(rez || '').trim();
    if (id) await setJson(store, `klient-index:rez:${id}`, { id: karta.id });
  }
}

export async function ulozKlientKartu(store: ProcessStore, karta: KlientKarta): Promise<void> {
  const pravidla = await nactiKlubPravidla(store);
  karta.urovenId = urovenZUtraty(karta.utrataKc, pravidla).id;
  karta.kreditKc = karta.kredit.reduce((s, k) => s + Math.max(0, k.castka - k.pouzito), 0);
  await setJson(store, `klient:${karta.id}`, karta);
  await ulozIndexy(store, karta);
  await pridejDoSeznamu(store, karta.id);
}

export async function nactiKlubPravidla(store: ProcessStore): Promise<KlubPravidla> {
  const raw = await getJson<Partial<KlubPravidla>>(store, 'klub:pravidla');
  return sloucitPravidla(raw);
}

export async function ulozKlubPravidla(store: ProcessStore, p: KlubPravidla): Promise<void> {
  await setJson(store, 'klub:pravidla', sloucitPravidla(p));
}

export async function zajistiVychoziPravidla(store: ProcessStore): Promise<KlubPravidla> {
  const exist = await getJson<Partial<KlubPravidla>>(store, 'klub:pravidla');
  if (exist) return sloucitPravidla(exist);
  const p = sloucitPravidla(VYCHOZI_KLUB_PRAVIDLA);
  await ulozKlubPravidla(store, p);
  return p;
}

export async function nactiKlientPodleId(
  store: ProcessStore,
  id: string,
): Promise<KlientKarta | null> {
  if (!id) return null;
  return asKarta(await getJson(store, `klient:${id}`));
}

export async function nactiKlientPodleKodu(
  store: ProcessStore,
  kodRaw: string,
): Promise<KlientKarta | null> {
  const kod = normalizujKlientKod(kodRaw);
  if (!kod) return null;
  const map = await getJson<{ id?: string }>(store, `klient-kod:${kod}`);
  if (!map?.id) return null;
  return nactiKlientPodleId(store, map.id);
}

export async function nactiKlientPodleTajnehoKlice(
  store: ProcessStore,
  tajny: string,
): Promise<KlientKarta | null> {
  const k = (tajny || '').trim();
  if (!k) return null;
  const map = await getJson<{ id?: string }>(store, `klient-klic:${k}`);
  if (!map?.id) return null;
  return nactiKlientPodleId(store, map.id);
}

export async function seznamKlientu(store: ProcessStore): Promise<KlientKarta[]> {
  const list = (await getJson<string[]>(store, 'klient-seznam')) || [];
  const out: KlientKarta[] = [];
  for (const id of list) {
    const k = await nactiKlientPodleId(store, id);
    if (k) out.push(k);
  }
  return out;
}

function dopNaKlienta(dop: DopProMigraci, pravidla: KlubPravidla): KlientKarta {
  const kreditKc = Math.max(0, dop.penize?.kVyplate || 0);
  const id = novyId();
  const typ: KlientTyp =
    dop.typ === 'firma' || dop.typ === 'host' || dop.typ === 'osoba' ? dop.typ : 'osoba';
  return prazdnaKarta({
    id,
    kod: normalizujKlientKod(dop.kod) || dop.kod.toUpperCase(),
    tajnyKlic: dop.tajnyKlic || generujTajnyKlic(),
    datumZalozeni: dop.datumZalozeni || new Date().toISOString(),
    typ,
    role:
      typ === 'firma'
        ? ['firma', 'doporucitel']
        : typ === 'host'
          ? ['host', 'doporucitel']
          : ['doporucitel'],
    stav: dop.stav === 'zrusena' ? 'zrusena' : dop.stav === 'pozastavena' ? 'pozastavena' : 'aktivni',
    jmeno: dop.jmeno || '',
    prijmeni: dop.prijmeni || '',
    email: dop.email || '',
    telefon: dop.telefon || '',
    jazyk: dop.jazyk || 'cs',
    rezervace: [...(dop.rezervace || [])],
    firma: dop.firma
      ? {
          ico: dop.firma.ico || '',
          dic: dop.firma.dic || '',
          nazev: dop.firma.nazev || '',
          sidlo: dop.firma.sidlo || '',
          platceDph: Boolean(dop.firma.platceDph),
        }
      : null,
    utrataKc: 0,
    urovenId: urovenZUtraty(0, pravidla).id,
    kredit:
      kreditKc > 0
        ? [
            {
              id: `kr${randomBytes(4).toString('hex')}`,
              castka: kreditKc,
              vznik: dop.datumZalozeni || new Date().toISOString(),
              platnostDo: '',
              zdroj: 'migrace-dop',
              pouzito: 0,
            },
          ]
        : [],
    kreditKc,
    dopKodPuvod: dop.kod,
    poznamka: dop.poznamka || '',
    zalozil: `migrace:${dop.zalozil || 'dop'}`,
  });
}

/**
 * Kopie dop:* → klient:*. Originál nemění.
 * Před spuštěním na ostrých datech udělej zálohu klíčů mimo git.
 */
export async function migrujDopNaKlienty(store: ProcessStore): Promise<MigraceVysledek> {
  const pravidla = await zajistiVychoziPravidla(store);
  const rezervovane = new Set(pravidla.rezervovaneKody.map(normalizujKlientKod));
  const list = (await getDopJson<string[]>(store, 'dop-seznam')) || [];
  const vysledek: MigraceVysledek = {
    ok: true,
    zkopirovano: 0,
    kolizeKodu: 0,
    bezKontaktu: 0,
    rezervovanePreskocene: 0,
    chyby: [],
  };

  for (const kod of list) {
    try {
      const dop = await getDopJson<DopProMigraci>(store, `dop:${kod}`);
      if (!dop || !dop.kod) {
        vysledek.chyby.push(`chybi:${kod}`);
        continue;
      }
      const exist = await nactiKlientPodleKodu(store, dop.kod);
      if (exist) {
        vysledek.kolizeKodu += 1;
        continue;
      }
      const kodN = normalizujKlientKod(dop.kod);
      if (rezervovane.has(kodN)) {
        vysledek.rezervovanePreskocene += 1;
        continue;
      }
      const klient = dopNaKlienta(dop, pravidla);
      if (!maKontakt(klient.email, klient.telefon)) vysledek.bezKontaktu += 1;
      await ulozKlientKartu(store, klient);
      vysledek.zkopirovano += 1;
    } catch (e) {
      vysledek.chyby.push(`err:${kod}:${e instanceof Error ? e.message : 'x'}`);
      vysledek.ok = false;
    }
  }

  for (const rk of rezervovane) {
    if (!rk) continue;
    await setJson(store, `klient-kod:${rk}`, { id: '', rezervovano: true });
  }

  return vysledek;
}

export function verejnaKlientKarta(k: KlientKarta, pravidla: KlubPravidla) {
  const u = urovenZUtraty(k.utrataKc, pravidla);
  return {
    id: k.id,
    kod: k.kod,
    jmeno: k.jmeno,
    prijmeni: k.prijmeni,
    typ: k.typ,
    role: k.role,
    stav: k.stav,
    utrataKc: k.utrataKc,
    kreditKc: k.kreditKc,
    urovenId: u.id,
    urovenNazev: k.typ === 'firma' ? u.nazevFirma : u.nazevHost,
    slevaPct: u.slevaPct,
    email: k.email,
    telefon: k.telefon,
    firmaNazev: k.firma?.nazev || null,
    dopKodPuvod: k.dopKodPuvod,
    zkontrolovatSlevu: Boolean(k.slevaKontrola?.aktivni),
    slevaKontrola: k.slevaKontrola,
  };
}
