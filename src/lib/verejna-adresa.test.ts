import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ADRESA_KLUB,
  ADRESA_PRUJEZD,
  OSTRA_ADRESA_ZALOHA,
  adresaKlub,
  adresaPrujezd,
  domenaJesteNebezi,
  opravVerejnyOdkaz,
} from './verejna-adresa';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('verejna-adresa', () => {
  it('club a prijezd ještě neběží', () => {
    expect(domenaJesteNebezi(ADRESA_KLUB)).toBe(true);
    expect(domenaJesteNebezi(ADRESA_PRUJEZD)).toBe(true);
    expect(domenaJesteNebezi(OSTRA_ADRESA_ZALOHA)).toBe(false);
  });

  it('bez env jde na vercel.app', () => {
    vi.stubEnv('PRUVODCE_BASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_KLUB_URL', '');
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', '');
    expect(adresaPrujezd()).toBe(OSTRA_ADRESA_ZALOHA);
    expect(adresaKlub()).toBe(OSTRA_ADRESA_ZALOHA);
  });

  it('env na prijezd/club se zatím nepřepíše přes vercel.app', () => {
    vi.stubEnv('PRUVODCE_BASE_URL', ADRESA_PRUJEZD);
    vi.stubEnv('NEXT_PUBLIC_KLUB_URL', ADRESA_KLUB);
    expect(adresaPrujezd()).toBe(OSTRA_ADRESA_ZALOHA);
    expect(adresaKlub()).toBe(OSTRA_ADRESA_ZALOHA);
  });

  it('jiná ostrá adresa z env projde', () => {
    vi.stubEnv('PRUVODCE_BASE_URL', 'https://vivien-prijezdy-six.vercel.app');
    expect(adresaPrujezd()).toBe('https://vivien-prijezdy-six.vercel.app');
  });

  it('opraví odkaz s club/prijezd na vercel.app', () => {
    expect(opravVerejnyOdkaz('https://prijezd.vivienapartments.cz/abc#doporucit')).toBe(
      `${OSTRA_ADRESA_ZALOHA}/abc#doporucit`,
    );
    expect(opravVerejnyOdkaz('https://club.vivienapartments.cz/poptavka?t=x')).toBe(
      `${OSTRA_ADRESA_ZALOHA}/poptavka?t=x`,
    );
    expect(opravVerejnyOdkaz(`${OSTRA_ADRESA_ZALOHA}/ok`)).toBe(`${OSTRA_ADRESA_ZALOHA}/ok`);
  });
});
