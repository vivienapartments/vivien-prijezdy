import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import {
  migrujDopNaKlienty,
  nactiKlubPravidla,
  seznamKlientu,
  ulozKlubPravidla,
  verejnaKlientKarta,
  zajistiVychoziPravidla,
  type KlientKarta,
} from '@/lib/klient-karta';
import { klubZapnut } from '@/lib/klub-klic';
import {
  nahledImportuBhCsv,
  type ImportBhNahled,
} from '@/lib/klub-import-bh-csv';
import { KLUB_IMPORT_BH_PRIME_SEED } from '@/lib/klub-import-bh-prime-seed';
import {
  potvrdImportBhCsv,
  seznamUtratCeka,
  spojUtratuCeka,
} from '@/lib/klub-utrata-ceka';
import {
  nahledImportuUtratyXlsx,
  potvrdImportUtraty,
  pridejUtratuRucne,
  type ImportUtrataNahled,
} from '@/lib/klub-utrata';
import { sloucitPravidla, type KlubPravidla } from '@/lib/klub-pravidla';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore } from '@/lib/store';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store' };

const CSV_PRIME = '.data/import/BH_export_prime_2026-11-25.csv';

function chyba(status: number, text: string) {
  return NextResponse.json({ ok: false, chyba: text }, { status, headers: noStore });
}

