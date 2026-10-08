export type GuideLang = 'cs' | 'en' | 'de' | 'pl' | 'uk' | 'zh-Hant';
export type AptId = 'V1' | 'V2' | 'V3' | 'V4' | 'V5';
export type Prijezd = 'auto' | 'pesky';
export type LText = Record<string, string>;

export const GUIDE_LANGS: GuideLang[] = ['cs', 'en', 'de', 'pl', 'uk', 'zh-Hant'];
export const APT_IDS: AptId[] = ['V1', 'V2', 'V3', 'V4', 'V5'];

export const LANG_LABELS: Record<GuideLang, string> = {
  cs: 'Čeština',
  en: 'English',
  de: 'Deutsch',
  pl: 'Polski',
  uk: 'Українська',
  'zh-Hant': '繁體中文',
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

export interface TokenPayload {
  r: string;
  a: AptId;
  d: string;
  l: GuideLang;
}

export interface StayFacts {
  noci: number | null;
  osob: number | null;
}
