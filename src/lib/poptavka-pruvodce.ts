/**
 * Zjednodušený průvodce výběrem apartmánu uvnitř poptávky.
 * Plný Discover Your Atmosphere zůstává na webu; tady jen zkouška bez odchodu.
 */

import type { AptId, GuideLang } from './types';

export type PruvodceOtazka = {
  otazka: string;
  volby: { text: string; body: AptId[] }[];
};

const CS: PruvodceOtazka[] = [
  {
    otazka: 'Jaká nálada vám teď sedí?',
    volby: [
      { text: 'Klid a měkké tóny', body: ['V1', 'V5'] },
      { text: 'Teplo a zlatavé světlo', body: ['V2'] },
      { text: 'Večerní elegance', body: ['V3'] },
      { text: 'Výrazný kontrast', body: ['V4'] },
    ],
  },
  {
    otazka: 'Kde si představíte večer?',
    volby: [
      { text: 'U okna s městem', body: ['V3', 'V4'] },
      { text: 'V útulném koutě', body: ['V1', 'V5'] },
      { text: 'U stolu se světlem', body: ['V2'] },
    ],
  },
  {
    otazka: 'Co je pro vás důležitější?',
    volby: [
      { text: 'Jemnost a harmonie', body: ['V1'] },
      { text: 'Pohodlí bez přemýšlení', body: ['V5', 'V2'] },
      { text: 'Charakter a výraz', body: ['V4', 'V3'] },
    ],
  },
];

const EN: PruvodceOtazka[] = [
  {
    otazka: 'What mood fits you now?',
    volby: [
      { text: 'Calm and soft tones', body: ['V1', 'V5'] },
      { text: 'Warm golden light', body: ['V2'] },
      { text: 'Evening elegance', body: ['V3'] },
      { text: 'Bold contrast', body: ['V4'] },
    ],
  },
  {
    otazka: 'Where do you picture the evening?',
    volby: [
      { text: 'By the window with the city', body: ['V3', 'V4'] },
      { text: 'In a cosy corner', body: ['V1', 'V5'] },
      { text: 'At a table with soft light', body: ['V2'] },
    ],
  },
  {
    otazka: 'What matters more to you?',
    volby: [
      { text: 'Gentleness and harmony', body: ['V1'] },
      { text: 'Comfort without fuss', body: ['V5', 'V2'] },
      { text: 'Character and expression', body: ['V4', 'V3'] },
    ],
  },
];

export function pruvodceOtazky(lang: GuideLang): PruvodceOtazka[] {
  return lang === 'cs' ? CS : EN;
}

export function vyhodnotPruvodce(body: AptId[][]): AptId {
  const skore: Record<AptId, number> = { V1: 0, V2: 0, V3: 0, V4: 0, V5: 0 };
  for (const volba of body) {
    for (const id of volba) skore[id] += 1;
  }
  const poradi: AptId[] = ['V1', 'V2', 'V3', 'V4', 'V5'];
  return poradi.sort((a, b) => skore[b] - skore[a])[0];
}
