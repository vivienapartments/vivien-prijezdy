/**
 * 15 fiktivních hostů (TEST…) podle nahled-karta-prulet-vsichni.html.
 * Jen Preview/local – klíče test-*.
 */

import type { KlientKarta, KlientRole, KlientTyp } from './klient-karta';
import { urovenZUtraty } from './klub-pravidla';
import { nadpisPobytuKlub } from './klub-termin-format';
import type { KlubPobytRadek, KlubPratelRadek } from './klub-ukazka';

const TED = '2026-11-26T12:00:00.000Z';
const DNES = '2026-11-26';

type Spec = {
  tajnyKlic: string;
  jmeno: string;
  prijmeni: string;
  situac: string;
  typ?: KlientTyp;
  role?: KlientRole[];
  firmaNazev?: string;
  utrataKc: number;
  utrataCekaKc: number;
  kreditKc: number;
  praveBydli: boolean;
  bookingRezim?: 'bez-klubu' | 'po-ubytovani' | null;
  nadchazejici: KlubPobytRadek[];
  pobyty: KlubPobytRadek[];
  pratele: KlubPratelRadek[];
  rezervaceId: string;
  apt?: string;
  prijezd?: string;
  odjezd?: string;
  cenaTed?: number;
  zdroj?: string;
  predano?: boolean;
  kartaPredana?: boolean;
};

function radek(
  prijezd: string,
  odjezd: string,
  apt: string,
  opts?: { kc?: number; barva?: KlubPobytRadek['barva']; stav?: string; pruvodce?: boolean },
): KlubPobytRadek {
  const barva = opts?.barva || 'zapocteno';
  return {
    nadpis: nadpisPobytuKlub(prijezd, odjezd, apt, opts?.kc),
    podnadpis: opts?.pruvodce ? 'Adresa, příjezd, kódy' : '',
    barva,
    stavText: opts?.stav || (barva === 'ceka' ? 'čeká' : barva === 'probiha' ? 'započítáno' : 'započítáno'),
    pruvodceUrl: opts?.pruvodce ? '/nahled?predano=1' : undefined,
  };
}

