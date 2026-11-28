import { describe, expect, it } from 'vitest';
import { odkazObecnePoptavky, textPozvankyPoptavky } from './poptavka-pozvanka';

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
    expect(t).toContain('Dobrý den,');
  });
});
