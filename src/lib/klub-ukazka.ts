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
  | 'ukazka-host-up'
  | 'ukazka-host-maxi-po'
  | 'ukazka-host-maxi-pred'
  | 'ukazka-novy'
  | 'ukazka-dop-host-pred'
  | 'ukazka-dop-host-bydli'
  | 'ukazka-dop-host-po'
  | 'ukazka-dop'
  | 'ukazka-dop-a-host'
  | 'ukazka-firma'
  | 'ukazka-firma-pred'
  | 'ukazka-firma-bydli'
  | 'ukazka-flidr'
  | 'ukazka-sofia'
  | 'ukazka-hromada'
  | 'ukazka-egd'; // alias → Hromada (zpětná kompatibilita odkazu)

export type KlubPobytBarva = 'zapocteno' | 'ceka' | 'probiha' | 'storno' | null;

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
    slevaBehem: cast.slevaBehem || [],
    slevaKontrola: cast.slevaKontrola ?? null,
  };
}

export function jeUkazkaKlic(k: string): k is KlubUkazkaId {
  return (
    k === 'ukazka-host' ||
    k === 'ukazka-host-pred' ||
    k === 'ukazka-host-po' ||
    k === 'ukazka-host-up' ||
    k === 'ukazka-host-maxi-po' ||
    k === 'ukazka-host-maxi-pred' ||
    k === 'ukazka-novy' ||
    k === 'ukazka-dop-host-pred' ||
    k === 'ukazka-dop-host-bydli' ||
    k === 'ukazka-dop-host-po' ||
    k === 'ukazka-dop' ||
    k === 'ukazka-dop-a-host' ||
    k === 'ukazka-firma' ||
    k === 'ukazka-firma-pred' ||
    k === 'ukazka-firma-bydli' ||
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
          podnadpis: 'Adresa, příjezd, kódy',
          pruvodceUrl: '/nahled',
          barva: 'probiha',
        },
      ],
      pobyty: [
        {
          nadpis: '24.–27. 11. 2026',
          podnadpis: 'Jemná harmonie',
          barva: 'probiha',
          stavText: 'započítáno',
        },
        {
          nadpis: '18.–19. 11. 2026 · Jemná harmonie',
          podnadpis: 'započítáno',
          barva: 'zapocteno',
        },
        {
          nadpis: 'Další pobyt · 3 600 Kč',
          podnadpis: 'započítáno',
          barva: 'zapocteno',
        },
        {
          nadpis: 'Další pobyt · 2 900 Kč',
          podnadpis: 'započítáno',
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
          podnadpis: 'Adresa, příjezd, kódy',
          pruvodceUrl: '/nahled',
          barva: 'probiha',
        },
      ],
      pobyty: [
        {
          nadpis: '23.–26. 11. 2026',
          podnadpis: 'Zlatá rovnováha · 1 450 Kč',
          barva: 'probiha',
          stavText: 'započítáno',
        },
        {
          nadpis: '6.–7. 11. 2026 · Jemná harmonie · 1 700 Kč',
          podnadpis: 'započítáno',
          barva: 'zapocteno',
        },
        {
          nadpis: '1.–6. 11. 2026 · Jemná harmonie · 7 900 Kč',
          podnadpis: 'započítáno',
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
  if (id === 'ukazka-firma' || id === 'ukazka-firma-pred' || id === 'ukazka-firma-bydli') {
    const firmaUtrata =
      id === 'ukazka-firma-pred' ? 0 : id === 'ukazka-firma-bydli' ? 18000 : 41500;
    return kartaZaklad({
      id,
      kod: 'STAVBYJIH',
      tajnyKlic: id,
      typ: 'firma',
      role: ['firma', 'doporucitel'],
      jmeno: 'Stavby',
      prijmeni: 'Jih',
      utrataKc: firmaUtrata,
      kreditKc: id === 'ukazka-firma' ? 460 : 0,
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
  if (id === 'ukazka-dop-a-host') {
    return kartaZaklad({
      id: 'ukazka-dop-a-host',
      kod: 'PETR7',
      tajnyKlic: 'ukazka-dop-a-host',
      typ: 'host',
      role: ['host', 'doporucitel'],
      jmeno: 'Petr',
      prijmeni: 'Svoboda',
      utrataKc: 9600,
      kreditKc: 690,
    });
  }
  if (id === 'ukazka-novy') {
    return kartaZaklad({
      id: 'ukazka-novy',
      kod: 'NOVY1',
      tajnyKlic: 'ukazka-novy',
      typ: 'host',
      role: ['host'],
      jmeno: 'Adam',
      prijmeni: 'Nový',
      utrataKc: 0,
      kreditKc: 0,
    });
  }
  if (
    id === 'ukazka-dop-host-pred' ||
    id === 'ukazka-dop-host-bydli' ||
    id === 'ukazka-dop-host-po'
  ) {
    return kartaZaklad({
      id,
      kod: 'LUCIE5',
      tajnyKlic: id,
      typ: 'host',
      role: ['host'],
      jmeno: 'Lucie',
      prijmeni: 'Doporučená',
      utrataKc: id === 'ukazka-dop-host-po' ? 4500 : 0,
      kreditKc: 0,
      dopKodPuvod: 'petr7',
    });
  }
  if (id === 'ukazka-host-up') {
    return kartaZaklad({
      id: 'ukazka-host-up',
      kod: 'JANA4',
      tajnyKlic: 'ukazka-host-up',
      typ: 'host',
      role: ['host', 'doporucitel'],
      jmeno: 'Jana',
      prijmeni: 'Ukázková',
      // Stříbrný 25 000 + probíhající 16 000 → Zlatý
      utrataKc: 25000,
      kreditKc: 0,
    });
  }
  if (id === 'ukazka-host-maxi-po' || id === 'ukazka-host-maxi-pred') {
    return kartaZaklad({
      id,
      kod: 'JANA4',
      tajnyKlic: id,
      typ: 'host',
      role: ['host', 'doporucitel'],
      jmeno: 'Jana',
      prijmeni: 'Nováková',
      utrataKc: 62000,
      kreditKc: 460,
    });
  }
  const hostId =
    id === 'ukazka-host-pred' || id === 'ukazka-host-po' || id === 'ukazka-host'
      ? id
      : 'ukazka-host';
  return kartaZaklad({
    id: hostId,
    kod: 'JANA4',
    tajnyKlic: hostId,
    typ: 'host',
    role: ['host', 'doporucitel'],
    jmeno: 'Jana',
    prijmeni: 'Nováková',
    // ukazka-host = bydlí, bez změny úrovně (9 600 + 1 450)
    // ukazka-host-pred = Věrný s minulými pobyty, čeká
    utrataKc: id === 'ukazka-host' ? 9600 : id === 'ukazka-host-pred' ? 9600 : 23600,
    kreditKc: id === 'ukazka-host-pred' || id === 'ukazka-host' ? 0 : 460,
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
  } else if (ukazka && jeUkazkaKlic(karta.tajnyKlic)) {
    const kid = normalizujUkazkaId(karta.tajnyKlic);
    const pred = kid === 'ukazka-host-pred' || kid === 'ukazka-host-maxi-pred';
    const jenPo = kid === 'ukazka-host-po' || kid === 'ukazka-host-maxi-po';
    const bydli = kid === 'ukazka-host' || kid === 'ukazka-host-up';
    const up = kid === 'ukazka-host-up';
    const maxi = kid === 'ukazka-host-maxi-po' || kid === 'ukazka-host-maxi-pred';

    if (kid === 'ukazka-novy') {
      nadchazejici = [
        {
          nadpis: '10.–12. 12. 2026 · Jemná harmonie',
          podnadpis: 'Za 14 dní · adresa, příjezd, kódy',
          pruvodceUrl: `${base}/nahled`,
          barva: 'ceka',
          stavText: 'čeká',
        },
      ];
      pobyty = [
        {
          nadpis: '10.–12. 12. 2026',
          podnadpis: '3 200 Kč',
          barva: 'ceka',
          stavText: 'čeká',
        },
      ];
    } else if (
      kid === 'ukazka-dop-host-pred' ||
      kid === 'ukazka-dop-host-bydli' ||
      kid === 'ukazka-dop-host-po'
    ) {
      const dBydli = kid === 'ukazka-dop-host-bydli';
      const dPo = kid === 'ukazka-dop-host-po';
      if (dBydli) {
        nadchazejici = [
          {
            nadpis: '23.–26. 11. 2026 · Zlatá rovnováha',
            podnadpis: 'Adresa, příjezd, kódy',
            pruvodceUrl: `${base}/nahled`,
            barva: 'probiha',
          },
        ];
        pobyty = [
          {
            nadpis: '23.–26. 11. 2026',
            podnadpis: '4 500 Kč',
            barva: 'probiha',
            stavText: 'započítáno',
          },
        ];
      } else if (dPo) {
        pobyty = [
          {
            nadpis: '23.–26. 11. 2026',
            podnadpis: 'započítáno',
            barva: 'zapocteno',
            stavText: 'započítáno',
          },
        ];
      } else {
        nadchazejici = [
          {
            nadpis: '23.–26. 11. 2026 · Zlatá rovnováha',
            podnadpis: 'Za 4 dny · adresa, příjezd, kódy',
            pruvodceUrl: `${base}/nahled`,
            barva: 'ceka',
            stavText: 'čeká',
          },
        ];
        pobyty = [
          {
            nadpis: '23.–26. 11. 2026',
            podnadpis: '4 500 Kč',
            barva: 'ceka',
            stavText: 'čeká',
          },
        ];
      }
    } else if (
      kid === 'ukazka-firma' ||
      kid === 'ukazka-firma-pred' ||
      kid === 'ukazka-firma-bydli'
    ) {
      if (kid === 'ukazka-firma-pred') {
        nadchazejici = [
          { nadpis: 'Ing. Dvořák · 1.–5. 12. 2026', podnadpis: 'Apartmán 3', barva: 'ceka' },
        ];
        pobyty = [
          {
            nadpis: 'Ing. Dvořák · 1.–5. 12. 2026',
            podnadpis: 'Apartmán 3',
            barva: 'ceka',
            stavText: 'čeká',
          },
        ];
      } else if (kid === 'ukazka-firma-bydli') {
        nadchazejici = [
          {
            nadpis: 'Ing. Dvořák · 23.–26. 11. 2026',
            podnadpis: 'Apartmán 3',
            barva: 'probiha',
          },
        ];
        pobyty = [
          {
            nadpis: 'Ing. Dvořák · 23.–26. 11. 2026',
            podnadpis: 'Apartmán 3 · 8 000 Kč',
            barva: 'probiha',
            stavText: 'započítáno',
          },
          {
            nadpis: 'P. Král · 20.–31. 10. 2026',
            podnadpis: 'Apartmán 1',
            barva: 'zapocteno',
            stavText: 'započítáno',
          },
        ];
      } else {
        nadchazejici = [
          { nadpis: 'Ing. Dvořák · 1.–5. 12. 2026', podnadpis: 'Apartmán 3' },
          { nadpis: 'J. Malý · 1.–12. 12. 2026', podnadpis: 'Apartmán 4' },
        ];
        pobyty = [
          {
            nadpis: 'Ing. Dvořák · 3.–7. 11. 2026',
            podnadpis: 'Apartmán 3',
            barva: 'zapocteno',
            stavText: 'započítáno',
          },
          {
            nadpis: 'P. Král · 20.–31. 10. 2026',
            podnadpis: 'Apartmán 1',
            barva: 'zapocteno',
            stavText: 'započítáno',
          },
          {
            nadpis: 'Ing. Dvořák · 6.–9. 10. 2026',
            podnadpis: 'Apartmán 3',
            barva: 'zapocteno',
            stavText: 'započítáno',
          },
        ];
      }
      pratele = [{ jmeno: 'Hotel Sever · listopad 2026', stav: 'přijeli ✓' }];
    } else if (kid === 'ukazka-dop' || kid === 'ukazka-dop-a-host') {
      if (kid === 'ukazka-dop-a-host') {
        pobyty = [
          {
            nadpis: '6.–7. 11. 2026',
            podnadpis: 'započítáno',
            barva: 'zapocteno',
            stavText: 'započítáno',
          },
          {
            nadpis: '1.–5. 11. 2026',
            podnadpis: 'započítáno',
            barva: 'zapocteno',
            stavText: 'započítáno',
          },
        ];
      }
      pratele = [
        { jmeno: 'Martin · říjen 2026', stav: 'přijel ✓' },
        { jmeno: 'Lucie · listopad 2026', stav: 'přijela ✓' },
        { jmeno: 'Tomáš · prosinec 2026', stav: 'čeká na pobyt' },
      ];
    } else if (bydli || pred || jenPo || maxi) {
      if (bydli) {
        nadchazejici = [
          {
            nadpis: '23.–26. 11. 2026 · Zlatá rovnováha',
            podnadpis: 'Adresa, příjezd, kódy',
            pruvodceUrl: `${base}/nahled`,
            barva: 'probiha',
          },
        ];
        pobyty = [
          {
            nadpis: '23.–26. 11. 2026',
            podnadpis: up ? '16 000 Kč' : '1 450 Kč',
            barva: 'probiha',
            stavText: 'započítáno',
          },
          {
            nadpis: '6.–7. 11. 2026',
            podnadpis: 'započítáno',
            barva: 'zapocteno',
            stavText: 'započítáno',
          },
          {
            nadpis: '1.–5. 11. 2026',
            podnadpis: 'započítáno',
            barva: 'zapocteno',
            stavText: 'započítáno',
          },
        ];
      } else if (pred) {
        nadchazejici = [
          {
            nadpis: '23.–26. 11. 2026 · Zlatá rovnováha',
            podnadpis: 'Za 4 dny · adresa, příjezd, kódy',
            pruvodceUrl: `${base}/nahled`,
            barva: 'ceka',
            stavText: 'čeká',
          },
        ];
        pobyty = [
          {
            nadpis: '23.–26. 11. 2026',
            podnadpis: '1 450 Kč',
            barva: 'ceka',
            stavText: 'čeká',
          },
          {
            nadpis: '6.–7. 11. 2026',
            podnadpis: 'započítáno',
            barva: 'zapocteno',
            stavText: 'započítáno',
          },
          {
            nadpis: '1.–5. 11. 2026',
            podnadpis: 'započítáno',
            barva: 'zapocteno',
            stavText: 'započítáno',
          },
        ];
      } else if (jenPo) {
        pobyty = [
          {
            nadpis: '23.–26. 11. 2026',
            podnadpis: 'započítáno',
            barva: 'zapocteno',
            stavText: 'započítáno',
          },
          {
            nadpis: '6.–7. 11. 2026',
            podnadpis: 'započítáno',
            barva: 'zapocteno',
            stavText: 'započítáno',
          },
          {
            nadpis: '1.–5. 11. 2026',
            podnadpis: 'započítáno',
            barva: 'zapocteno',
            stavText: 'započítáno',
          },
        ];
      }
      if (!pred || maxi) {
        pratele = [
          { jmeno: 'Martin · říjen 2026', stav: 'přijel ✓' },
          { jmeno: 'Lucie · listopad 2026', stav: 'přijela ✓' },
          { jmeno: 'Eva · leden 2027', stav: 'čeká na pobyt' },
        ];
      }
    }
  }

  const kreditKc = karta.kreditKc;
  const kidUkazka = ukazka ? normalizujUkazkaId(karta.tajnyKlic as KlubUkazkaId) : null;
  const utrataCekaUkazka =
    kidUkazka === 'ukazka-hromada' || kidUkazka === 'ukazka-egd'
      ? 1450
      : kidUkazka === 'ukazka-host'
        ? 1450
        : kidUkazka === 'ukazka-host-up'
          ? 16000
          : kidUkazka === 'ukazka-flidr'
            ? 2900
            : kidUkazka === 'ukazka-host-pred' || kidUkazka === 'ukazka-host-maxi-pred'
              ? 1450
              : kidUkazka === 'ukazka-dop-host-bydli'
                ? 4500
                : kidUkazka === 'ukazka-firma-bydli'
                  ? 8000
                  : kidUkazka === 'ukazka-firma-pred' || kidUkazka === 'ukazka-novy'
                    ? 0
                    : 0;
  const praveBydli =
    kidUkazka === 'ukazka-host' ||
    kidUkazka === 'ukazka-host-up' ||
    kidUkazka === 'ukazka-hromada' ||
    kidUkazka === 'ukazka-egd' ||
    kidUkazka === 'ukazka-flidr' ||
    kidUkazka === 'ukazka-dop-host-bydli' ||
    kidUkazka === 'ukazka-firma-bydli' ||
    nadchazejici.some((r) => r.barva === 'probiha');
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
