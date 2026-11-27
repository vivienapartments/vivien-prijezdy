import { NextResponse } from 'next/server';
import { dotazAres } from '@/lib/faktura';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store' };

/** Veřejné načtení firmy z ARES pro pozvánku doporučitele. */
export async function GET(req: Request) {
  const ico = new URL(req.url).searchParams.get('ico') || '';
  const ares = await dotazAres(ico);
  return NextResponse.json({ ok: ares.ok, ares }, { headers: noStore });
}
