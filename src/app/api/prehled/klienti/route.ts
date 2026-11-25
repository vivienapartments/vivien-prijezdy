import { NextResponse } from 'next/server';
import {
  migrujDopNaKlienty,
  nactiKlubPravidla,
  seznamKlientu,
  ulozKlubPravidla,
  verejnaKlientKarta,
  zajistiVychoziPravidla,
} from '@/lib/klient-karta';
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
      pravidla,
      karty: karty.map((k) => verejnaKlientKarta(k, pravidla)),
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

  return chyba(400, 'Neznámá akce.');
}
