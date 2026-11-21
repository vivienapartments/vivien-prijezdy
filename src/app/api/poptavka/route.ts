import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { jeBlokPokus, zapisPokus } from '@/lib/okno-pobytu';
import {
  firmaZKodu,
  filtrApartmany,
  novyIdPoptavky,
  overTerminy,
  textTelegramPoptavky,
  type PoptavkaZaznam,
  type PoptavkaZdroj,
} from '@/lib/poptavka';
import { createProcessStore } from '@/lib/store';
import { parseSignedToken } from '@/lib/token';
import { GUIDE_LANGS, type GuideLang } from '@/lib/types';
import { upozorniMajitele } from '@/lib/upozorneni';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

function klicAdresy(req: Request): string {
  const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'neznama')
    .split(',')[0]
    .trim();
  return `popt:${createHash('sha256').update(ip).digest('hex').slice(0, 16)}`;
}

export async function POST(req: Request) {
  let body: {
    token?: string;
    f?: string;
    od?: string;
    jmeno?: string;
    telefon?: string;
    prijezd?: string;
    odjezd?: string;
    apartmany?: string[];
    libovolnyApartman?: boolean;
    doprava?: string;
    poznamka?: string;
    lang?: string;
    honeypot?: string;
    zkouska?: boolean | string;
    kanal?: string;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  // Skryté pole proti botům.
  if ((body.honeypot || '').trim()) {
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  const suchyBeh = body.zkouska === true || body.zkouska === '1' || body.zkouska === 'ano';

  const lang = (GUIDE_LANGS as readonly string[]).includes(body.lang || '')
    ? (body.lang as GuideLang)
    : 'cs';

  const store = createProcessStore();
  const klic = klicAdresy(req);
  const mapa = await store.getObjednatPokusy();
  const nowMs = Date.now();
  if (jeBlokPokus(mapa, klic, nowMs)) {
    return NextResponse.json({ ok: false, duvod: 'blok' }, { status: 429, headers: noStore });
  }

  const terminy = overTerminy((body.prijezd || '').trim(), (body.odjezd || '').trim());
  if (!terminy.ok) {
    return NextResponse.json({ ok: false, duvod: 'termin' }, { status: 400, headers: noStore });
  }

  let zdroj: PoptavkaZdroj = 'obecna';
  let firmaKod: string | null = null;
  let firmaNazev: string | null = null;
  let doporucitelKod: string | null = null;
  let rezervace: string | null = null;
  let jmeno = (body.jmeno || '').trim().slice(0, 120);
  let telefon = (body.telefon || '').trim().slice(0, 40);

  const tokenRaw = (body.token || '').trim();
  if (tokenRaw) {
    try {
      const parsed = parseSignedToken(decodeURIComponent(tokenRaw));
      if (parsed.ok) {
        zdroj = 'vernost';
        rezervace = parsed.payload.r;
        const rec = await store.getRezervace(rezervace);
        if (!jmeno) jmeno = (rec?.jmeno || '').trim().slice(0, 120);
        if (!telefon) telefon = (rec?.telefon || '').trim().slice(0, 40);
      }
    } catch {
      /* neplatný token = obecná poptávka */
    }
  }

  const firma = firmaZKodu(body.f);
  if (firma && zdroj !== 'vernost') {
    zdroj = 'firma';
    firmaKod = firma.kod;
    firmaNazev = firma.nazev;
  }

  const od = (body.od || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  if (od && zdroj === 'obecna') {
    zdroj = 'doporucitel';
    doporucitelKod = od;
  }

  if (!jmeno || !telefon) {
    await store.setObjednatPokusy(zapisPokus(mapa, klic, nowMs));
    return NextResponse.json({ ok: false, duvod: 'kontakt' }, { status: 400, headers: noStore });
  }

  const doprava =
    body.doprava === 'auto' || body.doprava === 'pesky' || body.doprava === 'nevim'
      ? body.doprava
      : null;

  const kanal =
    body.kanal === 'whatsapp' || body.kanal === 'sms' || body.kanal === 'formular'
      ? body.kanal
      : 'formular';

  const zaznam: PoptavkaZaznam = {
    id: novyIdPoptavky(),
    cas: new Date().toISOString(),
    zdroj,
    firmaKod,
    firmaNazev,
    doporucitelKod,
    rezervace,
    jmeno,
    telefon,
    prijezd: (body.prijezd || '').trim(),
    odjezd: (body.odjezd || '').trim(),
    apartmany: filtrApartmany(Array.isArray(body.apartmany) ? body.apartmany : []),
    libovolnyApartman: Boolean(body.libovolnyApartman),
    doprava,
    poznamka: (body.poznamka || '').trim().slice(0, 500),
    jazyk: lang,
    kanal,
    stav: 'nova',
  };

  if (suchyBeh) {
    return NextResponse.json({ ok: true, id: 'zkouska', suchy: true }, { headers: noStore });
  }

  try {
    await store.pridejPoptavku(zaznam);
  } catch (err) {
    console.error('poptavka: ulozeni', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, duvod: 'ulozit' }, { status: 500, headers: noStore });
  }

  await upozorniMajitele(store, textTelegramPoptavky(zaznam), '/prehled', { telegram: 'zadost' });

  return NextResponse.json({ ok: true, id: zaznam.id }, { headers: noStore });
}
