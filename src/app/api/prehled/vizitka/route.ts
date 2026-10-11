import { NextResponse } from 'next/server';
import { ukazkovaRezervace } from '@/lib/prehled-ukazka';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore, type RezervaceRecord } from '@/lib/store';
import { sestavVizitku } from '@/lib/vizitka';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

function soubor(vizitka: { soubor: string; souborUtf: string; telo: string }): NextResponse {
  const ascii = vizitka.soubor.replace(/["\r\n]/g, '');
  const utf = encodeURIComponent(vizitka.souborUtf);
  return new NextResponse(vizitka.telo, {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `inline; filename="${ascii}"; filename*=UTF-8''${utf}`,
      ...noStore,
    },
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  const id = new URL(request.url).searchParams.get('rezervace')?.trim() || '';
  if (!id) return new NextResponse('Chybí rezervace.', { status: 400, headers: noStore });

  const prihlasen = await prehledPrihlasen();
  let rec: RezervaceRecord | null = null;
  if (prihlasen) {
    rec = await createProcessStore().getRezervace(id);
  } else if (process.env.NODE_ENV !== 'production') {
    rec = ukazkovaRezervace(id);
  }
  if (!rec) {
    const text = prihlasen ? 'Rezervace v přehledu není.' : 'Nepřihlášen.';
    return new NextResponse(text, { status: prihlasen ? 404 : 401, headers: noStore });
  }

  const vizitka = sestavVizitku(rec);
  if (!vizitka) return new NextResponse('Host nemá telefon.', { status: 404, headers: noStore });
  return soubor(vizitka);
}
