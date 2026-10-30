import fs from 'fs';
import path from 'path';
import type { Duvod } from './chyby';
import { UCHOVAT_KARTU_MESICU } from './constants';
import type { PoplatekStav } from './poplatek';
import {
  maOtevrenaVlakna,
  nactiVlaknoPrani,
  nactiZpravuPrani,
  type VlaknoPrani,
  type ZpravaPrani,
} from './prani';
import type { VyjezdPolozka } from './priplatek-prijezd';
import type { AptId, GuideLang } from './types';
import { prevedZaplaceno } from './platby-hosta';

export type MessageStatus =
  | 'sent'
  | 'skipped_no_data'
  | 'rejected'
  | 'duplicate'
  | 'error'
  | 'spam_vytazen';

export type MessageRecord = {
  messageId: string;
  uid?: number;
  processedAt: string;
  rezervace?: string;
  status: MessageStatus;
  reason?: string;
};

/** Poslední běh /api/zpracuj. Bez hesel a bez obsahu mailů. */
export type BehZpracovani = {
  cas: string;
  schranka: 'ano' | 'ne';
  mailu: number;
  chyba: string;
};

/** Stav IMAP schránky. Klíč Upstash `schranka:stav`. Bez obsahu mailů. */
export type SchrankaStav = {
  uidValidity: number;
  posledniUid: number;
  plnyBehKdy: string | null;
  spamKdy: string | null;
};

/** Jednou za den. vecer = 18:00, pripominka = 20:00, rano = 7:30 přehled dne. uklid = poslední pořadí. pondeli = souhrn starších nedoplatků. pohoda = 11:00 den po příjezdu. */
export type OdjezdBeh = {
  vecer: string | null;
  pripominka: string | null;
  rano: string | null;
  uklid: string | null;
  pondeli: string | null;
  pohoda: string | null;
};

export type JakPlatby = 'hotove' | 'karta' | 'prevod' | 'cena';
export type DruhPlatby = 'poplatek' | 'prijezd' | 'cesta' | 'drive' | 'pozde';

/** Jedna zaplacená položka. Prázdné platby a vyplněné zaplaceno znamenají starší „zaplaceno vše“. */
export type PlatbaPolozky = {
  druh: DruhPlatby;
  kc: number;
  jak: JakPlatby;
  kdo: 'pravoslav' | 'nikol';
  kdy: string;
};

export type RezervaceStav =
  | 'odeslano'
  | 'odeslano_s_vyhradou'
  | 'neodeslano'
  | 'vraceno'
  | 'bez_checkinu'
  | 'zruseno';

export type HistorieAkce = { cas: string; co: string };

export type ZadostOkna = {
  cas: string;
  kc: number;
  stav: 'ceka' | 'potvrzeno' | 'nelze';
  kdy: string;
  od: 'pruvodce' | 'objednat' | 'pripraveno';
  /** Předchozí noc je volná, nebo ten den do apartmánu nikdo nepřijede. */
  hned: boolean;
  /** Push po úklidu už odešel. */
  upozorneno: boolean;
};

export type ObjednatPokus = { od: number; pocet: number };

export type RezervaceRecord = {
  rezervace: string;
  apartman: AptId | null;
  prijezd: string | null;
  odjezd: string | null;
  noci: number | null;
  osob: number | null;
  jazyk: GuideLang | null;
  jmeno: string | null;
  /** Křestní jméno z GUEST_NAME jen pro pozdrav. Příjmení z oslovení sem nepatří. */
  krestni: string | null;
  /** Národnost z BH (CZE, SVK, …). U starých záznamů chybí a zůstane null. */
  narodnost: string | null;
  emailHosta: string | null;
  /** PIN pobytu pro odkaz na průvodce. V přehledu se neukazuje. */
  accessPin: string | null;
  /** Den vytvoření rezervace z BH (DATE), YYYY-MM-DD. */
  vytvoreno: string | null;
  poplatek: PoplatekStav;
  stav: RezervaceStav;
  duvody: Duvod[];
  posledniPokus: string;
  odeslaneMessageId: string | null;
  historie: HistorieAkce[];
  /** Kódy důvodů, ke kterým už odešlo upozornění. */
  upozorneneKody: string[];
  smtpPokusy: number;
  /**
   * Otevření průvodce v prohlížeči hosta.
   * null u počtu = starý záznam, nevíme. 0 = sledujeme a ještě neotevřel.
   * IP ani zařízení se neukládají. Maže se se záznamem.
   */
  otevrenoPoprve: string | null;
  otevrenoNaposled: string | null;
  otevrenoPocet: number | null;
  /** Telefon z GUEST_PHONE. Jen přehled. V průvodci, tokenu ani logu není. */
  telefon: string | null;
  /** Číslice pro WhatsApp, bez plus. null = tlačítko neukazovat. */
  telefonWa: string | null;
  /** Přesný zápis čísla z check-inu, jak ho host napsal. */
  telefonPuvodni: string | null;
  /** ZDROJ z Better Hotelu, jak přišel. */
  zdroj: string | null;
  /** Čas, který host napsal a majitel si ho sem zapsal. Tvar HH:MM. */
  casPrijezdu: string | null;
  /** Čas odjezdu. HH:MM. Ruční zápis majitele má přednost před hostem. */
  casOdjezdu: string | null;
  /** Poslední čas odjezdu zadal host v průvodci. */
  casOdjezduZadalHost: boolean;
  /** Kdy majitel poslal dotaz na odjezd. null = ještě ne. */
  odjezdDotaz: string | null;
  /** Kdy majitel poslal „Je vše v pořádku?“. null = ještě ne. */
  pohodaDotaz: string | null;
  /** Den a čas odjezdu, na který už odešlo upozornění půl hodiny předem. */
  odjezdPushPul: string | null;
  /** Kdy byl úklid tohoto odjezdu označen. null = ještě ne. */
  uklizenoKdy: string | null;
  /** Kdo úklid označil. */
  uklizenoKdo: 'miluska' | 'nikol' | 'pravoslav' | null;
  /** Žádost o dřívější příjezd. Platí až po potvrzení majitele. */
  zadostPrijezd: ZadostOkna | null;
  /** Žádost o pozdější odjezd. Platí až po potvrzení majitele. */
  zadostOdjezd: ZadostOkna | null;
  /** Telefon z e-mailu o nové rezervaci. Check-in ho nepřepisuje. */
  telefonRezervace: string | null;
  telefonRezervaceWa: string | null;
  /** Přesný zápis čísla z rezervace, jak přišel. */
  telefonRezervacePuvodni: string | null;
  /** Odkaz na online check-in. Jen https://. Maže se se záznamem. */
  checkinUrl: string | null;
  /** Odkud řádek vznikl, když ho nezaložil automat z Better Hotelu. */
  stitek: 'rucne' | 'info' | null;
  /** Čas osobního předání. Než je vyplněný, průvodce kódy neukáže. Maže se se záznamem. */
  predano: string | null;
  /** Kdy host napsal, že je na místě. Příplatek se bere odtud, jinak z předání. */
  naMiste: string | null;
  /** Ruční příplatek za čas. Když je vyplněný, výpočet ho nepřepíše. */
  priplatekRucni: number | null;
  /** Čas, kdy byl vybraný městský poplatek. S prázdnými platbami kryje vše, co v tu chvíli bylo. */
  zaplaceno: string | null;
  /** Jednotlivé zaplacené položky. Nová položka po zaplacení zůstane dluhem. */
  platby: PlatbaPolozky[];
  /** Kdo městský poplatek vybral. */
  poplatekVybral: 'ja' | 'nikol' | null;
  /** Kdy jsme apartmán od hosta převzali. null = ještě je v dnešních odjezdech. */
  prevzatoKdy: string | null;
  /** true, když odjezd doplnil automat, ne klepnutí. */
  prevzatoAuto: boolean;
  /** Den odjezdu, kdy už odešlo ranní upozornění, že něco není zaplacené. */
  platbaUpozorneno: string | null;
  /** Další výjezdy, každý 300 Kč, dokud není vybraný. Maže se se záznamem. */
  vyjezdy: VyjezdPolozka[];
  /** Souhlas hosta s pravidly příjezdu. Verze drží znění, které viděl. */
  souhlasPravidel: { kdy: string; jazyk: string; verze: string } | null;
  /** Závady zapsané při předání. E-mail až tlačítkem majitele. */
  zavadyPredani: {
    text: string;
    kdy: string;
    kdo: 'miluska' | 'nikol' | 'pravoslav';
    odeslanoKdy: string | null;
    potvrzenoKdy: string | null;
  } | null;
  /** Závady po odjezdu (z Úklidu). E-mail až tlačítkem, bez potvrzení hostem. */
  zavadyPoOdjezdu: {
    text: string;
    kdy: string;
    kdo: 'miluska' | 'nikol' | 'pravoslav';
    odeslanoKdy: string | null;
  } | null;
  /** Poslední čas příjezdu zadal host v průvodci. */
  casZadalHost: boolean;
  /** auto, nebo pěšky / vlak / autobus. */
  zpusobPrijezdu: 'auto' | 'pesky' | null;
  /** Telefon, ze kterého host otevírá bránu. */
  telefonBrana: string | null;
  /** SPZ bez mezer. */
  spz: string | null;
  /** Půjčené auto, SPZ doplní později. */
  spzPujcene: boolean;
  /** Majitel označil, že číslo je v bráně. */
  branaRegistrovano: string | null;
  /** Už odešlo upozornění, ať se brána zaregistruje. */
  branaPushRegistrace: string | null;
  /** Den příjezdu, kdy už odešlo ranní upozornění na bránu. */
  branaPushRano: string | null;
  /** Den a čas příjezdu, na který už odešlo upozornění hodinu předem. Tvar YYYY-MM-DD HH:MM. */
  prijezdPushCas: string | null;
  /** Den a čas příjezdu, na který už odešlo upozornění 30 min předem (doklady). */
  dokladyPushCas: string | null;
  /** Den příjezdu, kdy už odešlo ranní upozornění, že čas neznáme. */
  prijezdPushNeznamy: string | null;
  /** Majitel odemkl průvodce i bez údajů. Kódy to neodemkne. */
  pruvodceOdemcen: string | null;
  /** Časy uložení z průvodce, kvůli limitu. Bez údajů hosta. */
  hostUlozeni: string[];
  /** Pole, která majitel uložil v přehledu. Automat je nepřepíše. */
  rucniZnacky: RucniZnacka[];
  /** Jiná hodnota od automatu nebo hosta. Majitel ji může převzít. */
  navrhy: NavrhPole[];
  /** Kdy majitel uložil kontakt (vizitku) do telefonu. null = ještě ne. */
  kontaktUlozenKdy: string | null;
  /** Poznámka majitele pro Milušku (postýlka, dřívější příjezd…). */
  poznamkaUklid: string | null;
};

