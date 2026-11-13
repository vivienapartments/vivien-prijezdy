import { describe, expect, it } from 'vitest';
import {
  coChybiNaFakture,
  fakturyKeVystaveni,
  fakturyPozdeji,
  fakturyVyrizene,
  jePlatneIco,
  normalizujIco,
  normalizujIcoZahranici,
  sestavFakturu,
  sestavZpravuFaktury,
  textZminujeFakturu,
  vychoziTypFaktury,
  type FakturaUdaje,
} from './faktura';
import {
  FAKTURA_SLOVA,
  FAKTURA_ZPRAVA_BEZ_PRUVODCE,
  FAKTURA_ZPRAVA_HOSTOVI,
} from './faktura-texty';
import { GUIDE_LANGS } from './types';

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

  it('zrušená rezervace zmizí i z faktur k vystavení', () => {
    expect(fakturyKeVystaveni([rec('Z', '2026-11-09', faktura(), 'zruseno')], DNES)).toEqual([]);
    expect(fakturyKeVystaveni([rec('Z', DNES, faktura(), 'zruseno')], DNES)).toEqual([]);
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

describe('zahraniční IČO a zpráva', () => {
  it('registrační číslo ořízne na 30 znaků bez kontrolního součtu', () => {
    expect(normalizujIcoZahranici('  SK123  ')).toBe('SK123');
    expect(normalizujIcoZahranici('x'.repeat(40)).length).toBe(30);
  });

  it('sestaví zahraniční fakturu s registračním číslem', () => {
    const v = sestavFakturu(
      {
        typ: 'zahranici',
        ico: 'SK2020123456',
        nazev: 'Firma',
        adresa: 'Bratislava',
        zeme: 'Slovensko',
      },
      'host',
      '2026-11-13T10:00:00.000Z',
      null,
    );
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.faktura.ico).toBe('SK2020123456');
  });

  it('výchozí typ podle jazyka', () => {
    expect(vychoziTypFaktury('cs')).toBe('cz');
    expect(vychoziTypFaktury('sk')).toBe('zahranici');
    expect(vychoziTypFaktury('de')).toBe('zahranici');
  });

  it('zpráva s průvodcem má kotvu #faktura', () => {
    const v = sestavZpravuFaktury(
      'Odkaz: {odkaz}',
      'Check-in: {odkaz}',
      'https://example.com/abc',
      'https://checkin.example',
    );
    expect(v).toEqual({ ok: true, druh: 'pruvodce', text: 'Odkaz: https://example.com/abc#faktura' });
  });

  it('bez průvodce použije check-in', () => {
    const v = sestavZpravuFaktury('A {odkaz}', 'B {odkaz}', null, 'https://checkin.example');
    expect(v).toEqual({ ok: true, druh: 'checkin', text: 'B https://checkin.example' });
  });

  it('bez odkazů hlásí chybějící check-in', () => {
    expect(sestavZpravuFaktury('A {odkaz}', 'B {odkaz}', null, null)).toEqual({
      ok: false,
      duvod: 'chybi_checkin_odkaz',
    });
  });

  it('text pozná slovo faktura', () => {
    expect(textZminujeFakturu('Potřebuji fakturu prosím', FAKTURA_SLOVA)).toBe(true);
    expect(textZminujeFakturu('Need an INVOICE', FAKTURA_SLOVA)).toBe(true);
    expect(textZminujeFakturu('Dobrý den', FAKTURA_SLOVA)).toBe(false);
  });

  it('všechny jazyky mají {odkaz} ve zprávách', () => {
    for (const lang of GUIDE_LANGS) {
      expect(FAKTURA_ZPRAVA_HOSTOVI[lang]).toContain('{odkaz}');
      expect(FAKTURA_ZPRAVA_BEZ_PRUVODCE[lang]).toContain('{odkaz}');
    }
  });
});
