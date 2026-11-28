import { describe, expect, it } from 'vitest';
import {
  htmlZpravaPoptavkyHostovi,
  predmetPotvrzeniPoptavky,
} from './poptavka-potvrzeni-email';

describe('poptavka-potvrzeni-email', () => {
  it('html obsahuje termín a text', () => {
    const html = htmlZpravaPoptavkyHostovi({
      predmet: 'VIVIEN Apartments, potvrzení termínu',
      text: 'Dobrý den, Jano,\n\npotvrzujeme termín.',
      termin: '1.–3. 12. 2026 · 2 noci',
      apartman: 'Jemná harmonie',
      cena: '4 440 Kč',
    });
    expect(html).toContain('Jemná harmonie');
    expect(html).toContain('4 440 Kč');
    expect(html).toContain('potvrzujeme termín');
    expect(html).toContain('Nikol a rodina VIVIEN');
  });

  it('předmět v testu má [TEST]', () => {
    expect(predmetPotvrzeniPoptavky(true).startsWith('[TEST]')).toBe(true);
    expect(predmetPotvrzeniPoptavky(false).startsWith('[TEST]')).toBe(false);
  });
});
