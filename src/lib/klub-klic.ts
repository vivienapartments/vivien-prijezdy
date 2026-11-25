/**
 * Klíče VIVIEN Klubu (karta klienta, pravidla).
 * Na Preview (VERCEL_ENV=preview) předpona `test:`.
 */

const KLUB_PREFIXY = [
  'klient:',
  'klient-klic:',
  'klient-index:',
  'klient-kod:',
  'klient-seznam',
  'klub:',
] as const;

export function jeZkouskaKlubu(): boolean {
  return process.env.VERCEL_ENV === 'preview';
}

/** Klíč s `test:` na Preview. */
export function klubKlic(raw: string): string {
  const k = raw.trim();
  if (!k) return k;
  if (!jeZkouskaKlubu()) return k;
  if (k.startsWith('test:')) return k;
  const jeNase = KLUB_PREFIXY.some((p) => k === p || k.startsWith(p));
  return jeNase ? `test:${k}` : k;
}

export function klubZapnut(): boolean {
  return String(process.env.KLUB_ZAPNUTO || '0').trim() === '1';
}
