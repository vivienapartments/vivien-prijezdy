import { NextResponse } from 'next/server';
import { cistaChyba } from '@/lib/cista-chyba';
import { runInboxProcessing, vypisPotvrzeni } from '@/lib/process-inbox';
import { createProcessStore, pocetPrikazu, prevedPlatbyJednou, prodluzKartyJednou, type ProcessStore } from '@/lib/store';
import { upozorniBranu } from '@/lib/brana-upozorneni';
import { upozorniDnes } from '@/lib/dnesek-upozorneni';
import { upozorniOdjezdy } from '@/lib/odjezd-upozorneni';
import { upozorniPrijezd } from '@/lib/prijezd-upozorneni';
import { poBehZpracovani } from '@/lib/upozorneni';

export const runtime = 'nodejs';
export const maxDuration = 60;

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
}

function zapisSpotrebu(store: ProcessStore): void {
  const n = pocetPrikazu(store);
  if (n != null) console.log(`Upstash prikazu: ${n}`);
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

  const store = createProcessStore();
  try {
    const prodlouzeno = await prodluzKartyJednou(store);
    if (prodlouzeno != null) console.log(`Uchovani karet prodlouzeno: ${prodlouzeno}`);
  } catch {
    console.error('Uchovani karet selhalo');
  }
  try {
    const prevedeno = await prevedPlatbyJednou(store);
    if (prevedeno != null) console.log(`Platby prevedeny: ${prevedeno}`);
  } catch {
    console.error('Prevod plateb selhal');
  }
  try {
    const summary = await runInboxProcessing({ store });
    const posledni = [...summary.items].reverse().find((i) => i.reason);
    await store.setBeh({
      cas: new Date().toISOString(),
      schranka: 'ano',
      mailu: summary.scanned,
      chyba: cistaChyba(posledni?.reason || ''),
    });
    await poBehZpracovani(store, true).catch(() => undefined);
    await upozorniBranu(store).catch(() => undefined);
    await upozorniPrijezd(store).catch(() => undefined);
    await upozorniOdjezdy(store).catch(() => undefined);
    await upozorniDnes(store).catch(() => undefined);
    zapisSpotrebu(store);
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
    zapisSpotrebu(store);
    await store
      .setBeh({
        cas: new Date().toISOString(),
        schranka: 'ne',
        mailu: 0,
        chyba: cistaChyba(message) || 'čtení selhalo',
      })
      .catch(() => undefined);
    await poBehZpracovani(store, false).catch(() => undefined);
    await upozorniBranu(store).catch(() => undefined);
    await upozorniPrijezd(store).catch(() => undefined);
    await upozorniOdjezdy(store).catch(() => undefined);
    await upozorniDnes(store).catch(() => undefined);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
