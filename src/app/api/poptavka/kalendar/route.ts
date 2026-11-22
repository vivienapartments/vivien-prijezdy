import { NextResponse } from 'next/server';
import { sestavKalendarProHosta } from '@/lib/kalendar-uloziste';
import { createProcessStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

/** Veřejná data pro poptávku: dny + vypínač cen. */
export async function GET() {
  try {
    const store = createProcessStore();
    const { dny, meta, bezAptPoDnech } = await sestavKalendarProHosta(store);
    return NextResponse.json(
      {
        ok: true,
        cenyZapnuto: meta.cenyZapnuto !== false,
        dny,
        bezAptPoDnech,
      },
      { headers: noStore },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'chyba';
    return NextResponse.json({ ok: false, error: msg }, { status: 500, headers: noStore });
  }
}