export type RucniPole =
  | 'telefon'
  | 'telefonRezervace'
  | 'casPrijezdu'
  | 'casOdjezdu'
  | 'checkinUrl'
  | 'jmeno'
  | 'emailHosta'
  | 'apartman'
  | 'prijezd'
  | 'odjezd'
  | 'noci'
  | 'osob'
  | 'jazyk'
  | 'predano'
  | 'priplatekRucni'
  | 'zaplaceno'
  | 'poplatekVybral'
  | 'poplatek'
  | 'accessPin'
  | 'poznamkaUklid';

export type OdkudNavrh = 'check-in' | 'rezervace' | 'host' | 'potvrzeni';

export type NavrhPole = { pole: RucniPole; od: OdkudNavrh; hodnota: string };

export type RucniZnacka = { pole: RucniPole; cas: string };

export type PushRole = 'majitel' | 'uklid';

export type PushZarizeni = {
  endpoint: string;
  p256dh: string;
  auth: string;
  nazev: string;
  cas: string;
  /** Chybí = majitel (stará zařízení). */
  role?: PushRole;
};

/** Jedna položka v seznamu upozornění pro přehled (posledních 100). */
export type UpozorneniZaznam = {
  cas: string;
  text: string;
  url: string;
};

export type RezervaceEntry = { id: string; record: RezervaceRecord; chybaNahrani?: boolean };
export type MessageEntry = { id: string; record: MessageRecord };

type PraniFileSlot = {
  vlakna: Record<string, VlaknoPrani>;
  zpravy: ZpravaPrani[];
};

type StoreData = {
  messages: Record<string, MessageRecord>;
  rezervace: Record<string, RezervaceRecord>;
  push?: PushZarizeni[];
  upozorneni?: UpozorneniZaznam[];
  zpracujSelhani?: number;
  zpracujBeh?: BehZpracovani | null;
  odjezdBeh?: OdjezdBeh | null;
  brana?: unknown;
  objednatPokusy?: Record<string, ObjednatPokus>;
  schrankaStav?: SchrankaStav | null;
  /** Přání hosta mimo rez:* (prompt 57A). */
  praniOtevrena?: string[];
  prani?: Record<string, PraniFileSlot>;
};

const RUCNI_KLIC = new Set<RucniPole>([
  'telefon',
  'telefonRezervace',
  'casPrijezdu',
  'casOdjezdu',
  'checkinUrl',
  'jmeno',
  'emailHosta',
  'apartman',
  'prijezd',
  'odjezd',
  'noci',
  'osob',
  'jazyk',
  'predano',
  'priplatekRucni',
  'zaplaceno',
  'poplatekVybral',
  'accessPin',
  'poznamkaUklid',
]);

const ODKUD = new Set<OdkudNavrh>(['check-in', 'rezervace', 'host', 'potvrzeni']);

export type PraniTtlOpts = { odjezd: string | null; persist: boolean };

export type OtevrenaPraniPolozka = {
  rezervace: string;
  vlakna: VlaknoPrani[];
  zpravy: ZpravaPrani[];
};

export interface ProcessStore {
  isMessageProcessed(messageId: string): Promise<boolean>;
  getMessage(messageId: string): Promise<MessageRecord | null>;
  markMessage(record: MessageRecord): Promise<void>;
  getRezervace(id: string): Promise<RezervaceRecord | null>;
  setRezervace(id: string, record: RezervaceRecord): Promise<void>;
  listRezervace(): Promise<RezervaceEntry[]>;
  listMessages(): Promise<MessageEntry[]>;
  purgeExpired(now?: Date): Promise<number>;
  listPush(): Promise<PushZarizeni[]>;
  savePush(list: PushZarizeni[]): Promise<void>;
  listUpozorneni(): Promise<UpozorneniZaznam[]>;
  pridejUpozorneni(zaznam: UpozorneniZaznam): Promise<void>;
  getSelhani(): Promise<number>;
  setSelhani(pocet: number): Promise<void>;
  getBeh(): Promise<BehZpracovani | null>;
  setBeh(beh: BehZpracovani): Promise<void>;
  getBrana(): Promise<unknown>;
  setBrana(sloty: unknown): Promise<void>;
  getOdjezdBeh(): Promise<OdjezdBeh | null>;
  setOdjezdBeh(beh: OdjezdBeh): Promise<void>;
  getObjednatPokusy(): Promise<Record<string, ObjednatPokus>>;
  setObjednatPokusy(pokusy: Record<string, ObjednatPokus>): Promise<void>;
  getSchrankaStav(): Promise<SchrankaStav | null>;
  setSchrankaStav(stav: SchrankaStav): Promise<void>;
  listPrani(rez: string): Promise<{ vlakna: Record<string, VlaknoPrani>; zpravy: ZpravaPrani[] }>;
  pridejZpravuPrani(rez: string, zprava: ZpravaPrani, vlakno: VlaknoPrani, ttl: PraniTtlOpts): Promise<void>;
  nastavVlaknoPrani(rez: string, vlakno: VlaknoPrani, ttl: PraniTtlOpts): Promise<void>;
  upravZpravuPrani(
    rez: string,
    id: string,
    patch: Partial<Pick<ZpravaPrani, 'text' | 'upraveno' | 'smazano'>>,
    ttl: PraniTtlOpts,
  ): Promise<void>;
  smazVlaknoPrani(rez: string, vlaknoId: string, ttl: PraniTtlOpts): Promise<void>;
  listOtevrenaPrani(): Promise<OtevrenaPraniPolozka[]>;
}

