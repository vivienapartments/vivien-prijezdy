import type { AptId, GuideLang } from './types';

export type PoptavkaKoncept = {
  krok: 'termin' | 'zpusob' | 'apartmany' | 'pruvodce' | 'kontakt';
  prijezd: string;
  odjezd: string;
  zpusob: 'doporucit' | 'vybrat' | 'pruvodce' | null;
  apts: AptId[];
  jmeno: string;
  telefon: string;
  poznamka: string;
  doprava: 'auto' | 'pesky' | 'nevim' | '';
  lang: GuideLang;
};

export function klicPoptavkaKoncept(opts: {
  zdroj: string;
  doporucitelKod?: string | null;
  firmaKod?: string | null;
  rezervace?: string | null;
}): string {
  return [
    'poptavka-koncept',
    opts.zdroj,
    opts.doporucitelKod || '',
    opts.firmaKod || '',
    opts.rezervace || '',
  ].join(':');
}

export function nactiKoncept(klic: string): PoptavkaKoncept | null {
  try {
    const raw = localStorage.getItem(klic);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<PoptavkaKoncept>;
    if (!o || typeof o !== 'object') return null;
    const kroky = ['termin', 'zpusob', 'apartmany', 'pruvodce', 'kontakt'] as const;
    if (!kroky.includes(o.krok as (typeof kroky)[number])) return null;
    return {
      krok: o.krok as PoptavkaKoncept['krok'],
      prijezd: typeof o.prijezd === 'string' ? o.prijezd : '',
      odjezd: typeof o.odjezd === 'string' ? o.odjezd : '',
      zpusob:
        o.zpusob === 'doporucit' || o.zpusob === 'vybrat' || o.zpusob === 'pruvodce'
          ? o.zpusob
          : null,
      apts: Array.isArray(o.apts) ? (o.apts.filter(Boolean) as AptId[]) : [],
      jmeno: typeof o.jmeno === 'string' ? o.jmeno : '',
      telefon: typeof o.telefon === 'string' ? o.telefon : '',
      poznamka: typeof o.poznamka === 'string' ? o.poznamka : '',
      doprava:
        o.doprava === 'auto' || o.doprava === 'pesky' || o.doprava === 'nevim' ? o.doprava : '',
      lang: (typeof o.lang === 'string' ? o.lang : 'cs') as GuideLang,
    };
  } catch {
    return null;
  }
}

export function ulozKoncept(klic: string, data: PoptavkaKoncept): void {
  try {
    localStorage.setItem(klic, JSON.stringify(data));
  } catch {
    /* plný disk / soukromý režim */
  }
}

export function smazKoncept(klic: string): void {
  try {
    localStorage.removeItem(klic);
  } catch {
    /* */
  }
}
