export type GuideLang =
  | 'cs'
  | 'en'
  | 'de'
  | 'pl'
  | 'uk'
  | 'zh-Hant'
  | 'es'
  | 'fr'
  | 'it'
  | 'pt'
  | 'sv'
  | 'hu';
export type AptId = 'V1' | 'V2' | 'V3' | 'V4' | 'V5';
export type Prijezd = 'auto' | 'pesky';
export type LText = Record<string, string>;

export const GUIDE_LANGS: GuideLang[] = [
  'cs',
  'en',
  'de',
  'pl',
  'uk',
  'zh-Hant',
  'es',
  'fr',
  'it',
  'pt',
  'sv',
  'hu',
];
export const APT_IDS: AptId[] = ['V1', 'V2', 'V3', 'V4', 'V5'];

/** Názvy pro majitele v přehledu (česky, bez cizího písma). */
export const LANG_LABELS: Record<GuideLang, string> = {
  cs: 'Čeština',
  en: 'Angličtina',
  de: 'Němčina',
  pl: 'Polština',
  uk: 'Ukrajinština',
  'zh-Hant': 'Čínština (tradiční)',
  es: 'Španělština',
  fr: 'Francouzština',
  it: 'Italština',
  pt: 'Portugalština',
  sv: 'Švédština',
  hu: 'Maďarština',
};

export interface AptRecord {
  id: AptId;
  nazev: { cs: string; en: string };
  stani: number;
  wifi: { ssid: string; zabezpeceni: string; heslo_env?: string };
  navod_na_zahradu?: boolean;
  terasa?: string | null;
}

export interface Krok {
  id: string;
  apartmany?: string[];
  stav?: string;
  typ?: string;
  foto?: string | null;
  nadpis?: LText;
  text?: LText;
  body?: LText[];
  zaver?: LText;
  boxy?: { stitek?: LText; nadpis?: LText; text?: LText }[];
}

export interface Sekce {
  id: string;
  apartmany?: string[];
  stav?: string;
  typ?: string;
  nadpis?: LText;
  obsah_z_webu?: unknown;
  kroky?: Krok[];
  popisky_wifi?: Record<string, LText>;
}

/** Token: r rezervace, a apartmán, d odjezd, l jazyk, p příjezd, o osoby, i ACCESS_PIN (volitelné). */
export interface TokenPayload {
  r: string;
  a: AptId;
  d: string;
  l: GuideLang;
  p?: string;
  o?: number;
  /** ACCESS_PIN z Better Hotelu (mění se podle pobytu). */
  i?: string;
  /** 1 poplatek platí, 0 neplatí. Chybí = neznámo, box se ukáže. */
  f?: 0 | 1;
}

export interface StayFacts {
  noci: number | null;
  osob: number | null;
}
