/**
 * Ukázkové karty pro zkoušku /klub?k=ukazka-host|ukazka-dop|ukazka-firma.
 * Neukládají se do KV.
 */

import type { KlientKarta, KlientRole } from './klient-karta';
import { VYCHOZI_KLUB_PRAVIDLA, urovenZUtraty } from './klub-pravidla';
import type { GuideLang } from './types';

export type KlubUkazkaId = 'ukazka-host' | 'ukazka-dop' | 'ukazka-firma';

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
    utrataRucne: [],
    urovenId: u.id,
    kredit: cast.kredit || [],
    kreditKc: typeof cast.kreditKc === 'number' ? cast.kreditKc : 0,
    dopKodPuvod: cast.dopKodPuvod ?? null,
    poznamka: '',
    zalozil: 'ukazka',
  };
}

export function jeUkazkaKlic(k: string): k is KlubUkazkaId {
  return k === 'ukazka-host' || k === 'ukazka-dop' || k === 'ukazka-firma';
}

export function ukazkovaKlientKarta(id: KlubUkazkaId): KlientKarta {
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
  return kartaZaklad({
    id: 'ukazka-host',
    kod: 'JANA4',
    tajnyKlic: 'ukazka-host',
    typ: 'host',
    role: ['host', 'doporucitel'],
    jmeno: 'Jana',
    prijmeni: 'Nováková',
    utrataKc: 23600,
    kreditKc: 460,
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

  if (ukazka && pohled === 'host') {
    nadchazejici = [
      {
        nadpis: '12.–15. 3. 2027 · Apartmán 2',
        podnadpis: 'Adresa, příjezd, kódy',
        pruvodceUrl: `${base}/nahled`,
      },
    ];
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
