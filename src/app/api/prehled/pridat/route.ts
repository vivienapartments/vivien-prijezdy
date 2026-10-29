import { NextResponse } from 'next/server';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { vytvorRucniRezervaci } from '@/lib/rezervace-rucne';
import { createProcessStore } from '@/lib/store';
import { APT_IDS, GUIDE_LANGS, type AptId, type GuideLang } from '@/lib/types';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, body: Record<string, unknown>): NextResponse {
  return NextResponse.json({ ok: false, ...body }, { status, headers: noStore });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await prehledPrihlasen())) return chyba(401, { error: 'Nepřihlášen.' });

  const body = (await request.json().catch(() => null)) as {
    jmeno?: string;
    telefon?: string;
    email?: string;
    apartman?: string;
    prijezd?: string;
    odjezd?: string;
    osob?: string | number;
    pin?: string;
    narodnost?: string;
    jazyk?: string;
    potvrdPrekryv?: boolean;
  } | null;
  if (!body) return chyba(400, { error: 'Formulář je prázdný.' });

  const apartman = APT_IDS.includes((body.apartman || '') as AptId) ? (body.apartman as AptId) : null;
  if (!apartman) return chyba(400, { error: 'Vyberte apartmán.' });
  const osobCislo = Number(String(body.osob || '').trim());
  if (!Number.isFinite(osobCislo) || osobCislo < 1) return chyba(400, { error: 'Doplňte počet osob.' });
  const jazyk = GUIDE_LANGS.includes((body.jazyk || '') as GuideLang) ? (body.jazyk as GuideLang) : null;

  const vysledek = await vytvorRucniRezervaci(
    createProcessStore(),
    {
      jmeno: body.jmeno,
      telefon: body.telefon,
      email: body.email,
      apartman,
      prijezd: body.prijezd || '',
      odjezd: body.odjezd || '',
      osob: osobCislo,
      pin: body.pin || '',
      narodnost: body.narodnost,
      jazyk,
    },
    { potvrdPrekryv: Boolean(body.potvrdPrekryv) },
  );
  if (!vysledek.ok) {
    return chyba(400, {
      error: vysledek.error,
      prekryv: vysledek.prekryv || null,
    });
  }
  return NextResponse.json({ ok: true, rezervace: vysledek.rezervace }, { headers: noStore });
}
