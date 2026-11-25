/**
 * Import útraty z BH CSV exportu přímých rezervací (25. 11. 2026).
 * Všechny řádky v exportu bereme jako zaplacené (BH platby neeviduje).
 * Zápis až po potvrzení náhledu.
 */

import { urovenZUtraty, type KlubPravidla } from './klub-pravidla';
import type { KlientKarta } from './klient-karta';

export type ImportBhAkce = 'priradit' | 'cekajici' | 'kontrola' | 'firma';

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
  /** Cílové jméno karty (po mapování Anna / firma). */
  cilJmeno: string;
  klientId: string | null;
  klientNazev: string | null;
};

export type ImportBhSouhrn = {
  host: string;
  pocet: number;
  utrata: number;
  uroven: string;
  klientId: string | null;
  akce: ImportBhAkce;
  rezervace: string[];
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

const FIRMA_KLICHE: { match: RegExp; nazev: string }[] = [
  { match: /eg\.?\s*d/i, nazev: 'EG.D, s.r.o.' },
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
  // "1 640,00" → po remove spaces v replace výše: "1640.00" když mezery už pryč
  const bezMezer = s.replace(/\s/g, '').replace(/[^\d,.-]/g, '').replace(',', '.');
  const n = Number(bezMezer || cislo) || 0;
  return { castka: Math.round(n), mena };
}

/** Označení je poznámka, ne jméno hosta. */
export function jePoznamkaMistoJmena(oznaceni: string): boolean {
  const o = (oznaceni || '').trim();
  if (!o) return false;
  const n = normalJmeno(o);
  if (ANNA_MAP[n]) return false;
  if (/flidr|rodice|telefon|platba|hotove|dohromady|cena|termin|jestě|jeste|listopad/i.test(o)) {
    return true;
  }
  // Samá velká písmena a delší text
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

/**
 * Sestaví náhled importu z CSV textu.
 * EUR řádky se zatím nepočítají do útraty v Kč (kontrola).
 */
export function nahledImportuBhCsv(
  csvText: string,
  klienti: KlientKarta[],
  pravidla: KlubPravidla,
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
    const { castka, mena } = parsujCenuBh(row['Cena'] || '');

    if (!rezervace || castka <= 0) continue;
    if (/booking|airbnb|expedia/i.test(zdroj) || /booking|airbnb|expedia/i.test(agentura)) {
      continue;
    }

    const firmaNazev = firmaZRadku(firmaCol, agentura);
    const annaCil = ANNA_MAP[normalJmeno(oznaceni)] || null;
    const jmenoZHosta =
      host ||
      (/^web$/i.test(agentura) ? '' : !firmaNazev && agentura && !/web/i.test(agentura) ? agentura : '');

    let akce: ImportBhAkce = 'cekajici';
    let duvod = '';
    let cilJmeno = '';

    if (mena === 'EUR') {
      akce = 'kontrola';
      duvod = 'Cena v eurech – převod do Kč ručně';
      cilJmeno = jmenoZHosta || oznaceni || rezervace;
    } else if (castka === 10099) {
      akce = 'kontrola';
      duvod = 'Cena 10 099 Kč';
      cilJmeno = jmenoZHosta || oznaceni || rezervace;
    } else if (annaCil) {
      akce = 'priradit';
      duvod = `Ruční mapování „${oznaceni.trim()}“ → ${annaCil}`;
      cilJmeno = annaCil;
    } else if (!jmenoZHosta && jePoznamkaMistoJmena(oznaceni)) {
      akce = 'kontrola';
      duvod = 'Poznámka místo jména';
      cilJmeno = oznaceni;
    } else if (!jmenoZHosta && !oznaceni) {
      akce = 'kontrola';
      duvod = 'Bez jména';
      cilJmeno = rezervace;
    } else if (firmaNazev) {
      akce = 'firma';
      duvod = `Firma ${firmaNazev}`;
      cilJmeno = firmaNazev;
    } else if (jmenoZHosta) {
      cilJmeno = jmenoZHosta;
      const k = najdiKlienta(klienti, cilJmeno, null);
      if (k) {
        akce = 'priradit';
        duvod = 'Shoda jména s kartou';
      } else {
        akce = 'cekajici';
        duvod = 'Bez karty / kontaktu – útrata čeká na příští příjezd';
      }
    } else {
      // jen označení (přezdívka)
      cilJmeno = oznaceni;
      akce = 'cekajici';
      duvod = 'Jen označení – čeká na spojení';
    }

    const klient = najdiKlienta(
      klienti,
      cilJmeno,
      akce === 'firma' ? firmaNazev : null,
    );
    if (klient && (akce === 'priradit' || akce === 'firma' || akce === 'cekajici')) {
      if (akce === 'cekajici' && klient) {
        akce = klient.typ === 'firma' ? 'firma' : 'priradit';
        duvod = 'Shoda jména s kartou';
      }
    }

    radky.push({
      rezervace,
      jmeno: jmenoZHosta,
      oznaceni,
      firma: firmaCol || firmaNazev || '',
      prijezd,
      odjezd,
      castka: mena === 'EUR' ? castka : castka,
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
    });
  }

  const mapa = new Map<string, ImportBhSouhrn>();
  for (const r of radky) {
    if (r.akce === 'kontrola' || r.mena === 'EUR') continue;
    const klic = r.klientId || `n:${normalJmeno(r.cilJmeno)}` || r.rezervace;
    const cur = mapa.get(klic) || {
      host: r.klientNazev || r.cilJmeno,
      pocet: 0,
      utrata: 0,
      uroven: '',
      klientId: r.klientId,
      akce: r.akce,
      rezervace: [] as string[],
    };
    cur.pocet += 1;
    cur.utrata += r.castka;
    cur.rezervace.push(r.rezervace);
    if (r.akce === 'firma' || r.akce === 'priradit') cur.akce = r.akce;
    mapa.set(klic, cur);
  }

  const souhrn = [...mapa.values()].map((s) => ({
    ...s,
    uroven: urovenZUtraty(s.utrata, pravidla).nazevHost,
  }));

  const kontrola = radky.filter((r) => r.akce === 'kontrola' || r.mena === 'EUR');
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
