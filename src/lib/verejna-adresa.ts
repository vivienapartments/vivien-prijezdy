/**
 * Dvě veřejné adresy (stejná aplikace na Vercelu):
 * - klub = poptávka, VIVIEN KLUB na ploše
 * - příjezd = odkaz na průvodce z e-mailu
 * Stará vercel.app zůstává jako záloha.
 */
export const ADRESA_KLUB = 'https://club.vivienapartments.cz';
export const ADRESA_PRUJEZD = 'https://prijezd.vivienapartments.cz';
export const OSTRA_ADRESA_ZALOHA = 'https://vivien-prijezdy-six.vercel.app';

/** @deprecated použij ADRESA_KLUB */
export const OSTRA_ADRESA = ADRESA_KLUB;

function zEnv(klic: string): string {
  return (process.env[klic] || '').trim().replace(/\/$/, '');
}

function jeLokalni(url: string): boolean {
  return url.includes('127.0.0.1') || url.includes('localhost');
}

/** Poptávka, tip kamarádovi, klub na ploše. Env: NEXT_PUBLIC_KLUB_URL nebo NEXT_PUBLIC_BASE_URL. */
export function adresaKlub(): string {
  const z = zEnv('NEXT_PUBLIC_KLUB_URL') || zEnv('NEXT_PUBLIC_BASE_URL');
  if (z && !jeLokalni(z)) return z;
  return ADRESA_KLUB;
}

/** Průvodce z e-mailu. Env: PRUVODCE_BASE_URL. */
export function adresaPrujezd(): string {
  const z = zEnv('PRUVODCE_BASE_URL');
  if (z && !jeLokalni(z)) return z;
  return ADRESA_PRUJEZD;
}

/** @deprecated použij adresaKlub() */
export function verejnaAdresa(): string {
  return adresaKlub();
}
