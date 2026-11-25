/**
 * Import útraty z BH CSV exportu přímých rezervací (25. 11. 2026).
 * Všechny řádky v exportu bereme jako zaplacené (BH platby neeviduje).
 * Zápis až po potvrzení náhledu.
 */

import { urovenZUtraty, type KlubPravidla } from './klub-pravidla';
import type { KlientKarta } from './klient-karta';

export type ImportBhAkce = 'priradit' | 'cekajici' | 'kontrola' | 'firma';

/** Oranžová = odbydlené a započtené. Modrá = budoucí/probíhající (po předání). */
export type ImportBhStavUtraty = 'zapocteno' | 'ceka';

export type ImportBhRadek = {
  rezervace: string;
  jmeno: string;
  oznaceni: string;
  firma: string;
  prijezd: string;
  odjezd: string;
  castka: number;
  mena: 'CZK' | 'EUR';
  zdroj: string;
  akce: ImportBhAkce;
  duvod: string;
  cilJmeno: string;
  klientId: string | null;
  klientNazev: string | null;
  stavUtraty: ImportBhStavUtraty;
  /** Původní BH cena, když majitel přepsal. */
  castkaBh: number | null;
};

export type ImportBhPobyt = {
  rezervace: string;
  prijezd: string;
  odjezd: string;
  castka: number;
  stavUtraty: ImportBhStavUtraty;
  popisek: string;
};

export type ImportBhSouhrn = {
  host: string;
  pocet: number;
  /** Jen odbydlené (oranžové) částky. */
  utrata: number;
  /** Budoucí/probíhající (modré) ještě ne v úrovni. */
  utrataCeka: number;
  uroven: string;
  klientId: string | null;
  akce: ImportBhAkce;
  rezervace: string[];
  pobyty: ImportBhPobyt[];
};

export type ImportBhNahled = {
  verze: 'bh-csv-2026-11-25';
  radky: ImportBhRadek[];
  souhrn: ImportBhSouhrn[];
  kontrola: ImportBhRadek[];
  cekajici: ImportBhSouhrn[];
  primaHoste: { jmeno: string; utrata: number; pocet: number }[];
};

export type UtrataCekaPolozka = {
  id: string;
  jmenoNormal: string;
  jmenoZobrazeni: string;
  castka: number;
  rezervace: string[];
  kdy: string;
  zdroj: string;
};

const ANNA_MAP: Record<string, string> = {
  anna: 'Anna Nirenberh',
  'anna tri dny': 'Anna Nirenberh',
};

/** Ruční ceny Sobčák (majitel 25. 11. 2026). */
const SOBCAK_CENA: Record<string, number> = {
  '120260671': 5000,
  '120260627': 4400,
};

const EUR_KURZ_ZALOHA = 24.5;

/** Příjezd před tímto dnem = blokace/test, úplně vynechat. */
const PRIJEZD_OD = '2026-05-01';

const FIRMA_KLICHE: { match: RegExp; nazev: string }[] = [
  // EG.D ne – útrata patří Dominiku Hromadovi
  { match: /unique\s*textiles/i, nazev: 'UNIQUE Textiles, s.r.o.' },
  {
    match: /český\s*dub|cesky\s*dub|základní\s*škola|zakladni\s*skola/i,
    nazev: 'Základní škola Český Dub',
  },
];

