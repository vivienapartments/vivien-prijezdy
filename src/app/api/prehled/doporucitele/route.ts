import { NextResponse } from 'next/server';
import {
  nactiKartuPodleKodu,
  nactiPravidla,
  potvrdVyplaceno,
  seznamKaret,
  seznamPozvanek,
  ulozPravidla,
  zalozPozvanku,
  verejnaKartaProUi,
  zalozKartuMajitel,
  zmenStavDoporuceniRucne,
  type DoporuceniNaKarteStav,
  type DoporucitelPravidla,
  type DoporucitelTyp,
} from '@/lib/doporucitel-karta';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore } from '@/lib/store';
import { GUIDE_LANGS, type GuideLang } from '@/lib/types';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, text: string) {
  return NextResponse.json({ ok: false, chyba: text }, { status, headers: noStore });
}

export async function GET() {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nejste přihlášeni.');
  const store = createProcessStore();
  const karty = await seznamKaret(store);
  const pozvanky = await seznamPozvanek(store);
  const pravidla = await nactiPravidla(store);
  const pocetKeSchvaleni = pozvanky.filter((p) => p.stav === 'ke_schvaleni').length;
  return NextResponse.json(
    {
      ok: true,
      pravidla,
      pozvanky,
      pocetKeSchvaleni,
      karty: karty.map((k) => ({
        ...verejnaKartaProUi(k),
        tajnyKlic: k.tajnyKlic,
      })),
    },
    { headers: noStore },
  );
}

export async function POST(req: Request) {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nejste přihlášeni.');
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return chyba(400, 'Špatný požadavek.');
  }
  const akce = String(body.akce || '').trim();
  const store = createProcessStore();

  if (akce === 'pozvat') {
    const poznamka = String(body.poznamka || '').trim().slice(0, 80);
    const pozvanka = await zalozPozvanku(store, poznamka);
    return NextResponse.json({ ok: true, pozvanka }, { headers: noStore });
  }

  if (akce === 'novy') {
    const typ = (String(body.typ || 'osoba') as DoporucitelTyp) || 'osoba';
    const jmeno = String(body.jmeno || '').trim();
    if (!jmeno) return chyba(400, 'Chybí jméno.');
    const langRaw = String(body.jazyk || 'cs');
    const jazyk: GuideLang = GUIDE_LANGS.includes(langRaw as GuideLang) ? (langRaw as GuideLang) : 'cs';
    const karta = await zalozKartuMajitel(store, {
      typ: typ === 'firma' || typ === 'host' ? typ : 'osoba',
      jmeno,
      prijmeni: String(body.prijmeni || ''),
      email: String(body.email || ''),
      telefon: String(body.telefon || ''),
      jazyk,
    });
    return NextResponse.json({ ok: true, karta: verejnaKartaProUi(karta), tajnyKlic: karta.tajnyKlic }, { headers: noStore });
  }

  if (akce === 'vyplaceno') {
    const kod = String(body.kod || '').trim();
    const castka = Number(body.castka || 0);
    const karta = await potvrdVyplaceno(store, kod, castka, String(body.poznamka || ''));
    if (!karta) return chyba(404, 'Karta nenalezena.');
    return NextResponse.json({ ok: true, karta: verejnaKartaProUi(karta) }, { headers: noStore });
  }

  if (akce === 'stav') {
    const karta = await zmenStavDoporuceniRucne(
      store,
      String(body.kod || ''),
      String(body.doporuceniId || ''),
      String(body.stav || '') as DoporuceniNaKarteStav,
    );
    if (!karta) return chyba(404, 'Karta nenalezena.');
    return NextResponse.json({ ok: true, karta: verejnaKartaProUi(karta) }, { headers: noStore });
  }

  if (akce === 'pravidla') {
    const aktualni = await nactiPravidla(store);
    const dalsi: DoporucitelPravidla = {
      ...aktualni,
      odmenaPct: Number(body.odmenaPct ?? aktualni.odmenaPct),
      azPoOdjezdu: body.azPoOdjezdu !== false,
      jenPrvniPobyt: body.jenPrvniPobyt !== false,
      stejnaProHostyINehosty: body.stejnaProHostyINehosty !== false,
      kodNeomezene: body.kodNeomezene !== false,
      minVyplata: Number(body.minVyplata ?? aktualni.minVyplata),
    };
    await ulozPravidla(store, dalsi);
    return NextResponse.json({ ok: true, pravidla: dalsi }, { headers: noStore });
  }

  if (akce === 'detail') {
    const karta = await nactiKartuPodleKodu(store, String(body.kod || ''));
    if (!karta) return chyba(404, 'Karta nenalezena.');
    return NextResponse.json(
      { ok: true, karta: verejnaKartaProUi(karta), tajnyKlic: karta.tajnyKlic },
      { headers: noStore },
    );
  }

  return chyba(400, 'Neznámá akce.');
}
