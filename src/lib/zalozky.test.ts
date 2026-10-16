import { describe, expect, it } from 'vitest';
import { casVPraze } from './brana';
import { maUpozornitPul } from './odjezd';
import { dluhZmizel, vratPlatbu, zaplatDruhy } from './platby-hosta';
import { prazdnaRezervace, type RezervaceRecord } from './store';
import { zapisMajitele } from './rucni-pole';
import {
  casPrevzetiVyprsel,
  hledejHosty,
  jeHostOdjetly,
  jeNove,
  jeVDnesnichOdjezdech,
  otisk,
  seradNedoplatky,
  textHromadne,
  textStarychDluhu,
  vratPrevzeti,
  vychoziZalozka,
  type HostHledani,
} from './zalozky';

const DEN = '2026-10-16';
const VCERA = '2026-10-15';

function host(patch: Partial<HostHledani> = {}): HostHledani {
  return {
    rezervace: '1',
    jmeno: 'Jan Novák',
    apartman: 'V1',
    prijezd: '2026-10-10',
    odjezd: '2026-10-12',
    stav: 'odeslano',
    dluhKc: 0,
    ...patch,
  };
}

describe('dnešní odjezdy', () => {
  const vPoledne = new Date('2026-10-16T10:01:00.000Z');

  it('host s odjezdem dnes v 10:00 ve 12:01 v seznamu není', () => {
    const clovek = { odjezd: DEN, casOdjezdu: '10:00', prevzatoKdy: null, stav: 'odeslano' };
    expect(jeVDnesnichOdjezdech(clovek, DEN, vPoledne)).toBe(false);
    expect(jeVDnesnichOdjezdech(clovek, DEN, new Date('2026-10-16T09:59:00.000Z'))).toBe(true);
    expect(casPrevzetiVyprsel(null, DEN, new Date('2026-10-16T10:00:00.000Z'))).toBe(true);
    expect(casPrevzetiVyprsel(null, DEN, new Date('2026-10-16T09:59:00.000Z'))).toBe(false);
  });

  it('po Převzato zmizí hned a dluh ho v odjezdech nedrží', () => {
    const sDluhem = { odjezd: DEN, casOdjezdu: '18:00', prevzatoKdy: '2026-10-16T08:00:00.000Z', stav: 'odeslano' };
    expect(jeVDnesnichOdjezdech(sDluhem, DEN, new Date('2026-10-16T08:05:00.000Z'))).toBe(false);
    expect(jeHostOdjetly(sDluhem, DEN, new Date('2026-10-16T08:05:00.000Z'))).toBe(true);
  });

  it('včerejší odjezd s dluhem není v dnešních odjezdech a patří do nedoplatků', () => {
    const vcera = { odjezd: VCERA, casOdjezdu: '10:00', prevzatoKdy: null, stav: 'odeslano' };
    expect(jeVDnesnichOdjezdech(vcera, DEN, vPoledne)).toBe(false);
    const serazene = seradNedoplatky(
      [
        { id: 'stary', odjezd: '2026-10-01', kc: 200 },
        { id: 'vcera', odjezd: VCERA, kc: 400 },
        { id: 'dnes', odjezd: DEN, kc: 100 },
      ],
      DEN,
    );
    expect(serazene.map((h) => h.id)).toEqual(['dnes', 'vcera', 'stary']);
  });

  it('Vrátit odjezd hosta vrátí mezi odjezdy', () => {
    const rec = {
      ...prazdnaRezervace('9', '2026-10-16T08:00:00.000Z'),
      odjezd: DEN,
      prevzatoKdy: '2026-10-16T08:10:00.000Z',
      prevzatoAuto: false,
    };
    const zpet = vratPrevzeti(rec, new Date('2026-10-16T09:00:00.000Z'));
    expect(zpet.prevzatoKdy).toBeNull();
    expect(jeVDnesnichOdjezdech({ odjezd: DEN, casOdjezdu: '18:00', prevzatoKdy: zpet.prevzatoKdy, stav: 'odeslano' }, DEN, new Date('2026-10-16T09:00:00.000Z'))).toBe(true);
    expect(zpet.historie.at(-1)?.co).toContain('Vrácen odjezd');
  });
});

