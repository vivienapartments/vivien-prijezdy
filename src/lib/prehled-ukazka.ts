import { sOdkazem } from './prehled-odkazy';
import { dnesVPraze, posunDen, radekZRezervace, seradRadky, type PrehledRadek } from './prehled';
import { verzeAktualni } from './pravidla-verze';
import { prazdnaRezervace, type RezervaceRecord } from './store';

/** Jen místní náhled přehledu. Na ostrém webu se tahle data neukážou. */
export function ukazkoveZaznamy(now = new Date()): RezervaceRecord[] {
  const dnes = dnesVPraze(now);
  const zitra = posunDen(dnes, 1);
  const pozitri = posunDen(dnes, 2);

  const otevrel: RezervaceRecord = {
    ...prazdnaRezervace('9001', '2026-10-11T06:00:00.000Z'),
    apartman: 'V1',
    prijezd: dnes,
    odjezd: posunDen(dnes, 2),
    noci: 2,
    osob: 2,
    jazyk: 'cs',
    jmeno: 'Anna Svobodová',
    krestni: 'Anna',
    narodnost: 'CZE',
    emailHosta: 'anna.ukazka@example.com',
    accessPin: '0000',
    vytvoreno: '2026-10-06',
    poplatek: 'ano',
    stav: 'odeslano',
    rucniZnacky: [{ pole: 'telefon', cas: '2026-10-14T08:00:00.000Z' }],
    navrhy: [{ pole: 'telefon', od: 'check-in', hodnota: '+420777999000' }],
    telefon: '+420777111222',
    telefonWa: '420777111222',
    telefonPuvodni: '777 111 222',
    telefonRezervace: '+420777123456',
    telefonRezervaceWa: '420777123456',
    telefonRezervacePuvodni: '777 123 456',
    zdroj: 'Booking.com',
    casPrijezdu: '16:30',
    casZadalHost: true,
    souhlasPravidel: { kdy: '2026-10-14T12:15:00.000Z', jazyk: 'cs', verze: verzeAktualni() },
    zpusobPrijezdu: 'auto',
    telefonBrana: '+420777111222',
    spz: '1C23456',
    branaRegistrovano: null,
    otevrenoPocet: 3,
    otevrenoPoprve: '2026-10-10T12:32:00.000Z',
    otevrenoNaposled: '2026-10-10T12:32:00.000Z',
  };

  const neotevrel: RezervaceRecord = {
    ...prazdnaRezervace('9002', '2026-10-11T07:00:00.000Z'),
    apartman: 'V2',
    prijezd: zitra,
    odjezd: posunDen(zitra, 3),
    noci: 3,
    osob: 1,
    jazyk: 'de',
    jmeno: 'Hans Müller',
    krestni: 'Hans',
    narodnost: 'DEU',
    emailHosta: 'hans.ukazka@example.com',
    accessPin: '0000',
    vytvoreno: '2026-09-20',
    poplatek: 'ne',
    stav: 'neodeslano',
    telefon: '1701234567',
    telefonWa: null,
    zdroj: 'Airbnb',
    casPrijezdu: '11:00',
    otevrenoPocet: 0,
  };

  const ceka: RezervaceRecord = {
    ...prazdnaRezervace('8004', '2026-10-11T05:00:00.000Z'),
    apartman: 'V3',
    prijezd: dnes,
    odjezd: posunDen(dnes, 3),
    noci: 3,
    osob: 2,
    jazyk: 'cs',
    jmeno: 'Eva Dvořáková',
    krestni: 'Eva',
    emailHosta: 'eva.ukazka@example.com',
    vytvoreno: '2026-10-08',
    poplatek: 'ano',
    stav: 'bez_checkinu',
    telefonRezervace: '+420777123456',
    telefonRezervaceWa: '420777123456',
    telefonRezervacePuvodni: '777 123 456',
    zdroj: 'Booking',
    checkinUrl: 'https://checkin.example.com/ukazka',
    otevrenoPocet: 0,
  };

  const bezCasu: RezervaceRecord = {
    ...prazdnaRezervace('8005', '2026-10-11T06:30:00.000Z'),
    apartman: 'V4',
    prijezd: dnes,
    odjezd: posunDen(dnes, 2),
    noci: 2,
    osob: 2,
    jazyk: 'cs',
    jmeno: 'Lucie Horáková',
    krestni: 'Lucie',
    narodnost: 'CZE',
    emailHosta: 'lucie.ukazka@example.com',
    accessPin: '0000',
    vytvoreno: '2026-10-07',
    poplatek: 'ano',
    stav: 'odeslano',
    telefon: '+420777222333',
    telefonWa: '420777222333',
    telefonPuvodni: '777 222 333',
    zdroj: 'přímá',
    casPrijezdu: null,
    otevrenoPocet: 1,
    otevrenoPoprve: '2026-10-10T09:00:00.000Z',
    otevrenoNaposled: '2026-10-10T09:00:00.000Z',
    predano: '2026-10-13T13:42:00.000Z',
    zaplaceno: '2026-10-13T13:50:00.000Z',
    poplatekVybral: 'nikol',
  };

  const bezCasuPozdeji: RezervaceRecord = {
    ...prazdnaRezervace('8006', '2026-10-11T08:00:00.000Z'),
    apartman: 'V5',
    prijezd: posunDen(dnes, 3),
    odjezd: posunDen(dnes, 5),
    noci: 2,
    osob: 1,
    jazyk: 'cs',
    jmeno: 'Martin Černý',
    krestni: 'Martin',
    narodnost: 'CZE',
    emailHosta: 'martin.ukazka@example.com',
    accessPin: '0000',
    vytvoreno: '2026-10-04',
    poplatek: 'ano',
    stav: 'odeslano',
    telefon: '+420777333444',
    telefonWa: '420777333444',
    zdroj: 'Booking',
    casPrijezdu: null,
    otevrenoPocet: 2,
    otevrenoPoprve: '2026-10-10T15:00:00.000Z',
    otevrenoNaposled: '2026-10-10T15:00:00.000Z',
  };

  const stary: RezervaceRecord = {
    ...prazdnaRezervace('9003', '2026-10-09T08:00:00.000Z'),
    prijezd: pozitri,
    odjezd: posunDen(pozitri, 1),
    stav: 'odeslano',
    poplatek: 'neznamo',
    otevrenoPocet: null,
    jmeno: null,
    emailHosta: null,
    apartman: null,
  };

  const odjel: RezervaceRecord = {
    ...prazdnaRezervace('7001', '2026-10-01T08:00:00.000Z'),
    apartman: 'V4',
    prijezd: posunDen(dnes, -4),
    odjezd: posunDen(dnes, -1),
    noci: 3,
    osob: 2,
    jazyk: 'cs',
    jmeno: 'Petra Malá',
    krestni: 'Petra',
    narodnost: 'CZE',
    emailHosta: 'petra.ukazka@example.com',
    accessPin: '0000',
    vytvoreno: '2026-09-20',
    poplatek: 'ano',
    stav: 'odeslano',
    telefon: '+420777444555',
    telefonWa: '420777444555',
    zdroj: 'Booking',
    otevrenoPocet: 2,
    otevrenoPoprve: '2026-10-08T10:00:00.000Z',
    otevrenoNaposled: '2026-10-08T10:00:00.000Z',
  };

  return [ceka, otevrel, bezCasu, neotevrel, bezCasuPozdeji, stary, odjel];
}

export function ukazkoveRadky(now = new Date()): PrehledRadek[] {
  return seradRadky(
    ukazkoveZaznamy(now).map((rec) => sOdkazem(radekZRezervace(rec), rec, now)),
    now,
  );
}

export function ukazkovaRezervace(id: string, now = new Date()): RezervaceRecord | null {
  return ukazkoveZaznamy(now).find((rec) => rec.rezervace === id) || null;
}