const SPECS: Spec[] = [
  {
    tajnyKlic: 'test-lenka-pred',
    jmeno: 'Lenka',
    prijmeni: 'Před',
    situac: 'Host · před příjezdem',
    utrataKc: 10000,
    utrataCekaKc: 4500,
    kreditKc: 150,
    praveBydli: false,
    nadchazejici: [radek('2026-12-01', '2026-12-03', 'V1', { barva: 'ceka', pruvodce: true })],
    pobyty: [
      radek('2026-12-01', '2026-12-03', 'V1', { kc: 4500, barva: 'ceka' }),
      radek('2026-10-10', '2026-10-12', 'V2', { kc: 5000 }),
      radek('2026-09-01', '2026-09-03', 'V1', { kc: 5000 }),
    ],
    pratele: [{ jmeno: 'Igor · září 2026', stav: 'přijel ✓' }],
    rezervaceId: 'TESTLENKA',
    apt: 'V1',
    prijezd: '2026-12-01',
    odjezd: '2026-12-03',
    cenaTed: 4500,
    zdroj: 'přímá',
  },
  {
    tajnyKlic: 'test-karel-verny',
    jmeno: 'Karel',
    prijmeni: 'Věrný',
    situac: 'Host · právě bydlí',
    utrataKc: 10000,
    utrataCekaKc: 4500,
    kreditKc: 300,
    praveBydli: true,
    nadchazejici: [radek('2026-11-26', '2026-11-28', 'V1', { barva: 'probiha', pruvodce: true })],
    pobyty: [
      radek('2026-11-26', '2026-11-28', 'V1', { kc: 4500, barva: 'probiha' }),
      radek('2026-11-06', '2026-11-07', 'V2', { kc: 4500 }),
      radek('2026-11-01', '2026-11-05', 'V1', { kc: 5500 }),
    ],
    pratele: [{ jmeno: 'Martin · říjen 2026', stav: 'přijel ✓' }],
    rezervaceId: 'TESTKAREL',
    apt: 'V1',
    prijezd: DNES,
    odjezd: '2026-11-28',
    cenaTed: 4500,
    zdroj: 'přímá',
    predano: true,
    kartaPredana: true,
  },
  {
    tajnyKlic: 'test-marie-po',
    jmeno: 'Marie',
    prijmeni: 'Po',
    situac: 'Host · po odjezdu (3+ pobyty)',
    utrataKc: 14500,
    utrataCekaKc: 0,
    kreditKc: 200,
    praveBydli: false,
    nadchazejici: [],
    pobyty: [
      radek('2026-11-20', '2026-11-23', 'V3', { kc: 4500 }),
      radek('2026-10-10', '2026-10-12', 'V1', { kc: 5000 }),
      radek('2026-09-01', '2026-09-03', 'V2', { kc: 5000 }),
    ],
    pratele: [
      { jmeno: 'Lucie · listopad 2026', stav: 'přijela ✓' },
      { jmeno: 'Tomáš · prosinec 2026', stav: 'čeká na pobyt' },
    ],
    rezervaceId: 'TESTMARIE',
    zdroj: 'přímá',
  },
  {
    tajnyKlic: 'test-verny-po-2',
    jmeno: 'Eva',
    prijmeni: 'Druhá',
    situac: 'Host · po 2. pobytu (poděkování návrat)',
    utrataKc: 9500,
    utrataCekaKc: 0,
    kreditKc: 100,
    praveBydli: false,
    nadchazejici: [],
    pobyty: [
      radek('2026-11-18', '2026-11-20', 'V2', { kc: 4500 }),
      radek('2026-09-05', '2026-09-07', 'V1', { kc: 5000 }),
    ],
    pratele: [],
    rezervaceId: 'TESTEVA2',
    zdroj: 'přímá',
  },
  {
    tajnyKlic: 'test-verny-po-1',
    jmeno: 'Petr',
    prijmeni: 'První',
    situac: 'Host · po 1. přímém pobytu (poděkování poznat)',
    utrataKc: 4500,
    utrataCekaKc: 0,
    kreditKc: 0,
    praveBydli: false,
    nadchazejici: [],
    pobyty: [radek('2026-11-20', '2026-11-22', 'V1', { kc: 4500 })],
    pratele: [],
    rezervaceId: 'TESTPETR1',
    zdroj: 'přímá',
  },
  {
    tajnyKlic: 'test-jana-zlata',
    jmeno: 'Jana',
    prijmeni: 'Zlatá',
    situac: 'Host · bydlí, posune ze Stříbrné na Zlatou',
    utrataKc: 28000,
    utrataCekaKc: 15000,
    kreditKc: 460,
    praveBydli: true,
    nadchazejici: [radek('2026-11-26', '2026-11-30', 'V4', { barva: 'probiha', pruvodce: true })],
    pobyty: [
      radek('2026-11-26', '2026-11-30', 'V4', { kc: 15000, barva: 'probiha' }),
      radek('2026-09-10', '2026-09-14', 'V2', { kc: 14000 }),
      radek('2026-06-01', '2026-06-05', 'V1', { kc: 14000 }),
    ],
    pratele: [{ jmeno: 'Eva · říjen 2026', stav: 'přijela ✓' }],
    rezervaceId: 'TESTJANA',
    apt: 'V4',
    prijezd: DNES,
    odjezd: '2026-11-30',
    cenaTed: 15000,
    zdroj: 'přímá',
    predano: true,
  },
  {
    tajnyKlic: 'test-max-po',
    jmeno: 'Max',
    prijmeni: 'Platina',
    situac: 'Host · po odjezdu, nejvyšší úroveň',
    utrataKc: 62000,
    utrataCekaKc: 0,
    kreditKc: 800,
    praveBydli: false,
    nadchazejici: [],
    pobyty: [
      radek('2026-11-10', '2026-11-15', 'V5', { kc: 12000 }),
      radek('2026-08-01', '2026-08-10', 'V1', { kc: 25000 }),
      radek('2026-04-01', '2026-04-08', 'V3', { kc: 25000 }),
    ],
    pratele: [
      { jmeno: 'Petr · květen 2026', stav: 'přijel ✓' },
      { jmeno: 'Hana · červen 2026', stav: 'přijela ✓' },
    ],
    rezervaceId: 'TESTMAXPO',
    zdroj: 'přímá',
  },
  {
    tajnyKlic: 'test-novy-host',
    jmeno: 'Nový',
    prijmeni: 'Host',
    situac: 'Nový host · před 1. pobytem',
    utrataKc: 0,
    utrataCekaKc: 4500,
    kreditKc: 0,
    praveBydli: false,
    nadchazejici: [radek('2026-12-05', '2026-12-07', 'V2', { barva: 'ceka', pruvodce: true })],
    pobyty: [radek('2026-12-05', '2026-12-07', 'V2', { kc: 4500, barva: 'ceka' })],
    pratele: [],
    rezervaceId: 'TESTNOVY',
    apt: 'V2',
    prijezd: '2026-12-05',
    odjezd: '2026-12-07',
    cenaTed: 4500,
    zdroj: 'přímá',
  },
  {
    tajnyKlic: 'test-eva-dop-pred',
    jmeno: 'Eva',
    prijmeni: 'Doporučená',
    situac: 'Doporučený host · před 1. pobytem',
    utrataKc: 0,
    utrataCekaKc: 4500,
    kreditKc: 0,
    praveBydli: false,
    role: ['host'],
    nadchazejici: [radek('2026-12-08', '2026-12-10', 'V1', { barva: 'ceka', pruvodce: true })],
    pobyty: [radek('2026-12-08', '2026-12-10', 'V1', { kc: 4500, barva: 'ceka' })],
    pratele: [],
    rezervaceId: 'TESTEVADP',
    apt: 'V1',
    prijezd: '2026-12-08',
    odjezd: '2026-12-10',
    cenaTed: 4500,
    zdroj: 'přímá',
  },
  {
    tajnyKlic: 'test-adam-dop-bydli',
    jmeno: 'Adam',
    prijmeni: 'DopBydlí',
    situac: 'Doporučený host · bydlí (1. pobyt)',
    utrataKc: 0,
    utrataCekaKc: 4500,
    kreditKc: 0,
    praveBydli: true,
    nadchazejici: [radek(DNES, '2026-11-28', 'V3', { barva: 'probiha', pruvodce: true })],
    pobyty: [radek(DNES, '2026-11-28', 'V3', { kc: 4500, barva: 'probiha' })],
    pratele: [],
    rezervaceId: 'TESTADAMDB',
    apt: 'V3',
    prijezd: DNES,
    odjezd: '2026-11-28',
    cenaTed: 4500,
    zdroj: 'přímá',
    predano: true,
  },
  {
    tajnyKlic: 'test-olga-dop-po',
    jmeno: 'Olga',
    prijmeni: 'DopPo',
    situac: 'Doporučený host · po 1. pobytu',
    utrataKc: 4500,
    utrataCekaKc: 0,
    kreditKc: 0,
    praveBydli: false,
    nadchazejici: [],
    pobyty: [radek('2026-11-18', '2026-11-20', 'V2', { kc: 4500 })],
    pratele: [],
    rezervaceId: 'TESTOLGADP',
    zdroj: 'přímá',
  },
  {
    tajnyKlic: 'test-pavel-tip',
    jmeno: 'Pavel',
    prijmeni: 'Tipař',
    situac: 'Doporučitel · u nás nebydlel',
    typ: 'host',
    role: ['doporucitel'],
    utrataKc: 0,
    utrataCekaKc: 0,
    kreditKc: 690,
    praveBydli: false,
    nadchazejici: [],
    pobyty: [],
    pratele: [
      { jmeno: 'Hotel Sever · listopad 2026', stav: 'přijeli ✓' },
      { jmeno: 'Jana · prosinec 2026', stav: 'čeká na pobyt' },
    ],
    rezervaceId: 'TESTPAVEL',
    zdroj: 'přímá',
  },
  {
    tajnyKlic: 'test-firma-prvni',
    jmeno: 'Firma',
    prijmeni: 'První',
    situac: 'Firma · první objednávka',
    typ: 'firma',
    role: ['firma', 'doporucitel'],
    firmaNazev: 'TEST Firma První s.r.o.',
    utrataKc: 0,
    utrataCekaKc: 8000,
    kreditKc: 0,
    praveBydli: false,
    nadchazejici: [radek('2026-12-12', '2026-12-15', 'V5', { barva: 'ceka', pruvodce: true })],
    pobyty: [radek('2026-12-12', '2026-12-15', 'V5', { kc: 8000, barva: 'ceka' })],
    pratele: [],
    rezervaceId: 'TESTFIRPRV',
    apt: 'V5',
    prijezd: '2026-12-12',
    odjezd: '2026-12-15',
    cenaTed: 8000,
    zdroj: 'přímá',
  },
  {
    tajnyKlic: 'test-firma-bydli',
    jmeno: 'Firma',
    prijmeni: 'Bydlí',
    situac: 'Firma · kolega právě bydlí',
    typ: 'firma',
    role: ['firma', 'doporucitel'],
    firmaNazev: 'TEST Firma Bydlí a.s.',
    utrataKc: 12000,
    utrataCekaKc: 8000,
    kreditKc: 460,
    praveBydli: true,
    nadchazejici: [radek(DNES, '2026-11-29', 'V2', { barva: 'probiha', pruvodce: true })],
    pobyty: [
      radek(DNES, '2026-11-29', 'V2', { kc: 8000, barva: 'probiha' }),
      radek('2026-10-01', '2026-10-04', 'V1', { kc: 12000 }),
    ],
    pratele: [{ jmeno: 'Hotel Jih · říjen 2026', stav: 'přijeli ✓' }],
    rezervaceId: 'TESTFIRBYD',
    apt: 'V2',
    prijezd: DNES,
    odjezd: '2026-11-29',
    cenaTed: 8000,
    zdroj: 'přímá',
    predano: true,
  },
  {
    tajnyKlic: 'test-firma-po',
    jmeno: 'Firma',
    prijmeni: 'Po',
    situac: 'Firma · po pobytech',
    typ: 'firma',
    role: ['firma', 'doporucitel'],
    firmaNazev: 'TEST Firma Po s.r.o.',
    utrataKc: 28000,
    utrataCekaKc: 0,
    kreditKc: 1200,
    praveBydli: false,
    nadchazejici: [],
    pobyty: [
      radek('2026-11-01', '2026-11-05', 'V4', { kc: 14000 }),
      radek('2026-08-10', '2026-08-14', 'V3', { kc: 14000 }),
    ],
    pratele: [{ jmeno: 'Partner XY · září 2026', stav: 'přijeli ✓' }],
    rezervaceId: 'TESTFIRPO',
    zdroj: 'přímá',
  },
  {
    tajnyKlic: 'test-tomas-oba',
    jmeno: 'Tomáš',
    prijmeni: 'Oba',
    situac: 'Doporučitel + host · bydlel i doporučuje',
    role: ['host', 'doporucitel'],
    utrataKc: 18000,
    utrataCekaKc: 0,
    kreditKc: 690,
    praveBydli: false,
    nadchazejici: [radek('2026-12-20', '2026-12-22', 'V1', { barva: 'ceka', pruvodce: true })],
    pobyty: [
      radek('2026-12-20', '2026-12-22', 'V1', { kc: 4500, barva: 'ceka' }),
      radek('2026-09-05', '2026-09-08', 'V5', { kc: 9000 }),
      radek('2026-05-01', '2026-05-04', 'V2', { kc: 9000 }),
    ],
    pratele: [
      { jmeno: 'Klára · červen 2026', stav: 'přijela ✓' },
      { jmeno: 'Milan · listopad 2026', stav: 'čeká na pobyt' },
    ],
    rezervaceId: 'TESTTOMAS',
    apt: 'V1',
    prijezd: '2026-12-20',
    odjezd: '2026-12-22',
    cenaTed: 4500,
    zdroj: 'přímá',
  },
  {
    tajnyKlic: 'test-max-pred',
    jmeno: 'Max',
    prijmeni: 'Před',
    situac: 'Host · před příjezdem, nejvyšší úroveň',
    utrataKc: 65000,
    utrataCekaKc: 9000,
    kreditKc: 500,
    praveBydli: false,
    nadchazejici: [radek('2026-12-02', '2026-12-05', 'V5', { barva: 'ceka', pruvodce: true })],
    pobyty: [
      radek('2026-12-02', '2026-12-05', 'V5', { kc: 9000, barva: 'ceka' }),
      radek('2026-07-01', '2026-07-10', 'V1', { kc: 30000 }),
      radek('2026-03-01', '2026-03-08', 'V4', { kc: 35000 }),
    ],
    pratele: [{ jmeno: 'Ivana · únor 2026', stav: 'přijela ✓' }],
    rezervaceId: 'TESTMAXPR',
    apt: 'V5',
    prijezd: '2026-12-02',
    odjezd: '2026-12-05',
    cenaTed: 9000,
    zdroj: 'přímá',
  },
  /** Booking mimo 15 situací průletu – 3 stavy Anny. */
  {
    tajnyKlic: 'test-anna-booking-pred',
    jmeno: 'Anna',
    prijmeni: 'Booking',
    situac: 'Booking · před příjezdem',
    utrataKc: 0,
    utrataCekaKc: 4500,
    kreditKc: 0,
    praveBydli: false,
    bookingRezim: 'bez-klubu',
    nadchazejici: [radek('2026-12-01', '2026-12-03', 'V1', { barva: 'ceka', pruvodce: true })],
    pobyty: [radek('2026-12-01', '2026-12-03', 'V1', { kc: 4500, barva: 'ceka', stav: 'nepočítá se' })],
    pratele: [],
    rezervaceId: 'TESTANPRED',
    apt: 'V1',
    prijezd: '2026-12-01',
    odjezd: '2026-12-03',
    cenaTed: 4500,
    zdroj: 'Booking.com',
  },
  {
    tajnyKlic: 'test-anna-booking-po-ubytovani',
    jmeno: 'Anna',
    prijmeni: 'Booking',
    situac: 'Booking · po ubytování (karta Host 5 %)',
    utrataKc: 0,
    utrataCekaKc: 0,
    kreditKc: 0,
    praveBydli: true,
    bookingRezim: 'po-ubytovani',
    nadchazejici: [radek(DNES, '2026-11-28', 'V2', { barva: 'probiha', pruvodce: true })],
    pobyty: [radek(DNES, '2026-11-28', 'V2', { kc: 4500, barva: 'probiha', stav: 'nepočítá se' })],
    pratele: [],
    rezervaceId: 'TESTANPOUB',
    apt: 'V2',
    prijezd: DNES,
    odjezd: '2026-11-28',
    cenaTed: 4500,
    zdroj: 'Booking.com',
    predano: true,
    kartaPredana: true,
  },
  {
    tajnyKlic: 'test-anna-booking-po',
    jmeno: 'Anna',
    prijmeni: 'Booking',
    situac: 'Booking · po odjezdu',
    utrataKc: 0,
    utrataCekaKc: 0,
    kreditKc: 0,
    praveBydli: false,
    bookingRezim: 'po-ubytovani',
    nadchazejici: [],
    pobyty: [radek('2026-11-20', '2026-11-23', 'V2', { kc: 4500, barva: 'ceka', stav: 'nepočítá se' })],
    pratele: [],
    rezervaceId: 'TESTANPO',
    zdroj: 'Booking.com',
    predano: true,
    kartaPredana: true,
  },
];

