/**
 * Karta doporučitele (PROMPT-DOPORUCENI-KOMPLET část B).
 * Klíč Upstash: dop:{kod}. Tajný přístup: dop-klic:{tajny} → kod.
 */

import { randomBytes, createHash } from 'crypto';
import { doporuceniKlic } from './doporuceni-klic';
import { generujKod, normalizujKod } from './doporuceni';
import type { ProcessStore } from './store';
import type { GuideLang } from './types';

export type DoporucitelTyp = 'host' | 'osoba' | 'firma';
export type DoporucitelVznik = 'po-odjezdu' | 'registrace' | 'majitel';
export type DoporucitelStav = 'aktivni' | 'pozastavena' | 'zrusena';
export type VyplataZpusob = 'ucet' | 'sleva-na-pobyt' | 'poukaz';
export type DoporuceniKanal = 'email' | 'whatsapp' | 'kopie' | 'neznamy';
export type DoporuceniNaKarteStav =
  | 'poptavka'
  | 'potvrzeno'
  | 'pobyt-probehl'
  | 'pripsano'
  | 'vyplaceno'
  | 'storno'
  | 'nesplnuje';

export type DoporuceniNaKarte = {
  id: string;
  krestniJmenoKamarada: string;
  kanal: DoporuceniKanal;
  poptavkaId: string | null;
  /** Číslo rezervace kamaráda (po spárování / předání). */
  rezervaceId?: string | null;
  datumPoptavky: string;
  termin: string;
  apartman: string | null;
  cenaPredSlevou: number | null;
  slevaKamarada: number | null;
  odmena: number;
  stav: DoporuceniNaKarteStav;
  odjezd: string | null;
};

export type HistorieVyplat = {
  datum: string;
  castka: number;
  zpusob: VyplataZpusob | string;
  poznamka: string;
};

export type DoporucitelKarta = {
  kod: string;
  tajnyKlic: string;
  datumZalozeni: string;
  typ: DoporucitelTyp;
  vznik: DoporucitelVznik;
  stav: DoporucitelStav;
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
  vyplata: {
    zpusob: VyplataZpusob | null;
    ucetHash: string | null;
    ucetMaska: string | null;
    majitelUctu: string;
    fakturuje: boolean | null;
  };
  souhlasy: {
    podminky: { datum: string; verze: string } | null;
    zpracovaniUdaju: string | null;
    novinky: string | null;
  };
  doporuceni: DoporuceniNaKarte[];
  penize: {
    ceka: number;
    kVyplate: number;
    vyplacenoCelkem: number;
    historieVyplat: HistorieVyplat[];
  };
  statistiky: {
    odeslaneEmaily: number;
    otevreniWhatsApp: number;
    kopirovani: number;
    kliknutiNaOdkaz: number;
    poptavky: number;
    potvrzene: number;
    probehle: number;
  };
  poznamka: string;
  zalozil: string;
};

export type DoporucitelPravidla = {
  odmenaPct: number;
  azPoOdjezdu: boolean;
  jenPrvniPobyt: boolean;
  stejnaProHostyINehosty: boolean;
  kodNeomezene: boolean;
  minVyplata: number;
};

const VYCHOZI_PRAVIDLA: DoporucitelPravidla = {
  odmenaPct: 5,
  azPoOdjezdu: true,
  jenPrvniPobyt: true,
  stejnaProHostyINehosty: true,
  kodNeomezene: true,
  minVyplata: 0,
};

const PODMINKY_VERZE = '2026-11-23';

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

function novyId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
}

export function generujTajnyKlic(): string {
  return randomBytes(18).toString('base64url');
}

export function maskujUcet(ucet: string): string {
  const digits = (ucet || '').replace(/\s+/g, '');
  if (digits.length < 4) return '••••';
  return `••••${digits.slice(-4)}`;
}

export function hashUcet(ucet: string): string {
  return createHash('sha256').update((ucet || '').replace(/\s+/g, '').toLowerCase()).digest('hex');
}

export function spocitejOdmenu(cenaPredSlevou: number, pct = 5): number {
  if (!Number.isFinite(cenaPredSlevou) || cenaPredSlevou <= 0) return 0;
  return Math.round((cenaPredSlevou * pct) / 100);
}

export function kanalZParamu(raw: string | null | undefined): DoporuceniKanal {
  const k = (raw || '').trim().toLowerCase();
  if (k === 'e' || k === 'email') return 'email';
  if (k === 'w' || k === 'whatsapp') return 'whatsapp';
  if (k === 'c' || k === 'kopie' || k === 'copy') return 'kopie';
  return 'neznamy';
}

