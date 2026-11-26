/**
 * Dvě veřejné adresy (stejná aplikace na Vercelu), až budou na projektu napojené:
 * - klub = poptávka, VIVIEN KLUB na ploše
 * - příjezd = odkaz na průvodce z e-mailu
 *
 * Teď club/prijezd na Vercelu ještě nejsou (DEPLOYMENT_NOT_FOUND).
 * Bez env i při env nastaveném na club/prijezd tedy vercel.app, ať hostům odkazy fungují.
 */
export const ADRESA_KLUB = 'https://club.vivienapartments.cz';
export const ADRESA_PRUJEZD = 'https://prijezd.vivienapartments.cz';
export const OSTRA_ADRESA_ZALOHA = 'https://vivien-prijezdy-six.vercel.app';

/** @deprecated použij adresaKlub() — zatím vercel.app, dokud club neběží */
export const OSTRA_ADRESA = OSTRA_ADRESA_ZALOHA;

function zEnv(klic: string): string {
  return (process.env[klic] || '').trim().replace(/\/$/, '');
}

function jeLokalni(url: string): boolean {
  return url.includes('127.0.0.1') || url.includes('localhost');
}

/** Domény ještě nejsou napojené na projekt (Vercel: DEPLOYMENT_NOT_FOUND). */
export function domenaJesteNebezi(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h === 'prijezd.vivienapartments.cz' || h === 'club.vivienapartments.cz';
  } catch {
    return false;
  }
}

function ostráNeboZaloha(url: string): string {
  if (!url || jeLokalni(url) || domenaJesteNebezi(url)) return OSTRA_ADRESA_ZALOHA;
  return url;
}

/** Na Preview vždy adresa tohoto nasazení (test data nejsou na ostré). */
function adresaPreviewNasazeni(): string | null {
  if (process.env.VERCEL_ENV !== 'preview') return null;
  const u = (process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || '')
    .trim()
    .replace(/^https?:\/\//, '');
  if (!u) return null;
  return `https://${u}`;
}

/** Poptávka, tip kamarádovi, klub na ploše. Env: NEXT_PUBLIC_KLUB_URL nebo NEXT_PUBLIC_BASE_URL. */
export function adresaKlub(): string {
  const preview = adresaPreviewNasazeni();
  if (preview) return preview;
  const z = zEnv('NEXT_PUBLIC_KLUB_URL') || zEnv('NEXT_PUBLIC_BASE_URL');
  return ostráNeboZaloha(z);
}

/** Průvodce z e-mailu. Env: PRUVODCE_BASE_URL. */
export function adresaPrujezd(): string {
  const preview = adresaPreviewNasazeni();
  if (preview) return preview;
  return ostráNeboZaloha(zEnv('PRUVODCE_BASE_URL'));
}

/** @deprecated použij adresaKlub() */
export function verejnaAdresa(): string {
  return adresaKlub();
}

/**
 * Když odkaz míří na club/prijezd (ještě neběží), přepíše origin na vercel.app.
 * Cestu, query i hash nechá.
 */
export function opravVerejnyOdkaz(url: string): string {
  const raw = String(url || '').trim();
  if (!raw) return OSTRA_ADRESA_ZALOHA;
  try {
    const u = new URL(raw);
    if (!domenaJesteNebezi(u.origin)) return raw;
    return `${OSTRA_ADRESA_ZALOHA}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return raw;
  }
}
