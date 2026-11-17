import { describe, expect, it } from 'vitest';
import {
  BANKA_CZK,
  BANKA_EUR,
  bankaProMene,
  cisloDokladu,
  emailNaDokladu,
  htmlDokladuSQr,
  parsujCenuBh,
  polozkyDokladu,
  sestavDokladZRezervace,
  spdPlatba,
  splatnostZalohy,
  zbytekCastky,
} from './faktura-doklad';
import { prazdnaRezervace } from './store';

describe('splatnostZalohy', () => {
  it('bere týden, nejpozději den příjezdu', () => {
    expect(splatnostZalohy('2026-11-20', '2026-11-10')).toBe('2026-11-17');
    expect(splatnostZalohy('2026-11-12', '2026-11-10')).toBe('2026-11-12');
    expect(splatnostZalohy(null, '2026-11-10')).toBe('2026-11-17');
  });
});

describe('parsujCenuBh', () => {
  it('přečte české i eurové zápisy', () => {
    expect(parsujCenuBh('4 719,85 Kč')).toEqual({ castka: 4719.85, mena: 'CZK' });
    expect(parsujCenuBh('180 EUR')).toEqual({ castka: 180, mena: 'EUR' });
    expect(parsujCenuBh('€ 99,50')).toEqual({ castka: 99.5, mena: 'EUR' });
    expect(parsujCenuBh('')).toBeNull();
  });
});

describe('spdPlatba', () => {
  it('sestaví český QR platební řetězec', () => {
    const spd = spdPlatba({
      iban: BANKA_CZK.iban,
      castka: 4719.85,
      mena: 'CZK',
      vs: '120260042',
    });
    expect(spd).toContain('SPD*1.0*ACC:CZ0420100000002103497397');
    expect(spd).toContain('AM:4719.85');
    expect(spd).toContain('CC:CZK');
    expect(spd).toContain('X-VS:120260042');
  });
});

