/**
 * Ukázkové karty pro zkoušku /klub?k=ukazka-host|ukazka-dop|ukazka-firma.
 * Neukládají se do KV.
 */

import type { KlientKarta, KlientRole } from './klient-karta';
import { VYCHOZI_KLUB_PRAVIDLA, urovenZUtraty } from './klub-pravidla';
import type { GuideLang } from './types';

export type KlubUkazkaId =
  | 'ukazka-host'
  | 'ukazka-host-pred'
  | 'ukazka-host-po'
  | 'ukazka-dop'
  | 'ukazka-firma'
  | 'ukazka-flidr'
  | 'ukazka-sofia'
  | 'ukazka-egd';

export type KlubPobytRadek = {
  nadpis: string;
  podnadpis: string;
  pruvodceUrl?: string | null;
};

export type KlubPratelRadek = {
  jmeno: string;
  stav: string;
};

export type KlubKartaPohled = {
  ukazka: boolean;
  pohled: KlientRole;
  jmenoZobrazeni: string;
  jazyk: GuideLang;
  kod: string;
  tajnyKlic: string;
  utrataKc: number;
  kreditKc: number;
  slevaPct: number;
  urovenId: string;
  urovenNazev: string;
  role: KlientRole[];
  firmaNazev: string | null;
  firmaIco: string | null;
  firmaSidlo: string | null;
  nadchazejici: KlubPobytRadek[];
  pobyty: KlubPobytRadek[];
  pratele: KlubPratelRadek[];
  kreditCeka: number;
  kreditKVyplate: number;
  kreditVyplaceno: number;
  odkazDoporuceni: string;
};

const UROVNE = VYCHOZI_KLUB_PRAVIDLA.urovne;

function kartaZaklad(
  cast: Partial<KlientKarta> & Pick<KlientKarta, 'id' | 'kod' | 'typ' | 'tajnyKlic'>,
): KlientKarta {
  const role: KlientRole[] =
    cast.role && cast.role.length
      ? cast.role
      : cast.typ === 'firma'
        ? ['firma', 'doporucitel']
        : cast.typ === 'host'
          ? ['host', 'doporucitel']
          : ['doporucitel'];
  const utrataKc = typeof cast.utrataKc === 'number' ? cast.utrataKc : 0;
  const u = urovenZUtraty(utrataKc);
  return {
    id: cast.id,
    kod: cast.kod,
    tajnyKlic: cast.tajnyKlic,
    datumZalozeni: cast.datumZalozeni || '2026-01-15T10:00:00.000Z',
    typ: cast.typ,
    role,
    stav: 'aktivni',
    jmeno: cast.jmeno || '',
    prijmeni: cast.prijmeni || '',
    email: cast.email || 'zkouska@example.com',
    telefon: cast.telefon || '+420777000001',
    jazyk: cast.jazyk || 'cs',
    rezervace: cast.rezervace || [],
    firma: cast.firma ?? null,
    utrataKc,
    utrataRucne: cast.utrataRucne || [],
    urovenId: u.id,
    kredit: cast.kredit || [],
    kreditKc: typeof cast.kreditKc === 'number' ? cast.kreditKc : 0,
    dopKodPuvod: cast.dopKodPuvod ?? null,
    poznamka: cast.poznamka || '',
    zalozil: cast.zalozil || 'ukazka',
  };
}

export function jeUkazkaKlic(k: string): k is KlubUkazkaId {
  return (
    k === 'ukazka-host' ||
    k === 'ukazka-host-pred' ||
    k === 'ukazka-host-po' ||
    k === 'ukazka-dop' ||
    k === 'ukazka-firma' ||
    k === 'ukazka-flidr' ||
    k === 'ukazka-sofia' ||
    k === 'ukazka-egd'
  );
}

