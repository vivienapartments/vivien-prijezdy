import { NextResponse } from 'next/server';
import { createProcessStore } from '@/lib/store';
import { ulozVstupHosta } from '@/lib/vstup-ulozit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as {
    token?: string;
    akce?: string;
    cas?: string;
    zpusob?: string;
    telefon?: string;
    spz?: string;
    pujcene?: boolean;
    souhlas?: boolean;
    jazyk?: string;
    kanal?: string;
    zrusit?: string;
    casPrijezd?: string;
    casOdjezd?: string;
    od?: string;
  } | null;
  const token = typeof body?.token === 'string' ? body.token : '';
  const vysledek = await ulozVstupHosta(createProcessStore(), token, {
    akce: body?.akce,
    cas: body?.cas,
    zpusob: body?.zpusob,
    telefon: body?.telefon,
    spz: body?.spz,
    pujcene: body?.pujcene === true,
    souhlas: typeof body?.souhlas === 'boolean' ? body.souhlas : undefined,
    jazyk: typeof body?.jazyk === 'string' ? body.jazyk : undefined,
    kanal: typeof body?.kanal === 'string' ? body.kanal : undefined,
    zrusit: typeof body?.zrusit === 'string' ? body.zrusit : undefined,
    casPrijezd: typeof body?.casPrijezd === 'string' ? body.casPrijezd : undefined,
    casOdjezd: typeof body?.casOdjezd === 'string' ? body.casOdjezd : undefined,
    od: typeof body?.od === 'string' ? body.od : undefined,
  });
  if (!vysledek.ok) {
    const status = vysledek.duvod === 'token' ? 401 : vysledek.duvod === 'limit' ? 429 : 400;
    return NextResponse.json({ ok: false, duvod: vysledek.duvod }, { status, headers: noStore });
  }
  return NextResponse.json(
    {
      ok: true,
      uroven: vysledek.uroven,
      cas: vysledek.cas,
      ...(vysledek.zadostCeka ? { zadostCeka: true } : {}),
      ...(vysledek.kanal ? { kanal: vysledek.kanal } : {}),
      ...(vysledek.zpravaOdjezdu ? { zpravaOdjezdu: vysledek.zpravaOdjezdu } : {}),
    },
    { headers: noStore },
  );
}
