import { NextResponse } from 'next/server';
import { createProcessStore } from '@/lib/store';
import { parseSignedToken } from '@/lib/token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

/** Host klepl Pokračovat u zprávy od nás. */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as {
    token?: string;
    id?: string;
  } | null;
  const token = typeof body?.token === 'string' ? body.token : '';
  const id = body?.id === 'cas' || body?.id === 'brana' ? body.id : null;
  if (!token || !id) {
    return NextResponse.json({ ok: false }, { status: 400, headers: noStore });
  }

  let result;
  try {
    result = parseSignedToken(decodeURIComponent(token));
  } catch {
    return NextResponse.json({ ok: false }, { status: 401, headers: noStore });
  }
  if (!result.ok) {
    return NextResponse.json({ ok: false }, { status: 401, headers: noStore });
  }

  const store = createProcessStore();
  const rec = await store.getRezervace(result.payload.r);
  if (!rec) {
    return NextResponse.json({ ok: false }, { status: 404, headers: noStore });
  }

  const ted = new Date().toISOString();
  if (id === 'cas') {
    if (rec.zpravaCasPrectena) {
      return NextResponse.json({ ok: true }, { headers: noStore });
    }
    await store.setRezervace(rec.rezervace, {
      ...rec,
      zpravaCasPrectena: ted,
      posledniPokus: ted,
      historie: [...rec.historie, { cas: ted, co: 'Host přečetl zprávu k času' }].slice(-40),
    });
  } else {
    if (rec.zpravaBranaPrectena) {
      return NextResponse.json({ ok: true }, { headers: noStore });
    }
    await store.setRezervace(rec.rezervace, {
      ...rec,
      zpravaBranaPrectena: ted,
      posledniPokus: ted,
      historie: [...rec.historie, { cas: ted, co: 'Host přečetl zprávu k bráně' }].slice(-40),
    });
  }

  return NextResponse.json({ ok: true }, { headers: noStore });
}
