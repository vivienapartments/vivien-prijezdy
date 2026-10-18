import { NextResponse } from 'next/server';
import { createProcessStore } from '@/lib/store';
import { overTokenZavad, potvrdZavady } from '@/lib/zavady-predani';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  const token = (body?.token || '').trim();
  const overeno = overTokenZavad(token);
  if (!overeno.ok) {
    return NextResponse.json({ ok: false, error: 'Odkaz neplatí.' }, { status: 400, headers: noStore });
  }

  const store = createProcessStore();
  const rec = await store.getRezervace(overeno.rezervace);
  if (!rec?.zavadyPredani) {
    return NextResponse.json({ ok: false, error: 'Zápis už tu není.' }, { status: 404, headers: noStore });
  }

  const dalsi = potvrdZavady(rec, overeno.odeslanoKdy);
  if (!dalsi) {
    return NextResponse.json({ ok: false, error: 'Odkaz nepatří k tomuto zápisu.' }, { status: 400, headers: noStore });
  }

  if (dalsi !== rec) await store.setRezervace(overeno.rezervace, dalsi);
  return NextResponse.json(
    { ok: true, uz: Boolean(rec.zavadyPredani.potvrzenoKdy), potvrzenoKdy: dalsi.zavadyPredani?.potvrzenoKdy },
    { headers: noStore },
  );
}
