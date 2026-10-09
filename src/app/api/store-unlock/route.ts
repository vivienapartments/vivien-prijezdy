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
 * Odblokuje jednu rezervaci (a související msg:…), i při TEST_REZIM=0.
 * Bearer CRON_SECRET. Query: rez=120260496&messageId=a&messageId=b
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

  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) {
    return NextResponse.json({ ok: false, error: 'KV chybí' }, { status: 500 });
  }

  const q = new URL(request.url).searchParams;
  const rezervace = (q.get('rez') || '').trim();
  const messageIds = q.getAll('messageId').map((s) => s.trim()).filter(Boolean);
  if (!rezervace && messageIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'chybí rez=… nebo messageId=…' },
      { status: 400 },
    );
  }

  try {
    const idSet = new Set(messageIds);
    const keys = await scanKeys(url, token);
    let removedMsg = 0;

    for (const key of keys) {
      if (!key.startsWith('msg:')) continue;
      const mid = key.slice(4);
      let match = idSet.has(mid);
      if (!match && rezervace) {
        const raw = (await kvCmd(url, token, ['GET', key])) as string | null;
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as { rezervace?: string };
          if (parsed.rezervace === rezervace) match = true;
        } catch {
          continue;
        }
      }
      if (!match) continue;
      await kvCmd(url, token, ['DEL', key]);
      removedMsg += 1;
    }

    let removedRez = false;
    if (rezervace) {
      const del = await kvCmd(url, token, ['DEL', `rez:${rezervace}`]);
      removedRez = del === 1 || del === '1';
    }

    return NextResponse.json({
      ok: true,
      rezervace: rezervace || null,
      removedMsg,
      removedRez,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'chyba';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
