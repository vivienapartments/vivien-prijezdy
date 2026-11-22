/** Klíče kalendáře cen/obsazenosti. Na Preview předpona `test:`. */

export function jePreviewKalendar(): boolean {
  return process.env.VERCEL_ENV === 'preview';
}

export function kalendarKlic(raw: string): string {
  const k = raw.trim();
  if (!k) return k;
  if (!jePreviewKalendar()) return k;
  if (k.startsWith('test:')) return k;
  if (k.startsWith('kalendar-')) return `test:${k}`;
  return k;
}

export const KLIC_KALENDAR_DENNI = 'kalendar-denni';
export const KLIC_KALENDAR_META = 'kalendar-meta';
