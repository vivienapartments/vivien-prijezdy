/**
 * Preview karty klientů z BH importu + ruční Flídr / Sofia.
 * Jen pro zkoušku na Preview – neostrý zápis.
 */

import { KLUB_IMPORT_BH_PRIME_SEED } from './klub-import-bh-prime-seed';
import type { ImportBhPobyt, ImportBhSouhrn } from './klub-import-bh-csv';
import type { KlientKarta, KlientRole, KlientTyp } from './klient-karta';
import { urovenZUtraty } from './klub-pravidla';
import type { KlubPobytRadek } from './klub-ukazka';

export type PreviewKlientRadek = {
  id: string;
  kod: string;
  tajnyKlic: string;
  jmeno: string;
  prijmeni: string;
  email: string;
  telefon: string;
  typ: KlientTyp;
  firmaNazev: string | null;
  utrataKc: number;
  utrataCekaKc: number;
  kreditKc: number;
  urovenNazev: string;
  slevaPct: number;
  pocetPobytu: number;
  posledniPobyt: string | null;
  pristiPobyt: string | null;
  praveBydli: boolean;
};

export type PreviewKlientDetail = PreviewKlientRadek & {
  karta: KlientKarta;
  nadchazejici: KlubPobytRadek[];
  pobyty: KlubPobytRadek[];
};

const DNES = '2026-11-25';

const RUCNI: Record<
  string,
  { email?: string; telefon?: string; utrata?: number; utrataCeka?: number; kredit?: number }
> = {
  'dominik hromada': {
    email: 'dominik.hromada@egd.cz',
    telefon: '+420732347329',
  },
  'marcel flidr': {
    email: 'marcel.flidr@gmail.com',
    telefon: '+420603778347',
    utrata: 12300,
    utrataCeka: 0,
  },
  'sofia saieshnykova': {
    email: 'sofiasaeshnikova12@gmail.com',
    telefon: '+420774053627',
    utrata: 35000,
    utrataCeka: 0,
  },
  'veronika lancova': {},
};

