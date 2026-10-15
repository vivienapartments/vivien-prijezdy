import fs from 'fs';
import path from 'path';
import type { Duvod } from './chyby';
import type { PoplatekStav } from './poplatek';
import type { VyjezdPolozka } from './priplatek-prijezd';
import type { AptId, GuideLang } from './types';

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

/** Jednou za den. vecer = 18:00, pripominka = 20:00, rano = 8:00. Hodnota je den v Praze. */
export type OdjezdBeh = { vecer: string | null; pripominka: string | null; rano: string | null };

export type RezervaceStav =
  | 'odeslano'
  | 'odeslano_s_vyhradou'
  | 'neodeslano'
  | 'vraceno'
  | 'bez_checkinu'
  | 'zruseno';

export type HistorieAkce = { cas: string; co: string };

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
  /** Den a čas odjezdu, na který už odešlo upozornění půl hodiny předem. */
  odjezdPushPul: string | null;
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
  /** Čas, kdy byl vybraný městský poplatek. */
  zaplaceno: string | null;
  /** Kdo městský poplatek vybral. */
  poplatekVybral: 'ja' | 'nikol' | null;
  /** Den odjezdu, kdy už odešlo ranní upozornění, že něco není zaplacené. */
  platbaUpozorneno: string | null;
  /** Další výjezdy, každý 300 Kč, dokud není vybraný. Maže se se záznamem. */
  vyjezdy: VyjezdPolozka[];
  /** Souhlas hosta s pravidly příjezdu. Verze drží znění, které viděl. */
  souhlasPravidel: { kdy: string; jazyk: string; verze: string } | null;
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
  | 'accessPin';

export type OdkudNavrh = 'check-in' | 'rezervace' | 'host' | 'potvrzeni';

export type NavrhPole = { pole: RucniPole; od: OdkudNavrh; hodnota: string };

export type RucniZnacka = { pole: RucniPole; cas: string };

export type PushZarizeni = {
  endpoint: string;
  p256dh: string;
  auth: string;
  nazev: string;
  cas: string;
};

export type RezervaceEntry = { id: string; record: RezervaceRecord };
export type MessageEntry = { id: string; record: MessageRecord };

type StoreData = {
  messages: Record<string, MessageRecord>;
  rezervace: Record<string, RezervaceRecord>;
  push?: PushZarizeni[];
  zpracujSelhani?: number;
  zpracujBeh?: BehZpracovani | null;
  odjezdBeh?: OdjezdBeh | null;
  brana?: unknown;
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
]);

const ODKUD = new Set<OdkudNavrh>(['check-in', 'rezervace', 'host', 'potvrzeni']);

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
  getSelhani(): Promise<number>;
  setSelhani(pocet: number): Promise<void>;
  getBeh(): Promise<BehZpracovani | null>;
  setBeh(beh: BehZpracovani): Promise<void>;
  getBrana(): Promise<unknown>;
  setBrana(sloty: unknown): Promise<void>;
  getOdjezdBeh(): Promise<OdjezdBeh | null>;
  setOdjezdBeh(beh: OdjezdBeh): Promise<void>;
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
  return { messages: {}, rezervace: {}, push: [], zpracujSelhani: 0, zpracujBeh: null, brana: null };
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
  return raw.filter(
    (z): z is PushZarizeni =>
      Boolean(z) &&
      typeof z === 'object' &&
      typeof (z as PushZarizeni).endpoint === 'string' &&
      typeof (z as PushZarizeni).p256dh === 'string' &&
      typeof (z as PushZarizeni).auth === 'string',
  );
}

