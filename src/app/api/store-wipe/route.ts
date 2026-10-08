import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

async function kvCmd(
  url: string,
  token: string,
  args: (string | number)[],
): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
  const json = (await res.json()) as { result: unknown };
  return json.result;
}

async function scanKeys(url: string, token: string): Promise<string[]> {
  let cursor = '0';
  const keys: string[] = [];
  do {
    const result = (await kvCmd(url, token, ['SCAN', cursor, 'COUNT', 100])) as [
      string,
      string[],
    ];
    cursor = String(result[0]);
    keys.push(...(result[1] || []));
  } while (cursor !== '0');
  return keys;
}

/**
 * TEST: FLUSHDB, nebo mode=errors (jen záznamy status=error).
 * Bearer CRON_SECRET + TEST_REZIM=1.
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

  const mode = new URL(request.url).searchParams.get('mode') || 'all';

  try {
    if (mode === 'all') {
      const result = await kvCmd(url, token, ['FLUSHDB']);
      return NextResponse.json({ ok: true, flushed: true, result });
    }

    if (mode !== 'errors' && mode !== 'sent') {
      return NextResponse.json({ ok: false, error: 'mode: all|errors|sent' }, { status: 400 });
    }

    const wantStatus = mode === 'errors' ? 'error' : 'sent';
    const keys = await scanKeys(url, token);
    let removedMsg = 0;
    let removedRez = 0;
    const reasons: string[] = [];
    const rezervace: string[] = [];

    for (const key of keys) {
      if (!key.startsWith('msg:')) continue;
      const raw = (await kvCmd(url, token, ['GET', key])) as string | null;
      if (!raw) continue;
      let parsed: { status?: string; rezervace?: string; reason?: string };
      try {
        parsed = JSON.parse(raw) as {
          status?: string;
          rezervace?: string;
          reason?: string;
        };
      } catch {
        continue;
      }
      if (parsed.status !== wantStatus) continue;
      await kvCmd(url, token, ['DEL', key]);
      removedMsg += 1;
      if (parsed.reason) reasons.push(parsed.reason);
      if (parsed.rezervace) {
        rezervace.push(parsed.rezervace);
        const rezKey = `rez:${parsed.rezervace}`;
        const del = await kvCmd(url, token, ['DEL', rezKey]);
        if (del === 1 || del === '1') removedRez += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      mode,
      removedMsg,
      removedRez,
      rezervace: rezervace.slice(0, 20),
      reasons: reasons.slice(0, 10),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'chyba';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