function slug(jmeno: string): string {
  return jmeno
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function normal(j: string): string {
  return j
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDen(iso: string): string {
  const a = (iso || '').slice(0, 10);
  if (!a) return '';
  return `${Number(a.slice(8, 10))}. ${Number(a.slice(5, 7))}.`;
}

function formatTermin(p: ImportBhPobyt): string {
  const a = formatDen(p.prijezd);
  const b = formatDen(p.odjezd);
  if (!a) return p.rezervace;
  return b ? `${a}–${b}` : a;
}

function jePrave(p: ImportBhPobyt, dnes = DNES): boolean {
  const a = (p.prijezd || '').slice(0, 10);
  const b = (p.odjezd || '').slice(0, 10);
  if (!a || !b) return false;
  return a <= dnes && dnes < b;
}

function jeBudouciNeboPrave(p: ImportBhPobyt, dnes = DNES): boolean {
  const a = (p.prijezd || '').slice(0, 10);
  if (!a) return p.stavUtraty === 'ceka';
  return a >= dnes || jePrave(p, dnes) || p.stavUtraty === 'ceka';
}

function rozdelJmeno(host: string, firma: boolean): { jmeno: string; prijmeni: string } {
  if (firma) return { jmeno: host, prijmeni: '' };
  const casti = host.trim().split(/\s+/);
  if (casti.length <= 1) return { jmeno: host, prijmeni: '' };
  return { jmeno: casti[0], prijmeni: casti.slice(1).join(' ') };
}

function pobytNaRadek(p: ImportBhPobyt, opts?: { pruvodce?: boolean }): KlubPobytRadek {
  const ceka = p.stavUtraty === 'ceka';
  return {
    nadpis: formatTermin(p),
    podnadpis: p.castka > 0 ? `${p.castka.toLocaleString('cs-CZ')} Kč` : p.popisek || '',
    pruvodceUrl: opts?.pruvodce ? '/nahled' : null,
    barva: ceka ? 'ceka' : 'zapocteno',
    stavText: ceka ? 'čeká\nzapočítá se po odjezdu' : 'započítáno',
  };
}

function flidrPobyty(): { nadchazejici: KlubPobytRadek[]; pobyty: KlubPobytRadek[]; souhrn: ImportBhSouhrn } {
  const ceka: ImportBhPobyt = {
    rezervace: '92026110903',
    prijezd: '2026-11-24',
    odjezd: '2026-11-27',
    castka: 0,
    stavUtraty: 'ceka',
    popisek: 'čeká, započítá se po odjezdu',
  };
  const hotove: ImportBhPobyt[] = [
    {
      rezervace: '92026110902',
      prijezd: '2026-11-18',
      odjezd: '2026-11-19',
      castka: 2900,
      stavUtraty: 'zapocteno',
      popisek: 'započítáno',
    },
    {
      rezervace: 'flidr-3600',
      prijezd: '2026-10-01',
      odjezd: '2026-10-03',
      castka: 3600,
      stavUtraty: 'zapocteno',
      popisek: 'započítáno',
    },
    {
      rezervace: 'flidr-2900b',
      prijezd: '2026-09-01',
      odjezd: '2026-09-02',
      castka: 2900,
      stavUtraty: 'zapocteno',
      popisek: 'započítáno',
    },
  ];
  return {
    nadchazejici: [pobytNaRadek(ceka, { pruvodce: true })],
    pobyty: [
      {
        ...pobytNaRadek(ceka),
        podnadpis: 'Jemná harmonie',
      },
      ...hotove.map((p) => ({ ...pobytNaRadek(p), podnadpis: 'Jemná harmonie' })),
    ],
    souhrn: {
      host: 'Marcel Flídr',
      pocet: 4,
      utrata: 12300,
      utrataCeka: 0,
      uroven: 'Stálý host',
      klientId: null,
      akce: 'priradit',
      rezervace: ['92026110903', '92026110902'],
      pobyty: [ceka, ...hotove],
    },
  };
}

function sofiaPobyty(): { nadchazejici: KlubPobytRadek[]; pobyty: KlubPobytRadek[]; souhrn: ImportBhSouhrn } {
  const p: ImportBhPobyt = {
    rezervace: 'sofia-1',
    prijezd: '2026-10-07',
    odjezd: '2026-10-08',
    castka: 35000,
    stavUtraty: 'zapocteno',
    popisek: 'započítáno',
  };
  return {
    nadchazejici: [],
    pobyty: [
      { ...pobytNaRadek(p), podnadpis: 'Pohodlí v tlumených tónech' },
      {
        nadpis: 'Svatba a rodiče',
        podnadpis: 'započítáno',
        barva: 'zapocteno',
        stavText: 'započítáno',
      },
    ],
    souhrn: {
      host: 'Sofia Saieshnykova',
      pocet: 2,
      utrata: 35000,
      utrataCeka: 0,
      uroven: 'Stříbrný host',
      klientId: null,
      akce: 'priradit',
      rezervace: [],
      pobyty: [p],
    },
  };
}

function zeSouhrnu(s: ImportBhSouhrn): PreviewKlientDetail {
  const firma = s.akce === 'firma';
  const { jmeno, prijmeni } = rozdelJmeno(s.host, firma);
  const nkey = normal(s.host);
  const rucni = RUCNI[nkey] || {};
  const utrata = typeof rucni.utrata === 'number' ? rucni.utrata : s.utrata;
  const utrataCeka = typeof rucni.utrataCeka === 'number' ? rucni.utrataCeka : s.utrataCeka;
  const u = urovenZUtraty(utrata);
  const kod = (firma ? slug(s.host) : slug(`${jmeno}-${prijmeni}`)).toUpperCase().replace(/-/g, '').slice(0, 12) || 'HOST';
  const tajnyKlic = `preview-${slug(s.host)}`;
  const serazene = [...s.pobyty].sort((a, b) => (a.prijezd < b.prijezd ? 1 : -1));
  const prave = serazene.find((p) => jePrave(p));
  const budouci = serazene.filter((p) => jeBudouciNeboPrave(p) && !jePrave(p));
  const odbydlene = serazene.filter((p) => !jeBudouciNeboPrave(p) && !jePrave(p));

  const nadchazejici: KlubPobytRadek[] = [];
  if (prave) {
    nadchazejici.push({
      ...pobytNaRadek(prave, { pruvodce: true }),
      podnadpis: 'Adresa, příjezd, kódy',
    });
  } else if (budouci[0]) {
    nadchazejici.push({
      ...pobytNaRadek(budouci[0], { pruvodce: true }),
      podnadpis: 'Adresa, příjezd, kódy',
    });
  }

  const pobyty: KlubPobytRadek[] = [
    ...(prave ? [pobytNaRadek(prave)] : []),
    ...budouci.map((p) => pobytNaRadek(p)),
    ...odbydlene.map((p) => pobytNaRadek(p)),
  ];

  const typ: KlientTyp = firma ? 'firma' : 'host';
  const role: KlientRole[] = firma ? ['firma', 'doporucitel'] : ['host', 'doporucitel'];
  const karta: KlientKarta = {
    id: `preview-${slug(s.host)}`,
    kod,
    tajnyKlic,
    datumZalozeni: '2026-11-25T12:00:00.000Z',
    typ,
    role,
    stav: 'aktivni',
    jmeno,
    prijmeni,
    email: rucni.email || '',
    telefon: rucni.telefon || '',
    jazyk: 'cs',
    rezervace: s.rezervace,
    firma: firma
      ? { ico: '', dic: '', nazev: s.host, sidlo: '', platceDph: false }
      : null,
    utrataKc: utrata,
    utrataRucne: [],
    urovenId: u.id,
    kredit: [],
    kreditKc: rucni.kredit || 0,
    dopKodPuvod: null,
    poznamka: '',
    zalozil: 'preview-bh-2026-11-25',
  };

  const posledni = odbydlene[0] || null;
  const pristi = prave || budouci[0] || null;

  return {
    id: karta.id,
    kod: karta.kod,
    tajnyKlic,
    jmeno,
    prijmeni,
    email: karta.email,
    telefon: karta.telefon,
    typ,
    firmaNazev: firma ? s.host : null,
    utrataKc: utrata,
    utrataCekaKc: utrataCeka,
    kreditKc: karta.kreditKc,
    urovenNazev: firma ? u.nazevFirma : u.nazevHost,
    slevaPct: u.slevaPct,
    pocetPobytu: s.pocet,
    posledniPobyt: posledni ? formatTermin(posledni) : null,
    pristiPobyt: pristi ? formatTermin(pristi) : null,
    praveBydli: Boolean(prave),
    karta,
    nadchazejici,
    pobyty,
  };
}

let cache: PreviewKlientDetail[] | null = null;

export function seznamPreviewKlientu(): PreviewKlientDetail[] {
  if (cache) return cache;
  const mapa = new Map<string, PreviewKlientDetail>();

  for (const s of KLUB_IMPORT_BH_PRIME_SEED.souhrn) {
    const d = zeSouhrnu(s);
    mapa.set(normal(s.host), d);
  }

  // Ruční Flídr / Sofia přepíší / doplní
  const fl = flidrPobyty();
  const flDetail = zeSouhrnu(fl.souhrn);
  flDetail.nadchazejici = fl.nadchazejici;
  flDetail.pobyty = fl.pobyty;
  flDetail.email = RUCNI['marcel flidr'].email || '';
  flDetail.telefon = RUCNI['marcel flidr'].telefon || '';
  flDetail.karta.email = flDetail.email;
  flDetail.karta.telefon = flDetail.telefon;
  flDetail.praveBydli = true;
  flDetail.pristiPobyt = '24. 11.–27. 11.';
  flDetail.posledniPobyt = '18. 11.–19. 11.';
  mapa.set('marcel flidr', flDetail);

  const so = sofiaPobyty();
  const soDetail = zeSouhrnu(so.souhrn);
  soDetail.nadchazejici = so.nadchazejici;
  soDetail.pobyty = so.pobyty;
  soDetail.pocetPobytu = Math.max(2, so.pobyty.length);
  soDetail.email = RUCNI['sofia saieshnykova'].email || '';
  soDetail.telefon = RUCNI['sofia saieshnykova'].telefon || '';
  soDetail.karta.email = soDetail.email;
  soDetail.karta.telefon = soDetail.telefon;
  soDetail.posledniPobyt = '7. 10.–8. 10.';
  mapa.set('sofia saieshnykova', soDetail);

  // Flídr: počet pobytů z ručního seznamu
  const flidr = mapa.get('marcel flidr');
  if (flidr) flidr.pocetPobytu = Math.max(4, flidr.pobyty.length);

  cache = [...mapa.values()]
    .filter((x) => !/eg\.?\s*d/i.test(`${x.firmaNazev || ''} ${x.jmeno} ${x.prijmeni}`))
    .sort((a, b) => b.utrataKc - a.utrataKc || a.jmeno.localeCompare(b.jmeno, 'cs'));
  return cache;
}

export function najdiPreviewPodleKlice(k: string): PreviewKlientDetail | null {
  const key = (k || '').trim();
  if (!key.startsWith('preview-') && !key.startsWith('ukazka-')) return null;
  const seznam = seznamPreviewKlientu();
  if (key === 'ukazka-hromada' || key === 'ukazka-egd') {
    return seznam.find((x) => /hromada/i.test(`${x.jmeno} ${x.prijmeni}`)) || null;
  }
  if (key === 'ukazka-flidr') {
    return seznam.find((x) => /flidr/i.test(x.prijmeni)) || null;
  }
  if (key === 'ukazka-sofia') {
    return seznam.find((x) => /saieshnykova/i.test(x.prijmeni)) || null;
  }
  return seznam.find((x) => x.tajnyKlic === key) || null;
}

export function jePreviewKlientKlic(k: string): boolean {
  return Boolean(najdiPreviewPodleKlice(k));
}