function prazdnaKarta(cast: Partial<DoporucitelKarta> & Pick<DoporucitelKarta, 'kod' | 'typ' | 'vznik'>): DoporucitelKarta {
  const tajny = cast.tajnyKlic || generujTajnyKlic();
  return {
    kod: cast.kod,
    tajnyKlic: tajny,
    datumZalozeni: cast.datumZalozeni || new Date().toISOString(),
    typ: cast.typ,
    vznik: cast.vznik,
    stav: cast.stav || 'aktivni',
    jmeno: cast.jmeno || '',
    prijmeni: cast.prijmeni || '',
    email: cast.email || '',
    telefon: cast.telefon || '',
    jazyk: cast.jazyk || 'cs',
    rezervace: cast.rezervace || [],
    firma: cast.firma ?? null,
    vyplata: cast.vyplata || {
      zpusob: null,
      ucetHash: null,
      ucetMaska: null,
      majitelUctu: '',
      fakturuje: null,
    },
    souhlasy: cast.souhlasy || {
      podminky: null,
      zpracovaniUdaju: null,
      novinky: null,
    },
    doporuceni: cast.doporuceni || [],
    penize: cast.penize || { ceka: 0, kVyplate: 0, vyplacenoCelkem: 0, historieVyplat: [] },
    statistiky: cast.statistiky || {
      odeslaneEmaily: 0,
      otevreniWhatsApp: 0,
      kopirovani: 0,
      kliknutiNaOdkaz: 0,
      poptavky: 0,
      potvrzene: 0,
      probehle: 0,
    },
    poznamka: cast.poznamka || '',
    zalozil: cast.zalozil || '',
  };
}

function asKarta(raw: unknown): DoporucitelKarta | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const kod = typeof r.kod === 'string' ? r.kod : '';
  const tajnyKlic = typeof r.tajnyKlic === 'string' ? r.tajnyKlic : '';
  if (!kod || !tajnyKlic) return null;
  return prazdnaKarta({
    ...(r as Partial<DoporucitelKarta>),
    kod,
    tajnyKlic,
    typ: (r.typ as DoporucitelTyp) || 'osoba',
    vznik: (r.vznik as DoporucitelVznik) || 'registrace',
  });
}

async function pridejDoSeznamu(store: ProcessStore, kod: string): Promise<void> {
  const list = (await getJson<string[]>(store, 'dop-seznam')) || [];
  if (!list.includes(kod)) {
    list.unshift(kod);
    await setJson(store, 'dop-seznam', list.slice(0, 2000));
  }
}

export async function ulozKartu(store: ProcessStore, karta: DoporucitelKarta): Promise<void> {
  await setJson(store, `dop:${karta.kod}`, karta);
  await setJson(store, `dop-klic:${karta.tajnyKlic}`, { kod: karta.kod });
  await pridejDoSeznamu(store, karta.kod);
}

export async function nactiPravidla(store: ProcessStore): Promise<DoporucitelPravidla> {
  const raw = await getJson<Partial<DoporucitelPravidla>>(store, 'dop-pravidla');
  return { ...VYCHOZI_PRAVIDLA, ...(raw || {}) };
}

export async function ulozPravidla(store: ProcessStore, p: DoporucitelPravidla): Promise<void> {
  await setJson(store, 'dop-pravidla', p);
}

export async function nactiKartuPodleKodu(
  store: ProcessStore,
  kodRaw: string,
): Promise<DoporucitelKarta | null> {
  const kod = normalizujKod(kodRaw);
  if (!kod) return null;
  return asKarta(await getJson(store, `dop:${kod}`));
}

export async function nactiKartuPodleKlic(
  store: ProcessStore,
  klicRaw: string,
): Promise<DoporucitelKarta | null> {
  const klic = (klicRaw || '').trim();
  if (!klic) return null;
  const map = await getJson<{ kod?: string }>(store, `dop-klic:${klic}`);
  if (!map?.kod) return null;
  return nactiKartuPodleKodu(store, map.kod);
}

