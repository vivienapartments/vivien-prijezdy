import { sOdkazem } from './prehled-odkazy';
import { dnesVPraze, posunDen, radekZRezervace, seradRadky, type PrehledRadek } from './prehled';
import { prazdnaRezervace, type RezervaceRecord } from './store';

/** Jen místní náhled přehledu. Na ostrém webu se tahle data neukážou. */
export function ukazkoveRadky(now = new Date()): PrehledRadek[] {
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
    telefon: '+420777111222',
    telefonWa: '420777111222',
    telefonPuvodni: '777 111 222',
    telefonRezervace: '+420777123456',
    telefonRezervaceWa: '420777123456',
    telefonRezervacePuvodni: '777 123 456',
    zdroj: 'Booking.com',
    casPrijezdu: '16:30',
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
    telefon: '+491701234567',
    telefonWa: '491701234567',
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

  return seradRadky([ceka, otevrel, neotevrel, stary].map((rec) => sOdkazem(radekZRezervace(rec), rec, now)), now);
}