/** Ruční karty 25. 11. 2026 – sdílecí náhled (data z majitele + rez:*). */
function pobytyRucniKarty(id: KlubUkazkaId): {
  nadchazejici: KlubPobytRadek[];
  pobyty: KlubPobytRadek[];
} | null {
  if (id === 'ukazka-flidr') {
    return {
      nadchazejici: [],
      pobyty: [
        {
          nadpis: '24.–27. 11. 2026 · Jemná harmonie',
          podnadpis: 'rez. 92026110903 · přímá · v rez:*',
        },
        {
          nadpis: '18.–19. 11. 2026 · Jemná harmonie',
          podnadpis: 'rez. 92026110902 · přímá · v rez:*',
        },
        {
          nadpis: 'Další pobyt · 3 600 Kč',
          podnadpis: 'Termín v rez:* nenalezen · ručně majitel',
        },
        {
          nadpis: 'Další pobyt · 2 900 Kč',
          podnadpis: 'Termín v rez:* nenalezen · ručně majitel',
        },
      ],
    };
  }
  if (id === 'ukazka-sofia') {
    return {
      nadchazejici: [],
      pobyty: [
        {
          nadpis: '7.–8. 10. 2026 · Pohodlí v tlumených tónech',
          podnadpis: 'RODICE TELEFON PLATBA HOTOVE · jen seznam (ne v rez:*)',
        },
        {
          nadpis: 'Svatba / rodiče / Booking',
          podnadpis: 'Detaily pobytů v rez:* nenalezeny · ručně majitel',
        },
      ],
    };
  }
  if (id === 'ukazka-egd') {
    return {
      nadchazejici: [],
      pobyty: [
        {
          nadpis: '23.–26. 11. 2026 · Zlatá rovnováha',
          podnadpis: 'rez. 92026111801 · Dominik Hromada · přímá · v rez:*',
        },
        {
          nadpis: '6.–7. 11. 2026 · Jemná harmonie',
          podnadpis: 'BH 120260643 · 1 700 Kč · v rez:* zatím není',
        },
        {
          nadpis: '1.–6. 11. 2026 · Jemná harmonie',
          podnadpis: 'rez. 120260570 · Dominik Hromada · přímá · v rez:*',
        },
        {
          nadpis: '19.–23. 10. 2026 · Ušlechtilý kontrast',
          podnadpis: 'rez. 120260538 · Booking.com · v rez:* (ne do útraty)',
        },
      ],
    };
  }
  return null;
}

