import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { aptRecord } from '@/lib/guide-data';
import { jeBlokPokus, jazykProhlizece, praha, vety, vyhodnotObjednavku, zapisPokus } from '@/lib/okno-pobytu';
import { createProcessStore } from '@/lib/store';
import { APT_IDS, GUIDE_LANGS, type GuideLang } from '@/lib/types';
import { upozorniMajitele } from '@/lib/upozorneni';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

function klicAdresy(req: Request): string {
  const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'neznama').split(',')[0].trim();
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

function nazevApartmanu(apt: string | null, lang: GuideLang): string {
  if (!apt || !(APT_IDS as readonly string[]).includes(apt)) return apt || '';
  const r = aptRecord(apt as (typeof APT_IDS)[number]);
  return lang === 'cs' ? r.nazev.cs : r.nazev.en;
}

export async function POST(req: Request) {
  let body: {
    rezervace?: string;
    prijmeni?: string;
    lang?: string;
    prijezd?: string;
    odjezd?: string;
    zrusitPrijezd?: boolean;
    zrusitOdjezd?: boolean;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const lang = (GUIDE_LANGS as readonly string[]).includes(body.lang || '')
    ? (body.lang as GuideLang)
    : jazykProhlizece(req.headers.get('accept-language'));
  const texty = vety(lang);
  const store = createProcessStore();
  const klic = klicAdresy(req);
  const mapa = await store.getObjednatPokusy();
  const nowMs = Date.now();
  if (jeBlokPokus(mapa, klic, nowMs)) {
    return NextResponse.json({ ok: false, duvod: 'blok', veta: texty.blok }, { headers: noStore });
  }
  const zaznamy = (await store.listRezervace()).map((e) => e.record);
  const id = (body.rezervace || '').trim();
  const nalezeny = zaznamy.find((r) => r.rezervace === id);
  const { den } = praha(new Date());
  const vysledek = vyhodnotObjednavku(
    zaznamy,
    id,
    body.prijmeni || '',
    den,
    body.prijezd || body.odjezd || body.zrusitPrijezd || body.zrusitOdjezd
      ? {
          prijezd: body.prijezd,
          odjezd: body.odjezd,
          zrusitPrijezd: body.zrusitPrijezd,
          zrusitOdjezd: body.zrusitOdjezd,
        }
      : null,
    nazevApartmanu(nalezeny?.apartman || null, lang),
    new Date(),
  );
  if (!vysledek.ok) {
    if (vysledek.duvod === 'nesedi') await store.setObjednatPokusy(zapisPokus(mapa, klic, nowMs));
    const veta = vysledek.duvod === 'chybi' ? texty.zatim : texty.nesedi;
    return NextResponse.json({ ok: false, duvod: vysledek.duvod, veta }, { status: 200, headers: noStore });
  }
  const meni = Boolean(body.prijezd || body.odjezd || body.zrusitPrijezd || body.zrusitOdjezd);
  if (meni) {
    await store.setRezervace(vysledek.rec.rezervace, vysledek.rec);
    for (const text of vysledek.push) {
      await upozorniMajitele(store, text, `/prehled#${vysledek.rec.rezervace}`);
    }
  }
  return NextResponse.json({ ok: true, nahled: vysledek.nahled }, { headers: noStore });
}
