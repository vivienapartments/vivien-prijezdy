import { describe, expect, it } from 'vitest';
import {
  firmaZKodu,
  nociMezi,
  overTerminy,
  POPTAVKA_SLEVA_PCT,
  sestavZpravuPoptavky,
  textTelegramPoptavky,
} from './poptavka';

describe('poptavka', () => {
  it('pozná firmu z kódu', () => {
    expect(firmaZKodu('RACCOON')?.nazev).toBe('RACCOON');
    expect(firmaZKodu('neznama')).toBeNull();
  });

  it('ověří termíny', () => {
    expect(overTerminy('2026-12-01', '2026-12-03', '2026-11-20').ok).toBe(true);
    expect(overTerminy('2026-11-19', '2026-11-21', '2026-11-20').ok).toBe(false);
    expect(overTerminy('2026-12-03', '2026-12-01', '2026-11-20').ok).toBe(false);
  });

  it('spočíta noci', () => {
    expect(nociMezi('2026-12-01', '2026-12-03')).toBe(2);
  });

  it('složí telegram s českým termínem a slevou', () => {
    const text = textTelegramPoptavky(
      {
        id: 'p1',
        cas: '2026-11-22T12:00:00.000Z',
        zdroj: 'doporucitel',
        firmaKod: null,
        firmaNazev: null,
        doporucitelKod: 'a692c6',
        rezervace: null,
        jmeno: 'Anna',
        telefon: '+420604692573',
        prijezd: '2026-11-25',
        odjezd: '2026-11-26',
        apartmany: ['V2'],
        libovolnyApartman: false,
        doprava: null,
        poznamka: '',
        jazyk: 'cs',
        kanal: 'formular',
        stav: 'nova',
      },
      {
        seSlevouKc: 1473,
        slevaPct: 5,
        doporucitelJmeno: 'Petr',
      },
    );
    expect(text).toContain('25.–26. 11.');
    expect(text).toContain('1 noc');
    expect(text).toContain('Zlatá rovnováha');
    expect(text.replace(/\u00a0/g, ' ')).toContain('1 473 Kč, sleva 5 %');
    expect(text).toContain('doporučení od: Petr');
  });

  it('složí zprávu se slevou bez ceny', () => {
    const text = sestavZpravuPoptavky({
      zdroj: 'firma',
      firmaNazev: 'RACCOON',
      jmeno: 'Jan Novák',
      telefon: '+420777123456',
      prijezd: '2026-12-01',
      odjezd: '2026-12-02',
      apartmany: ['V2'],
      libovolnyApartman: false,
      doprava: 'pesky',
    });
    expect(text).toContain('RACCOON');
    expect(text).toContain('Zlatá rovnováha');
    expect(text).toContain(`${POPTAVKA_SLEVA_PCT} %`);
    expect(text).toContain('dopočítáme');
    expect(text).toContain('pěšky');
  });
});
