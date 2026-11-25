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
    expect(PREDMET_PODEKOVANI.en).toBe('VIVIEN · Thank you for your visit');
    expect(PREDMET_PODEKOVANI.fi).toBe('VIVIEN · Kiitos vierailustanne');
  });

  it('český HTML má hlavičku, podpis, tři klikací řádky a bez starého CTA', () => {
    const html = htmlPodekovaniEmail('cs', 'https://vivien-prijezdy-six.vercel.app/abc');
    expect(html).toContain('hlavicka-po-odjezdu.jpg');
    expect(html).not.toContain('va-logo-192.png');
    expect(html).not.toContain('zahrada-po-odjezdu.jpg');
    expect(html).toContain('Děkujeme za návštěvu');
    expect(html).toContain('Nikol a rodina VIVIEN');
    expect(html).toContain('Jako poděkování jsme pro vás připravili 3\u00a0výhody:');
    expect(html).not.toContain('Využít výhody');
    expect(html).toContain('Rezervovat ›');
    expect(html).toContain('Poslat ›');
    expect(html).toContain('Přidat ›');
    expect(html).toContain('/poptavka?t=');
    expect(html).toContain('#doporucit');
    expect(html).toContain('plocha=1');
    expect(html).toContain('5&nbsp;%');
    expect(html).toContain('https://vivien-prijezdy-six.vercel.app/email/hlavicka-po-odjezdu.jpg');
    expect(html).toContain('https://vivien-prijezdy-six.vercel.app/email/ikona-kalendar.png');
    expect(html).toContain('alt=""');
    expect(html).toContain('ikona-hovor.png');
    expect(html).toContain('tel:+420702153573');
    expect(html).toContain('tel:+420604692573');
    expect(html).toContain('text-align:center');
    expect(html).toContain('#c9a84c');
    expect(html).toContain('color:#1a1510');
    expect(html).not.toContain('127.0.0.1');
    expect(html).not.toContain('localhost');
    expect(html).not.toContain('Zkouška Preview');
  });

  it('prostý text obsahuje odkazy na výhody', () => {
    const text = textPodekovaniEmail('cs', 'https://priklad.cz/t');
    expect(text).toContain('https://priklad.cz/t');
    expect(text).toContain('#doporucit');
    expect(text).toContain('plocha=1');
    expect(text).not.toContain('Využít výhody');
    expect(text).toContain('Nechcete od nás další e-maily? Stačí odpovědět NE.');
  });

  it('HTML má větu o odhlášení na konci', () => {
    const html = htmlPodekovaniEmail('cs', 'https://vivien-prijezdy-six.vercel.app/abc');
    expect(html).toContain('Nechcete od nás další e-maily? Stačí odpovědět NE.');
    expect(html).toContain('color:#8a7f72');
  });
});
