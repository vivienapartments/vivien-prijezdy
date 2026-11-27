import { NextResponse } from 'next/server';
import { problemEmailu } from '@/lib/chyby';
import {
  jmenoDoporucitele,
  nactiPozvanku,
  schvalPozvanku,
  vyplnPozvanku,
  zalozKartuZeZkousky,
  type UdajeDoporucitele,
} from '@/lib/doporucitel-karta';
import { jeZkusebniProstredi } from '@/lib/klub-klic';
import { createProcessStore } from '@/lib/store';
import { posliTelegram } from '@/lib/telegram';
import { GUIDE_LANGS, type GuideLang } from '@/lib/types';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, duvod: string) {
  return NextResponse.json({ ok: false, duvod }, { status, headers: noStore });
}

function udajeZ(body: Record<string, unknown>): UdajeDoporucitele | { duvod: string } {
  const jmeno = String(body.jmeno || '').trim().slice(0, 60);
  const prijmeni = String(body.prijmeni || '').trim().slice(0, 60);
  const email = String(body.email || '').trim().toLowerCase();
  const telefon = String(body.telefon || '').trim().slice(0, 40);
  const typ = body.typ === 'firma' ? 'firma' : 'osoba';
  const langRaw = String(body.jazyk || 'cs');
  const jazyk: GuideLang = GUIDE_LANGS.includes(langRaw as GuideLang) ? (langRaw as GuideLang) : 'cs';
  const souhlas = body.souhlas === true || body.souhlas === '1' || body.podminky === true || body.podminky === '1';
  if (!jmeno || !prijmeni) return { duvod: 'jmeno' };
  if (problemEmailu(email)) return { duvod: 'email' };
  if (!telefon) return { duvod: 'telefon' };
  if (!souhlas) return { duvod: 'souhlas' };
  if (typ === 'firma' && !String(body.firmaNazev || '').trim()) return { duvod: 'firma' };
  return {
    typ,
    jmeno,
    prijmeni,
    email,
    telefon,
    jazyk,
    firmaNazev: String(body.firmaNazev || ''),
    firmaIco: String(body.firmaIco || ''),
    firmaSidlo: String(body.firmaSidlo || ''),
    novinky: body.novinky === true || body.novinky === '1',
  };
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get('p') || '';
  const store = createProcessStore();
  const poz = await nactiPozvanku(store, p);
  if (!poz) return chyba(404, 'odkaz');
  return NextResponse.json({ ok: true, stav: poz.stav }, { headers: noStore });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return chyba(400, 'body');
  }

  const udaje = udajeZ(body);
  if ('duvod' in udaje) return chyba(400, udaje.duvod);

  const zkouska = body.zkouska === true || body.zkouska === '1';
  const store = createProcessStore();

  if (zkouska) {
    if (!jeZkusebniProstredi()) return chyba(400, 'zkouska');
    const karta = await zalozKartuZeZkousky(store, udaje);
    return NextResponse.json(
      { ok: true, hotovo: true, kartaKlic: karta.tajnyKlic, kod: karta.kod },
      { headers: noStore },
    );
  }

  const p = String(body.p || '').trim();
  const poz = await nactiPozvanku(store, p);
  if (!poz) return chyba(404, 'odkaz');
  if (poz.stav === 'ke_schvaleni' || poz.stav === 'vyplnena') return chyba(409, 'vyplneno');
  if (poz.stav !== 'ceka') return chyba(409, 'vyplneno');

  const vyplnena = await vyplnPozvanku(store, p, udaje);
  if (!vyplnena) return chyba(409, 'vyplneno');

  const jmeno = `${udaje.jmeno} ${udaje.prijmeni}`.trim();
  await posliTelegram(`Doporučitel ke schválení: ${jmeno}`, 'automat', '/prehled/doporucitele');

  return NextResponse.json({ ok: true, cekaNaSchvaleni: true }, { headers: noStore });
}

/** Ruční schválení ze zkoušky (ne z přehledu). */
export async function PUT(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return chyba(400, 'body');
  }
  if (!jeZkusebniProstredi()) return chyba(403, 'zakazano');
  const store = createProcessStore();
  const karta = await schvalPozvanku(store, String(body.p || ''), body.udaje as UdajeDoporucitele | undefined);
  if (!karta) return chyba(404, 'odkaz');
  return NextResponse.json(
    { ok: true, kartaKlic: karta.tajnyKlic, kod: karta.kod, jmeno: jmenoDoporucitele(karta) },
    { headers: noStore },
  );
}