export function ukazkovaKlientKarta(id: KlubUkazkaId): KlientKarta {
  if (id === 'ukazka-flidr') {
    return kartaZaklad({
      id: 'ukazka-flidr',
      kod: 'FLIDR',
      tajnyKlic: 'ukazka-flidr',
      typ: 'host',
      role: ['host', 'doporucitel'],
      jmeno: 'Marcel',
      prijmeni: 'Flídr',
      email: 'marcel.flidr@gmail.com',
      telefon: '+420603778347',
      jazyk: 'cs',
      utrataKc: 12300,
      rezervace: ['92026110902', '92026110903'],
      poznamka:
        'Adresa: Osvoboditelů 223, 767 01 Kroměříž. 4 přímé pobyty, 12 300 Kč. Recenze Google (týdenní pracovní pobyt). Dva termíny 2 900 a 3 600 Kč v rez:* nenalezeny.',
      zalozil: 'rucni-2026-11-25',
    });
  }
  if (id === 'ukazka-sofia') {
    return kartaZaklad({
      id: 'ukazka-sofia',
      kod: 'SOFIA',
      tajnyKlic: 'ukazka-sofia',
      typ: 'host',
      role: ['host', 'doporucitel'],
      jmeno: 'Sofia',
      prijmeni: 'Saieshnykova',
      email: 'sofiasaeshnikova12@gmail.com',
      telefon: '+420774053627',
      jazyk: 'cs',
      utrataKc: 35000,
      rezervace: [],
      poznamka:
        'Adresa: Žižkova třída 1915/1b, 370 01 České Budějovice. Státní příslušnost: Ukrajina. Výjimka majitele 35 000 Kč (svatba, rodiče napřímo + Booking). Manžel taxikář – možný doporučitel. Recenze. V rez:* žádný záznam.',
      zalozil: 'rucni-2026-11-25',
    });
  }
  if (id === 'ukazka-egd') {
    return kartaZaklad({
      id: 'ukazka-egd',
      kod: 'EGD',
      tajnyKlic: 'ukazka-egd',
      typ: 'firma',
      role: ['firma', 'doporucitel'],
      jmeno: 'EG.D',
      prijmeni: '',
      email: 'dominik.hromada@egd.cz',
      telefon: '+420732347329',
      jazyk: 'cs',
      utrataKc: 14040,
      rezervace: ['120260570', '92026111801'],
      firma: {
        ico: '',
        dic: '',
        nazev: 'EG.D, s.r.o.',
        sidlo: '',
        platceDph: false,
      },
      poznamka:
        'Kontakt Dominik Hromada. Útrata z BH přímé (1 700 + 4 440 + 7 900). Booking 120260538 jen v seznamu pobytů.',
      zalozil: 'rucni-2026-11-25',
    });
  }
  if (id === 'ukazka-firma') {
    return kartaZaklad({
      id: 'ukazka-firma',
      kod: 'STAVBYJIH',
      tajnyKlic: 'ukazka-firma',
      typ: 'firma',
      role: ['firma', 'doporucitel'],
      jmeno: 'Stavby',
      prijmeni: 'Jih',
      utrataKc: 41500,
      kreditKc: 460,
      firma: {
        ico: '12345678',
        dic: '',
        nazev: 'Stavby Jih s.r.o.',
        sidlo: 'Nádražní 1, České Budějovice',
        platceDph: true,
      },
    });
  }
  if (id === 'ukazka-dop') {
    return kartaZaklad({
      id: 'ukazka-dop',
      kod: 'PETR7',
      tajnyKlic: 'ukazka-dop',
      typ: 'osoba',
      role: ['doporucitel'],
      jmeno: 'Petr',
      prijmeni: 'Svoboda',
      utrataKc: 0,
      kreditKc: 690,
    });
  }
  const hostId = id === 'ukazka-host-pred' || id === 'ukazka-host-po' ? id : 'ukazka-host';
  return kartaZaklad({
    id: hostId,
    kod: 'JANA4',
    tajnyKlic: hostId,
    typ: 'host',
    role: ['host', 'doporucitel'],
    jmeno: 'Jana',
    prijmeni: 'Nováková',
    utrataKc: id === 'ukazka-host-pred' ? 0 : 23600,
    kreditKc: id === 'ukazka-host-pred' ? 0 : 460,
  });
}