function normalJmeno(j: string): string {
  return (j || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Seed z Preview bez CSV: doplní klientId podle jména na kartách. */
function doplnSeedKartami(seed: ImportBhNahled, karty: KlientKarta[]): ImportBhNahled {
  const najdi = (jmeno: string, firma: boolean) => {
    const nj = normalJmeno(jmeno);
    return (
      karty.find((k) =>
        firma
          ? k.typ === 'firma' &&
            normalJmeno(k.firma?.nazev || `${k.jmeno} ${k.prijmeni}`) === nj
          : normalJmeno(`${k.jmeno} ${k.prijmeni}`) === nj,
      ) || null
    );
  };
  const radky = seed.radky.map((r) => {
    const k = najdi(r.cilJmeno, r.akce === 'firma');
    if (!k) return r;
    return {
      ...r,
      klientId: k.id,
      klientNazev:
        k.typ === 'firma'
          ? k.firma?.nazev || `${k.jmeno} ${k.prijmeni}`.trim()
          : `${k.jmeno} ${k.prijmeni}`.trim(),
      akce: r.akce === 'cekajici' ? ('priradit' as const) : r.akce,
      duvod: r.akce === 'cekajici' ? 'Shoda jména s kartou' : r.duvod,
    };
  });
  const mapa = new Map<string, ImportBhNahled['souhrn'][0]>();
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
  const souhrn = [...mapa.values()].map((s) => {
    const puv = seed.souhrn.find(
      (x) =>
        normalJmeno(x.host) === normalJmeno(s.host) ||
        x.rezervace.some((rz) => s.rezervace.includes(rz)),
    );
    return { ...s, uroven: puv?.uroven || s.uroven };
  });
  return {
    ...seed,
    radky,
    souhrn,
    cekajici: souhrn.filter((s) => s.akce === 'cekajici'),
    kontrola: radky.filter((r) => r.akce === 'kontrola' || r.mena === 'EUR'),
    primaHoste: souhrn
      .filter((s) => s.akce !== 'firma')
      .map((s) => ({ jmeno: s.host, utrata: s.utrata, pocet: s.pocet })),
  };
}

async function sestavNahledBhPrime(
  store: ReturnType<typeof createProcessStore>,
): Promise<ImportBhNahled> {
  const karty = await seznamKlientu(store);
  const lokalni = path.join(process.cwd(), CSV_PRIME);
  if (fs.existsSync(lokalni)) {
    const pravidla = await nactiKlubPravidla(store);
    return nahledImportuBhCsv(fs.readFileSync(lokalni, 'utf8'), karty, pravidla);
  }
  return doplnSeedKartami(KLUB_IMPORT_BH_PRIME_SEED, karty);
}

export async function GET() {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nejste přihlášeni.');
  const store = createProcessStore();
  const pravidla = await zajistiVychoziPravidla(store);
  const karty = await seznamKlientu(store);
  const ceka = await seznamUtratCeka(store);
  return NextResponse.json(
    {
      ok: true,
      klubZapnut: klubZapnut(),
      pravidla,
      karty: karty.map((k) => verejnaKlientKarta(k, pravidla)),
      utrataCeka: ceka,
    },
    { headers: noStore },
  );
}

export async function POST(req: Request) {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nejste přihlášeni.');
  const ctype = req.headers.get('content-type') || '';
  const store = createProcessStore();

  if (ctype.includes('multipart/form-data')) {
    const form = await req.formData();
    const akce = String(form.get('akce') || '').trim();
    if (akce === 'import-nahled') {
      const file = form.get('soubor');
      if (!(file instanceof File)) return chyba(400, 'Chybí xlsx.');
      const buf = Buffer.from(await file.arrayBuffer());
      const pravidla = await nactiKlubPravidla(store);
      const karty = await seznamKlientu(store);
      const nahled = nahledImportuUtratyXlsx(buf, karty, pravidla);
      return NextResponse.json({ ok: true, nahled }, { headers: noStore });
    }
    if (akce === 'import-bh-csv-nahled') {
      const file = form.get('soubor');
      if (!(file instanceof File)) return chyba(400, 'Chybí csv.');
      const text = await file.text();
      const pravidla = await nactiKlubPravidla(store);
      const karty = await seznamKlientu(store);
      const nahled = nahledImportuBhCsv(text, karty, pravidla);
      return NextResponse.json({ ok: true, nahled }, { headers: noStore });
    }
    return chyba(400, 'Neznámá akce.');
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return chyba(400, 'Špatný požadavek.');
  }
  const akce = String(body.akce || '').trim();

  if (akce === 'pravidla') {
    const raw = body.pravidla as Partial<KlubPravidla> | undefined;
    if (!raw || typeof raw !== 'object') return chyba(400, 'Chybí pravidla.');
    const soucasna = await nactiKlubPravidla(store);
    const dalsi = sloucitPravidla({ ...soucasna, ...raw });
    await ulozKlubPravidla(store, dalsi);
    return NextResponse.json({ ok: true, pravidla: dalsi }, { headers: noStore });
  }

  if (akce === 'migrace-dop') {
    const vysledek = await migrujDopNaKlienty(store);
    return NextResponse.json({ ok: vysledek.ok, migrace: vysledek }, { headers: noStore });
  }

  if (akce === 'utrata-rucne') {
    if (!klubZapnut()) return chyba(403, 'Klub je vypnutý.');
    const id = String(body.id || '').trim();
    const castka = Number(body.castka);
    const poznamka = String(body.poznamka || 'ruční').trim();
    if (!id || !Number.isFinite(castka)) return chyba(400, 'Chybí id nebo částka.');
    const k = await pridejUtratuRucne(store, id, castka, poznamka);
    if (!k) return chyba(404, 'Klient není.');
    const pravidla = await nactiKlubPravidla(store);
    return NextResponse.json(
      { ok: true, karta: verejnaKlientKarta(k, pravidla) },
      { headers: noStore },
    );
  }

  if (akce === 'import-potvrdit') {
    if (!klubZapnut()) return chyba(403, 'Klub je vypnutý.');
    const nahled = body.nahled as ImportUtrataNahled | undefined;
    if (!nahled || !Array.isArray(nahled.souhrn)) return chyba(400, 'Chybí náhled.');
    const vysledek = await potvrdImportUtraty(store, nahled);
    return NextResponse.json({ ok: true, ...vysledek }, { headers: noStore });
  }

  if (akce === 'import-bh-prime-nahled') {
    const nahled = await sestavNahledBhPrime(store);
    return NextResponse.json({ ok: true, nahled }, { headers: noStore });
  }

  if (akce === 'import-bh-csv-potvrdit') {
    if (!klubZapnut()) return chyba(403, 'Klub je vypnutý.');
    const nahled = body.nahled as ImportBhNahled | undefined;
    if (!nahled || !Array.isArray(nahled.souhrn)) return chyba(400, 'Chybí náhled.');
    const vysledek = await potvrdImportBhCsv(store, nahled);
    return NextResponse.json({ ok: true, ...vysledek }, { headers: noStore });
  }

  if (akce === 'utrata-ceka-spojit') {
    if (!klubZapnut()) return chyba(403, 'Klub je vypnutý.');
    const cekaId = String(body.cekaId || '').trim();
    const klientId = String(body.klientId || '').trim();
    if (!cekaId || !klientId) return chyba(400, 'Chybí cekaId nebo klientId.');
    const vysledek = await spojUtratuCeka(store, cekaId, klientId);
    if (!vysledek.ok) return chyba(404, 'Spojení se nepovedlo.');
    return NextResponse.json(
      { ok: true, castka: vysledek.castka },
      { headers: noStore },
    );
  }

  return chyba(400, 'Neznámá akce.');
}
