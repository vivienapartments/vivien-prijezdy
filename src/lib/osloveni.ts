import jmena from '@/data/ceska-krestni.json';
import { vokativ } from 'vokativ';

/** Křestní jména, u kterých knihovna vokativ sedí na svůj slovník. */
const ZNAMA = jmena as Record<string, string>;

export function narodnostKod(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .trim()
    .toUpperCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '');
}

/**
 * 5. pád křestního jména.
 * Vrátí null, když jméno není v slovníku, má víc slov, nebo knihovna nesedí se slovníkem.
 */
export function ceskyVokativ(jmeno: string): string | null {
  const raw = jmeno.trim();
  if (!raw || /[\s\-–—]/.test(raw)) return null;
  const key = raw.toLocaleLowerCase('cs');
  const cekane = ZNAMA[key];
  if (!cekane) return null;
  const slozene = vokativ(key, null, false);
  if (slozene !== cekane) return null;
  return slozene.charAt(0).toLocaleUpperCase('cs') + slozene.slice(1);
}
