import { NextResponse } from 'next/server';
import { doplnOdkazyZeSchranky, planOdkazu } from '@/lib/checkin-schranka';
import { cistaChyba } from '@/lib/cista-chyba';
import { fetchRecentInboxMails } from '@/lib/inbox-mail';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore } from '@/lib/store';

export const runtime = 'nodejs';
export const maxDuration = 60;

const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status, headers: noStore });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nepřihlášen.');
  const body = (await request.json().catch(() => null)) as { akce?: string } | null;
  if (body?.akce !== 'ukazat' && body?.akce !== 'doplnit') return chyba(400, 'Neznámá akce.');

  const user = process.env.IMAP_USER?.trim();
  const pass = process.env.IMAP_HESLO?.trim();
  if (!user || !pass) return chyba(500, 'Schránka není nastavená.');

  try {
    const mails = await fetchRecentInboxMails({ user, pass, days: 30 });
    const store = createProcessStore();
    const majitel = process.env.MAJITEL_PREPOSILA_Z?.trim() || '';
    if (body.akce === 'ukazat') {
      const seznam = (await store.listRezervace()).map((r) => r.record);
      return NextResponse.json({ ok: true, radky: planOdkazu(mails, seznam, majitel) }, { headers: noStore });
    }
    const vysledek = await doplnOdkazyZeSchranky(store, mails, majitel);
    return NextResponse.json({ ok: true, ...vysledek }, { headers: noStore });
  } catch (err) {
    const text = err instanceof Error ? err.message : 'chyba';
    return chyba(500, cistaChyba(text) || 'Schránku se nepodařilo přečíst.');
  }
}
