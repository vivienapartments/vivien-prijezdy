/**
 * Klíče evidence doporučení.
 * Na Preview (VERCEL_ENV=preview) vždy předpona `test:`, ať se nezasahuje do ostrých dat.
 */

const DOPORUCENI_PREFIXY = [
  'osoba:',
  'od:',
  'osoba-tel:',
  'osoba-email:',
  'doporuceni:',
  'kredit:',
  'rez-osoba:',
  'rez-doporuceni:',
  'rez-lock:',
] as const;

export function jeZkouskaDoporuceni(): boolean {
  return process.env.VERCEL_ENV === 'preview';
}

/** Vrátí klíč s `test:` na Preview. Ostatní prostředí beze změny. */
export function doporuceniKlic(raw: string): string {
  const k = raw.trim();
  if (!k) return k;
  if (!jeZkouskaDoporuceni()) return k;
  if (k.startsWith('test:')) return k;
  const jeNase = DOPORUCENI_PREFIXY.some((p) => k.startsWith(p));
  return jeNase ? `test:${k}` : k;
}
