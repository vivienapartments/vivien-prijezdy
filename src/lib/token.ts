import { createHmac, timingSafeEqual } from 'crypto';
import { APT_IDS, GUIDE_LANGS, type AptId, type GuideLang, type TokenPayload } from './types';

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

export function createToken(payload: TokenPayload, secret = getSecret()): string {
  const json = JSON.stringify({
    r: String(payload.r),
    a: payload.a,
    d: payload.d,
    l: payload.l,
  });
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
  // Po dni odjezdu po 12:00 Europe/Prague
  const parts = departureYmd.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return true;
  const [y, m, d] = parts;
  // Najdi UTC okamžik, kdy je v Praze 12:00 v den odjezdu
  const noonPrague = pragueLocalToUtc(y, m, d, 12, 0, 0);
  return now.getTime() > noonPrague.getTime();
}

/** Převod lokálního času Europe/Prague na UTC Date (bez externí lib). */
export function pragueLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date {
  // Hrubý odhad: zkus CET (UTC+1) a CEST (UTC+2), vyber ten, který po formátování sedí.
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
  // Fallback CET
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

  if (isExpired(d, now)) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, payload: { r, a, d, l } };
}

export function mapWebLocaleToGuideLang(locale: string): GuideLang {
  if (locale === 'zh') return 'zh-Hant';
  if (GUIDE_LANGS.includes(locale as GuideLang)) return locale as GuideLang;
  return 'en';
}