export function pohledZKarty(
  karta: KlientKarta,
  odkazBase: string,
  opts?: { ukazka?: boolean; pohled?: KlientRole },
): KlubKartaPohled {
  const u = urovenZUtraty(karta.utrataKc);
  const pohled: KlientRole =
    opts?.pohled ||
    (karta.role.includes('firma')
      ? 'firma'
      : karta.role.includes('host')
        ? 'host'
        : 'doporucitel');
  const jmenoZobrazeni =
    karta.typ === 'firma' && karta.firma?.nazev
      ? karta.firma.nazev
      : `${karta.jmeno} ${karta.prijmeni}`.trim() || karta.kod;

  const ukazka = Boolean(opts?.ukazka);
  const base = odkazBase.replace(/\/$/, '');

  let nadchazejici: KlubPobytRadek[] = [];
  let pobyty: KlubPobytRadek[] = [];
  let pratele: KlubPratelRadek[] = [];

  const rucni = ukazka ? pobytyRucniKarty(karta.tajnyKlic as KlubUkazkaId) : null;
  if (rucni) {
    nadchazejici = rucni.nadchazejici;
    pobyty = rucni.pobyty;
  } else if (ukazka && pohled === 'host') {
    const pred = karta.tajnyKlic === 'ukazka-host-pred';
    const jenPo = karta.tajnyKlic === 'ukazka-host-po';
    if (!jenPo) {
      nadchazejici = [
        {
          nadpis: '12.–15. 3. 2027 · Apartmán 2',
          podnadpis: 'Adresa, příjezd, kódy',
          pruvodceUrl: `${base}/nahled`,
        },
      ];
    }
    if (!pred) {
      pobyty = [
        { nadpis: '2.–5. 10. 2026', podnadpis: 'Apartmán 2' },
        { nadpis: '14.–16. 6. 2026', podnadpis: 'Apartmán 5' },
        { nadpis: '7.–9. 2. 2026', podnadpis: 'Apartmán 1' },
      ];
      pratele = [
        { jmeno: 'Martin · říjen 2026', stav: 'přijel ✓' },
        { jmeno: 'Lucie · listopad 2026', stav: 'přijela ✓' },
        { jmeno: 'Eva · leden 2027', stav: 'čeká na pobyt' },
      ];
    }
  } else if (ukazka && pohled === 'firma') {
    nadchazejici = [
      { nadpis: 'Ing. Dvořák · 1.–5. 12. 2026', podnadpis: 'Apartmán 3' },
      { nadpis: 'J. Malý · 1.–12. 12. 2026', podnadpis: 'Apartmán 4' },
    ];
    pobyty = [
      { nadpis: 'Ing. Dvořák · 3.–7. 11. 2026', podnadpis: 'Apartmán 3' },
      { nadpis: 'P. Král · 20.–31. 10. 2026', podnadpis: 'Apartmán 1' },
      { nadpis: 'Ing. Dvořák · 6.–9. 10. 2026', podnadpis: 'Apartmán 3' },
    ];
    pratele = [{ jmeno: 'Hotel Sever · listopad 2026', stav: 'přijeli ✓' }];
  } else if (ukazka && pohled === 'doporucitel') {
    pratele = [
      { jmeno: 'Martin · říjen 2026', stav: 'přijel ✓' },
      { jmeno: 'Lucie · listopad 2026', stav: 'přijela ✓' },
      { jmeno: 'Tomáš · prosinec 2026', stav: 'čeká na pobyt' },
    ];
  }

  const kreditKc = karta.kreditKc;
  return {
    ukazka,
    pohled,
    jmenoZobrazeni,
    jazyk: karta.jazyk,
    kod: karta.kod,
    tajnyKlic: karta.tajnyKlic,
    utrataKc: karta.utrataKc,
    kreditKc,
    slevaPct: u.slevaPct,
    urovenId: u.id,
    urovenNazev: pohled === 'firma' ? u.nazevFirma : u.nazevHost,
    role: karta.role,
    firmaNazev: karta.firma?.nazev || null,
    firmaIco: karta.firma?.ico || null,
    firmaSidlo: karta.firma?.sidlo || null,
    nadchazejici,
    pobyty,
    pratele,
    kreditCeka: Math.round(kreditKc / 2),
    kreditKVyplate: kreditKc,
    kreditVyplaceno: 0,
    odkazDoporuceni: `${base}/poptavka?od=${encodeURIComponent(karta.kod)}`,
  };
}

export function pokrokUrovne(
  utrataKc: number,
  opts?: { pohled?: KlientRole },
): {
  pct: number;
  dalsiNazev: string | null;
  dalsiPct: number | null;
  chybiKc: number | null;
  index: number;
} {
  const serazene = [...UROVNE].sort((a, b) => a.odKc - b.odKc);
  let index = 0;
  for (let i = 0; i < serazene.length; i++) {
    if (utrataKc >= serazene[i].odKc) index = i;
  }
  const dalsi = serazene[index + 1] || null;
  const nazev = (u: (typeof serazene)[0]) =>
    opts?.pohled === 'firma' ? u.nazevFirma : u.nazevHost;
  if (!dalsi) {
    return { pct: 100, dalsiNazev: null, dalsiPct: null, chybiKc: null, index };
  }
  const od = serazene[index].odKc;
  const span = Math.max(1, dalsi.odKc - od);
  const pct = Math.min(100, Math.max(0, Math.round(((utrataKc - od) / span) * 100)));
  return {
    pct,
    dalsiNazev: nazev(dalsi),
    dalsiPct: dalsi.slevaPct,
    chybiKc: Math.max(0, dalsi.odKc - utrataKc),
    index,
  };
}

export { UROVNE as KLUB_UROVNE_PRO_LADDER };
