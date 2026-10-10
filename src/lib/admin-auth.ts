import { createHmac, timingSafeEqual } from 'crypto';

export const PREHLED_COOKIE = 'vivien_prehled';
export const PREHLED_MAX_AGE_SEC = 60 * 60 * 24 * 30;

const OKNO_MS = 15 * 60 * 1000;
const MAX_POKUSU = 5;

const pokusy = new Map<string, number[]>();

function secret(): string {
  const token = process.env.PRUVODCE_TOKEN_SECRET?.trim() || '';
  if (token.length >= 32) return token;
  return process.env.ADMIN_HESLO?.trim() || '';
}

export function hesloSedí(zadane: string): boolean {
  const expected = process.env.ADMIN_HESLO?.trim() || '';
  if (!expected || !zadane) return false;
  const a = Buffer.from(zadane);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function signSession(now = Date.now()): string {
  const key = secret();
  if (!key) throw new Error('Chybí tajemství pro přihlášení');
  const exp = String(now + PREHLED_MAX_AGE_SEC * 1000);
  const sig = createHmac('sha256', key).update(exp).digest('base64url');
  return `${exp}.${sig}`;
}

export function verifySession(value: string | undefined | null, now = Date.now()): boolean {
  if (!value) return false;
  const key = secret();
  if (!key) return false;
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return false;
  const exp = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expMs = Number(exp);
  if (!Number.isFinite(expMs) || expMs < now) return false;
  const expected = createHmac('sha256', key).update(exp).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function loginPovolen(ip: string, now = Date.now()): boolean {
  const list = (pokusy.get(ip) || []).filter((t) => now - t < OKNO_MS);
  pokusy.set(ip, list);
  return list.length < MAX_POKUSU;
}

export function zapisNeuspesnyLogin(ip: string, now = Date.now()): void {
  const list = (pokusy.get(ip) || []).filter((t) => now - t < OKNO_MS);
  list.push(now);
  pokusy.set(ip, list);
}

export function resetLoginPokusy(): void {
  pokusy.clear();
}