function zeSpec(s: Spec) {
  const typ: KlientTyp = s.typ || (s.firmaNazev ? 'firma' : 'host');
  const role: KlientRole[] = s.role || (typ === 'firma' ? ['firma', 'doporucitel'] : ['host']);
  const u = urovenZUtraty(s.utrataKc);
  const karta: KlientKarta = {
    id: `k-${s.tajnyKlic}`,
    kod: s.tajnyKlic.replace(/^test-/, '').replace(/-/g, '').slice(0, 10).toUpperCase() || 'TEST',
    tajnyKlic: s.tajnyKlic,
    datumZalozeni: TED,
    typ,
    role,
    stav: 'aktivni',
    jmeno: s.jmeno,
    prijmeni: s.prijmeni,
    email: 'info@vivienapartments.cz',
    telefon: '+420777702272',
    jazyk: 'cs',
    rezervace: [s.rezervaceId],
    firma: s.firmaNazev
      ? { ico: '12345678', dic: '', nazev: s.firmaNazev, sidlo: 'České Budějovice', platceDph: false }
      : null,
    utrataKc: s.utrataKc,
    utrataRucne:
      s.utrataKc > 0
        ? [{ id: 'u1', castka: s.utrataKc, kdy: TED, poznamka: 'zkouška TEST' }]
        : [],
    urovenId: u.id,
    kredit:
      s.kreditKc > 0
        ? [{ id: 'kr1', castka: s.kreditKc, pouzito: 0, kdy: TED, poznamka: 'zkouška' }]
        : [],
    kreditKc: s.kreditKc,
    dopKodPuvod: null,
    poznamka: s.situac,
    zalozil: 'klub-test-hoste',
    slevaBehem: [],
    slevaKontrola: null,
    podekovaniVidel: s.praveBydli ? null : TED,
    podekovaniVarianta: null,
    podekovaniVariantaPobyt: null,
    podekovaniVariantaPred: null,
  };

  return {
    id: karta.id,
    kod: karta.kod,
    tajnyKlic: s.tajnyKlic,
    jmeno: s.jmeno,
    prijmeni: s.prijmeni,
    email: karta.email,
    telefon: karta.telefon,
    typ,
    firmaNazev: s.firmaNazev || null,
    utrataKc: s.utrataKc,
    utrataCekaKc: s.utrataCekaKc,
    kreditKc: s.kreditKc,
    urovenNazev: typ === 'firma' ? u.nazevFirma : u.nazevHost,
    slevaPct: u.slevaPct,
    pocetPobytu: s.pobyty.length,
    posledniPobyt: null,
    pristiPobyt: null,
    praveBydli: s.praveBydli,
    karta,
    nadchazejici: s.nadchazejici,
    pobyty: s.pobyty,
    pratele: s.pratele,
    bookingRezim: s.bookingRezim ?? null,
    situac: s.situac,
  };
}

let cache: ReturnType<typeof zeSpec>[] | null = null;

export function seznamTestHostu() {
  if (!cache) cache = SPECS.map(zeSpec);
  return cache;
}

export function najdiTestHostaPodleKlice(k: string) {
  const key = (k || '').trim();
  if (!key.startsWith('test-')) return null;
  return seznamTestHostu().find((x) => x.tajnyKlic === key) || null;
}

export function specTestHostuProSeed() {
  return SPECS;
}