function ttlPraniSec(ttl: PraniTtlOpts, now = new Date()): number | 'persist' | null {
  if (ttl.persist) return 'persist';
  if (!ttl.odjezd) return MESSAGE_TTL_SEC;
  const limit = smazatPoOdjezdu(ttl.odjezd);
  if (!limit) return MESSAGE_TTL_SEC;
  if (limit.getTime() <= now.getTime()) return 60;
  return Math.max(60, Math.ceil((limit.getTime() - now.getTime()) / 1000));
}

export function nactiUpozorneniSeznam(raw: unknown): UpozorneniZaznam[] {
  if (!Array.isArray(raw)) return [];
  const out: UpozorneniZaznam[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const cas = typeof r.cas === 'string' ? r.cas : '';
    const text = typeof r.text === 'string' ? r.text.trim() : '';
    const url = typeof r.url === 'string' ? r.url.trim() : '';
    if (!cas || !text) continue;
    out.push({ cas, text, url: url || '/prehled' });
    if (out.length >= 100) break;
  }
  return out;
}

export function nactiSchrankaStav(raw: unknown): SchrankaStav | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const uidValidity = typeof s.uidValidity === 'number' && Number.isFinite(s.uidValidity) ? Math.floor(s.uidValidity) : null;
  const posledniUid = typeof s.posledniUid === 'number' && Number.isFinite(s.posledniUid) ? Math.floor(s.posledniUid) : null;
  if (uidValidity == null || uidValidity < 0 || posledniUid == null || posledniUid < 0) return null;
  const cas = (v: unknown) => (typeof v === 'string' && v.length >= 10 ? v : null);
  return {
    uidValidity,
    posledniUid,
    plnyBehKdy: cas(s.plnyBehKdy),
    spamKdy: cas(s.spamKdy),
  };
}

const MESSAGE_TTL_SEC = 90 * 24 * 60 * 60;
const STAVY: RezervaceStav[] = [
  'odeslano',
  'odeslano_s_vyhradou',
  'neodeslano',
  'vraceno',
  'bez_checkinu',
  'zruseno',
];

function emptyData(): StoreData {
  return {
    messages: {},
    rezervace: {},
    push: [],
    upozorneni: [],
    zpracujSelhani: 0,
    zpracujBeh: null,
    brana: null,
    schrankaStav: null,
  };
}

export function nactiBeh(raw: unknown): BehZpracovani | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as BehZpracovani;
  if ((b.schranka !== 'ano' && b.schranka !== 'ne') || typeof b.cas !== 'string') return null;
  const mailu = typeof b.mailu === 'number' && b.mailu >= 0 ? Math.floor(b.mailu) : 0;
  const chyba = typeof b.chyba === 'string' ? b.chyba.slice(0, 180) : '';
  return { cas: b.cas, schranka: b.schranka, mailu, chyba };
}

function nactiZnacky(raw: unknown): RucniZnacka[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (z): z is RucniZnacka =>
      Boolean(z) &&
      typeof z === 'object' &&
      RUCNI_KLIC.has((z as RucniZnacka).pole) &&
      typeof (z as RucniZnacka).cas === 'string',
  );
}

function nactiNavrhy(raw: unknown): NavrhPole[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (n): n is NavrhPole =>
      Boolean(n) &&
      typeof n === 'object' &&
      RUCNI_KLIC.has((n as NavrhPole).pole) &&
      ODKUD.has((n as NavrhPole).od) &&
      typeof (n as NavrhPole).hodnota === 'string',
  );
}

function nactiPush(raw: unknown): PushZarizeni[] {
  if (!Array.isArray(raw)) return [];
  const out: PushZarizeni[] = [];
  for (const z of raw) {
    if (!z || typeof z !== 'object') continue;
    const r = z as PushZarizeni;
    if (typeof r.endpoint !== 'string' || typeof r.p256dh !== 'string' || typeof r.auth !== 'string') {
      continue;
    }
    const role = r.role === 'uklid' || r.role === 'majitel' ? r.role : undefined;
    out.push({
      endpoint: r.endpoint,
      p256dh: r.p256dh,
      auth: r.auth,
      nazev: typeof r.nazev === 'string' ? r.nazev : 'Telefon',
      cas: typeof r.cas === 'string' ? r.cas : new Date(0).toISOString(),
      ...(role ? { role } : {}),
    });
  }
  return out;
}

export function rolePush(z: PushZarizeni): PushRole {
  return z.role === 'uklid' ? 'uklid' : 'majitel';
}

/**
 * Smazat v poledne UTC po UCHOVAT_KARTU_MESICU měsících od dne odjezdu.
 * 24 měsíců drží nedoplatky, spory, stálé hosty a poplatek z pobytu.
 * Zprávy mají vlastní dobu (MESSAGE_TTL_SEC) a tahle funkce se jich netýká.
 */
export function smazatPoOdjezdu(odjezdYmd: string): Date | null {
  const [y, m, d] = odjezdYmd.split('-').map(Number);
  if (!y || !m || !d) return null;
  const celkem = m - 1 + UCHOVAT_KARTU_MESICU;
  return new Date(Date.UTC(y + Math.floor(celkem / 12), celkem % 12, d, 12, 0, 0));
}

const DRUHY_PLATBY: DruhPlatby[] = ['poplatek', 'prijezd', 'cesta', 'drive', 'pozde'];
const JAKY_PLATBY: JakPlatby[] = ['hotove', 'karta', 'prevod', 'cena'];

function nactiPlatby(raw: unknown): PlatbaPolozky[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const v = item as Record<string, unknown>;
    if (!DRUHY_PLATBY.includes(v.druh as DruhPlatby)) return [];
    if (!JAKY_PLATBY.includes(v.jak as JakPlatby)) return [];
    if (v.kdo !== 'pravoslav' && v.kdo !== 'nikol') return [];
    if (typeof v.kdy !== 'string' || !v.kdy) return [];
    if (typeof v.kc !== 'number' || !Number.isFinite(v.kc) || v.kc < 0) return [];
    return [{ druh: v.druh as DruhPlatby, kc: Math.round(v.kc), jak: v.jak as JakPlatby, kdo: v.kdo, kdy: v.kdy }];
  });
}

function nactiVyjezdy(raw: unknown): VyjezdPolozka[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const v = item as Record<string, unknown>;
    if (typeof v.id !== 'string' || !v.id || typeof v.kdy !== 'string' || !v.kdy) return [];
    if (typeof v.castka !== 'number' || v.castka <= 0) return [];
    return [{ id: v.id, kdy: v.kdy, castka: v.castka }];
  });
}

function nactiSouhlas(raw: unknown): RezervaceRecord['souhlasPravidel'] {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.kdy !== 'string' || typeof s.jazyk !== 'string' || typeof s.verze !== 'string') return null;
  return { kdy: s.kdy, jazyk: s.jazyk, verze: s.verze };
}

function nactiKdoZavad(raw: unknown): 'miluska' | 'nikol' | 'pravoslav' {
  return raw === 'miluska' || raw === 'nikol' || raw === 'pravoslav' ? raw : 'pravoslav';
}

function nactiZavadyPredani(raw: unknown): RezervaceRecord['zavadyPredani'] {
  if (!raw || typeof raw !== 'object') return null;
  const z = raw as Record<string, unknown>;
  if (typeof z.text !== 'string' || !z.text.trim()) return null;
  const odeslanoKdy =
    typeof z.odeslanoKdy === 'string' && z.odeslanoKdy ? z.odeslanoKdy : null;
  const kdy =
    typeof z.kdy === 'string' && z.kdy ? z.kdy : odeslanoKdy;
  if (!kdy) return null;
  return {
    text: z.text.trim().slice(0, 2000),
    kdy,
    kdo: nactiKdoZavad(z.kdo),
    odeslanoKdy,
    potvrzenoKdy: typeof z.potvrzenoKdy === 'string' && z.potvrzenoKdy ? z.potvrzenoKdy : null,
  };
}