/** Smazat v poledne UTC třetí den po dni odjezdu. */
export function smazatPoOdjezdu(odjezdYmd: string): Date | null {
  const [y, m, d] = odjezdYmd.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d + 3, 12, 0, 0));
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
    odjezdPushPul: typeof r.odjezdPushPul === 'string' && r.odjezdPushPul ? r.odjezdPushPul : null,
    casZadalHost: r.casZadalHost === true,
    zpusobPrijezdu: r.zpusobPrijezdu === 'auto' || r.zpusobPrijezdu === 'pesky' ? r.zpusobPrijezdu : null,
    telefonBrana: typeof r.telefonBrana === 'string' && r.telefonBrana ? r.telefonBrana : null,
    spz: typeof r.spz === 'string' && r.spz ? r.spz : null,
    spzPujcene: r.spzPujcene === true,
    branaRegistrovano: typeof r.branaRegistrovano === 'string' && r.branaRegistrovano ? r.branaRegistrovano : null,
    branaPushRegistrace: typeof r.branaPushRegistrace === 'string' && r.branaPushRegistrace ? r.branaPushRegistrace : null,
    branaPushRano: typeof r.branaPushRano === 'string' && r.branaPushRano ? r.branaPushRano : null,
    prijezdPushCas: typeof r.prijezdPushCas === 'string' && r.prijezdPushCas ? r.prijezdPushCas : null,
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
    poplatekVybral: r.poplatekVybral === 'ja' || r.poplatekVybral === 'nikol' ? r.poplatekVybral : null,
    platbaUpozorneno: typeof r.platbaUpozorneno === 'string' && r.platbaUpozorneno ? r.platbaUpozorneno : null,
    vyjezdy: nactiVyjezdy(r.vyjezdy),
    souhlasPravidel: nactiSouhlas(r.souhlasPravidel),
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
    poplatekVybral: null,
    platbaUpozorneno: null,
    vyjezdy: [],
    souhlasPravidel: null,
    casZadalHost: false,
    zpusobPrijezdu: null,
    telefonBrana: null,
    spz: null,
    spzPujcene: false,
    branaRegistrovano: null,
    branaPushRegistrace: null,
    branaPushRano: null,
    prijezdPushCas: null,
    prijezdPushNeznamy: null,
    casOdjezdu: null,
    casOdjezduZadalHost: false,
    odjezdDotaz: null,
    odjezdPushPul: null,
    pruvodceOdemcen: null,
    hostUlozeni: [],
    rucniZnacky: [],
    navrhy: [],
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
        zpracujSelhani: typeof parsed.zpracujSelhani === 'number' ? parsed.zpracujSelhani : 0,
        zpracujBeh: nactiBeh(parsed.zpracujBeh),
        brana: parsed.brana ?? null,
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
}

/** Upstash REST (až budou KV_* v env). Stejné klíče jako lokální store. */
export class UpstashProcessStore implements ProcessStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async cmd<T>(...args: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      throw new Error(`Upstash HTTP ${res.status}`);
    }
    const json = (await res.json()) as { result: T };
    return json.result;
  }

  private msgKey(id: string): string {
    return `msg:${id}`;
  }

  private rezKey(id: string): string {
    return `rez:${id}`;
  }

  private async scanKeys(match: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const result = await this.cmd<[string, string[]]>('SCAN', cursor, 'MATCH', match, 'COUNT', 100);
      cursor = String(result[0]);
      keys.push(...(result[1] || []));
    } while (cursor !== '0');
    return keys;
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
    const limit = record.odjezd ? smazatPoOdjezdu(record.odjezd) : null;
    const ttlSec = !record.odjezd
      ? MESSAGE_TTL_SEC
      : limit && limit.getTime() > Date.now()
        ? Math.max(60, Math.ceil((limit.getTime() - Date.now()) / 1000))
        : 60;
    await this.cmd('SET', this.rezKey(id), JSON.stringify(record), 'EX', ttlSec);
  }

  async listRezervace(): Promise<RezervaceEntry[]> {
    const keys = await this.scanKeys('rez:*');
    const out: RezervaceEntry[] = [];
    for (const key of keys) {
      const v = await this.cmd<string | null>('GET', key);
      if (!v) continue;
      const id = key.slice(4);
      const record = asRezervace(id, JSON.parse(v));
      if (record) out.push({ id, record });
    }
    return out;
  }

  async listMessages(): Promise<MessageEntry[]> {
    const keys = await this.scanKeys('msg:*');
    const out: MessageEntry[] = [];
    for (const key of keys) {
      const v = await this.cmd<string | null>('GET', key);
      if (!v) continue;
      out.push({ id: key.slice(4), record: JSON.parse(v) as MessageRecord });
    }
    return out;
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
      return { vecer: den(beh.vecer), pripominka: den(beh.pripominka), rano: den(beh.rano) };
    } catch {
      return null;
    }
  }

  async setOdjezdBeh(beh: OdjezdBeh): Promise<void> {
    await this.cmd('SET', 'meta:odjezd', JSON.stringify(beh));
  }
}

export function createProcessStore(): ProcessStore {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (url && token) {
    return new UpstashProcessStore(url, token);
  }
  return new FileProcessStore();
}
