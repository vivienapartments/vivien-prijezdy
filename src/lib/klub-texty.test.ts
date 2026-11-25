import { describe, expect, it } from 'vitest';
import { klubTexty } from './klub-texty';
import type { GuideLang } from './types';

const LANGS: GuideLang[] = [
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
  'da',
  'fi',
];

describe('klub-texty', () => {
  it('má texty ve všech 13+ jazycích průvodce', () => {
    for (const lang of LANGS) {
      const t = klubTexty(lang);
      expect(t.klub.length).toBeGreaterThan(3);
      expect(t.sleva(7)).toContain('7');
      expect(t.doUrovne('Bronzový', 7, '1 400 Kč')).toMatch(/Bronz|1 400|1400|7/);
      expect(t.zadnaKarta.length).toBeGreaterThan(5);
      expect(t.prazdnePobyty.length).toBeGreaterThan(10);
    }
  });

  it('česky vyká a bez pomlček ve větách', () => {
    const t = klubTexty('cs');
    expect(t.dopPopis).toContain('doporučujete');
    expect(t.sleva(5)).not.toMatch(/[—–]/);
    expect(t.rezervovat).toBe('Rezervovat pobyt');
  });
});