function nactiZavadyPoOdjezdu(raw: unknown): RezervaceRecord['zavadyPoOdjezdu'] {
  if (!raw || typeof raw !== 'object') return null;
  const z = raw as Record<string, unknown>;
  if (typeof z.text !== 'string' || !z.text.trim()) return null;
  if (typeof z.kdy !== 'string' || !z.kdy) return null;
  return {
    text: z.text.trim().slice(0, 2000),
    kdy: z.kdy,
    kdo: nactiKdoZavad(z.kdo),
    odeslanoKdy: typeof z.odeslanoKdy === 'string' && z.odeslanoKdy ? z.odeslanoKdy : null,
  };
}

function nactiZadost(raw: unknown): ZadostOkna | null {
  if (!raw || typeof raw !== 'object') return null;
  const z = raw as ZadostOkna;
  if (typeof z.cas !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(z.cas)) return null;
  if (z.stav !== 'ceka' && z.stav !== 'potvrzeno' && z.stav !== 'nelze') return null;
  if (typeof z.kc !== 'number' || z.kc <= 0) return null;
  const od = z.od === 'objednat' || z.od === 'pripraveno' ? z.od : 'pruvodce';
  return {
    cas: z.cas,
    kc: Math.round(z.kc),
    stav: z.stav,
    kdy: typeof z.kdy === 'string' ? z.kdy : '',
    od,
    hned: z.hned === true,
    upozorneno: z.upozorneno === true,
  };
}

export function nactiObjednatPokusy(raw: unknown, now = Date.now()): Record<string, ObjednatPokus> {
  if (!raw || typeof raw !== 'object') return {};
  const ven: Record<string, ObjednatPokus> = {};
  for (const [klic, hodnota] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[a-f0-9]{8,64}$/.test(klic) || !hodnota || typeof hodnota !== 'object') continue;
    const p = hodnota as ObjednatPokus;
    if (typeof p.od !== 'number' || typeof p.pocet !== 'number') continue;
    if (now - p.od > 2 * 60 * 60 * 1000) continue;
    ven[klic] = { od: p.od, pocet: Math.max(0, Math.floor(p.pocet)) };
  }
  return ven;
}

function jeStav(value: unknown): value is RezervaceStav {
  return typeof value === 'string' && STAVY.includes(value as RezervaceStav);
}

function asRezervace(id: string, raw: unknown): RezervaceRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const stary = typeof r.status === 'string' ? r.status : '';
  const stav = jeStav(r.stav) ? r.stav : stary === 'zruseno' ? 'zruseno' : stary === 'odeslano' ? 'odeslano' : 'neodeslano';
  const posledni =
    (typeof r.posledniPokus === 'string' && r.posledniPokus) ||
    (typeof r.processedAt === 'string' && r.processedAt) ||
    new Date(0).toISOString();
  return {
    rezervace: typeof r.rezervace === 'string' && r.rezervace ? r.rezervace : id,
    apartman: (r.apartman as AptId) || null,
    prijezd: typeof r.prijezd === 'string' ? r.prijezd : null,
    odjezd: typeof r.odjezd === 'string' ? r.odjezd : null,
    noci: typeof r.noci === 'number' ? r.noci : null,
    osob: typeof r.osob === 'number' ? r.osob : null,
    jazyk: (r.jazyk as GuideLang) || null,
    jmeno: typeof r.jmeno === 'string' ? r.jmeno : null,
    krestni: typeof r.krestni === 'string' ? r.krestni : null,
    narodnost: typeof r.narodnost === 'string' ? r.narodnost : null,
    emailHosta: typeof r.emailHosta === 'string' ? r.emailHosta : null,
    accessPin: typeof r.accessPin === 'string' ? r.accessPin : null,
    vytvoreno: typeof r.vytvoreno === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.vytvoreno) ? r.vytvoreno : null,
    poplatek: r.poplatek === 'ano' || r.poplatek === 'ne' || r.poplatek === 'neznamo' ? r.poplatek : 'neznamo',
    stav,
    duvody: Array.isArray(r.duvody) ? (r.duvody as Duvod[]) : [],
    posledniPokus: posledni,
    odeslaneMessageId:
      (typeof r.odeslaneMessageId === 'string' && r.odeslaneMessageId) ||
      (typeof r.messageId === 'string' && r.messageId) ||
      null,
    historie: Array.isArray(r.historie) ? (r.historie as HistorieAkce[]) : [],
    upozorneneKody: Array.isArray(r.upozorneneKody) ? (r.upozorneneKody as string[]) : [],
    smtpPokusy: typeof r.smtpPokusy === 'number' ? r.smtpPokusy : 0,
    otevrenoPoprve: typeof r.otevrenoPoprve === 'string' ? r.otevrenoPoprve : null,
    otevrenoNaposled: typeof r.otevrenoNaposled === 'string' ? r.otevrenoNaposled : null,
    otevrenoPocet: typeof r.otevrenoPocet === 'number' ? r.otevrenoPocet : null,
    telefon: typeof r.telefon === 'string' && r.telefon ? r.telefon : null,
    telefonWa: typeof r.telefonWa === 'string' && r.telefonWa ? r.telefonWa : null,
    telefonPuvodni: typeof r.telefonPuvodni === 'string' && r.telefonPuvodni ? r.telefonPuvodni : null,
    zdroj: typeof r.zdroj === 'string' && r.zdroj ? r.zdroj : null,
    casPrijezdu:
      r.casPrijezdu === 'po20' ||
      r.casPrijezdu === 'po23' ||
      (typeof r.casPrijezdu === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.casPrijezdu))
        ? r.casPrijezdu
        : null,
    casOdjezdu: typeof r.casOdjezdu === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.casOdjezdu) ? r.casOdjezdu : null,
    casOdjezduZadalHost: r.casOdjezduZadalHost === true,
    odjezdDotaz: typeof r.odjezdDotaz === 'string' && r.odjezdDotaz ? r.odjezdDotaz : null,
    pohodaDotaz: typeof r.pohodaDotaz === 'string' && r.pohodaDotaz ? r.pohodaDotaz : null,
    odjezdPushPul: typeof r.odjezdPushPul === 'string' && r.odjezdPushPul ? r.odjezdPushPul : null,
    uklizenoKdy: typeof r.uklizenoKdy === 'string' && r.uklizenoKdy ? r.uklizenoKdy : null,
    uklizenoKdo:
      r.uklizenoKdo === 'nikol'
        ? 'nikol'
        : r.uklizenoKdo === 'miluska' || r.uklizenoKdo === 'pravoslav'
          ? 'miluska'
          : null,
    zadostPrijezd: nactiZadost(r.zadostPrijezd),
    zadostOdjezd: nactiZadost(r.zadostOdjezd),
    casZadalHost: r.casZadalHost === true,
    zpusobPrijezdu: r.zpusobPrijezdu === 'auto' || r.zpusobPrijezdu === 'pesky' ? r.zpusobPrijezdu : null,
    telefonBrana: typeof r.telefonBrana === 'string' && r.telefonBrana ? r.telefonBrana : null,
    spz: typeof r.spz === 'string' && r.spz ? r.spz : null,
    spzPujcene: r.spzPujcene === true,
    branaRegistrovano: typeof r.branaRegistrovano === 'string' && r.branaRegistrovano ? r.branaRegistrovano : null,
    branaPushRegistrace: typeof r.branaPushRegistrace === 'string' && r.branaPushRegistrace ? r.branaPushRegistrace : null,
    branaPushRano: typeof r.branaPushRano === 'string' && r.branaPushRano ? r.branaPushRano : null,
    prijezdPushCas: typeof r.prijezdPushCas === 'string' && r.prijezdPushCas ? r.prijezdPushCas : null,
    dokladyPushCas: typeof r.dokladyPushCas === 'string' && r.dokladyPushCas ? r.dokladyPushCas : null,
    prijezdPushNeznamy: typeof r.prijezdPushNeznamy === 'string' && r.prijezdPushNeznamy ? r.prijezdPushNeznamy : null,
    pruvodceOdemcen: typeof r.pruvodceOdemcen === 'string' && r.pruvodceOdemcen ? r.pruvodceOdemcen : null,
    hostUlozeni: Array.isArray(r.hostUlozeni) ? r.hostUlozeni.filter((x) => typeof x === 'string') : [],
    rucniZnacky: nactiZnacky(r.rucniZnacky),
    navrhy: nactiNavrhy(r.navrhy),
    telefonRezervace: typeof r.telefonRezervace === 'string' && r.telefonRezervace ? r.telefonRezervace : null,
    telefonRezervaceWa: typeof r.telefonRezervaceWa === 'string' && r.telefonRezervaceWa ? r.telefonRezervaceWa : null,
    telefonRezervacePuvodni:
      typeof r.telefonRezervacePuvodni === 'string' && r.telefonRezervacePuvodni ? r.telefonRezervacePuvodni : null,
    checkinUrl: typeof r.checkinUrl === 'string' && /^https:\/\//i.test(r.checkinUrl) ? r.checkinUrl : null,
    stitek: r.stitek === 'rucne' || r.stitek === 'info' ? r.stitek : null,
    predano: typeof r.predano === 'string' && r.predano ? r.predano : null,
    naMiste: typeof r.naMiste === 'string' && r.naMiste ? r.naMiste : null,
    priplatekRucni:
      typeof r.priplatekRucni === 'number' && Number.isFinite(r.priplatekRucni) && r.priplatekRucni >= 0
        ? Math.round(r.priplatekRucni)
        : null,
    zaplaceno: typeof r.zaplaceno === 'string' && r.zaplaceno ? r.zaplaceno : null,
    platby: nactiPlatby(r.platby),
    poplatekVybral: r.poplatekVybral === 'ja' || r.poplatekVybral === 'nikol' ? r.poplatekVybral : null,
    prevzatoKdy: typeof r.prevzatoKdy === 'string' && r.prevzatoKdy ? r.prevzatoKdy : null,
    prevzatoAuto: r.prevzatoAuto === true,
    platbaUpozorneno: typeof r.platbaUpozorneno === 'string' && r.platbaUpozorneno ? r.platbaUpozorneno : null,
    vyjezdy: nactiVyjezdy(r.vyjezdy),
    souhlasPravidel: nactiSouhlas(r.souhlasPravidel),
    zavadyPredani: nactiZavadyPredani(r.zavadyPredani),
    zavadyPoOdjezdu: nactiZavadyPoOdjezdu(r.zavadyPoOdjezdu),
    kontaktUlozenKdy:
      typeof r.kontaktUlozenKdy === 'string' && r.kontaktUlozenKdy ? r.kontaktUlozenKdy : null,
    poznamkaUklid:
      typeof r.poznamkaUklid === 'string' && r.poznamkaUklid.trim() ? r.poznamkaUklid.trim().slice(0, 500) : null,
  };
}