function normalJmeno(j: string): string {
  return (j || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function parsujCenuBh(raw: string): { castka: number; mena: 'CZK' | 'EUR' } {
  const s = (raw || '').trim();
  const mena: 'CZK' | 'EUR' = /€|eur/i.test(s) ? 'EUR' : 'CZK';
  const cislo = s.replace(/[^\d,.-]/g, '').replace(/\s/g, '').replace(',', '.');
  const bezMezer = s.replace(/\s/g, '').replace(/[^\d,.-]/g, '').replace(',', '.');
  const n = Number(bezMezer || cislo) || 0;
  return { castka: Math.round(n * 100) / 100, mena };
}

export function eurNaKc(castkaEur: number, kurz = EUR_KURZ_ZALOHA): number {
  return Math.round(castkaEur * kurz);
}

/** Odjezd před dneškem = započteno. Jinak čeká na předání / odjezd. */
export function stavUtratyZTerminu(
  odjezd: string,
  dnesIso = new Date().toISOString().slice(0, 10),
): ImportBhStavUtraty {
  const o = (odjezd || '').slice(0, 10);
  if (!o) return 'ceka';
  return o < dnesIso ? 'zapocteno' : 'ceka';
}

export function jePoznamkaMistoJmena(oznaceni: string): boolean {
  const o = (oznaceni || '').trim();
  if (!o) return false;
  const n = normalJmeno(o);
  if (ANNA_MAP[n]) return false;
  if (/sobcak|sobcka|sobcak/i.test(n)) return false;
  if (/flidr|rodice|telefon|platba|hotove|dohromady|cena|termin|jestě|jeste|listopad/i.test(o)) {
    return true;
  }
  if (o.length >= 12 && o === o.toUpperCase() && /\s/.test(o)) return true;
  return false;
}

function rozdelCsvRadek(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQ = !inQ;
      }
      continue;
    }
    if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export function parsujBhCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = rozdelCsvRadek(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = rozdelCsvRadek(lines[i]);
    if (!cells.some((c) => c.trim())) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function najdiKlienta(
  klienti: KlientKarta[],
  jmeno: string,
  firmaNazev: string | null,
): KlientKarta | null {
  if (firmaNazev) {
    const nf = normalJmeno(firmaNazev);
    const firma =
      klienti.find(
        (k) =>
          k.typ === 'firma' &&
          (normalJmeno(k.firma?.nazev || '') === nf ||
            normalJmeno(`${k.jmeno} ${k.prijmeni}`) === nf ||
            normalJmeno(k.firma?.nazev || '').includes(nf.slice(0, 8))),
      ) || null;
    if (firma) return firma;
  }
  const nj = normalJmeno(jmeno);
  if (!nj) return null;
  return (
    klienti.find((k) => normalJmeno(`${k.jmeno} ${k.prijmeni}`) === nj) ||
    klienti.find((k) => normalJmeno(k.jmeno) === nj.split(' ')[0] && nj.split(' ').length >= 2) ||
    null
  );
}

function firmaZRadku(firmaCol: string, agentura: string): string | null {
  const blob = `${firmaCol} ${agentura}`;
  for (const f of FIRMA_KLICHE) {
    if (f.match.test(blob)) return f.nazev;
  }
  return null;
}

function jeEgdNeboHromada(firmaCol: string, agentura: string, host: string, oznaceni: string): boolean {
  const blob = `${firmaCol} ${agentura} ${host} ${oznaceni}`;
  return /eg\.?\s*d/i.test(blob) || /hromada/i.test(blob);
}

function jeSobcak(host: string, oznaceni: string, agentura: string): boolean {
  const n = normalJmeno(`${host} ${oznaceni} ${agentura}`);
  return /sobc[aá]k|sobcak|sobcka/.test(n);
}

/**
 * Sestaví náhled importu z CSV textu.
 */
export function nahledImportuBhCsv(
  csvText: string,
  klienti: KlientKarta[],
  pravidla: KlubPravidla,
  dnesIso = new Date().toISOString().slice(0, 10),
): ImportBhNahled {
  const rows = parsujBhCsv(csvText);
  const radky: ImportBhRadek[] = [];

  for (const row of rows) {
    const rezervace = (row['Číslo'] || row['Cislo'] || '').trim();
    const host = (row['Host'] || '').trim();
    const agentura = (row['Agentura'] || '').trim();
    const oznaceni = (row['Označení'] || row['Oznaceni'] || '').trim();
    const firmaCol = (row['Firma'] || '').trim();
    const prijezd = (row['Příjezd'] || row['Prijezd'] || '').trim();
    const odjezd = (row['Odjezd'] || '').trim();
    const zdroj = (row['Zdroj'] || '').trim();
    const cenaRaw = parsujCenuBh(row['Cena'] || '');

    if (!rezervace || cenaRaw.castka <= 0) continue;
    if (/booking|airbnb|expedia/i.test(zdroj) || /booking|airbnb|expedia/i.test(agentura)) {
      continue;
    }
    // Blokace / testy před 1. 5. 2026 – úplně pryč
    if ((prijezd || '').slice(0, 10) && (prijezd || '').slice(0, 10) < PRIJEZD_OD) {
      continue;
    }

    let castka = Math.round(cenaRaw.castka);
    let mena: 'CZK' | 'EUR' = cenaRaw.mena;
    let castkaBh: number | null = null;
    let duvodCena = '';

    if (SOBCAK_CENA[rezervace] != null) {
      castkaBh = castka;
      castka = SOBCAK_CENA[rezervace];
      mena = 'CZK';
      duvodCena = `Cena majitele ${castka} Kč (BH ${castkaBh} Kč)`;
    } else if (mena === 'EUR') {
      castkaBh = castka;
      castka = eurNaKc(cenaRaw.castka);
      mena = 'CZK';
      duvodCena = `Přepočet ${cenaRaw.castka} € × ${EUR_KURZ_ZALOHA}`;
    }

    const firmaNazev = firmaZRadku(firmaCol, agentura);
    const annaCil = ANNA_MAP[normalJmeno(oznaceni)] || null;
    const jmenoZHosta =
      host ||
      (/^web$/i.test(agentura)
        ? ''
        : !firmaNazev && !jeEgdNeboHromada(firmaCol, agentura, host, oznaceni) && agentura && !/web/i.test(agentura)
          ? agentura
          : '');

    let akce: ImportBhAkce = 'cekajici';
    let duvod = duvodCena;
    let cilJmeno = '';

    if (castka === 10099) {
      akce = 'kontrola';
      duvod = [duvod, 'Cena 10 099 Kč'].filter(Boolean).join(' · ');
      cilJmeno = jmenoZHosta || oznaceni || rezervace;
    } else if (annaCil) {
      akce = 'priradit';
      duvod = [duvod, `Ruční mapování „${oznaceni.trim()}“ → ${annaCil}`].filter(Boolean).join(' · ');
      cilJmeno = annaCil;
    } else if (jeSobcak(host, oznaceni, agentura)) {
      akce = 'priradit';
      cilJmeno = 'Peter Sobčák';
      duvod = [duvod, 'Sobčák = sobcak + Peter Sobčák'].filter(Boolean).join(' · ');
    } else if (jeEgdNeboHromada(firmaCol, agentura, host, oznaceni)) {
      akce = 'priradit';
      cilJmeno = 'Dominik Hromada';
      duvod = [duvod, 'EG.D jen proplácí – útrata hosta Dominik Hromada'].filter(Boolean).join(' · ');
    } else if (!jmenoZHosta && jePoznamkaMistoJmena(oznaceni)) {
      akce = 'kontrola';
      duvod = [duvod, 'Poznámka místo jména'].filter(Boolean).join(' · ');
      cilJmeno = oznaceni;
    } else if (!jmenoZHosta && !oznaceni) {
      akce = 'kontrola';
      duvod = [duvod, 'Bez jména'].filter(Boolean).join(' · ');
      cilJmeno = rezervace;
    } else if (firmaNazev) {
      akce = 'firma';
      duvod = [duvod, `Firma ${firmaNazev}`].filter(Boolean).join(' · ');
      cilJmeno = firmaNazev;
    } else if (jmenoZHosta) {
      cilJmeno = jmenoZHosta;
      const k = najdiKlienta(klienti, cilJmeno, null);
      if (k) {
        akce = 'priradit';
        duvod = [duvod, 'Shoda jména s kartou'].filter(Boolean).join(' · ');
      } else {
        akce = 'cekajici';
        duvod = [duvod, 'Bez karty / kontaktu – útrata čeká na příští příjezd'].filter(Boolean).join(' · ');
      }
    } else {
      cilJmeno = oznaceni;
      akce = 'cekajici';
      duvod = [duvod, 'Jen označení – čeká na spojení'].filter(Boolean).join(' · ');
    }

    const klient = najdiKlienta(
      klienti,
      cilJmeno,
      akce === 'firma' ? firmaNazev : null,
    );
    if (klient && (akce === 'priradit' || akce === 'firma' || akce === 'cekajici')) {
      if (akce === 'cekajici' && klient) {
        akce = klient.typ === 'firma' ? 'firma' : 'priradit';
        duvod = [duvodCena, 'Shoda jména s kartou'].filter(Boolean).join(' · ');
      }
    }

    const stav = stavUtratyZTerminu(odjezd, dnesIso);

    radky.push({
      rezervace,
      jmeno: jmenoZHosta,
      oznaceni,
      firma: firmaCol || (jeEgdNeboHromada(firmaCol, agentura, host, oznaceni) ? 'EG.D (proplácí)' : firmaNazev || ''),
      prijezd,
      odjezd,
      castka,
      mena,
      zdroj,
      akce,
      duvod,
      cilJmeno,
      klientId: klient?.id || null,
      klientNazev: klient
        ? klient.typ === 'firma'
          ? klient.firma?.nazev || `${klient.jmeno} ${klient.prijmeni}`.trim()
          : `${klient.jmeno} ${klient.prijmeni}`.trim()
        : null,
      stavUtraty: stav,
      castkaBh,
    });
  }

  // Lancová: druhý pobyt z rez:* (Booking) – jen evidence v souhrnu, ne útrata
  const lancovaExtra: ImportBhPobyt = {
    rezervace: '120260665',
    prijezd: '2026-11-19',
    odjezd: '2026-11-20',
    castka: 0,
    stavUtraty: 'zapocteno',
    popisek: 'Booking · V1 · v rez:* (do útraty přímé ne)',
  };

  const mapa = new Map<string, ImportBhSouhrn>();
  for (const r of radky) {
    if (r.akce === 'kontrola') continue;
    const klic = r.klientId || `n:${normalJmeno(r.cilJmeno)}` || r.rezervace;
    const cur = mapa.get(klic) || {
      host: r.klientNazev || r.cilJmeno,
      pocet: 0,
      utrata: 0,
      utrataCeka: 0,
      uroven: '',
      klientId: r.klientId,
      akce: r.akce,
      rezervace: [] as string[],
      pobyty: [] as ImportBhPobyt[],
    };
    cur.pocet += 1;
    if (r.stavUtraty === 'zapocteno') cur.utrata += r.castka;
    else cur.utrataCeka += r.castka;
    cur.rezervace.push(r.rezervace);
    cur.pobyty.push({
      rezervace: r.rezervace,
      prijezd: r.prijezd,
      odjezd: r.odjezd,
      castka: r.castka,
      stavUtraty: r.stavUtraty,
      popisek:
        r.stavUtraty === 'ceka'
          ? 'čeká, započítá se po odjezdu'
          : r.castkaBh != null
            ? `započteno · BH bylo ${r.castkaBh}`
            : 'započteno',
    });
    if (r.akce === 'firma' || r.akce === 'priradit') cur.akce = r.akce;
    mapa.set(klic, cur);
  }

  // Doplň Lancové Booking pobyt
  for (const [k, s] of mapa) {
    if (/lancov/i.test(s.host) && !s.rezervace.includes('120260665')) {
      s.pocet += 1;
      s.pobyty.push(lancovaExtra);
      s.rezervace.push('120260665');
      mapa.set(k, s);
    }
  }

  const souhrn = [...mapa.values()].map((s) => {
    const u = urovenZUtraty(s.utrata, pravidla);
    return {
      ...s,
      uroven: s.akce === 'firma' ? u.nazevFirma : u.nazevHost,
      pobyty: [...s.pobyty].sort((a, b) => (a.prijezd < b.prijezd ? 1 : -1)),
    };
  });

  const kontrola = radky.filter((r) => r.akce === 'kontrola');
  const cekajici = souhrn.filter((s) => s.akce === 'cekajici');
  const primaHoste = souhrn
    .filter((s) => s.akce !== 'firma')
    .map((s) => ({ jmeno: s.host, utrata: s.utrata, pocet: s.pocet }));

  return {
    verze: 'bh-csv-2026-11-25',
    radky,
    souhrn,
    kontrola,
    cekajici,
    primaHoste,
  };
}
