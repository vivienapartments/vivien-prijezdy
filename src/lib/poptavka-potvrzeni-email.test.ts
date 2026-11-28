import { describe, expect, it } from 'vitest';
import {
  htmlZpravaPoptavkyHostovi,
  odkazPotvrzeniPoptavky,
  predmetPotvrzeniPoptavky,
  textPotvrzeniProEmail,
  textPotvrditSOdkazemNaStranku,
} from './poptavka-potvrzeni-email';

describe('poptavka-potvrzeni-email', () => {
  it('html je učesané: bez druhého loga, s boxem a podpisem', () => {
    const html = htmlZpravaPoptavkyHostovi({
      predmet: 'VIVIEN Apartments, potvrzení termínu',
      nadpis: 'Potvrzení termínu',
      text: textPotvrzeniProEmail('Jano'),
      termin: '1.–3. 12. 2026 · 2 noci',
      apartman: 'Jemná harmonie',
      cena: '4 440 Kč',
      verze: 4,
    });
    expect(html).toContain('Jemná harmonie');
    expect(html).toContain('4 440 Kč');
    expect(html).toContain('Potvrzení termínu');
    expect(html).toContain('online check-inu');
    expect(html).toContain('osobního příjezdového průvodce');
    expect(html).toContain('Nikol a rodina VIVIEN');
    expect(html).not.toContain('va-logo-192.png');
    expect(html).not.toContain('V1');
  });

  it('verze 4 má telefon', () => {
    const html = htmlZpravaPoptavkyHostovi({
      predmet: 'x',
      nadpis: 'Potvrzení termínu',
      text: 'Ahoj',
      termin: '1.–2. 1. 2027',
      apartman: 'Jemná harmonie',
      cena: '1 000 Kč',
      verze: 4,
    });
    expect(html).toContain('tel:+420604692573');
  });

  it('předmět v testu má [TEST]', () => {
    expect(predmetPotvrzeniPoptavky(true).startsWith('[TEST]')).toBe(true);
    expect(predmetPotvrzeniPoptavky(false).startsWith('[TEST]')).toBe(false);
  });

  it('WhatsApp text dostane odkaz na stránku', () => {
    const url = odkazPotvrzeniPoptavky('abcToken12', 'https://example.test');
    expect(url).toBe('https://example.test/poptavka/potvrzeni/abcToken12');
    expect(textPotvrditSOdkazemNaStranku('Ahoj.', url)).toContain(url);
  });
});
