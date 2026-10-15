import { NextResponse } from 'next/server';
import { cistaChyba } from '@/lib/cista-chyba';
import { runInboxProcessing, vypisPotvrzeni } from '@/lib/process-inbox';
import { createProcessStore } from '@/lib/store';
import { upozorniBranu } from '@/lib/brana-upozorneni';
import { upozorniNezaplacene } from '@/lib/platba';
import { poBehZpracovani } from '@/lib/upozorneni';

export const runtime = 'nodejs';
export const maxDuration = 60;

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET chybí' }, { status: 500 });
  }

  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!bearer || bearer !== secret) {
    return unauthorized();
  }

  const url = new URL(request.url);
  if (url.searchParams.get('cteni') === '1') {
    try {
      const vypis = await vypisPotvrzeni(undefined, url.searchParams.get('overeni') === '1');
      return NextResponse.json({ ok: true, vypis });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'chyba';
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  try {
    const summary = await runInboxProcessing();
    const store = createProcessStore();
    const posledni = [...summary.items].reverse().find((i) => i.reason);
    await store.setBeh({
      cas: new Date().toISOString(),
      schranka: 'ano',
      mailu: summary.scanned,
      chyba: cistaChyba(posledni?.reason || ''),
    });
    await poBehZpracovani(store, true);
    await upozorniNezaplacene(store).catch(() => undefined);
    await upozorniBranu(store).catch(() => undefined);
    return NextResponse.json({
      ok: true,
      scanned: summary.scanned,
      sent: summary.sent,
      skipped: summary.skipped,
      rejected: summary.rejected,
      duplicate: summary.duplicate,
      errors: summary.errors,
      items: summary.items.map((i) => ({
        rezervace: i.rezervace,
        status: i.status,
        reason: i.reason,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'chyba';
    const store = createProcessStore();
    await store
      .setBeh({
        cas: new Date().toISOString(),
        schranka: 'ne',
        mailu: 0,
        chyba: cistaChyba(message) || 'čtení selhalo',
      })
      .catch(() => undefined);
    await poBehZpracovani(store, false);
    await upozorniNezaplacene(store).catch(() => undefined);
    await upozorniBranu(store).catch(() => undefined);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
