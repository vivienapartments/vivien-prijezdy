import { describe, expect, it } from 'vitest';
import { radekVolnychVTerminu } from './kalendar-texty';

describe('radekVolnychVTerminu', () => {
  it('cs tvary podle počtu', () => {
    expect(radekVolnychVTerminu('cs', '25.–26. 11. 2026', 1)).toBe(
      'Ve vašem termínu 25.–26. 11. 2026 máme volné 1 apartmán.',
    );
    expect(radekVolnychVTerminu('cs', '25.–26. 11. 2026', 2)).toBe(
      'Ve vašem termínu 25.–26. 11. 2026 máme volné 2 apartmány.',
    );
    expect(radekVolnychVTerminu('cs', '25.–26. 11. 2026', 5)).toBe(
      'Ve vašem termínu 25.–26. 11. 2026 máme volné 5 apartmánů.',
    );
  });

  it('en a de', () => {
    expect(radekVolnychVTerminu('en', '25–26 Nov 2026', 1)).toContain('1 apartment free');
    expect(radekVolnychVTerminu('en', '25–26 Nov 2026', 3)).toContain('3 apartments free');
    expect(radekVolnychVTerminu('de', '25.–26.11.2026', 2)).toContain('2 Apartments frei');
  });
});
