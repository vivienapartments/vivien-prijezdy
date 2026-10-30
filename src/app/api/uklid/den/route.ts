import { NextResponse } from 'next/server';
import { dnesVPraze, posunDen } from '@/lib/prehled';
import { createProcessStore } from '@/lib/store';
import { sestavUklidDen } from '@/lib/uklid-den';
import { uklidPrihlasen } from '@/lib/uklid-session';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

export async function GET(request: Request): Promise<NextResponse> {
  if (!(await uklidPrihlasen())) {
    return NextResponse.json({ ok: false, error: 'Nepřihlášen.' }, { status: 401, headers: noStore });
  }
  const url = new URL(request.url);
  const dnes = dnesVPraze();
  const denParam = (url.searchParams.get('den') || '').trim();
  const den =
    denParam && /^\d{4}-\d{2}-\d{2}$/.test(denParam) ? denParam : dnes;
  const povolene = new Set([dnes, posunDen(dnes, 1), posunDen(dnes, 2)]);
  if (!povolene.has(den)) {
    return NextResponse.json({ ok: false, error: 'Den mimo rozsah.' }, { status: 400, headers: noStore });
  }

  const store = createProcessStore();
  const zaznamy = (await store.listRezervace()).map((e) => e.record);
  const pohled = sestavUklidDen(zaznamy, den);
  const dnesP = sestavUklidDen(zaznamy, dnes);
  const zitra = sestavUklidDen(zaznamy, posunDen(dnes, 1));
  const pozitri = sestavUklidDen(zaznamy, posunDen(dnes, 2));

  return NextResponse.json(
    {
      ok: true,
      dnes,
      den: pohled.den,
      karty: pohled.karty,
      pocetKUklidu: pohled.pocetKUklidu,
      pocty: {
        dnes: dnesP.pocetKUklidu,
        zitra: zitra.pocetKUklidu,
        pozitri: pozitri.pocetKUklidu,
      },
      dny: {
        dnes,
        zitra: posunDen(dnes, 1),
        pozitri: posunDen(dnes, 2),
      },
    },
    { headers: noStore },
  );
}
