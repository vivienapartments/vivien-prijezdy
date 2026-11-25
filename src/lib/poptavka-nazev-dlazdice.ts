import type { AptId, GuideLang } from './types';

/** Zkrácený název V5 jen v dlaždici. Jinde plný název. */
const V5_KRATKY: Record<GuideLang, string> = {
  cs: 'Tlumené tóny',
  en: 'Muted Tones',
  de: 'Gedämpfte Töne',
  pl: 'Stonowane barwy',
  uk: 'Приглушені тони',
  'zh-Hant': '柔和色調',
  es: 'Tonos suaves',
  fr: 'Tons feutrés',
  it: 'Toni tenui',
  pt: 'Tons suaves',
  sv: 'Dämpade toner',
  hu: 'Tompa tónusok',
  da: 'Dæmpede toner',
  fi: 'Hillityt sävyt',
};

export function nazevDlazdice(id: AptId, lang: GuideLang, plny: string): string {
  if (id === 'V5') return V5_KRATKY[lang] || V5_KRATKY.en;
  return plny;
}
