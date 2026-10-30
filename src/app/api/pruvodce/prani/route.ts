import { NextResponse } from 'next/server';
import {
  hostNactiPrani,
  hostNapisPrani,
  hostSmazPrani,
  hostUpravPrani,
} from '@/lib/prani';
import { createProcessStore } from '@/lib/store';
import { verifyToken } from '@/lib/token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, duvod: string): NextResponse {
  return NextResponse.json({ ok: false, duvod }, { status, headers: noStore });
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as {
    token?: string;
    akce?: string;
    id?: string;
    vlakno?: string;
    text?: string;
  } | null;

  const token = typeof body?.token === 'string' ? body.token : '';
  let payload;
  try {
    const vysledek = verifyToken(token);
    if (!vysledek.ok) return chyba(401, 'token');
    payload = vysledek.payload;
  } catch {
    return chyba(401, 'token');
  }

  const rez = String(payload.r || '').trim();
  if (!rez) return chyba(401, 'token');

  const store = createProcessStore();
  const rec = await store.getRezervace(rez);
  if (!rec) return chyba(404, 'nenalezeno');
  if (rec.stav === 'zruseno') return chyba(404, 'zruseno');

  const akce = body?.akce;
  if (akce === 'nacti') {
    const vysledek = await hostNactiPrani(store, rec);
    return NextResponse.json({ ok: true, ...vysledek.data }, { headers: noStore });
  }

  if (akce === 'napis') {
    const vysledek = await hostNapisPrani(store, rec, {
      id: typeof body?.id === 'string' ? body.id : '',
      vlakno: typeof body?.vlakno === 'string' ? body.vlakno : null,
      text: typeof body?.text === 'string' ? body.text : '',
    });
    if (!vysledek.ok) {
      const status =
        vysledek.duvod === 'limit' ? 429 : vysledek.duvod === 'nenalezeno' ? 404 : 400;
      return chyba(status, vysledek.duvod);
    }
    return NextResponse.json(
      { ok: true, uz: Boolean(vysledek.uz), vlakno: vysledek.vlakno },
      { headers: noStore },
    );
  }

  if (akce === 'uprav') {
    const vysledek = await hostUpravPrani(store, rec, {
      id: typeof body?.id === 'string' ? body.id : '',
      text: typeof body?.text === 'string' ? body.text : '',
    });
    if (!vysledek.ok) {
      const status = vysledek.duvod === 'nenalezeno' ? 404 : 400;
      return chyba(status, vysledek.duvod);
    }
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (akce === 'smaz') {
    const vysledek = await hostSmazPrani(store, rec, {
      id: typeof body?.id === 'string' ? body.id : '',
    });
    if (!vysledek.ok) {
      const status = vysledek.duvod === 'nenalezeno' ? 404 : 400;
      return chyba(status, vysledek.duvod);
    }
    return NextResponse.json(
      { ok: true, zrusenoVlakno: Boolean(vysledek.zrusenoVlakno) },
      { headers: noStore },
    );
  }

  return chyba(400, 'text');
}