describe('faktura-doklad', () => {
  it('spojuje číslo dokladu s rezervací a volí účet podle měny', () => {
    expect(cisloDokladu('120260042')).toBe('120260042');
    expect(bankaProMene('CZK')).toEqual(BANKA_CZK);
    expect(bankaProMene('EUR')).toEqual(BANKA_EUR);
  });

  it('faktura po odjezdu má odkaz + QR na rezervaci, ne platební QR', async () => {
    const rec = {
      ...prazdnaRezervace('120260042', '2026-11-16T10:00:00.000Z'),
      jmeno: 'Norbert Racz',
      apartman: 'V2' as const,
      prijezd: '2026-11-07',
      odjezd: '2026-11-10',
      noci: 3,
      osob: 1,
      jazyk: 'en' as const,
      mena: 'CZK' as const,
      cenaPobytu: 4569.85,
      poplatek: 'ano' as const,
      faktura: {
        typ: 'zahranici' as const,
        nazev: 'NR biz s.r.o.',
        adresa: 'Lehotského 1, Bratislava 811 06',
        zeme: 'Slovakia',
        ico: '50749153',
        email: 'firma@example.com',
        zadal: 'host' as const,
        kdy: '2026-11-10T12:00:00.000Z',
      },
    };
    const doklad = sestavDokladZRezervace(rec, {
      typ: 'faktura',
      lang: 'cs',
      apartmanNazev: 'Jemná harmonie',
      logoUrl: '/pruvodce/va-logo-faktura.png',
    });
    expect(doklad.vystaveno).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(doklad.splatnost).toBe(doklad.vystaveno);
    expect(doklad.uhrazeno).toBe(true);
    expect(polozkyDokladu(doklad).map((p) => p.celkem)).toEqual([4569.85, 150]);

    const html = await htmlDokladuSQr(doklad);
    expect(html).toContain('7. 11. 2026 – 10. 11. 2026');
    expect(html).toContain('CZ04 2010 0000 0021 0349 7397');
    expect(html).toContain('Doklad je uhrazený.');
    expect(html).toContain('href="https://www.vivienapartments.cz/cs/rezervace"');
    expect(html).toContain('www.vivienapartments.cz/cs/rezervace');
    expect(html).toContain('Budete znovu v Českých Budějovicích? Novou rezervaci uděláte na našem webu.');
    expect(html).toContain('Doklad je uhrazený.');
    expect(html).toContain('sum-stav');
    expect(html).toContain('sum-castka-cislo');
    expect(html).toMatch(/4\s*719,85\s*Kč/);
    expect(html).not.toContain('Celkem k úhradě');
    expect(html).toContain('QR na rezervaci');
    expect(html).toContain('pay-after');
    expect(html).toContain('promo-url');
    expect(html).toContain('data:image/png;base64,');
    expect(html).not.toContain('QR platba');
  });

  it('půlení Firma / Host dopočte zbytek a bere údaje hosta', async () => {
    expect(zbytekCastky(4719.85, 3000)).toBe(1719.85);
    const rec = {
      ...prazdnaRezervace('120260042', '2026-11-16T10:00:00.000Z'),
      jmeno: 'Norbert Racz',
      emailHosta: 'host@example.com',
      adresaHosta: 'Nádražní 1, České Budějovice',
      prijezd: '2026-11-07',
      odjezd: '2026-11-10',
      noci: 3,
      osob: 1,
      mena: 'CZK' as const,
      cenaPobytu: 4719.85,
      poplatek: 'ano' as const,
      faktura: {
        typ: 'cz' as const,
        nazev: 'Firma s.r.o.',
        adresa: 'Ulice 1',
        ico: '27074358',
        zadal: 'host' as const,
        kdy: '2026-11-10T12:00:00.000Z',
      },
    };
    const firma = sestavDokladZRezervace(rec, {
      typ: 'faktura',
      lang: 'cs',
      odberatel: 'firma',
      cenaPobytu: 3000,
    });
    const host = sestavDokladZRezervace(rec, {
      typ: 'faktura',
      lang: 'cs',
      odberatel: 'host',
      cenaPobytu: 1719.85,
    });
    expect(polozkyDokladu(firma).map((p) => p.celkem)).toEqual([3000]);
    expect(polozkyDokladu(host).map((p) => p.celkem)).toEqual([1719.85]);
    const htmlHost = await htmlDokladuSQr(host);
    expect(htmlHost).toContain('Norbert Racz');
    expect(htmlHost).toContain('Nádražní 1, České Budějovice');
    expect(htmlHost).toContain('host@example.com');
    expect(htmlHost).not.toContain('Firma s.r.o.');
  });

  it('bezHosta u firmy neuvede jméno hosta', async () => {
    const rec = {
      ...prazdnaRezervace('120260042', '2026-11-16T10:00:00.000Z'),
      jmeno: 'Norbert Racz',
      prijezd: '2026-11-07',
      odjezd: '2026-11-10',
      noci: 3,
      mena: 'CZK' as const,
      cenaPobytu: 3000,
      faktura: {
        typ: 'cz' as const,
        nazev: 'Firma s.r.o.',
        adresa: 'Ulice 1',
        ico: '27074358',
        zadal: 'host' as const,
        kdy: '2026-11-10T12:00:00.000Z',
      },
    };
    const doklad = sestavDokladZRezervace(rec, {
      typ: 'faktura',
      lang: 'cs',
      odberatel: 'firma',
      bezHosta: true,
    });
    expect(doklad.bezHosta).toBe(true);
    expect(doklad.hostJmeno).toBeNull();
    const html = await htmlDokladuSQr(doklad);
    expect(html).toContain('Firma s.r.o.');
    expect(html).not.toContain('Norbert Racz');
    expect(html).not.toMatch(/·\s*3×/);
  });

  it('u firmy neuvede e-mail hosta a poznámku jde skrýt', async () => {
    const rec = {
      ...prazdnaRezervace('120260042', '2026-11-16T10:00:00.000Z'),
      emailHosta: 'host@example.com',
      prijezd: '2026-11-07',
      odjezd: '2026-11-10',
      noci: 3,
      mena: 'CZK' as const,
      cenaPobytu: 3000,
      faktura: {
        typ: 'cz' as const,
        nazev: 'Firma s.r.o.',
        adresa: 'Ulice 1',
        ico: '27074358',
        email: 'host@example.com',
        poznamka: 'Interní text',
        zadal: 'host' as const,
        kdy: '2026-11-10T12:00:00.000Z',
      },
    };
    const doklad = sestavDokladZRezervace(rec, {
      typ: 'faktura',
      lang: 'cs',
      odberatel: 'firma',
      bezPoznamky: true,
    });
    expect(emailNaDokladu(doklad)).toBe('');
    expect(doklad.poznamkaDokladu).toBeNull();
    const html = await htmlDokladuSQr(doklad);
    expect(html).not.toContain('host@example.com');
    expect(html).not.toContain('Interní text');
  });

  it('zálohová má QR a splatnost za týden nejpozději k příjezdu', async () => {
    const rec = {
      ...prazdnaRezervace('120260042', '2026-11-16T10:00:00.000Z'),
      prijezd: '2026-11-20',
      odjezd: '2026-11-22',
      noci: 2,
      osob: 2,
      mena: 'CZK' as const,
      cenaPobytu: 3000,
      poplatek: 'ne' as const,
      faktura: {
        typ: 'cz' as const,
        ico: '27074358',
        nazev: 'Firma',
        adresa: 'Ulice 1',
        zadal: 'host' as const,
        kdy: '2026-11-16T12:00:00.000Z',
      },
    };
    const doklad = sestavDokladZRezervace(rec, {
      typ: 'zalohova',
      lang: 'cs',
      vystaveno: '2026-11-16',
    });
    expect(doklad.uhrazeno).toBe(false);
    expect(doklad.splatnost).toBe('2026-11-20');
    const html = await htmlDokladuSQr(doklad);
    expect(html).toContain('Zálohová faktura');
    expect(html).toContain('QR platba');
    expect(html).toContain('data:image/png;base64,');
  });
});
