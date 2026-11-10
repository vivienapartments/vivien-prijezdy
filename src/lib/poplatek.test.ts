import { describe, expect, it } from 'vitest';
import {
  POPLATEK_BOOKING_OD_REZ,
  kandidatOpravyPoplatkuBooking,
  poplatekProRezervaci,
  poplatekZData,
  poplatekZTokenu,
  ukazatPoplatek,
  ukazatPoplatekVCene,
  hraniceRezervace,
} from './poplatek';
import { polozkyDluhu } from './odjezd';

describe('městský poplatek podle data a Bookingu', () => {
  it('před 5. 10. 2026 nevybírá (všechny kanály)', () => {
    expect(poplatekProRezervaci({ vytvoreno: '2026-10-04', zdroj: 'Booking.com', rezervace: '120260500' })).toBe(
      'ne',
    );
    expect(poplatekProRezervaci({ vytvoreno: '4.10.2026', zdroj: 'Airbnb', rezervace: '120260500' })).toBe('ne');
    expect(poplatekZData('2026-10-04')).toBe('ne');
  });

  it('od 5. 10. 2026 VIVIEN vybírá u Airbnb a přímé', () => {
    expect(poplatekProRezervaci({ vytvoreno: '2026-10-05', zdroj: 'Airbnb', rezervace: '120260700' })).toBe('ano');
    expect(poplatekProRezervaci({ vytvoreno: '2026-11-09', zdroj: 'přímá', rezervace: '120260800' })).toBe('ano');
    expect(poplatekZData('2026-10-05')).toBe('ano');
  });

  it('Galia 120260623 Booking: VIVIEN vybírá', () => {
    expect(
      poplatekProRezervaci({ vytvoreno: '2026-11-09', zdroj: 'Booking.com', rezervace: '120260623' }),
    ).toBe('ano');
    expect(poplatekProRezervaci({ vytvoreno: '2026-10-05', zdroj: 'Booking', rezervace: '120260622' })).toBe('ano');
  });

  it('Bennett 120260625 Booking: VIVIEN nevybírá i bez data', () => {
    expect(poplatekProRezervaci({ vytvoreno: null, zdroj: 'Booking.com', rezervace: '120260625' })).toBe('ne');
    expect(
      poplatekProRezervaci({ vytvoreno: '2026-11-09', zdroj: 'Booking.com', rezervace: '120260625' }),
    ).toBe('ne');
    expect(poplatekProRezervaci({ vytvoreno: null, zdroj: 'Booking', rezervace: '120260700' })).toBe('ne');
    expect(POPLATEK_BOOKING_OD_REZ).toBe(120260625);
  });

  it('Airbnb s číslem nad hranicí Booking dál vybírá od 5. 10.', () => {
    expect(
      poplatekProRezervaci({ vytvoreno: '2026-11-09', zdroj: 'Airbnb', rezervace: '120260624' }),
    ).toBe('ano');
  });

  it('Booking bez čísla a bez data je neznamo; s datem před 5. 10. je ne', () => {
    expect(poplatekProRezervaci({ vytvoreno: null, zdroj: 'Booking.com', rezervace: null })).toBe('neznamo');
    expect(poplatekProRezervaci({ vytvoreno: '2026-11-01', zdroj: 'Booking.com', rezervace: 'abc' })).toBe(
      'neznamo',
    );
    expect(poplatekProRezervaci({ vytvoreno: '2026-10-04', zdroj: 'Booking.com', rezervace: null })).toBe('ne');
  });

  it('bez data a bez Bookingu je neznamo', () => {
    expect(poplatekProRezervaci({ vytvoreno: null, zdroj: 'Airbnb' })).toBe('neznamo');
    expect(poplatekZData(null)).toBe('neznamo');
    expect(poplatekZData('(DATE)')).toBe('neznamo');
  });

  it('zobrazení: platba jen u ano, v ceně jen kde to sedí, neznamo hostovi nic', () => {
    expect(ukazatPoplatek('ano')).toBe(true);
    expect(ukazatPoplatek('ne')).toBe(false);
    expect(ukazatPoplatek('neznamo')).toBe(false);
    expect(ukazatPoplatekVCene('ne')).toBe(false);
    expect(
      ukazatPoplatekVCene('ne', { zdroj: 'Booking.com', rezervace: '120260625', vytvoreno: '2026-11-09' }),
    ).toBe(true);
    expect(
      ukazatPoplatekVCene('ne', { zdroj: 'Booking.com', rezervace: '120260623', vytvoreno: '2026-10-04' }),
    ).toBe(false);
    expect(ukazatPoplatekVCene('ne', { zdroj: 'Airbnb', vytvoreno: '2026-10-04' })).toBe(false);
    expect(ukazatPoplatekVCene('ne', { zdroj: 'Airbnb', vytvoreno: '2026-11-09' })).toBe(true);
    expect(ukazatPoplatekVCene('ano')).toBe(false);
    expect(ukazatPoplatekVCene('neznamo')).toBe(false);
  });

  it('neznamo nevytvoří položku dluhu městského poplatku', () => {
    expect(
      polozkyDluhu({
        poplatek: 'neznamo',
        noci: 2,
        osob: 2,
        stav: 'odeslano',
        zaplaceno: null,
        casPrijezdu: '16:00',
        naMiste: null,
        predano: null,
        priplatekRucni: null,
        vyjezdy: [],
      }).some((p) => p.druh === 'poplatek'),
    ).toBe(false);
    expect(
      polozkyDluhu({
        poplatek: 'ne',
        noci: 2,
        osob: 2,
        stav: 'odeslano',
        zaplaceno: null,
        casPrijezdu: null,
        naMiste: null,
        predano: null,
        priplatekRucni: null,
        vyjezdy: [],
      }).some((p) => p.druh === 'poplatek'),
    ).toBe(false);
    expect(
      polozkyDluhu({
        poplatek: 'ano',
        noci: 2,
        osob: 2,
        stav: 'odeslano',
        zaplaceno: null,
        casPrijezdu: null,
        naMiste: null,
        predano: null,
        priplatekRucni: null,
        vyjezdy: [],
      }),
    ).toContainEqual({ druh: 'poplatek', kc: 200 });
  });

  it('hraniceRezervace bere jen karty s výsledkem ano', () => {
    expect(
      hraniceRezervace([
        { rezervace: '120260623', vytvoreno: '2026-11-09', zdroj: 'Booking.com' },
        { rezervace: '120260625', vytvoreno: '2026-11-09', zdroj: 'Booking.com' },
        { rezervace: '120260700', vytvoreno: '2026-11-09', zdroj: 'Airbnb' },
      ]),
    ).toBe(120260623);
  });

  it('kandidát opravy: Booking od Bennett s ano nebo neznamo', () => {
    expect(
      kandidatOpravyPoplatkuBooking({
        rezervace: '120260625',
        zdroj: 'Booking.com',
        poplatek: 'ano',
      }),
    ).toBe(true);
    expect(
      kandidatOpravyPoplatkuBooking({
        rezervace: '120260623',
        zdroj: 'Booking.com',
        poplatek: 'ano',
      }),
    ).toBe(false);
    expect(
      kandidatOpravyPoplatkuBooking({
        rezervace: '120260700',
        zdroj: 'Airbnb',
        poplatek: 'ano',
      }),
    ).toBe(false);
  });

  it('starý token bez příznaku je neznamo a hostovi se neukáže výzva', () => {
    expect(poplatekZTokenu(undefined)).toBe('neznamo');
    expect(ukazatPoplatek(poplatekZTokenu(undefined))).toBe(false);
  });
});
