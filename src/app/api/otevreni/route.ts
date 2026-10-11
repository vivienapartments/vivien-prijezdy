import { NextResponse } from 'next/server';
import { zpracujBeacon } from '@/lib/otevreni';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Záznam z prohlížeče hosta. Neplatný token, majitel i robot skončí bez zápisu. */
export async function POST(request: Request): Promise<NextResponse> {
  let token = '';
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body?.token === 'string' ? body.token : '';
  } catch {
    token = '';
  }

  const majitel = await prehledPrihlasen();
  await zpracujBeacon({
    token,
    ua: request.headers.get('user-agent'),
    majitel,
    store: createProcessStore(),
  });

  return new NextResponse(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  });
}
