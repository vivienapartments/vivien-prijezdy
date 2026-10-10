import fs from 'fs';
import path from 'path';
import type { Duvod } from './chyby';
import type { PoplatekStav } from './poplatek';
import type { AptId, GuideLang } from './types';

export type MessageStatus = 'sent' | 'skipped_no_data' | 'rejected' | 'duplicate' | 'error';

export type MessageRecord = {
  messageId: string;
  uid?: number;
  processedAt: string;
  rezervace?: string;
  status: MessageStatus;
  reason?: string;
};

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
};

export type RezervaceEntry = { id: string; record: RezervaceRecord };
export type MessageEntry = { id: string; record: MessageRecord };

type StoreData = {
  messages: Record<string, MessageRecord>;
  rezervace: Record<string, RezervaceRecord>;
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
  return { messages: {}, rezervace: {} };
}

/** Smazat v poledne UTC třetí den po dni odjezdu. */
export function smazatPoOdjezdu(odjezdYmd: string): Date | null {
  const [y, m, d] = odjezdYmd.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d + 3, 12, 0, 0));
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
}

export function createProcessStore(): ProcessStore {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (url && token) {
    return new UpstashProcessStore(url, token);
  }
  return new FileProcessStore();
}
