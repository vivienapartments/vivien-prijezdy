import { NextResponse } from 'next/server';
import {
  migrujDopNaKlienty,
  nactiKlubPravidla,
  seznamKlientu,
  ulozKlubPravidla,
  verejnaKlientKarta,
  zajistiVychoziPravidla,
} from '@/lib/klient-karta';
import { klubZapnut } from '@/lib/klub-klic';
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

function chyba(status: number, text: string) {
  return NextResponse.json({ ok: false, chyba: text }, { status, headers: noStore });
}

export async function GET() {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nejste přihlášeni.');
  const store = createProcessStore();
  const pravidla = await zajistiVychoziPravidla(store);
  const karty = await seznamKlientu(store);
  return NextResponse.json(
    {
      ok: true,
      klubZapnut: klubZapnut(),
      pravidla,
      karty: karty.map((k) => verejnaKlientKarta(k, pravidla)),
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

  return chyba(400, 'Neznámá akce.');
}