export async function zajistiKartuHosta(
  store: ProcessStore,
  vstup: {
    kod: string;
    jmeno: string | null;
    email?: string | null;
    telefon?: string | null;
    jazyk?: GuideLang | null;
    rezervaceId?: string | null;
  },
): Promise<DoporucitelKarta> {
  const kod = normalizujKod(vstup.kod);
  let karta = await nactiKartuPodleKodu(store, kod);
  const jmeno = (vstup.jmeno || '').trim().split(/\s+/)[0] || '';
  const prijmeni = (vstup.jmeno || '').trim().split(/\s+/).slice(1).join(' ');
  if (!karta) {
    karta = prazdnaKarta({
      kod,
      typ: 'host',
      vznik: 'po-odjezdu',
      jmeno,
      prijmeni,
      email: (vstup.email || '').trim().toLowerCase(),
      telefon: (vstup.telefon || '').trim(),
      jazyk: vstup.jazyk || 'cs',
      rezervace: vstup.rezervaceId ? [vstup.rezervaceId] : [],
      zalozil: 'automat',
    });
  } else {
    if (jmeno && !karta.jmeno) karta.jmeno = jmeno;
    if (prijmeni && !karta.prijmeni) karta.prijmeni = prijmeni;
    if (vstup.email && !karta.email) karta.email = vstup.email.trim().toLowerCase();
    if (vstup.telefon && !karta.telefon) karta.telefon = vstup.telefon.trim();
    if (vstup.rezervaceId && !karta.rezervace.includes(vstup.rezervaceId)) {
      karta.rezervace = [...karta.rezervace, vstup.rezervaceId];
    }
  }
  await ulozKartu(store, karta);
  return karta;
}

export async function zalozKartuRegistrace(
  store: ProcessStore,
  vstup: {
    typ: 'osoba' | 'firma';
    jmeno: string;
    prijmeni: string;
    email: string;
    telefon: string;
    jazyk: GuideLang;
    firmaNazev?: string;
    firmaIco?: string;
    novinky?: boolean;
  },
): Promise<DoporucitelKarta> {
  let kod = generujKod(6);
  for (let i = 0; i < 8; i++) {
    if (!(await nactiKartuPodleKodu(store, kod))) break;
    kod = generujKod(6);
  }
  const ted = new Date().toISOString();
  const karta = prazdnaKarta({
    kod,
    typ: vstup.typ,
    vznik: 'registrace',
    jmeno: vstup.jmeno.trim(),
    prijmeni: vstup.prijmeni.trim(),
    email: vstup.email.trim().toLowerCase(),
    telefon: vstup.telefon.trim(),
    jazyk: vstup.jazyk,
    firma:
      vstup.typ === 'firma'
        ? {
            ico: (vstup.firmaIco || '').trim(),
            dic: '',
            nazev: (vstup.firmaNazev || '').trim(),
            sidlo: '',
            platceDph: false,
          }
        : null,
    souhlasy: {
      podminky: { datum: ted, verze: PODMINKY_VERZE },
      zpracovaniUdaju: ted,
      novinky: vstup.novinky ? ted : null,
    },
    zalozil: 'registrace',
  });
  await ulozKartu(store, karta);
  return karta;
}

export async function zalozKartuMajitel(
  store: ProcessStore,
  vstup: {
    typ: DoporucitelTyp;
    jmeno: string;
    prijmeni?: string;
    email?: string;
    telefon?: string;
    jazyk?: GuideLang;
  },
): Promise<DoporucitelKarta> {
  let kod = generujKod(6);
  for (let i = 0; i < 8; i++) {
    if (!(await nactiKartuPodleKodu(store, kod))) break;
    kod = generujKod(6);
  }
  const karta = prazdnaKarta({
    kod,
    typ: vstup.typ,
    vznik: 'majitel',
    jmeno: vstup.jmeno.trim(),
    prijmeni: (vstup.prijmeni || '').trim(),
    email: (vstup.email || '').trim().toLowerCase(),
    telefon: (vstup.telefon || '').trim(),
    jazyk: vstup.jazyk || 'cs',
    zalozil: 'majitel',
  });
  await ulozKartu(store, karta);
  return karta;
}

function normalEmail(e: string): string {
  return e.trim().toLowerCase();
}

function stejnyKontakt(
  karta: DoporucitelKarta,
  kamarad: { jmeno: string; email?: string | null; telefon?: string | null },
): boolean {
  const j = kamarad.jmeno.trim().toLowerCase().split(/\s+/)[0] || '';
  const kj = karta.jmeno.trim().toLowerCase();
  if (j && kj && j === kj) return true;
  const em = kamarad.email ? normalEmail(kamarad.email) : '';
  if (em && karta.email && em === normalEmail(karta.email)) return true;
  const tel = (kamarad.telefon || '').replace(/\D/g, '');
  const kt = karta.telefon.replace(/\D/g, '');
  if (tel.length >= 9 && kt.length >= 9 && (tel.endsWith(kt.slice(-9)) || kt.endsWith(tel.slice(-9)))) {
    return true;
  }
  return false;
}

