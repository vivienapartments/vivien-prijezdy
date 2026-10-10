import fs from 'fs';
import path from 'path';
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

export type RezervaceRecord = {
  status: 'odeslano' | 'zruseno';
  odjezd: string;
  emailHosta: string;
  processedAt: string;
  messageId: string;
  /** YYYY-MM-DD – od novějších záznamů */
  prijezd?: string;
  apartman?: AptId;
  /** Jméno hosta (GUEST_NAME / zkrácené OSLOVENI) */
  jmeno?: string;
  jazyk?: GuideLang;
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

function emptyData(): StoreData {
  return { messages: {}, rezervace: {} };
}

function dayAfterOdjezd(odjezdYmd: string): Date | null {
  const [y, m, d] = odjezdYmd.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
}

/** Lokální soubor .data/store.json (výchozí). */
export class FileProcessStore implements ProcessStore {
  private readonly filePath: string;

  constructor(filePath = path.join(process.cwd(), '.data', 'store.json')) {
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
    return this.read().rezervace[id] ?? null;
  }

  async setRezervace(id: string, record: RezervaceRecord): Promise<void> {
    const data = this.read();
    data.rezervace[id] = record;
    this.write(data);
  }

  async listRezervace(): Promise<RezervaceEntry[]> {
    return Object.entries(this.read().rezervace).map(([id, record]) => ({ id, record }));
  }

  async listMessages(): Promise<MessageEntry[]> {
    return Object.entries(this.read().messages).map(([id, record]) => ({ id, record }));
  }

  async purgeExpired(now = new Date()): Promise<number> {
    const data = this.read();
    let removed = 0;
    for (const [id, rec] of Object.entries(data.rezervace)) {
      const limit = dayAfterOdjezd(rec.odjezd);
      if (limit && now.getTime() > limit.getTime()) {
        delete data.rezervace[id];
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
      const result = await this.cmd<[string, string[]]>(
        'SCAN',
        cursor,
        'MATCH',
        match,
        'COUNT',
        100,
      );
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
    await this.cmd('SET', this.msgKey(record.messageId), JSON.stringify(record));
  }

  async getRezervace(id: string): Promise<RezervaceRecord | null> {
    const v = await this.cmd<string | null>('GET', this.rezKey(id));
    if (!v) return null;
    return JSON.parse(v) as RezervaceRecord;
  }

  async setRezervace(id: string, record: RezervaceRecord): Promise<void> {
    const limit = dayAfterOdjezd(record.odjezd);
    const ttlSec =
      limit && limit.getTime() > Date.now()
        ? Math.ceil((limit.getTime() - Date.now()) / 1000)
        : 60 * 60 * 24 * 7;
    await this.cmd('SET', this.rezKey(id), JSON.stringify(record), 'EX', ttlSec);
  }

  async listRezervace(): Promise<RezervaceEntry[]> {
    const keys = await this.scanKeys('rez:*');
    const out: RezervaceEntry[] = [];
    for (const key of keys) {
      const v = await this.cmd<string | null>('GET', key);
      if (!v) continue;
      out.push({ id: key.slice(4), record: JSON.parse(v) as RezervaceRecord });
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
