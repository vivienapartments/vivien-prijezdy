import { NextResponse } from 'next/server';
import { createProcessStore } from '@/lib/store';
import { parseSignedToken } from '@/lib/token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

/**
 * Host oznámí, že má průvodce na ploše.
 * Uloží plochaOd jen poprvé. Bez Telegramu a e-mailu.
 * Token platí i po odjezdu (stránka Expired).
 */
export async function POST(request: Request): Promise<NextResponse> {
  let token = '';
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body?.token === 'string' ? body.token : '';
  } catch {
    token = '';
  }
  if (!token.trim()) {
    return NextResponse.json({ ok: false }, { status: 400, headers: noStore });
  }

  let overeni;
  try {
    overeni = parseSignedToken(token);
  } catch {
    return NextResponse.json({ ok: false }, { status: 401, headers: noStore });
  }
  if (!overeni.ok) {
    return NextResponse.json({ ok: false }, { status: 401, headers: noStore });
  }

  const store = createProcessStore();
  const id = overeni.payload.r;
  const rec = await store.getRezervace(id);
  if (!rec) {
    return NextResponse.json({ ok: false }, { status: 404, headers: noStore });
  }
  if (rec.plochaOd) {
    return NextResponse.json({ ok: true, plochaOd: rec.plochaOd }, { headers: noStore });
  }

  const plochaOd = new Date().toISOString();
  await store.setRezervace(id, { ...rec, plochaOd });
  return NextResponse.json({ ok: true, plochaOd }, { headers: noStore });
}
