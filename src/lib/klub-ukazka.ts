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
  | 'ukazka-hromada'
  | 'ukazka-egd'; // alias → Hromada (zpětná kompatibilita odkazu)

export type KlubPobytBarva = 'zapocteno' | 'ceka' | null;

export type KlubPobytRadek = {
  nadpis: string;
  podnadpis: string;
  pruvodceUrl?: string | null;
  /** Oranžová započteno / modrá čeká po odjezdu. */
  barva?: KlubPobytBarva;
  /** Text vpravo na kartě (započítáno / čeká…). */
  stavText?: string;
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
  /** Čekající útrata (modrý pruh). */
  utrataCekaKc: number;
  /** Probíhající pobyt = nadpis „Právě u nás bydlíte“. */
  praveBydli: boolean;
  /** Preview z BH: schovat blok doporučení, dokud není skutečný kredit / přítel. */
  skrytDoporuceni: boolean;
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
    k === 'ukazka-hromada' ||
    k === 'ukazka-egd'
  );
}

function normalizujUkazkaId(id: KlubUkazkaId): KlubUkazkaId {
  return id === 'ukazka-egd' ? 'ukazka-hromada' : id;
}

/** Ruční karty 25. 11. 2026 – sdílecí náhled (data z majitele + rez:*). */
function pobytyRucniKarty(id: KlubUkazkaId): {
  nadchazejici: KlubPobytRadek[];
  pobyty: KlubPobytRadek[];
} | null {
  const kid = normalizujUkazkaId(id);
  if (kid === 'ukazka-flidr') {
    return {
      nadchazejici: [
        {
          nadpis: '24.–27. 11. 2026 · Jemná harmonie',
          podnadpis: 'čeká, započítá se po odjezdu',
          pruvodceUrl: '/nahled',
          barva: 'ceka',
        },
      ],
      pobyty: [
        {
          nadpis: '18.–19. 11. 2026 · Jemná harmonie',
          podnadpis: 'započteno',
          barva: 'zapocteno',
        },
        {
          nadpis: 'Další pobyt · 3 600 Kč',
          podnadpis: 'započteno',
          barva: 'zapocteno',
        },
        {
          nadpis: 'Další pobyt · 2 900 Kč',
          podnadpis: 'započteno',
          barva: 'zapocteno',
        },
      ],
    };
  }
  if (kid === 'ukazka-sofia') {
    return {
      nadchazejici: [],
      pobyty: [
        {
          nadpis: '7.–8. 10. 2026 · Pohodlí v tlumených tónech',
          podnadpis: 'započteno',
          barva: 'zapocteno',
        },
        {
          nadpis: 'Svatba a rodiče',
          podnadpis: 'započteno',
          barva: 'zapocteno',
        },
      ],
    };
  }
  if (kid === 'ukazka-hromada') {
    return {
      nadchazejici: [
        {
          nadpis: '23.–26. 11. 2026 · Zlatá rovnováha',
          podnadpis: 'čeká, započítá se po odjezdu · 1 450 Kč',
          pruvodceUrl: '/nahled',
          barva: 'ceka',
        },
      ],
      pobyty: [
        {
          nadpis: '6.–7. 11. 2026 · Jemná harmonie · 1 700 Kč',
          podnadpis: 'započteno',
          barva: 'zapocteno',
        },
        {
          nadpis: '1.–6. 11. 2026 · Jemná harmonie · 7 900 Kč',
          podnadpis: 'započteno',
          barva: 'zapocteno',
        },
        {
          nadpis: '19.–23. 10. 2026 · Ušlechtilý kontrast',
          podnadpis: 'Booking · ne do útraty',
          barva: 'zapocteno',
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
      poznamka: '',
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
      poznamka: '',
      zalozil: 'rucni-2026-11-25',
    });
  }
  if (id === 'ukazka-hromada' || id === 'ukazka-egd') {
    return kartaZaklad({
      id: 'ukazka-hromada',
      kod: 'HROMADA',
      tajnyKlic: id === 'ukazka-egd' ? 'ukazka-egd' : 'ukazka-hromada',
      typ: 'host',
      role: ['host', 'doporucitel'],
      jmeno: 'Dominik',
      prijmeni: 'Hromada',
      email: 'dominik.hromada@egd.cz',
      telefon: '+420732347329',
      jazyk: 'cs',
      utrataKc: 9600,
      rezervace: ['120260570', '92026111801', '120260643'],
      poznamka: '',
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

  const rucni = ukazka
    ? pobytyRucniKarty(normalizujUkazkaId(karta.tajnyKlic as KlubUkazkaId))
    : null;
  if (rucni) {
    nadchazejici = rucni.nadchazejici;
    pobyty = rucni.pobyty;
  } else if (
    ukazka &&
    (karta.tajnyKlic === 'ukazka-host' ||
      karta.tajnyKlic === 'ukazka-host-pred' ||
      karta.tajnyKlic === 'ukazka-host-po')
  ) {
    // Jediná povolená fiktivní ukázka (ne BH Preview karty).
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
  } else if (ukazka && karta.tajnyKlic === 'ukazka-firma') {
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
  } else if (ukazka && karta.tajnyKlic === 'ukazka-dop') {
    pratele = [
      { jmeno: 'Martin · říjen 2026', stav: 'přijel ✓' },
      { jmeno: 'Lucie · listopad 2026', stav: 'přijela ✓' },
      { jmeno: 'Tomáš · prosinec 2026', stav: 'čeká na pobyt' },
    ];
  }

  const kreditKc = karta.kreditKc;
  const kidUkazka = ukazka ? normalizujUkazkaId(karta.tajnyKlic as KlubUkazkaId) : null;
  // Hromada: probíhající pobyt = cena z účtování (1 450), ne BH 4 440.
  const utrataCekaUkazka =
    kidUkazka === 'ukazka-hromada' || kidUkazka === 'ukazka-egd' ? 1450 : 0;
  const praveBydli = nadchazejici.some((r) => /právě|bydlíte|adresa, příjezd/i.test(r.podnadpis || ''));
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
    utrataCekaKc: utrataCekaUkazka,
    praveBydli,
    skrytDoporuceni: false,
  };
}

/** Pohled z Preview BH seedu (opravdová data importu). */
export function pohledZPreviewDetailu(
  d: {
    karta: KlientKarta;
    nadchazejici: KlubPobytRadek[];
    pobyty: KlubPobytRadek[];
    utrataCekaKc: number;
    praveBydli: boolean;
  },
  odkazBase: string,
  opts?: { pohled?: KlientRole },
): KlubKartaPohled {
  const zaklad = pohledZKarty(d.karta, odkazBase, { ukazka: false, pohled: opts?.pohled });
  const kreditKc = d.karta.kreditKc || 0;
  return {
    ...zaklad,
    ukazka: true,
    pratele: [],
    nadchazejici: d.nadchazejici,
    pobyty: d.pobyty,
    utrataCekaKc: d.utrataCekaKc,
    praveBydli: d.praveBydli,
    kreditKc,
    kreditCeka: 0,
    kreditKVyplate: kreditKc,
    kreditVyplaceno: 0,
    // Doporučit mají všichni hosté. Prázdný seznam přátel / kredit 0 je v pořádku.
    skrytDoporuceni: false,
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
