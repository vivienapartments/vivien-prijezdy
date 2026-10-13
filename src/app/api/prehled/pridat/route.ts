import { NextResponse } from 'next/server';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { doplnRezervaci } from '@/lib/rezervace-rucne';
import { createProcessStore } from '@/lib/store';
import { APT_IDS, type AptId } from '@/lib/types';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status, headers: noStore });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nepřihlášen.');

  const body = (await request.json().catch(() => null)) as {
    rezervace?: string;
    jmeno?: string;
    telefon?: string;
    email?: string;
    apartman?: string;
    prijezd?: string;
    odjezd?: string;
    osob?: string | number;
    zdroj?: string;
  } | null;
  if (!body) return chyba(400, 'Formulář je prázdný.');

  const apartman = APT_IDS.includes((body.apartman || '') as AptId) ? (body.apartman as AptId) : null;
  const osobCislo = Number(String(body.osob || '').trim());
  const osob = String(body.osob || '').trim() && Number.isFinite(osobCislo) ? osobCislo : null;

  const vysledek = await doplnRezervaci(
    createProcessStore(),
    {
      rezervace: body.rezervace || '',
      jmeno: body.jmeno,
      telefon: body.telefon,
      email: body.email,
      apartman,
      prijezd: body.prijezd,
      odjezd: body.odjezd,
      osob,
      zdroj: body.zdroj,
    },
    { stitek: 'rucne', historie: 'Přidáno ručně' },
  );
  if (!vysledek.ok) return chyba(400, vysledek.error);
  return NextResponse.json({ ok: true, nova: vysledek.nova }, { headers: noStore });
}
