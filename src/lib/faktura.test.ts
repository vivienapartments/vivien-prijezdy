import { describe, expect, it } from 'vitest';
import {
  coChybiNaFakture,
  fakturyKeVystaveni,
  fakturyPozdeji,
  fakturyVyrizene,
  jePlatneIco,
  normalizujIco,
  type FakturaUdaje,
} from './faktura';

const DNES = '2026-11-11';

function faktura(patch: Partial<FakturaUdaje> = {}): FakturaUdaje {
  return { typ: 'cz', ico: '27082440', zadal: 'host', kdy: '2026-11-01T10:00:00.000Z', hotovo: null, ...patch };
}

function rec(rezervace: string, odjezd: string | null, f: FakturaUdaje | null, stav = 'odeslano') {
  return { rezervace, jmeno: 'Host', apartman: 'V1', odjezd, stav, faktura: f };
}

describe('IČO', () => {
  it('platné IČO projde i s mezerami', () => {
    expect(jePlatneIco('27082440')).toBe(true);
    expect(jePlatneIco('270 824 40')).toBe(true);
    expect(normalizujIco('270 824 40')).toBe('27082440');
  });

  it('špatný součet, délka nebo písmena neprojdou', () => {
    expect(jePlatneIco('27082441')).toBe(false);
    expect(jePlatneIco('1234567')).toBe(false);
    expect(jePlatneIco('abcdefgh')).toBe(false);
    expect(jePlatneIco('')).toBe(false);
  });
});

describe('faktury k vystavení', () => {
  const list = [
    rec('A', '2026-11-10', faktura()),
    rec('B', DNES, faktura()),
    rec('C', '2026-11-15', faktura()),
    rec('D', '2026-11-09', null),
    rec('E', '2026-11-08', faktura({ hotovo: '2026-11-09T10:00:00.000Z' })),
  ];

  it('ke vystavení je odjezd dnes a dřív, seřazeno podle odjezdu', () => {
    expect(fakturyKeVystaveni(list, DNES).map((r) => r.rezervace)).toEqual(['A', 'B']);
  });

  it('budoucí odjezd je jen v sekci později', () => {
    expect(fakturyPozdeji(list, DNES).map((r) => r.rezervace)).toEqual(['C']);
  });

  it('zrušená rezervace s budoucím odjezdem se mezi později nepočítá', () => {
    expect(fakturyPozdeji([rec('Z', '2026-11-20', faktura(), 'zruseno')], DNES)).toEqual([]);
  });

  it('hotová faktura zmizí ze seznamů a je mezi vyřízenými', () => {
    expect(fakturyKeVystaveni(list, DNES).some((r) => r.rezervace === 'E')).toBe(false);
    expect(fakturyPozdeji(list, DNES).some((r) => r.rezervace === 'E')).toBe(false);
    expect(fakturyVyrizene(list, DNES).map((r) => r.rezervace)).toEqual(['E']);
  });

  it('po označení hotovo faktura ze seznamu ke vystavení odejde', () => {
    const hotova = list.map((r) =>
      r.rezervace === 'A' ? { ...r, faktura: faktura({ hotovo: '2026-11-11T08:00:00.000Z' }) } : r,
    );
    expect(fakturyKeVystaveni(hotova, DNES).map((r) => r.rezervace)).toEqual(['B']);
  });

  it('vrácená faktura se zase objeví', () => {
    const vracena = list.map((r) => (r.rezervace === 'E' ? { ...r, faktura: faktura({ hotovo: null }) } : r));
    expect(fakturyKeVystaveni(vracena, DNES).map((r) => r.rezervace)).toEqual(['E', 'A', 'B']);
  });
});

describe('co chybí na faktuře', () => {
  it('české firmě chybí název, adresa a e-mail', () => {
    expect(coChybiNaFakture(faktura())).toEqual(['název firmy', 'adresa', 'e-mail']);
  });

  it('úplná faktura nic nechybí', () => {
    expect(coChybiNaFakture(faktura({ nazev: 'Firma', adresa: 'Praha', email: 'a@b.cz' }))).toEqual([]);
  });

  it('zahraniční firmě chybí i země', () => {
    expect(coChybiNaFakture(faktura({ typ: 'zahranici', nazev: 'X', adresa: 'Y', email: 'a@b.cz' }))).toEqual(['země']);
  });
});
