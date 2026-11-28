import { describe, expect, it } from 'vitest';
import {
  htmlBlokKlubuPozvanky,
  htmlPozvankaPoptavky,
  htmlPozvankaPoptavkyFinal,
  nadpisPozvankyPoptavky,
  odkazObecnePoptavky,
  textKlubuPozvanky,
  textPozvankyPoptavky,
} from './poptavka-pozvanka';

describe('poptavka-pozvanka', () => {
  it('odkaz končí /poptavka', () => {
    expect(odkazObecnePoptavky('https://priklad.cz/')).toBe('https://priklad.cz/poptavka');
  });

  it('text obsahuje slevu 5 % a odkaz', () => {
    const odkaz = 'https://priklad.cz/poptavka';
    const t = textPozvankyPoptavky(odkaz);
    expect(t).toContain('5 % slevu');
    expect(t).toContain(odkaz);
    expect(t).toContain('Nikol a rodina VIVIEN');
  });

  it('finále 3: velké 5 %, karta bez druhého Klub, Napište nebo zavolejte', () => {
    const html = htmlPozvankaPoptavkyFinal('https://priklad.cz/poptavka', 3);
    expect(html).toContain(nadpisPozvankyPoptavky());
    expect(html).toContain('5&nbsp;%');
    expect(html).toContain('sleva na první přímý pobyt');
    expect(html).toContain('#c9ced4');
    expect(html).toContain('Vybrat termín');
    expect(html).toContain('karticka-stribrny-web-blank.png');
    expect(html).toContain('Společná cesta teprve začíná');
    expect(html).toContain(textKlubuPozvanky().uvod);
    expect(html).not.toContain('klubovou slevu');
    /* Na kartě jen jeden nápis hostovi, ne druhé VIVIEN Klub (je v PNG). */
    expect(html).not.toMatch(/Společná cesta teprve začíná[\s\S]*VIVIEN Klub/);
    expect(html).toContain('Napište nebo zavolejte');
    expect(html).toContain('Nikol a rodina VIVIEN');
  });

  it('tři finální verze mají stříbrný tón', () => {
    for (const v of [1, 2, 3] as const) {
      const html = htmlPozvankaPoptavkyFinal('https://x.cz/poptavka', v);
      expect(html).toContain('#c9ced4');
      expect(html).toContain('Společná cesta teprve začíná');
    }
  });

  it('výchozí htmlPozvankaPoptavky bere finále 3', () => {
    const html = htmlPozvankaPoptavky('https://priklad.cz/poptavka');
    expect(html).toContain('Společná cesta teprve začíná');
    expect(html).toContain('5&nbsp;%');
    expect(html).toContain('Napište nebo zavolejte');
  });

  it('verze 4 má kartu', () => {
    expect(htmlBlokKlubuPozvanky(4)).toContain('Společná cesta teprve začíná');
    expect(htmlBlokKlubuPozvanky(4)).not.toContain('klubovou slevu');
  });
});
