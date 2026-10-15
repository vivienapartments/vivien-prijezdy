import { NextResponse } from 'next/server';
import { otevriSmsBrany, potvrdBranu, potvrdStavBrany, ulozRucniBranu, zrusParkovani, type RucniVstup } from '@/lib/brana-akce';
import { jeIos } from '@/lib/brana';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore } from '@/lib/store';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status, headers: noStore });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nepřihlášen.');
  const body = (await request.json().catch(() => null)) as {
    akce?: string;
    rezervace?: string;
    pozice?: number;
    druhe?: string;
    radky?: RucniVstup[];
  } | null;
  const akce = body?.akce;
  const store = createProcessStore();
  const ios = jeIos(request.headers.get('user-agent') || '');

  if (akce === 'sms') {
    const id = (body?.rezervace || '').trim();
    if (!id) return chyba(400, 'Chybí rezervace.');
    const vysledek = await otevriSmsBrany(store, { rezervace: id, ios, druhe: body?.druhe });
    if (!vysledek.ok) return chyba(400, vysledek.error);
    return NextResponse.json(
      { ok: true, pozice: vysledek.pozice, odkaz: vysledek.odkaz, text: vysledek.text, sloty: vysledek.sloty },
      { headers: noStore },
    );
  }

  if (akce === 'potvrdit' || akce === 'zrusit') {
    const id = (body?.rezervace || '').trim();
    const pozice = body?.pozice;
    if (!id || typeof pozice !== 'number') return chyba(400, 'Chybí pozice.');
    const vysledek = akce === 'potvrdit' ? await potvrdBranu(store, id, pozice) : await zrusParkovani(store, id, pozice);
    if (!vysledek.ok) return chyba(400, vysledek.error);
    return NextResponse.json({ ok: true, sloty: vysledek.sloty }, { headers: noStore });
  }

  if (akce === 'souhlas') {
    const vysledek = await potvrdStavBrany(store);
    return NextResponse.json({ ok: true, sloty: vysledek.sloty, potvrzeno: true }, { headers: noStore });
  }

  if (akce === 'ulozit') {
    if (!Array.isArray(body?.radky) || body.radky.length === 0) return chyba(400, 'Chybí řádky brány.');
    const vysledek = await ulozRucniBranu(store, body.radky);
    if (!vysledek.ok) return chyba(400, vysledek.error);
    return NextResponse.json({ ok: true, sloty: vysledek.sloty }, { headers: noStore });
  }

  return chyba(400, 'Neznámá akce.');
}