export async function pridejDoporuceniZPoptavky(
  store: ProcessStore,
  vstup: {
    kod: string;
    poptavkaId: string;
    krestniJmeno: string;
    email?: string | null;
    telefon?: string | null;
    kanal: DoporuceniKanal;
    termin: string;
    apartman?: string | null;
    cenaPredSlevou?: number | null;
    odjezd?: string | null;
  },
): Promise<DoporuceniNaKarte | null> {
  const karta = await nactiKartuPodleKodu(store, vstup.kod);
  if (!karta || karta.stav !== 'aktivni') return null;
  if (karta.doporuceni.some((d) => d.poptavkaId === vstup.poptavkaId)) {
    return karta.doporuceni.find((d) => d.poptavkaId === vstup.poptavkaId) || null;
  }
  const pravidla = await nactiPravidla(store);
  const cena = vstup.cenaPredSlevou ?? null;
  const odmena = cena != null ? spocitejOdmenu(cena, pravidla.odmenaPct) : 0;
  const zneuziti = stejnyKontakt(karta, {
    jmeno: vstup.krestniJmeno,
    email: vstup.email,
    telefon: vstup.telefon,
  });
  const rad: DoporuceniNaKarte = {
    id: novyId('dr'),
    krestniJmenoKamarada: vstup.krestniJmeno.trim().split(/\s+/)[0] || '',
    kanal: vstup.kanal,
    poptavkaId: vstup.poptavkaId,
    datumPoptavky: new Date().toISOString(),
    termin: vstup.termin,
    apartman: vstup.apartman || null,
    cenaPredSlevou: cena,
    slevaKamarada: cena != null ? spocitejOdmenu(cena, pravidla.odmenaPct) : null,
    odmena: zneuziti ? 0 : odmena,
    stav: zneuziti ? 'nesplnuje' : 'poptavka',
    odjezd: vstup.odjezd || null,
  };
  karta.doporuceni = [rad, ...karta.doporuceni];
  karta.statistiky.poptavky += 1;
  if (!zneuziti && odmena > 0) karta.penize.ceka += odmena;
  await ulozKartu(store, karta);
  return rad;
}

export async function aktualizujStavDoporuceniPodlePoptavky(
  store: ProcessStore,
  poptavkaId: string,
  novy: 'potvrzeno' | 'storno',
): Promise<void> {
  const list = (await getJson<string[]>(store, 'dop-seznam')) || [];
  for (const kod of list) {
    const karta = await nactiKartuPodleKodu(store, kod);
    if (!karta) continue;
    const idx = karta.doporuceni.findIndex((d) => d.poptavkaId === poptavkaId);
    if (idx < 0) continue;
    const d = karta.doporuceni[idx];
    if (d.stav === 'nesplnuje' || d.stav === 'vyplaceno' || d.stav === 'pripsano') return;
    if (novy === 'storno') {
      if (d.stav === 'poptavka' || d.stav === 'potvrzeno') {
        if (d.odmena > 0) {
          karta.penize.ceka = Math.max(0, karta.penize.ceka - d.odmena);
        }
        d.stav = 'storno';
      }
    } else if (novy === 'potvrzeno' && d.stav === 'poptavka') {
      d.stav = 'potvrzeno';
      karta.statistiky.potvrzene += 1;
    }
    karta.doporuceni[idx] = d;
    await ulozKartu(store, karta);
    return;
  }
}

export async function pripisOdmenyPoOdjezdu(
  store: ProcessStore,
  dnesYmd: string,
): Promise<{ kod: string; castka: number; jmeno: string; kamarad: string }[]> {
  const list = (await getJson<string[]>(store, 'dop-seznam')) || [];
  const vysledek: { kod: string; castka: number; jmeno: string; kamarad: string }[] = [];
  const pravidla = await nactiPravidla(store);
  if (!pravidla.azPoOdjezdu) return vysledek;

  for (const kod of list) {
    const karta = await nactiKartuPodleKodu(store, kod);
    if (!karta || karta.stav !== 'aktivni') continue;
    let zmena = false;
    for (let i = 0; i < karta.doporuceni.length; i++) {
      const d = karta.doporuceni[i];
      if (d.stav !== 'potvrzeno' && d.stav !== 'pobyt-probehl') continue;
      if (!d.odjezd || d.odjezd >= dnesYmd) continue;
      if (d.stav === 'potvrzeno') {
        d.stav = 'pobyt-probehl';
        karta.statistiky.probehle += 1;
        zmena = true;
      }
      if (d.stav === 'pobyt-probehl' && d.odmena > 0) {
        d.stav = 'pripsano';
        karta.penize.ceka = Math.max(0, karta.penize.ceka - d.odmena);
        karta.penize.kVyplate += d.odmena;
        zmena = true;
        vysledek.push({
          kod: karta.kod,
          castka: d.odmena,
          jmeno: karta.jmeno,
          kamarad: d.krestniJmenoKamarada,
        });
      }
      karta.doporuceni[i] = d;
    }
    if (zmena) await ulozKartu(store, karta);
  }
  return vysledek;
}

