import { createHmac, timingSafeEqual } from 'crypto';
import { nightsBetween } from './dates';
import { APT_IDS, GUIDE_LANGS, type AptId, type GuideLang, type StayFacts, type TokenPayload } from './types';

function b64urlEncode(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf;
  return b.toString('base64url');
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, 'base64url');
}

function getSecret(): string {
  const secret = process.env.PRUVODCE_TOKEN_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error('PRUVODCE_TOKEN_SECRET missing or too short');
  }
  return secret;
}

function signPayload(payloadJson: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadJson).digest('base64url');
}

function normalizePayload(payload: TokenPayload): Record<string, string | number> {
  const out: Record<string, string | number> = {
    r: String(payload.r),
    a: payload.a,
    d: payload.d,
    l: payload.l,
  };
  if (payload.p && /^\d{4}-\d{2}-\d{2}$/.test(payload.p)) {
    out.p = payload.p;
  }
  if (typeof payload.o === 'number' && Number.isFinite(payload.o) && payload.o > 0) {
    out.o = Math.floor(payload.o);
  }
  return out;
}

export function createToken(payload: TokenPayload, secret = getSecret()): string {
  const json = JSON.stringify(normalizePayload(payload));
  return `${b64urlEncode(json)}.${signPayload(json, secret)}`;
}

export type TokenResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: 'invalid' | 'expired' };

function parseLang(raw: unknown): GuideLang | null {
  const v = String(raw ?? '') as GuideLang;
  return GUIDE_LANGS.includes(v) ? v : null;
}

function parseApt(raw: unknown): AptId | null {
  const v = String(raw ?? '').toUpperCase() as AptId;
  return APT_IDS.includes(v) ? v : null;
}

function isExpired(departureYmd: string, now = new Date()): boolean {
  const parts = departureYmd.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return true;
  const [y, m, d] = parts;
  const noonPrague = pragueLocalToUtc(y, m, d, 12, 0, 0);
  return now.getTime() > noonPrague.getTime();
}

export function pragueLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date {
  for (const offsetHours of [2, 1]) {
    const utcMs = Date.UTC(year, month - 1, day, hour - offsetHours, minute, second);
    const dt = new Date(utcMs);
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Prague',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(dt).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
    );
    if (
      Number(parts.year) === year &&
      Number(parts.month) === month &&
      Number(parts.day) === day &&
      Number(parts.hour) === hour &&
      Number(parts.minute) === minute &&
      Number(parts.second) === second
    ) {
      return dt;
    }
  }
  return new Date(Date.UTC(year, month - 1, day, hour - 1, minute, second));
}

export function verifyToken(token: string, secret = getSecret(), now = new Date()): TokenResult {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'invalid' };
  const [bodyB64, sig] = parts;
  let json: string;
  try {
    json = b64urlDecode(bodyB64).toString('utf8');
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  const expected = signPayload(json, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: 'invalid' };
    }
  } catch {
    return { ok: false, reason: 'invalid' };
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return { ok: false, reason: 'invalid' };
  }

  const r = String(raw.r ?? '').trim();
  const a = parseApt(raw.a);
  const d = String(raw.d ?? '').trim();
  const l = parseLang(raw.l);
  if (!r || !a || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !l) {
    return { ok: false, reason: 'invalid' };
  }

  const payload: TokenPayload = { r, a, d, l };

  const p = String(raw.p ?? '').trim();
  if (p) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p)) return { ok: false, reason: 'invalid' };
    payload.p = p;
  }

  if (raw.o !== undefined && raw.o !== null && raw.o !== '') {
    const o = Number(raw.o);
    if (!Number.isFinite(o) || o < 1) return { ok: false, reason: 'invalid' };
    payload.o = Math.floor(o);
  }

  if (isExpired(d, now)) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, payload };
}

export function stayFromPayload(payload: TokenPayload): StayFacts {
  const noci = payload.p ? nightsBetween(payload.p, payload.d) : null;
  const osob = typeof payload.o === 'number' ? payload.o : null;
  return { noci, osob };
}

export function mapWebLocaleToGuideLang(locale: string): GuideLang {
  if (locale === 'zh') return 'zh-Hant';
  if (GUIDE_LANGS.includes(locale as GuideLang)) return locale as GuideLang;
  return 'en';
}
