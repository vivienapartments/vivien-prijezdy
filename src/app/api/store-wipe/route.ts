import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * TEST: vyprázdní Upstash paměť (FLUSHDB). Jen s Bearer CRON_SECRET a TEST_REZIM=1.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET chybí' }, { status: 500 });
  }

  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!bearer || bearer !== secret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if ((process.env.TEST_REZIM ?? '1') === '0') {
    return NextResponse.json(
      { ok: false, error: 'wipe jen při TEST_REZIM=1' },
      { status: 403 },
    );
  }

  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) {
    return NextResponse.json({ ok: false, error: 'KV chybí' }, { status: 500 });
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['FLUSHDB']),
    });
    const body = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Upstash ${res.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, flushed: true, detail: body.slice(0, 80) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'chyba';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
