import { NextResponse } from 'next/server';
import { najdiNeboVytvorOsobu, nactiOsobaIdRezervace } from '@/lib/doporuceni';
import { createProcessStore } from '@/lib/store';
import { parseSignedToken } from '@/lib/token';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

/** Vrátí (nebo založí) kód doporučitele pro hosta s platným tokenem. Jen `kod`, ne interní ID. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenRaw = (url.searchParams.get('token') || '').trim();
  if (!tokenRaw) {
    return NextResponse.json({ ok: false, duvod: 'token' }, { status: 400, headers: noStore });
  }

  let rezervaceId: string;
  try {
    const parsed = parseSignedToken(decodeURIComponent(tokenRaw));
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, duvod: 'token' }, { status: 400, headers: noStore });
    }
    rezervaceId = parsed.payload.r;
  } catch {
    return NextResponse.json({ ok: false, duvod: 'token' }, { status: 400, headers: noStore });
  }

  const store = createProcessStore();
  const rec = await store.getRezervace(rezervaceId);
  if (!rec) {
    return NextResponse.json({ ok: false, duvod: 'rezervace' }, { status: 404, headers: noStore });
  }

  const osobaId = await nactiOsobaIdRezervace(store, rezervaceId, rec);
  const osoba = await najdiNeboVytvorOsobu(store, {
    rezervaceId,
    jmeno: rec.jmeno,
    telefon: rec.telefon || rec.telefonRezervace,
    email: rec.emailHosta,
    narodnost: rec.narodnost,
    osobaId,
  });

  return NextResponse.json({ ok: true, kod: osoba.kod }, { headers: noStore });
}