export async function nastavVyplatuUdaje(
  store: ProcessStore,
  klic: string,
  udaje: {
    zpusob: VyplataZpusob;
    ucet?: string;
    majitelUctu?: string;
    fakturuje?: boolean;
  },
): Promise<DoporucitelKarta | null> {
  const karta = await nactiKartuPodleKlic(store, klic);
  if (!karta) return null;
  karta.vyplata.zpusob = udaje.zpusob;
  if (udaje.ucet) {
    karta.vyplata.ucetHash = hashUcet(udaje.ucet);
    karta.vyplata.ucetMaska = maskujUcet(udaje.ucet);
  }
  if (udaje.majitelUctu != null) karta.vyplata.majitelUctu = udaje.majitelUctu.trim();
  if (udaje.fakturuje != null) karta.vyplata.fakturuje = udaje.fakturuje;
  await ulozKartu(store, karta);
  return karta;
}

export async function pozadatVyplatu(
  store: ProcessStore,
  klic: string,
): Promise<{ ok: true; castka: number; karta: DoporucitelKarta } | { ok: false; duvod: string }> {
  const karta = await nactiKartuPodleKlic(store, klic);
  if (!karta) return { ok: false, duvod: 'karta' };
  if (karta.penize.kVyplate <= 0) return { ok: false, duvod: 'nula' };
  return { ok: true, castka: karta.penize.kVyplate, karta };
}

export async function potvrdVyplaceno(
  store: ProcessStore,
  kod: string,
  castka: number,
  poznamka = '',
): Promise<DoporucitelKarta | null> {
  const karta = await nactiKartuPodleKodu(store, kod);
  if (!karta) return null;
  const kc = Math.min(castka, karta.penize.kVyplate);
  if (kc <= 0) return karta;
  karta.penize.kVyplate -= kc;
  karta.penize.vyplacenoCelkem += kc;
  karta.penize.historieVyplat.unshift({
    datum: new Date().toISOString(),
    castka: kc,
    zpusob: karta.vyplata.zpusob || 'ucet',
    poznamka,
  });
  for (const d of karta.doporuceni) {
    if (d.stav === 'pripsano') d.stav = 'vyplaceno';
  }
  await ulozKartu(store, karta);
  return karta;
}

export async function seznamKaret(store: ProcessStore): Promise<DoporucitelKarta[]> {
  const list = (await getJson<string[]>(store, 'dop-seznam')) || [];
  const out: DoporucitelKarta[] = [];
  for (const kod of list) {
    const k = await nactiKartuPodleKodu(store, kod);
    if (k) out.push(k);
  }
  return out;
}

export async function zmenStavDoporuceniRucne(
  store: ProcessStore,
  kod: string,
  doporuceniId: string,
  stav: DoporuceniNaKarteStav,
): Promise<DoporucitelKarta | null> {
  const karta = await nactiKartuPodleKodu(store, kod);
  if (!karta) return null;
  const d = karta.doporuceni.find((x) => x.id === doporuceniId);
  if (!d) return karta;
  d.stav = stav;
  await ulozKartu(store, karta);
  return karta;
}

export function verejnaKartaProUi(karta: DoporucitelKarta): Omit<DoporucitelKarta, 'vyplata'> & {
  vyplata: {
    zpusob: VyplataZpusob | null;
    ucetMaska: string | null;
    majitelUctu: string;
    fakturuje: boolean | null;
  };
} {
  return {
    ...karta,
    vyplata: {
      zpusob: karta.vyplata.zpusob,
      ucetMaska: karta.vyplata.ucetMaska,
      majitelUctu: karta.vyplata.majitelUctu,
      fakturuje: karta.vyplata.fakturuje,
    },
  };
}
