import { describe, expect, it } from 'vitest';
import {
  htmlPodekovaniEmail,
  PREDMET_PODEKOVANI,
  textPodekovaniEmail,
  tlacitkoPodekovani,
} from './podekovani-email';
import { GUIDE_LANGS } from './types';

describe('podekovani-email', () => {
  it('má předmět a tlačítko ve všech 13 jazycích', () => {
    for (const lang of GUIDE_LANGS) {
      expect(PREDMET_PODEKOVANI[lang]).toMatch(/^VIVIEN/);
      expect(tlacitkoPodekovani(lang).length).toBeGreaterThan(3);
    }
  });

  it('český HTML má fotku, logo, podpis a zlaté tlačítko', () => {
    const html = htmlPodekovaniEmail('cs', 'https://vivien-prijezdy-six.vercel.app/abc');
    expect(html).toContain('zahrada-po-odjezdu.jpg');
    expect(html).toContain('va-logo-192.png');
    expect(html).toContain('Děkujeme za návštěvu');
    expect(html).toContain('Nikol a rodina VIVIEN');
    expect(html).toContain('Využít výhody');
    expect(html).toContain('5&nbsp;%');
    expect(html).toContain('ikona-kalendar.png');
    expect(html).toContain('ikona-hovor.png');
    expect(html).toContain('tel:+420702153573');
    expect(html).toContain('tel:+420604692573');
    expect(html).toContain('text-align:center');
    expect(html).toContain('background:#1c1712;border:2px solid #c9a84c');
    expect(html).toContain('#c9a84c');
    expect(html).toContain('color:#1a1510');
    expect(html).toContain('Kolik ušetří oni, tolik získáte vy');
    expect(html).not.toContain('Zkouška Preview');
  });

  it('prostý text obsahuje odkaz', () => {
    const text = textPodekovaniEmail('cs', 'https://priklad.cz/t');
    expect(text).toContain('https://priklad.cz/t');
    expect(text).toContain('Využít výhody');
  });
});
