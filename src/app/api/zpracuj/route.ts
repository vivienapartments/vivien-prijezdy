import { NextResponse } from 'next/server';
import { runInboxProcessing } from '@/lib/process-inbox';

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

  try {
    const summary = await runInboxProcessing();
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
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
