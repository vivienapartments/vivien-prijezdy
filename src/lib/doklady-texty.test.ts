import { describe, expect, it } from 'vitest';
import { GUIDE_LANGS } from './types';
import {
  DOKLADY_PRUVODCE_CIZINEC,
  DOKLADY_PRUVODCE_CR,
  DOKLADY_PRUVODCE_NADPIS,
  DOKLADY_ZPRAVA_CIZINEC,
  DOKLADY_ZPRAVA_CR,
  jeDokladyCr,
  textyDokladu,
  ukazatDokladyRamecek,
} from './doklady-texty';

describe('doklady verze CR / CIZINEC', () => {
  it('CZE → CR, SVK → cizinec; bez národnosti podle jazyka', () => {
    expect(jeDokladyCr('CZE', 'en')).toBe(true);
    expect(jeDokladyCr('cze', 'de')).toBe(true);
    expect(jeDokladyCr('SVK', 'cs')).toBe(false);
    expect(jeDokladyCr(null, 'cs')).toBe(true);
    expect(jeDokladyCr('', 'cs')).toBe(true);
    expect(jeDokladyCr(null, 'en')).toBe(false);
  });

  it('text CR nikde neobsahuje cizineckou policii', () => {
    for (const lang of GUIDE_LANGS) {
      const t = textyDokladu('CZE', lang);
      expect(t.verze).toBe('CR');
      expect(t.zprava.toLowerCase()).not.toMatch(/cizineck|foreign police|fremdenpolizei|cudzoziemc/);
      expect(t.pruvodce.toLowerCase()).not.toMatch(/cizineck|foreign police|fremdenpolizei|cudzoziemc/);
    }
  });

  it('žádný jazyk nemá prázdný text', () => {
    for (const lang of GUIDE_LANGS) {
      expect(DOKLADY_ZPRAVA_CR[lang].trim()).not.toBe('');
      expect(DOKLADY_ZPRAVA_CIZINEC[lang].trim()).not.toBe('');
      expect(DOKLADY_PRUVODCE_NADPIS[lang].trim()).not.toBe('');
      expect(DOKLADY_PRUVODCE_CR[lang].trim()).not.toBe('');
      expect(DOKLADY_PRUVODCE_CIZINEC[lang].trim()).not.toBe('');
    }
  });

  it('rámeček jen s časem a do předání; demo i bez času', () => {
    expect(ukazatDokladyRamecek({ cas: '16:30', predano: false })).toBe(true);
    expect(ukazatDokladyRamecek({ cas: null, predano: false })).toBe(false);
    expect(ukazatDokladyRamecek({ cas: '16:30', predano: true })).toBe(false);
    expect(ukazatDokladyRamecek({ cas: null, predano: false, demo: true })).toBe(true);
    expect(ukazatDokladyRamecek({ cas: '16:30', predano: true, demo: true })).toBe(false);
  });
});
