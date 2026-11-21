import { NextResponse } from 'next/server';
import { cistaChyba } from '@/lib/cista-chyba';
import { runInboxProcessing } from '@/lib/process-inbox';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore } from '@/lib/store';

export const runtime = 'nodejs';
export const maxDuration = 60;

const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status, headers: noStore });
}

/** Ruční běh schránky z přehledu. Stejné čtení jako cron, bez čekání na minutu. */
export async function POST(): Promise<NextResponse> {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nepřihlášen.');

  const store = createProcessStore();
  try {
    const summary = await runInboxProcessing({ store });
    const posledni = [...summary.items].reverse().find((i) => i.reason);
    await store.setBeh({
      cas: new Date().toISOString(),
      schranka: 'ano',
      mailu: summary.scanned,
      chyba: cistaChyba(posledni?.reason || ''),
    });
    return NextResponse.json(
      {
        ok: true,
        scanned: summary.scanned,
        sent: summary.sent,
        skipped: summary.skipped,
        rejected: summary.rejected,
        duplicate: summary.duplicate,
        errors: summary.errors,
      },
      { headers: noStore },
    );
  } catch (err) {
    const text = err instanceof Error ? err.message : 'chyba';
    try {
      await store.setBeh({
        cas: new Date().toISOString(),
        schranka: 'ne',
        mailu: 0,
        chyba: cistaChyba(text),
      });
    } catch {
      /* zápis behu nesmí zakrýt chybu */
    }
    return chyba(500, cistaChyba(text) || 'Schránku se nepodařilo načíst.');
  }
}