describe('platby', () => {
  const now = new Date('2026-10-16T09:00:00.000Z');

  function dluznik(): RezervaceRecord {
    return {
      ...prazdnaRezervace('9', '2026-10-01T08:00:00.000Z'),
      odjezd: VCERA,
      prijezd: '2026-10-12',
      noci: 2,
      osob: 2,
      poplatek: 'ano' as const,
      priplatekRucni: 200,
      stav: 'odeslano' as const,
    };
  }

  it('Zaplaceno položky i hromadně jde vrátit', () => {
    let rec = dluznik();
    rec = zaplatDruhy(rec, ['poplatek'], 'hotove', 'nikol', now);
    expect(dluhZmizel(rec)).toBe(false);
    expect(rec.platby.map((p) => p.druh)).toEqual(['poplatek']);
    rec = zaplatDruhy(rec, ['vse'], 'karta', 'pravoslav', now);
    expect(dluhZmizel(rec)).toBe(true);
    rec = vratPlatbu(rec, 'prijezd', now);
    expect(dluhZmizel(rec)).toBe(false);
    expect(rec.platby.map((p) => p.druh)).toEqual(['poplatek']);
  });

  it('u odjetého hosta jde změnit platbu, telefon, čas i počet osob', () => {
    let rec = dluznik();
    rec = zapisMajitele(rec, 'telefon', { telefon: '+420777000111', telefonWa: '420777000111' }, 'Telefon');
    rec = zapisMajitele(rec, 'casPrijezdu', { casPrijezdu: '16:00' }, 'Čas příjezdu');
    rec = zapisMajitele(rec, 'osob', { osob: 3 }, 'Počet osob');
    rec = zaplatDruhy(rec, ['vse'], 'prevod', 'pravoslav', now);
    expect(rec.telefon).toBe('+420777000111');
    expect(rec.casPrijezdu).toBe('16:00');
    expect(rec.osob).toBe(3);
    expect(dluhZmizel(rec)).toBe(true);
    expect(rec.historie.some((h) => h.co.includes('Zapsal Pravoslav'))).toBe(true);
  });

  it('po odjezdu automatické upozornění neodejde', () => {
    const rec = {
      ...prazdnaRezervace('9', '2026-10-16T06:00:00.000Z'),
      odjezd: DEN,
      casOdjezdu: '10:00',
      stav: 'odeslano' as const,
      prevzatoKdy: '2026-10-16T08:00:00.000Z',
    };
    const pul = new Date(casVPraze(DEN, 9, 40).getTime());
    expect(maUpozornitPul(rec, pul)).toBe(false);
    const vcera = { ...rec, prevzatoKdy: null, odjezd: VCERA, casOdjezdu: '10:00' };
    expect(maUpozornitPul(vcera, new Date('2026-10-16T08:00:00.000Z'))).toBe(false);
  });
});

describe('záložky a hledání', () => {
  it('číslo zčervená jen po nové položce a výchozí záložka jsou Příjezdy', () => {
    const prvni = otisk([{ id: 'a', kc: 400 }]);
    expect(jeNove(prvni, null)).toBe(true);
    expect(jeNove(prvni, prvni)).toBe(false);
    expect(jeNove(otisk([{ id: 'a', kc: 400 }, { id: 'b', kc: 200 }]), prvni)).toBe(true);
    expect(jeNove('', null)).toBe(false);
    expect(vychoziZalozka(null, DEN, null)).toBe('prijezdy');
    expect(vychoziZalozka({ den: '2026-10-15', zalozka: 'dluhy' }, DEN, null)).toBe('prijezdy');
    expect(vychoziZalozka({ den: DEN, zalozka: 'hledat' }, DEN, null)).toBe('hledat');
    expect(vychoziZalozka({ den: DEN, zalozka: 'hledat' }, DEN, 'dluhy')).toBe('dluhy');
  });

  it('jelinek najde Jelínek, a taky číslo rezervace a datum', () => {
    const hoste = [
      host({ rezervace: '5551', jmeno: 'Jan Jelínek', apartman: 'V2', prijezd: '2026-10-13', odjezd: '2026-10-15', dluhKc: 400 }),
      host({ rezervace: '5552', jmeno: 'Petra Malá', apartman: 'V4', stav: 'zruseno' }),
    ];
    expect(hledejHosty(hoste, 'jelinek', '', DEN, '2026-10-17').map((h) => h.rezervace)).toEqual(['5551']);
    expect(hledejHosty(hoste, '5552', '', DEN, '2026-10-17').map((h) => h.jmeno)).toEqual(['Petra Malá']);
    expect(hledejHosty(hoste, '15.10.', '', DEN, '2026-10-17').map((h) => h.rezervace)).toEqual(['5551']);
    expect(hledejHosty(hoste, 'v2', '', DEN, '2026-10-17')).toHaveLength(1);
  });

  it('souhrn starších nedoplatků a hromadné potvrzení', () => {
    expect(textStarychDluhu(2, 600)).toBe('Starší nedoplatky: 2 hosté, 600 Kč');
    expect(textStarychDluhu(0, 0)).toBeNull();
    expect(textHromadne(5, 2400)).toBe('Označit 5 hostů (2 400 Kč) jako zaplacené?');
  });
});