export function prazdnaRezervace(id: string, cas: string): RezervaceRecord {
  return {
    rezervace: id,
    apartman: null,
    prijezd: null,
    odjezd: null,
    noci: null,
    osob: null,
    jazyk: null,
    jmeno: null,
    krestni: null,
    narodnost: null,
    emailHosta: null,
    accessPin: null,
    vytvoreno: null,
    poplatek: 'neznamo',
    stav: 'neodeslano',
    duvody: [],
    posledniPokus: cas,
    odeslaneMessageId: null,
    historie: [],
    upozorneneKody: [],
    smtpPokusy: 0,
    otevrenoPoprve: null,
    otevrenoNaposled: null,
    otevrenoPocet: 0,
    telefon: null,
    telefonWa: null,
    telefonPuvodni: null,
    zdroj: null,
    casPrijezdu: null,
    telefonRezervace: null,
    telefonRezervaceWa: null,
    telefonRezervacePuvodni: null,
    checkinUrl: null,
    stitek: null,
    predano: null,
    naMiste: null,
    priplatekRucni: null,
    zaplaceno: null,
    platby: [],
    poplatekVybral: null,
    prevzatoKdy: null,
    prevzatoAuto: false,
    platbaUpozorneno: null,
    vyjezdy: [],
    souhlasPravidel: null,
    zavadyPredani: null,
    zavadyPoOdjezdu: null,
    casZadalHost: false,
    zpusobPrijezdu: null,
    telefonBrana: null,
    spz: null,
    spzPujcene: false,
    branaRegistrovano: null,
    branaPushRegistrace: null,
    branaPushRano: null,
    prijezdPushCas: null,
    dokladyPushCas: null,
    prijezdPushNeznamy: null,
    casOdjezdu: null,
    casOdjezduZadalHost: false,
    odjezdDotaz: null,
    pohodaDotaz: null,
    odjezdPushPul: null,
    uklizenoKdy: null,
    uklizenoKdo: null,
    zadostPrijezd: null,
    zadostOdjezd: null,
    pruvodceOdemcen: null,
    hostUlozeni: [],
    rucniZnacky: [],
    navrhy: [],
    kontaktUlozenKdy: null,
    poznamkaUklid: null,
  };
}

/** Lokální soubor .data/store.json (výchozí). */
export class FileProcessStore implements ProcessStore {
  private readonly filePath: string;

  constructor(filePath = process.env.STORE_FILE?.trim() || path.join(process.cwd(), '.data', 'store.json')) {
    this.filePath = filePath;
  }

  private read(): StoreData {
    try {
      if (!fs.existsSync(this.filePath)) return emptyData();
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as StoreData;
      return {
        messages: parsed.messages || {},
        rezervace: parsed.rezervace || {},
        push: nactiPush(parsed.push),
        upozorneni: nactiUpozorneniSeznam(parsed.upozorneni),
        zpracujSelhani: typeof parsed.zpracujSelhani === 'number' ? parsed.zpracujSelhani : 0,
        zpracujBeh: nactiBeh(parsed.zpracujBeh),
        odjezdBeh: parsed.odjezdBeh ?? null,
        brana: parsed.brana ?? null,
        objednatPokusy: parsed.objednatPokusy,
        schrankaStav: nactiSchrankaStav(parsed.schrankaStav),
        praniOtevrena: Array.isArray(parsed.praniOtevrena)
          ? parsed.praniOtevrena.filter((x): x is string => typeof x === 'string')
          : [],
        prani: parsed.prani && typeof parsed.prani === 'object' ? parsed.prani : {},
      };
    } catch {
      return emptyData();
    }
  }

