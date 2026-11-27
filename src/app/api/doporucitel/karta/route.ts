import { NextResponse } from 'next/server';
import {
  nactiKartuPodleKlic,
  nastavVyplatuUdaje,
  pozadatVyplatu,
  verejnaKartaProUi,
  type VyplataZpusob,
} from '@/lib/doporucitel-karta';
import { createProcessStore } from '@/lib/store';
import { posliTelegram } from '@/lib/telegram';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store' };

export async function GET(req: Request) {
  const klic = new URL(req.url).searchParams.get('k') || '';
  const store = createProcessStore();
  const karta = await nactiKartuPodleKlic(store, klic);
  if (!karta) {
    return NextResponse.json({ ok: false, duvod: 'karta' }, { status: 404, headers: noStore });
  }
  return NextResponse.json({ ok: true, karta: verejnaKartaProUi(karta) }, { headers: noStore });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, duvod: 'body' }, { status: 400, headers: noStore });
  }
  const klic = String(body.k || '').trim();
  const akce = String(body.akce || '').trim();
  const store = createProcessStore();

  if (akce === 'vyplata-udaje') {
    const zpusob = String(body.zpusob || '') as VyplataZpusob;
    if (zpusob !== 'ucet' && zpusob !== 'sleva-na-pobyt' && zpusob !== 'poukaz') {
      return NextResponse.json({ ok: false, duvod: 'zpusob' }, { status: 400, headers: noStore });
    }
    const karta = await nastavVyplatuUdaje(store, klic, {
      zpusob,
      ucet: String(body.ucet || ''),
      majitelUctu: String(body.majitelUctu || ''),
      fakturuje: body.fakturuje === true,
    });
    if (!karta) {
      return NextResponse.json({ ok: false, duvod: 'karta' }, { status: 404, headers: noStore });
    }
    return NextResponse.json({ ok: true, karta: verejnaKartaProUi(karta) }, { headers: noStore });
  }

  if (akce === 'pozadat-vyplatu') {
    const vysledek = await pozadatVyplatu(store, klic);
    if (!vysledek.ok) {
      return NextResponse.json({ ok: false, duvod: vysledek.duvod }, { status: 400, headers: noStore });
    }
    await posliTelegram(
      `Žádost o výplatu ${vysledek.castka} Kč · ${vysledek.karta.jmeno}`,
      'automat',
      '/prehled/doporucitele',
    );
    return NextResponse.json(
      { ok: true, castka: vysledek.castka, karta: verejnaKartaProUi(vysledek.karta) },
      { headers: noStore },
    );
  }

  return NextResponse.json({ ok: false, duvod: 'akce' }, { status: 400, headers: noStore });
}
