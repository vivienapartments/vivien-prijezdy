import { describe, expect, it } from 'vitest';
import { jazykZPredvolby, normalizujTelefon, textTelefonu } from './telefon';

describe('telefon hosta', () => {
  it('české číslo bez předvolby dostane +420', () => {
    const t = normalizujTelefon('777 111 222');
    expect(t?.ulozeny).toBe('+420777111222');
    expect(t?.wa).toBe('420777111222');
    expect(t?.puvodni).toBe('777 111 222');
    expect(t?.nejisty).toBe(false);
    expect(textTelefonu(t!.ulozeny)).toBe('+420 777 111 222');
  });

  it('devět číslic od 6 je taky české', () => {
    expect(normalizujTelefon('603123456')?.ulozeny).toBe('+420603123456');
  });

  it('německé číslo s plus nechá a dá ho na WhatsApp', () => {
    const t = normalizujTelefon('+49 170 1234567');
    expect(t?.wa).toBe('491701234567');
    expect(t?.nejisty).toBe(false);
    expect(textTelefonu(t!.ulozeny)).toBe('+49 1701234567');
  });

  it('00420 se převede na plus', () => {
    expect(normalizujTelefon('00420 777 111 222')?.ulozeny).toBe('+420777111222');
  });

  it('známá předvolba bez plus dostane plus, když sedí délka', () => {
    const priklady: [string, string][] = [
      ['420777123456', '+420777123456'],
      ['421903123456', '+421903123456'],
      ['491701234567', '+491701234567'],
      ['436641234567', '+436641234567'],
      ['41791234567', '+41791234567'],
      ['48500123456', '+48500123456'],
      ['380501234567', '+380501234567'],
      ['36201234567', '+36201234567'],
      ['31612345678', '+31612345678'],
      ['447911123456', '+447911123456'],
      ['393331234567', '+393331234567'],
      ['33612345678', '+33612345678'],
      ['12025550198', '+12025550198'],
      ['8613812345678', '+8613812345678'],
      ['886912345678', '+886912345678'],
      ['85291234567', '+85291234567'],
    ];
    for (const [vstup, cekany] of priklady) {
      expect(normalizujTelefon(vstup)?.ulozeny).toBe(cekany);
    }
  });

  it('mezery, pomlčky, tečky, lomítka a závorky zmizí', () => {
    expect(normalizujTelefon('(420) 777-123.456')?.ulozeny).toBe('+420777123456');
    expect(normalizujTelefon('420/777/123/456')?.ulozeny).toBe('+420777123456');
  });

  it('nula na začátku s národností dostane předvolbu země', () => {
    const t = normalizujTelefon('0171 1234567', 'DEU');
    expect(t?.ulozeny).toBe('+491711234567');
    expect(t?.wa).toBe('491711234567');
    expect(t?.puvodni).toBe('0171 1234567');
  });

  it('číslo bez předvolby dostane kód země hosta', () => {
    expect(normalizujTelefon('170 1234567', 'DEU')?.ulozeny).toBe('+491701234567');
    expect(normalizujTelefon('903123456', 'SVK')?.ulozeny).toBe('+421903123456');
    expect(normalizujTelefon('0701234567', 'SWE')?.ulozeny).toBe('+46701234567');
    expect(normalizujTelefon('6641234567', 'AUT')?.ulozeny).toBe('+436641234567');
    expect(textTelefonu(normalizujTelefon('170 1234567', 'DEU')!.ulozeny)).toBe('+49 1701234567');
  });

  it('známá předvolba se podle země nepřepisuje', () => {
    expect(normalizujTelefon('+420 777 111 222', 'DEU')?.ulozeny).toBe('+420777111222');
    expect(normalizujTelefon('420777123456', 'DEU')?.ulozeny).toBe('+420777123456');
  });

  it('nula na začátku bez národnosti se nemění a nemá WhatsApp', () => {
    const t = normalizujTelefon('0171 1234567');
    expect(t?.ulozeny).toBe('0171 1234567');
    expect(t?.wa).toBeNull();
    expect(t?.nejisty).toBe(true);
    expect(t?.puvodni).toBe('0171 1234567');
  });

  it('nevyplněné pole z Better Hotelu je prázdné', () => {
    expect(normalizujTelefon('(GUEST_PHONE)')).toBeNull();
    expect(normalizujTelefon('')).toBeNull();
  });

  it('neznámý tvar uloží přesně, jak přišel, a tlačítko schová', () => {
    const t = normalizujTelefon('volat večer');
    expect(t?.ulozeny).toBe('volat večer');
    expect(t?.wa).toBeNull();
    expect(t?.nejisty).toBe(true);
    expect(t?.puvodni).toBe('volat večer');
  });
});

describe('jazyk z předvolby', () => {
  it('české a slovenské číslo je čeština, ostatní angličtina', () => {
    expect(jazykZPredvolby(normalizujTelefon('777 123 456')?.ulozeny)).toBe('cs');
    expect(jazykZPredvolby(normalizujTelefon('421903123456')?.ulozeny)).toBe('cs');
    expect(jazykZPredvolby(normalizujTelefon('+49 170 1234567')?.ulozeny)).toBe('en');
    expect(jazykZPredvolby(normalizujTelefon('0171 1234567')?.ulozeny)).toBe('en');
    expect(jazykZPredvolby(null)).toBe('en');
  });
});
