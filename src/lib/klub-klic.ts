/**
 * Klíče VIVIEN Klubu (karta klienta, pravidla).
 * Na Preview a lokálně předpona `test:` (ostré klient:* se nemění).
 */

const KLUB_PREFIXY = [
  'klient:',
  'klient-klic:',
  'klient-index:',
  'klient-kod:',
  'klient-seznam',
  'klub:',
] as const;

/** Preview nebo lokální vývoj (ne ostrá produkce). */
export function jeZkusebniProstredi(): boolean {
  if (process.env.VERCEL_ENV === 'production') return false;
  return (
    process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development'
  );
}

export function jeZkouskaKlubu(): boolean {
  return jeZkusebniProstredi();
}

/** Ostré rezervace (ne TEST…) se na Preview/local nesmí přepisovat. */
export function smiZapisovatRezervaci(id: string): boolean {
  const cid = String(id || '').trim();
  if (!cid) return false;
  if (/^TEST/i.test(cid)) return true;
  return !jeZkusebniProstredi();
}

/** Klíč s `test:` na Preview a lokálně. */
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

/** Klub UI / odkazy: vypínač nebo zkouška (Preview/local). */
export function klubPovolenProZkousku(): boolean {
  return klubZapnut() || jeZkouskaKlubu();
}
