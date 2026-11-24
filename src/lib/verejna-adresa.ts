/**
 * Veřejná adresa pro hosty (poptávka, e-maily, odkazy).
 * Doména club.vivienapartments.cz. Stará vercel.app zůstává jako záloha.
 */
export const OSTRA_ADRESA = 'https://club.vivienapartments.cz';
export const OSTRA_ADRESA_ZALOHA = 'https://vivien-prijezdy-six.vercel.app';

/** Preferuje env, pak novou doménu. */
export function verejnaAdresa(): string {
  const zEnv = (process.env.NEXT_PUBLIC_BASE_URL || process.env.PRUVODCE_BASE_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (zEnv && !zEnv.includes('127.0.0.1') && !zEnv.includes('localhost')) return zEnv;
  return OSTRA_ADRESA;
}
