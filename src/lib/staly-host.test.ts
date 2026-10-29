import { describe, expect, it } from 'vitest';
import { prazdnaRezervace } from './store';
import { radekZRezervace } from './prehled';
import { doplnStaleHosty, stalyHostPro, textStalehoHosta } from './staly-host';

function karta(cast: {
  id: string;
  jmeno?: string;
  telefon?: string;
  email?: string;
  narodnost?: string;
  prijezd: string;
  odjezd?: string;
  apartman?: 'V1' | 'V2' | 'V3';
  kontakt?: string;
}) {
  return radekZRezervace({
    ...prazdnaRezervace(cast.id, '2026-01-01T00:00:00.000Z'),
    jmeno: cast.jmeno || 'Jan Novák',
    telefonRezervace: cast.telefon || null,
    telefonRezervaceWa: cast.telefon ? cast.telefon.replace(/\D/g, '') : null,
    emailHosta: cast.email || null,
    narodnost: cast.narodnost || 'CZE',
    prijezd: cast.prijezd,
    odjezd: cast.odjezd || '2026-03-05',
    apartman: cast.apartman || 'V3',
    kontaktUlozenKdy: cast.kontakt || null,
    stav: 'odeslano',
  });
}

describe('stálý host', () => {
  it('shodí se podle telefonu a spočítá pobyt', () => {
    const stary = karta({
      id: '1',
      telefon: '+420604111222',
      prijezd: '2026-03-01',
      odjezd: '2026-03-03',
      apartman: 'V3',
    });
    const novy = karta({
      id: '2',
      telefon: '+420 604 111 222',
      prijezd: '2026-10-01',
      odjezd: '2026-10-03',
      apartman: 'V1',
    });
    const info = stalyHostPro(novy, [stary, novy]);
    expect(info?.shoda).toBe('pevna');
    expect(info?.poradi).toBe(2);
    expect(textStalehoHosta(info!)).toContain('Stálý host · 2. pobyt');
    expect(textStalehoHosta(info!)).toContain('naposledy 3/2026, V3');
  });

  it('relay e-maily Booking a Airbnb se neshodují', () => {
    const a = karta({
      id: '1',
      email: 'abc@guest.booking.com',
      telefon: undefined,
      jmeno: 'Eva Test',
      prijezd: '2026-01-01',
    });
    const b = karta({
      id: '2',
      email: 'abc@guest.booking.com',
      telefon: undefined,
      jmeno: 'Eva Test',
      prijezd: '2026-06-01',
    });
    // bez telefonu a s relay emailem – jen slabá shoda jméno+národnost
    const info = stalyHostPro(b, [a, b]);
    expect(info?.shoda).toBe('slaba');
    expect(textStalehoHosta(info!)).toBe('Možná stálý host');
  });

  it('stejný e-mail (ne relay) je pevná shoda', () => {
    const a = karta({ id: '1', email: 'host@example.com', telefon: undefined, prijezd: '2026-01-01' });
    const b = karta({ id: '2', email: 'Host@Example.com', telefon: undefined, prijezd: '2026-06-01' });
    expect(stalyHostPro(b, [a, b])?.shoda).toBe('pevna');
  });

  it('nabídne telefon a kontakt z minula', () => {
    const stary = karta({
      id: '1',
      telefon: '+420777888999',
      prijezd: '2026-03-01',
      kontakt: '2026-03-02T10:00:00.000Z',
    });
    const novy = radekZRezervace({
      ...prazdnaRezervace('2', '2026-01-01T00:00:00.000Z'),
      jmeno: 'Jan Novák',
      narodnost: 'CZE',
      emailHosta: 'host@example.com',
      prijezd: '2026-10-01',
      odjezd: '2026-10-03',
      apartman: 'V1',
      stav: 'odeslano',
    });
    // pevná shoda přes e-mail – stary nemá email, potřebuji e-mail na starém
    const starySEmailem = { ...stary, email: 'host@example.com' };
    const info = stalyHostPro(novy, [starySEmailem, novy]);
    expect(info?.telefonZMinula).toContain('777');
    expect(info?.kontaktZMinula).toBe('2026-03-02T10:00:00.000Z');
  });

  it('doplnStaleHosty nepadá na prázdném seznamu', () => {
    expect(doplnStaleHosty([])).toEqual([]);
  });
});
