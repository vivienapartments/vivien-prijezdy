import { NextResponse } from 'next/server';
import { nactiStavPruvodce } from '@/lib/pruvodce-stav';
import { createProcessStore } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

/** Host se ptá, jestli už je předáno. Otevření se nepočítá. Bez předání žádný kód. */
export async function POST(request: Request): Promise<NextResponse> {
  let token = '';
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body?.token === 'string' ? body.token : '';
  } catch {
    token = '';
  }

  const stav = await nactiStavPruvodce(createProcessStore(), token);
  if (!stav.ok) {
    return NextResponse.json({ predano: false }, { status: 404, headers: noStore });
  }
  return NextResponse.json({ predano: stav.predano, kody: stav.kody }, { headers: noStore });
}
