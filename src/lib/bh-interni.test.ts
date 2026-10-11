import { describe, expect, it } from 'vitest';
import { authDkimPass, parsujInterni, puvodInterniOk, vetaChybi } from './bh-interni';

const PREDMET = 'Vivien Apartmens Character and Atmosphere | Nová rezervace - #100000001';

const TELO = [
  'Nová rezervace',
  'Rezervace',
  'Číslo',
  '100000001',
  'Zarezervováno',
  '6. 10. 2026',
  'Příjezd',
  '20. 11. 2026',
  'Odjezd',
  '22. 11. 2026',
  'Agentura',
  'Booking.com',
  'Klient',
  'Jana Malá',
  'Email',
  'jana.mala@example.com',
  'Telefon',
  '777 123 456',
  'Rezervované pokoje',
  'Jemná harmonie (Gentle Harmony) - počet hostů: 2',
].join('\n');

describe('původ interního e-mailu', () => {
  it('bez DKIM se odmítne', () => {
    expect(
      puvodInterniOk({
        from: 'Better Hotel <info@better-hotel.com>',
        authenticationResults: null,
      }),
    ).toBe(false);
    expect(
      puvodInterniOk({
        from: 'Better Hotel <info@better-hotel.com>',
        authenticationResults: 'spf=pass smtp.mailfrom=better-hotel.com',
      }),
    ).toBe(false);
    expect(
      puvodInterniOk({
        from: 'utocnik@example.com',
        authenticationResults: 'dkim=pass header.d=mg2.better-hotel.com',
      }),
    ).toBe(false);
  });

  it('dkim=pass pro better-hotel.com projde, i když je to subdoména', () => {
    expect(authDkimPass('mx.seznam.cz; dkim=pass header.d=mg2.better-hotel.com')).toBe(true);
    expect(
      puvodInterniOk({
        from: 'info@mg2.better-hotel.com',
        authenticationResults: 'dkim=pass header.d=mg2.better-hotel.com',
      }),
    ).toBe(true);
  });

  it('chybějící hlavičku nahradí jen ověřený podpis', () => {
    expect(
      puvodInterniOk({
        from: 'info@better-hotel.com',
        authenticationResults: null,
        dkimBetterHotel: true,
      }),
    ).toBe(true);
  });
});

describe('čtení nové rezervace', () => {
  it('vytáhne údaje ve tvaru mailu z Better Hotelu', () => {
    const u = parsujInterni(PREDMET, '', TELO);
    expect(u?.druh).toBe('nova');
    expect(u?.rezervace).toBe('100000001');
    expect(u?.apartman).toBe('V1');
    expect(u?.prijezd).toBe('2026-11-20');
    expect(u?.odjezd).toBe('2026-11-22');
    expect(u?.noci).toBe(2);
    expect(u?.osob).toBe(2);
    expect(u?.jmeno).toBe('Jana Malá');
    expect(u?.krestni).toBe('Jana');
    expect(u?.email).toBe('jana.mala@example.com');
    expect(u?.telefon).toBe('+420777123456');
    expect(u?.telefonWa).toBe('420777123456');
    expect(u?.zdroj).toBe('Booking');
    expect(u?.vytvoreno).toBe('2026-10-06');
    expect(u?.chybi).toEqual([]);
  });

  it('odkaz na check-in vezme, sledovací odkaz Better Hotelu ne', () => {
    const html = `${TELO}\n<a href="https://email.mg2.better-hotel.com/c/abc">web</a>\n<a href="https://checkin.example.com/pobyt/100000001">online check-in</a>`;
    expect(parsujInterni(PREDMET, html, '')?.checkinUrl).toBe('https://checkin.example.com/pobyt/100000001');
  });

  it('když telefon chybí, záznam stejně vznikne a řekne, co chybí', () => {
    const telo = TELO.replace('777 123 456', 'neuvedeno');
    const u = parsujInterni(PREDMET, '', telo);
    expect(u?.rezervace).toBe('100000001');
    expect(u?.telefon).toBeNull();
    expect(u?.chybi).toEqual(['telefon']);
    expect(vetaChybi(u?.chybi || [])).toBe('Chybí telefon.');
  });

  it('zrušení a změna se poznají z předmětu', () => {
    expect(parsujInterni('Vivien Apartmens Character and Atmosphere | Zrušení rezervace - #100000001', '', TELO)?.druh).toBe(
      'zruseni',
    );
    expect(parsujInterni('Vivien Apartmens Character and Atmosphere | Modifikace rezervace - #100000001', '', TELO)?.druh).toBe(
      'zmena',
    );
  });
});
