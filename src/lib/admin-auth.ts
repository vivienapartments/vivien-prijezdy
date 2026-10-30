import { createHmac, timingSafeEqual } from 'crypto';

export const PREHLED_COOKIE = 'vivien_prehled';
export const UKLID_COOKIE = 'vivien_uklid';
export const PREHLED_MAX_AGE_SEC = 60 * 60 * 24 * 30;
export const UKLID_MAX_AGE_SEC = PREHLED_MAX_AGE_SEC;

export type SessionRole = 'majitel' | 'uklid';

const OKNO_MS = 15 * 60 * 1000;
const MAX_POKUSU = 5;

const pokusy = new Map<string, number[]>();

function secret(): string {
  const token = process.env.PRUVODCE_TOKEN_SECRET?.trim() || '';
  if (token.length >= 32) return token;
  return process.env.ADMIN_HESLO?.trim() || '';
}

function safeEq(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

export function hesloSedí(zadane: string): boolean {
  const expected = process.env.ADMIN_HESLO?.trim() || '';
  if (!expected || !zadane) return false;
  return safeEq(zadane, expected);
}

export function uklidHesloSedi(zadane: string): boolean {
  const expected = process.env.UKLID_HESLO?.trim() || '';
  if (!expected || !zadane) return false;
  return safeEq(zadane, expected);
}

/** Cookie = `role.exp.sig`. Podepisuje se `role:exp`. */
export function signSession(role: SessionRole, now = Date.now()): string {
  const key = secret();
  if (!key) throw new Error('Chybí tajemství pro přihlášení');
  const exp = String(now + PREHLED_MAX_AGE_SEC * 1000);
  const sig = createHmac('sha256', key).update(`${role}:${exp}`).digest('base64url');
  return `${role}.${exp}.${sig}`;
}

/**
 * Ověří cookie pro danou roli.
 * Starý formát `exp.sig` (bez role) platí jen jako majitel.
 */
export function verifySession(
  value: string | undefined | null,
  role: SessionRole,
  now = Date.now(),
): boolean {
  if (!value) return false;
  const key = secret();
  if (!key) return false;

  const casti = value.split('.');
  if (casti.length === 3) {
    const [cookieRole, exp, sig] = casti;
    if (cookieRole !== role) return false;
    if (cookieRole !== 'majitel' && cookieRole !== 'uklid') return false;
    const expMs = Number(exp);
    if (!Number.isFinite(expMs) || expMs < now) return false;
    const expected = createHmac('sha256', key).update(`${cookieRole}:${exp}`).digest('base64url');
    return safeEq(sig, expected);
  }

  if (casti.length === 2) {
    if (role !== 'majitel') return false;
    const [exp, sig] = casti;
    const expMs = Number(exp);
    if (!Number.isFinite(expMs) || expMs < now) return false;
    const expected = createHmac('sha256', key).update(exp).digest('base64url');
    return safeEq(sig, expected);
  }

  return false;
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
