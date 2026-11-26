import { NextResponse } from 'next/server';
import { nactiKlientPodleTajnehoKlice, ulozKlientKartu } from '@/lib/klient-karta';
import { klubZapnut } from '@/lib/klub-klic';
import { createProcessStore } from '@/lib/store';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store' };

/** Označí první otevření poděkování na kartě (server, ne jen prohlížeč). */
export async function POST(req: Request) {
  if (!klubZapnut()) {
    return NextResponse.json({ ok: false, chyba: 'klub-vypnuty' }, { status: 400, headers: noStore });
  }
  let body: { k?: string } = {};
  try {
    body = (await req.json()) as { k?: string };
  } catch {
    return NextResponse.json({ ok: false, chyba: 'json' }, { status: 400, headers: noStore });
  }
  const klic = (body.k || '').trim();
  if (!klic || klic.startsWith('ukazka-')) {
    return NextResponse.json({ ok: true, ukazka: true }, { headers: noStore });
  }
  const store = createProcessStore();
  const karta = await nactiKlientPodleTajnehoKlice(store, klic);
  if (!karta) {
    return NextResponse.json({ ok: false, chyba: 'missing' }, { status: 404, headers: noStore });
  }
  if (!karta.podekovaniVidel) {
    karta.podekovaniVidel = new Date().toISOString();
    await ulozKlientKartu(store, karta);
  }
  return NextResponse.json(
    { ok: true, podekovaniVidel: karta.podekovaniVidel },
    { headers: noStore },
  );
}
