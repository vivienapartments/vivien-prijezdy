import { NextResponse } from 'next/server';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore, type PushZarizeni } from '@/lib/store';
import { textZkuseni, upozorniMajitelePodrobne } from '@/lib/upozorneni';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status, headers: noStore });
}

function vypis(list: PushZarizeni[]) {
  return list.map((z) => ({
    nazev: z.nazev || 'Telefon',
    cas: z.cas,
    konec: z.endpoint.slice(-12),
    endpoint: z.endpoint,
  }));
}

export async function GET(): Promise<NextResponse> {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nepřihlášen.');
  const store = createProcessStore();
  let list: PushZarizeni[] = [];
  let chybaUlaziste = '';
  try {
    list = await store.listPush();
  } catch (err) {
    chybaUlaziste = err instanceof Error ? err.message : 'úložiště';
  }
  return NextResponse.json(
    {
      ok: true,
      publicKey: process.env.VAPID_PUBLIC?.trim() || '',
      vapid: Boolean(process.env.VAPID_PUBLIC?.trim() && process.env.VAPID_PRIVATE?.trim()),
      pocet: list.length,
      zarizeni: vypis(list),
      chybaUlaziste: chybaUlaziste || undefined,
    },
    { headers: noStore },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nepřihlášen.');
  const body = (await request.json().catch(() => null)) as {
    akce?: string;
    nazev?: string;
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  } | null;
  const store = createProcessStore();

  if (body?.akce === 'zkusit') {
    const vysledek = await upozorniMajitelePodrobne(store, 'Zkušební upozornění z přehledu VIVIEN', '/prehled', {
      zkuseni: true,
    });
    return NextResponse.json(
      {
        ok: true,
        jak: vysledek.jak,
        pocet: vysledek.doruceno,
        zarizeni: vysledek.zarizeni,
        text: textZkuseni(vysledek),
      },
      { headers: noStore },
    );
  }

  let list: PushZarizeni[] = [];
  try {
    list = await store.listPush();
  } catch {
    return chyba(503, 'Úložiště teď neodpovídá. Zkuste to za chvíli.');
  }

  if (body?.akce === 'vypnout') {
    const endpoint = (body.endpoint || '').trim();
    if (!endpoint) return chyba(400, 'Chybí zařízení.');
    await store.savePush(list.filter((z) => z.endpoint !== endpoint));
    return NextResponse.json({ ok: true, zarizeni: vypis(list.filter((z) => z.endpoint !== endpoint)) }, { headers: noStore });
  }

  if (body?.akce !== 'zapnout') return chyba(400, 'Neznámá akce.');
  const endpoint = (body.endpoint || '').trim();
  const p256dh = body.keys?.p256dh || '';
  const auth = body.keys?.auth || '';
  if (!endpoint || !p256dh || !auth) return chyba(400, 'Prohlížeč upozornění nepředal.');
  const bez = list.filter((z) => z.endpoint !== endpoint);
  const nazev = (body.nazev || 'Telefon').replace(/\s+/g, ' ').trim().slice(0, 40) || 'Telefon';
  const dalsi: PushZarizeni = {
    endpoint,
    p256dh,
    auth,
    nazev,
    cas: new Date().toISOString(),
    role: 'majitel',
  };
  await store.savePush([...bez, dalsi]);
  return NextResponse.json({ ok: true, zarizeni: vypis([...bez, dalsi]) }, { headers: noStore });
}