  private write(data: StoreData): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, this.filePath);
  }

  async isMessageProcessed(messageId: string): Promise<boolean> {
    return Boolean(this.read().messages[messageId]);
  }

  async getMessage(messageId: string): Promise<MessageRecord | null> {
    return this.read().messages[messageId] ?? null;
  }

  async markMessage(record: MessageRecord): Promise<void> {
    const data = this.read();
    data.messages[record.messageId] = record;
    this.write(data);
  }

  async getRezervace(id: string): Promise<RezervaceRecord | null> {
    const raw = this.read().rezervace[id];
    return raw ? asRezervace(id, raw) : null;
  }

  async setRezervace(id: string, record: RezervaceRecord): Promise<void> {
    const data = this.read();
    data.rezervace[id] = record;
    this.write(data);
  }

  async listRezervace(): Promise<RezervaceEntry[]> {
    return Object.entries(this.read().rezervace)
      .map(([id, record]) => ({ id, record: asRezervace(id, record) }))
      .filter((row): row is RezervaceEntry => Boolean(row.record));
  }

  async listMessages(): Promise<MessageEntry[]> {
    return Object.entries(this.read().messages).map(([id, record]) => ({ id, record }));
  }

  async purgeExpired(now = new Date()): Promise<number> {
    const data = this.read();
    let removed = 0;
    for (const [id, raw] of Object.entries(data.rezervace)) {
      const rec = asRezervace(id, raw);
      const limit = rec?.odjezd ? smazatPoOdjezdu(rec.odjezd) : null;
      if (limit && now.getTime() > limit.getTime()) {
        delete data.rezervace[id];
        removed += 1;
      }
    }
    const messageLimit = now.getTime() - MESSAGE_TTL_SEC * 1000;
    for (const [id, rec] of Object.entries(data.messages)) {
      const at = Date.parse(rec.processedAt);
      if (Number.isFinite(at) && at < messageLimit) {
        delete data.messages[id];
        removed += 1;
      }
    }
    if (removed) this.write(data);
    return removed;
  }

  async listPush(): Promise<PushZarizeni[]> {
    return this.read().push || [];
  }

  async savePush(list: PushZarizeni[]): Promise<void> {
    const data = this.read();
    data.push = list;
    this.write(data);
  }

  async listUpozorneni(): Promise<UpozorneniZaznam[]> {
    return this.read().upozorneni || [];
  }

  async pridejUpozorneni(zaznam: UpozorneniZaznam): Promise<void> {
    const data = this.read();
    data.upozorneni = nactiUpozorneniSeznam([zaznam, ...(data.upozorneni || [])]);
    this.write(data);
  }

  async getSelhani(): Promise<number> {
    return this.read().zpracujSelhani || 0;
  }

  async getBeh(): Promise<BehZpracovani | null> {
    return this.read().zpracujBeh || null;
  }

  async setBeh(beh: BehZpracovani): Promise<void> {
    const data = this.read();
    data.zpracujBeh = nactiBeh(beh);
    this.write(data);
  }

  async setSelhani(pocet: number): Promise<void> {
    const data = this.read();
    data.zpracujSelhani = pocet;
    this.write(data);
  }

  async getBrana(): Promise<unknown> {
    return this.read().brana ?? null;
  }

  async setBrana(sloty: unknown): Promise<void> {
    const data = this.read();
    data.brana = sloty;
    this.write(data);
  }

  async getOdjezdBeh(): Promise<OdjezdBeh | null> {
    return this.read().odjezdBeh ?? null;
  }

  async setOdjezdBeh(beh: OdjezdBeh): Promise<void> {
    const data = this.read();
    data.odjezdBeh = beh;
    this.write(data);
  }

  async getObjednatPokusy(): Promise<Record<string, ObjednatPokus>> {
    return nactiObjednatPokusy(this.read().objednatPokusy);
  }

  async setObjednatPokusy(pokusy: Record<string, ObjednatPokus>): Promise<void> {
    const data = this.read();
    data.objednatPokusy = nactiObjednatPokusy(pokusy);
    this.write(data);
  }

  async getSchrankaStav(): Promise<SchrankaStav | null> {
    return this.read().schrankaStav ?? null;
  }

  async setSchrankaStav(stav: SchrankaStav): Promise<void> {
    const cisty = nactiSchrankaStav(stav);
    if (!cisty) return;
    const data = this.read();
    data.schrankaStav = cisty;
    this.write(data);
  }

  private syncOtevrenaPrani(data: StoreData, rez: string, vlakna: Record<string, VlaknoPrani>): void {
    const set = new Set(data.praniOtevrena || []);
    if (maOtevrenaVlakna(Object.values(vlakna))) set.add(rez);
    else set.delete(rez);
    data.praniOtevrena = [...set];
  }

  async listPrani(rez: string): Promise<{ vlakna: Record<string, VlaknoPrani>; zpravy: ZpravaPrani[] }> {
    const slot = this.read().prani?.[rez];
    return { vlakna: { ...(slot?.vlakna || {}) }, zpravy: [...(slot?.zpravy || [])] };
  }

  async pridejZpravuPrani(rez: string, zprava: ZpravaPrani, vlakno: VlaknoPrani, _ttl: PraniTtlOpts): Promise<void> {
    const data = this.read();
    const slot = data.prani?.[rez] || { vlakna: {}, zpravy: [] };
    slot.vlakna = { ...slot.vlakna, [vlakno.id]: vlakno };
    slot.zpravy = [...slot.zpravy, zprava];
    data.prani = { ...(data.prani || {}), [rez]: slot };
    this.syncOtevrenaPrani(data, rez, slot.vlakna);
    this.write(data);
  }

  async nastavVlaknoPrani(rez: string, vlakno: VlaknoPrani, _ttl: PraniTtlOpts): Promise<void> {
    const data = this.read();
    const slot = data.prani?.[rez] || { vlakna: {}, zpravy: [] };
    slot.vlakna = { ...slot.vlakna, [vlakno.id]: vlakno };
    data.prani = { ...(data.prani || {}), [rez]: slot };
    this.syncOtevrenaPrani(data, rez, slot.vlakna);
    this.write(data);
  }

  async upravZpravuPrani(
    rez: string,
    id: string,
    patch: Partial<Pick<ZpravaPrani, 'text' | 'upraveno' | 'smazano'>>,
    _ttl: PraniTtlOpts,
  ): Promise<void> {
    const data = this.read();
    const slot = data.prani?.[rez];
    if (!slot) return;
    const i = slot.zpravy.findIndex((z) => z.id === id);
    if (i < 0) return;
    slot.zpravy = slot.zpravy.map((z, idx) => (idx === i ? { ...z, ...patch } : z));
    data.prani = { ...(data.prani || {}), [rez]: slot };
    this.write(data);
  }

  async smazVlaknoPrani(rez: string, vlaknoId: string, _ttl: PraniTtlOpts): Promise<void> {
    const data = this.read();
    const slot = data.prani?.[rez];
    if (!slot) return;
    const { [vlaknoId]: _odebrano, ...zbytek } = slot.vlakna;
    slot.vlakna = zbytek;
    data.prani = { ...(data.prani || {}), [rez]: slot };
    this.syncOtevrenaPrani(data, rez, slot.vlakna);
    this.write(data);
  }

  async listOtevrenaPrani(): Promise<OtevrenaPraniPolozka[]> {
    const data = this.read();
    const out: OtevrenaPraniPolozka[] = [];
    for (const rez of data.praniOtevrena || []) {
      const slot = data.prani?.[rez];
      if (!slot) continue;
      out.push({
        rezervace: rez,
        vlakna: Object.values(slot.vlakna),
        zpravy: slot.zpravy,
      });
    }
    return out;
  }
}

/** Upstash REST (až budou KV_* v env). Stejné klíče jako lokální store. */
export class UpstashProcessStore implements ProcessStore {
  private prikazu = 0;
  /** Seznam z tohoto běhu. Druhé čtení už do Upstash nesahá. */
  private seznam: RezervaceEntry[] | null = null;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  /** Kolik příkazů tenhle běh poslal. Do logu jen číslo. */
  pocetPrikazu(): number {
    return this.prikazu;
  }

