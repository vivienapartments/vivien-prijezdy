import { describe, expect, it } from 'vitest';
import {
  emailJeAgenturni,
  rozhodniZdroj,
  smíObchodniAktivita,
  smíUtrataKlubu,
  sparujPoptavku,
  telefonJeZCheckinu,
  zdrojZEmailu,
} from './zdroj-rezervace';
import type { PoptavkaZaznam } from './poptavka';

function popt(cast: Partial<PoptavkaZaznam> & Pick<PoptavkaZaznam, 'id' | 'jmeno' | 'prijezd' | 'odjezd'>): PoptavkaZaznam {
  return {
    cas: '2026-11-01T10:00:00.000Z',
    zdroj: 'vernost',
    firmaKod: null,
    firmaNazev: null,
    doporucitelKod: null,
    rezervace: null,
    telefon: '+420777000111',
    apartmany: ['V1'],
    libovolnyApartman: false,
    doprava: null,
    poznamka: '',
    jazyk: 'cs',
    stav: 'nova',
    ...cast,
  };
}

describe('zdroj-rezervace', () => {
  it('pozná agenturní e-mail i mimo guest. domény', () => {
    expect(emailJeAgenturni('x@guest.booking.com')).toBe(true);
    expect(emailJeAgenturni('Adam.Booking@firma.cz')).toBe(true);
    expect(emailJeAgenturni('host@airbnb-mail.com')).toBe(true);
    expect(emailJeAgenturni('a@expedia.example')).toBe(true);
    expect(emailJeAgenturni('host@gmail.com')).toBe(false);
  });

  it('zdroj z e-mailu', () => {
    expect(zdrojZEmailu('x@guest.booking.com')).toBe('Booking');
    expect(zdrojZEmailu('x@m.airbnb.com')).toBe('Airbnb');
    expect(zdrojZEmailu('host@gmail.com')).toBeNull();
  });

  it('agentura Booking → jistý zdroj', () => {
    const r = rozhodniZdroj({ agentura: 'Booking.com', jmeno: 'Jan Novák' });
    expect(r.zdroj).toBe('Booking');
    expect(r.zdrojCeka).toBe(false);
  });

  it('bez agentury + poptávka → přímá', () => {
    const r = rozhodniZdroj({
      agentura: null,
      jmeno: 'Jana Nováková',
      prijezd: '2026-12-01',
      odjezd: '2026-12-03',
      telefon: '+420777000111',
      poptavky: [
        popt({
          id: 'p1',
          jmeno: 'Jana Nováková',
          prijezd: '2026-12-01',
          odjezd: '2026-12-03',
          zdroj: 'doporucitel',
        }),
      ],
    });
    expect(r.zdroj).toBe('přímá');
    expect(r.poptavkaId).toBe('p1');
    expect(r.zdrojCeka).toBe(false);
  });

  it('bez agentury a bez poptávky → čeká + Telegram', () => {
    const r = rozhodniZdroj({
      agentura: null,
      jmeno: 'Petr Svoboda',
      prijezd: '2026-12-10',
      odjezd: '2026-12-12',
    });
    expect(r.zdroj).toBeNull();
    expect(r.zdrojCeka).toBe(true);
    expect(r.telegram).toMatch(/Rezervace bez zdroje/);
    expect(r.telegram).toMatch(/Petr Svoboda/);
  });

  it('párování podle příjmení a termínu', () => {
    const hit = sparujPoptavku(
      { jmeno: 'Martin Dvořák', prijezd: '2027-01-05', odjezd: '2027-01-08' },
      [
        popt({ id: 'a', jmeno: 'Eva Nová', prijezd: '2027-01-05', odjezd: '2027-01-08' }),
        popt({ id: 'b', jmeno: 'Martin Dvořák', prijezd: '2027-01-05', odjezd: '2027-01-08' }),
      ],
    );
    expect(hit?.id).toBe('b');
  });

  it('telefon z check-inu ano, z rezervace ne', () => {
    const rec = {
      zdrojCeka: false,
      telefon: '+420604111222',
      telefonWa: '420604111222',
      telefonRezervace: '+420777000999',
      telefonRezervaceWa: '420777000999',
    };
    expect(telefonJeZCheckinu('+420604111222', rec)).toBe(true);
    expect(telefonJeZCheckinu('420604111222', rec)).toBe(true);
    expect(telefonJeZCheckinu('+420777000999', rec)).toBe(false);
  });

  it('bez zdroje není obchodní aktivita (staré karty bez Telegramu)', () => {
    expect(smíObchodniAktivita(null)).toBe(true);
    expect(smíObchodniAktivita({ zdroj: null, zdrojCeka: false })).toBe(false);
    expect(smíObchodniAktivita({ zdroj: 'přímá', zdrojCeka: false })).toBe(true);
    expect(smíUtrataKlubu({ zdroj: 'Booking', zdrojCeka: false })).toBe(false);
    expect(smíUtrataKlubu({ zdroj: 'přímá', zdrojCeka: false })).toBe(true);
  });
});
