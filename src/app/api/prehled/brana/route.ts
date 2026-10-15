import { NextResponse } from 'next/server';
import {
  nahledBrany,
  nahledZneplatneni,
  otevriSmsBrany,
  potvrdBranu,
  potvrdOdpovedi,
  potvrdStavBrany,
  ulozRucniBranu,
  zneplatniBranu,
  zrusParkovani,
  type RucniVstup,
} from '@/lib/brana-akce';
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
    odpoved?: string;
    radky?: RucniVstup[];
  } | null;
  const akce = body?.akce;
  const store = createProcessStore();
  const ios = jeIos(request.headers.get('user-agent') || '');

  if (akce === 'nahled' || akce === 'nahled-zneplatnit') {
    const id = (body?.rezervace || '').trim();
    if (!id) return chyba(400, 'Chybí rezervace.');
    const vysledek =
      akce === 'nahled'
        ? await nahledBrany(store, { rezervace: id, druhe: body?.druhe })
        : await nahledZneplatneni(store, { rezervace: id, pozice: body?.pozice || 0 });
    if (!vysledek.ok) return chyba(400, vysledek.error);
    return NextResponse.json({ ok: true, nahled: vysledek.nahled, veta: vysledek.veta }, { headers: noStore });
  }

  if (akce === 'sms' || akce === 'zneplatnit') {
    const id = (body?.rezervace || '').trim();
    if (!id) return chyba(400, 'Chybí rezervace.');
    const vysledek =
      akce === 'zneplatnit'
        ? await zneplatniBranu(store, { rezervace: id, pozice: body?.pozice || 0, ios })
        : await otevriSmsBrany(store, { rezervace: id, ios, druhe: body?.druhe });
    if (!vysledek.ok) return chyba(400, vysledek.error);
    return NextResponse.json(
      { ok: true, pozice: vysledek.pozice, odkaz: vysledek.odkaz, text: vysledek.text, sloty: vysledek.sloty },
      { headers: noStore },
    );
  }

  if (akce === 'odpoved') {
    const id = (body?.rezervace || '').trim();
    const pozice = body?.pozice;
    const odpoved = body?.odpoved || '';
    if (!id || typeof pozice !== 'number' || !odpoved.trim()) return chyba(400, 'Chybí odpověď brány.');
    const vysledek = await potvrdOdpovedi(store, id, pozice, odpoved);
    if (!vysledek.ok) return chyba(400, vysledek.error);
    return NextResponse.json({ ok: true, sloty: vysledek.sloty }, { headers: noStore });
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