  private async cmd<T>(...args: (string | number)[]): Promise<T> {
    this.prikazu += 1;
    // Upstash REST bere jen text. Číslo (třeba COUNT 100) vrací HTTP 400 a shodí celý přehled.
    const prikaz = args.map((arg) => String(arg));
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prikaz),
    });
    const raw = await res.text();
    let json: { result?: T; error?: string } = {};
    try {
      json = JSON.parse(raw) as { result?: T; error?: string };
    } catch {
      json = {};
    }
    if (!res.ok || json.error) {
      const duvod = String(json.error || raw || '')
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
        .replace(/\s+/g, ' ')
        .slice(0, 160);
      throw new Error(`Upstash HTTP ${res.status}${duvod ? `: ${duvod}` : ''}`);
    }
    return json.result as T;
  }

  private msgKey(id: string): string {
    return `msg:${id}`;
  }

  private rezKey(id: string): string {
    return `rez:${id}`;
  }

  private async scanKeys(match: string): Promise<string[]> {
    try {
      const keys: string[] = [];
      let cursor = '0';
      do {
        const result = await this.cmd<[string, string[]]>('SCAN', cursor, 'MATCH', match, 'COUNT', '100');
        if (!result || !Array.isArray(result)) break;
        cursor = String(result[0]);
        keys.push(...(result[1] || []));
      } while (cursor !== '0');
      return keys;
    } catch (err) {
      const text = err instanceof Error ? err.message : '';
      if (text.includes('max requests limit')) throw err;
      const keys = await this.cmd<string[]>('KEYS', match).catch(() => {
        throw err;
      });
      return Array.isArray(keys) ? keys : [];
    }
  }

  private chybejiciZaznam(id: string): RezervaceEntry {
    return { id, record: prazdnaRezervace(id, new Date(0).toISOString()), chybaNahrani: true };
  }

  /** Hodnoty víc klíčů najednou. Jedna dávka má nejvýš 100 klíčů. */
  private async hodnotyKlicu(keys: string[]): Promise<(string | null)[]> {
    const DAVKA = 100;
    const out: (string | null)[] = [];
    for (let i = 0; i < keys.length; i += DAVKA) {
      const davka = keys.slice(i, i + DAVKA);
      const result = await this.cmd<(string | null)[]>('MGET', ...davka);
      const hodnoty = Array.isArray(result) ? result : [];
      for (let j = 0; j < davka.length; j += 1) out.push(hodnoty[j] ?? null);
    }
    return out;
  }

  private zaznamZHodnoty(key: string, v: string | null): RezervaceEntry | null {
    if (!v) return null;
    const id = key.startsWith('rez:') ? key.slice(4) : key;
    try {
      const record = asRezervace(id, JSON.parse(v));
      if (!record) return this.chybejiciZaznam(id);
      return { id, record };
    } catch {
      return this.chybejiciZaznam(id);
    }
  }

  async isMessageProcessed(messageId: string): Promise<boolean> {
    const v = await this.cmd<string | null>('GET', this.msgKey(messageId));
    return Boolean(v);
  }

  async getMessage(messageId: string): Promise<MessageRecord | null> {
    const v = await this.cmd<string | null>('GET', this.msgKey(messageId));
    if (!v) return null;
    return JSON.parse(v) as MessageRecord;
  }

  async markMessage(record: MessageRecord): Promise<void> {
    await this.cmd('SET', this.msgKey(record.messageId), JSON.stringify(record), 'EX', MESSAGE_TTL_SEC);
  }

  async getRezervace(id: string): Promise<RezervaceRecord | null> {
    const v = await this.cmd<string | null>('GET', this.rezKey(id));
    if (!v) return null;
    return asRezervace(id, JSON.parse(v));
  }

  async setRezervace(id: string, record: RezervaceRecord): Promise<void> {
    const telo = JSON.stringify(record);
    const klic = this.rezKey(id);
    if (record.zavadyPredani || record.zavadyPoOdjezdu) {
      await this.cmd('SET', klic, telo);
    } else {
      const limit = record.odjezd ? smazatPoOdjezdu(record.odjezd) : null;
      const ttlSec = !record.odjezd
        ? MESSAGE_TTL_SEC
        : limit && limit.getTime() > Date.now()
          ? Math.max(60, Math.ceil((limit.getTime() - Date.now()) / 1000))
          : 60;
      await this.cmd('SET', klic, telo, 'EX', ttlSec);
    }
    if (!this.seznam) return;
    const zaznam = { id, record };
    const i = this.seznam.findIndex((e) => e.id === id);
    if (i >= 0) this.seznam[i] = zaznam;
    else this.seznam.push(zaznam);
  }

  async listRezervace(): Promise<RezervaceEntry[]> {
    if (this.seznam) return this.seznam;
    const keys = await this.scanKeys('rez:*');
    const hodnoty = await this.hodnotyKlicu(keys);
    const out: RezervaceEntry[] = [];
    for (let i = 0; i < keys.length; i += 1) {
      const zaznam = this.zaznamZHodnoty(keys[i], hodnoty[i] ?? null);
      if (zaznam) out.push(zaznam);
    }
    this.seznam = out;
    return out;
  }

  async listMessages(): Promise<MessageEntry[]> {
    const keys = await this.scanKeys('msg:*');
    const hodnoty = await this.hodnotyKlicu(keys);
    const out: MessageEntry[] = [];
    for (let i = 0; i < keys.length; i += 1) {
      const v = hodnoty[i];
      if (!v) continue;
      try {
        out.push({ id: keys[i].slice(4), record: JSON.parse(v) as MessageRecord });
      } catch {
        continue;
      }
    }
    return out;
  }

  /**
   * Jednorázově prodlouží EX u karet, které ještě mají být. Nic nemaže a záznam nepřepisuje.
   * Klíč, jehož nová doba už minula, nechá být.
   */
  async prodluzUchovani(now = new Date()): Promise<number> {
    const keys = await this.scanKeys('rez:*');
    const hodnoty = await this.hodnotyKlicu(keys);
    let n = 0;
    for (let i = 0; i < keys.length; i += 1) {
      const raw = hodnoty[i];
      if (!raw) continue;
      let odjezd = '';
      let maZavady = false;
      try {
        const data = JSON.parse(raw) as {
          odjezd?: unknown;
          zavadyPredani?: unknown;
          zavadyPoOdjezdu?: unknown;
        };
        odjezd = typeof data.odjezd === 'string' ? data.odjezd : '';
        maZavady = Boolean(data.zavadyPredani || data.zavadyPoOdjezdu);
      } catch {
        continue;
      }
      if (maZavady) {
        await this.cmd('PERSIST', keys[i]);
        n += 1;
        continue;
      }
      if (!odjezd) continue;
      const limit = smazatPoOdjezdu(odjezd);
      if (!limit || limit.getTime() <= now.getTime()) continue;
      const sec = Math.floor((limit.getTime() - now.getTime()) / 1000);
      if (sec < 60) continue;
      await this.cmd('EXPIRE', keys[i], sec);
      n += 1;
    }
    return n;
  }

  async purgeExpired(): Promise<number> {
    return 0;
  }

  async listPush(): Promise<PushZarizeni[]> {
    const v = await this.cmd<string | null>('GET', 'push:zarizeni');
    if (!v) return [];
    return nactiPush(JSON.parse(v));
  }

  async savePush(list: PushZarizeni[]): Promise<void> {
    await this.cmd('SET', 'push:zarizeni', JSON.stringify(list));
  }

  async listUpozorneni(): Promise<UpozorneniZaznam[]> {
    const v = await this.cmd<string | null>('GET', 'upozorneni:seznam');
    if (!v) return [];
    try {
      return nactiUpozorneniSeznam(JSON.parse(v));
    } catch {
      return [];
    }
  }

  async pridejUpozorneni(zaznam: UpozorneniZaznam): Promise<void> {
    const list = await this.listUpozorneni();
    await this.cmd('SET', 'upozorneni:seznam', JSON.stringify(nactiUpozorneniSeznam([zaznam, ...list])));
  }

  async getSelhani(): Promise<number> {
    const v = await this.cmd<string | null>('GET', 'meta:selhani');
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  async setSelhani(pocet: number): Promise<void> {
    await this.cmd('SET', 'meta:selhani', String(pocet));
  }

  async getBeh(): Promise<BehZpracovani | null> {
    const v = await this.cmd<string | null>('GET', 'meta:beh');
    if (!v) return null;
    try {
      return nactiBeh(JSON.parse(v));
    } catch {
      return null;
    }
  }

  async setBeh(beh: BehZpracovani): Promise<void> {
    const cisty = nactiBeh(beh);
    if (!cisty) return;
    await this.cmd('SET', 'meta:beh', JSON.stringify(cisty));
  }

  async getBrana(): Promise<unknown> {
    const v = await this.cmd<string | null>('GET', 'meta:brana');
    if (!v) return null;
    try {
      return JSON.parse(v) as unknown;
    } catch {
      return null;
    }
  }

  async setBrana(sloty: unknown): Promise<void> {
    await this.cmd('SET', 'meta:brana', JSON.stringify(sloty));
  }

  async getOdjezdBeh(): Promise<OdjezdBeh | null> {
    const v = await this.cmd<string | null>('GET', 'meta:odjezd');
    if (!v) return null;
    try {
      const beh = JSON.parse(v) as OdjezdBeh;
      const den = (x: unknown) => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null);
      const uklid =
        typeof beh.uklid === 'string' && /^\d{4}-\d{2}-\d{2}:(?:V[1-5](?:,V[1-5])*)?$/.test(beh.uklid) ? beh.uklid : null;
      return {
        vecer: den(beh.vecer),
        pripominka: den(beh.pripominka),
        rano: den(beh.rano),
        uklid,
        pondeli: den(beh.pondeli),
        pohoda: den(beh.pohoda),
      };
    } catch {
      return null;
    }
  }

  async setOdjezdBeh(beh: OdjezdBeh): Promise<void> {
    await this.cmd('SET', 'meta:odjezd', JSON.stringify(beh));
  }

  async getObjednatPokusy(): Promise<Record<string, ObjednatPokus>> {
    const v = await this.cmd<string | null>('GET', 'meta:objednat');
    if (!v) return {};
    try {
      return nactiObjednatPokusy(JSON.parse(v));
    } catch {
      return {};
    }
  }

  async setObjednatPokusy(pokusy: Record<string, ObjednatPokus>): Promise<void> {
    await this.cmd('SET', 'meta:objednat', JSON.stringify(nactiObjednatPokusy(pokusy)));
  }

  async getSchrankaStav(): Promise<SchrankaStav | null> {
    const v = await this.cmd<string | null>('GET', 'schranka:stav');
    if (!v) return null;
    try {
      return nactiSchrankaStav(JSON.parse(v));
    } catch {
      return null;
    }
  }

  async setSchrankaStav(stav: SchrankaStav): Promise<void> {
    const cisty = nactiSchrankaStav(stav);
    if (!cisty) return;
    await this.cmd('SET', 'schranka:stav', JSON.stringify(cisty));
  }

  private praniVlaknaKey(rez: string): string {
    return `prani:${rez}:vlakna`;
  }

  private praniZpravyKey(rez: string): string {
    return `prani:${rez}:zpravy`;
  }

  private async nastavTtlPrani(rez: string, ttl: PraniTtlOpts): Promise<void> {
    const sec = ttlPraniSec(ttl);
    const klice = [this.praniVlaknaKey(rez), this.praniZpravyKey(rez)];
    if (sec === 'persist') {
      for (const k of klice) await this.cmd('PERSIST', k);
      return;
    }
    if (sec == null) return;
    for (const k of klice) await this.cmd('EXPIRE', k, sec);
  }

  private async syncOtevrenaPraniUpstash(rez: string, vlakna: Record<string, VlaknoPrani>): Promise<void> {
    if (maOtevrenaVlakna(Object.values(vlakna))) await this.cmd('SADD', 'prani:otevrena', rez);
    else await this.cmd('SREM', 'prani:otevrena', rez);
  }

  async listPrani(rez: string): Promise<{ vlakna: Record<string, VlaknoPrani>; zpravy: ZpravaPrani[] }> {
    const rawHash = await this.cmd<Record<string, string> | null>('HGETALL', this.praniVlaknaKey(rez));
    const vlakna: Record<string, VlaknoPrani> = {};
    if (rawHash && typeof rawHash === 'object' && !Array.isArray(rawHash)) {
      for (const [k, v] of Object.entries(rawHash)) {
        try {
          const vl = nactiVlaknoPrani(JSON.parse(v));
          if (vl) vlakna[k] = vl;
        } catch {
          /* přeskočit */
        }
      }
    } else if (Array.isArray(rawHash)) {
      /** Upstash někdy vrací flat pole [field, value, …]. */
      for (let i = 0; i + 1 < rawHash.length; i += 2) {
        const k = String(rawHash[i]);
        const v = String(rawHash[i + 1]);
        try {
          const vl = nactiVlaknoPrani(JSON.parse(v));
          if (vl) vlakna[k] = vl;
        } catch {
          /* přeskočit */
        }
      }
    }
    const rawList = await this.cmd<string[] | null>('LRANGE', this.praniZpravyKey(rez), 0, -1);
    const zpravy: ZpravaPrani[] = [];
    for (const row of rawList || []) {
      try {
        const z = nactiZpravuPrani(JSON.parse(row));
        if (z) zpravy.push(z);
      } catch {
        /* přeskočit */
      }
    }
    return { vlakna, zpravy };
  }

  async pridejZpravuPrani(rez: string, zprava: ZpravaPrani, vlakno: VlaknoPrani, ttl: PraniTtlOpts): Promise<void> {
    await this.cmd('RPUSH', this.praniZpravyKey(rez), JSON.stringify(zprava));
    await this.cmd('HSET', this.praniVlaknaKey(rez), vlakno.id, JSON.stringify(vlakno));
    const { vlakna } = await this.listPrani(rez);
    await this.syncOtevrenaPraniUpstash(rez, vlakna);
    await this.nastavTtlPrani(rez, ttl);
  }

  async nastavVlaknoPrani(rez: string, vlakno: VlaknoPrani, ttl: PraniTtlOpts): Promise<void> {
    await this.cmd('HSET', this.praniVlaknaKey(rez), vlakno.id, JSON.stringify(vlakno));
    const { vlakna } = await this.listPrani(rez);
    await this.syncOtevrenaPraniUpstash(rez, vlakna);
    await this.nastavTtlPrani(rez, ttl);
  }

  async upravZpravuPrani(
    rez: string,
    id: string,
    patch: Partial<Pick<ZpravaPrani, 'text' | 'upraveno' | 'smazano'>>,
    ttl: PraniTtlOpts,
  ): Promise<void> {
    const rawList = await this.cmd<string[] | null>('LRANGE', this.praniZpravyKey(rez), 0, -1);
    const list = rawList || [];
    for (let i = 0; i < list.length; i += 1) {
      try {
        const z = nactiZpravuPrani(JSON.parse(list[i]));
        if (!z || z.id !== id) continue;
        await this.cmd('LSET', this.praniZpravyKey(rez), i, JSON.stringify({ ...z, ...patch }));
        await this.nastavTtlPrani(rez, ttl);
        return;
      } catch {
        continue;
      }
    }
  }

  async smazVlaknoPrani(rez: string, vlaknoId: string, ttl: PraniTtlOpts): Promise<void> {
    await this.cmd('HDEL', this.praniVlaknaKey(rez), vlaknoId);
    const { vlakna } = await this.listPrani(rez);
    await this.syncOtevrenaPraniUpstash(rez, vlakna);
    await this.nastavTtlPrani(rez, ttl);
  }

  async listOtevrenaPrani(): Promise<OtevrenaPraniPolozka[]> {
    const ids = (await this.cmd<string[] | null>('SMEMBERS', 'prani:otevrena')) || [];
    const out: OtevrenaPraniPolozka[] = [];
    for (const rezervace of ids) {
      const { vlakna, zpravy } = await this.listPrani(rezervace);
      out.push({ rezervace, vlakna: Object.values(vlakna), zpravy });
    }
    return out;
  }
}

/** null, když to není Upstash. Do logu patří jen číslo. */
export function pocetPrikazu(store: ProcessStore): number | null {
  return store instanceof UpstashProcessStore ? store.pocetPrikazu() : null;
}

const MIGRACE_UCHOVANI = 'migrace-uchovani-24';
const MIGRACE_PLATBY = 'migrace-platby-polozky';

/**
 * Jednou po nasazení prodlouží dobu karet v Upstash. Souborové úložiště vrací null.
 * Když to spadne dřív, než se zapíše značka, příští běh to zkusí znovu.
 */
export async function prodluzKartyJednou(store: ProcessStore, now = new Date()): Promise<number | null> {
  if (!(store instanceof UpstashProcessStore)) return null;
  if (await store.isMessageProcessed(MIGRACE_UCHOVANI)) return null;
  const n = await store.prodluzUchovani(now);
  await store.markMessage({
    messageId: MIGRACE_UCHOVANI,
    processedAt: now.toISOString(),
    status: 'skipped_no_data',
    reason: `prodlouzeno:${n}`,
  });
  return n;
}

/** Jednou zapíše staré zaplaceno jako položky, které na kartě v tu chvíli jsou. */
export async function prevedPlatbyJednou(store: ProcessStore, now = new Date()): Promise<number | null> {
  if (!(store instanceof UpstashProcessStore)) return null;
  if (await store.isMessageProcessed(MIGRACE_PLATBY)) return null;
  const seznam = await store.listRezervace();
  let n = 0;
  for (const e of seznam) {
    if (e.chybaNahrani || !e.record) continue;
    const dalsi = prevedZaplaceno(e.record);
    if (!dalsi) continue;
    await store.setRezervace(e.id, dalsi);
    n += 1;
  }
  await store.markMessage({
    messageId: MIGRACE_PLATBY,
    processedAt: now.toISOString(),
    status: 'skipped_no_data',
    reason: `prevedeno:${n}`,
  });
  return n;
}

export function createProcessStore(): ProcessStore {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (url && token) {
    return new UpstashProcessStore(url, token);
  }
  return new FileProcessStore();
}
