import { NextResponse } from 'next/server';
import apartmanyJson from '@/data/apartmany.json';
import {
  htmlDokladuSQr,
  jazykDokladu,
  normalizujZpusobUhrady,
  sestavDokladZRezervace,
  type JazykDokladu,
  type OdberatelDokladu,
  type TypDokladu,
} from '@/lib/faktura-doklad';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore } from '@/lib/store';
import type { AptId } from '@/lib/types';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

type AptRow = { id: AptId; nazev: { cs: string; en: string } };
const apartmany = (apartmanyJson as { apartmany: AptRow[] }).apartmany;

function nazevApartmanu(id: AptId | null, lang: JazykDokladu): string {
  if (!id) return '';
  const apt = apartmany.find((a) => a.id === id);
  if (!apt) return id;
  return lang === 'cs' ? apt.nazev.cs : apt.nazev.en;
}

function jeDatum(raw: string | null): string | undefined {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  return raw;
}

export async function GET(req: Request) {
  if (!(await prehledPrihlasen())) {
    return NextResponse.json({ ok: false, error: 'Nejste přihlášeni.' }, { status: 401, headers: noStore });
  }

  const url = new URL(req.url);
  const rezervace = (url.searchParams.get('rezervace') || '').trim();
  if (!rezervace) {
    return NextResponse.json({ ok: false, error: 'Chybí rezervace.' }, { status: 400, headers: noStore });
  }

  const store = createProcessStore();
  const rec = await store.getRezervace(rezervace);
  if (!rec) {
    return NextResponse.json({ ok: false, error: 'Rezervace v přehledu není.' }, { status: 404, headers: noStore });
  }

  const langParam = url.searchParams.get('lang');
  const lang: JazykDokladu =
    langParam === 'cs' || langParam === 'en' ? langParam : jazykDokladu(rec.jazyk);
  const typ: TypDokladu = url.searchParams.get('typ') === 'zalohova' ? 'zalohova' : 'faktura';
  const odberatel: OdberatelDokladu =
    url.searchParams.get('odberatel') === 'host' ? 'host' : 'firma';
  const bezHosta = odberatel === 'firma' && url.searchParams.get('bezHosta') === '1';
  const bezEmailu = url.searchParams.get('bezEmailu') === '1';
  const bezPoznamky = url.searchParams.get('bezPoznamky') === '1';
  const poznamkaQ = url.searchParams.get('poznamka');
  const castkaRaw = url.searchParams.get('castka');
  const cenaOverride =
    castkaRaw != null && castkaRaw !== ''
      ? Number(String(castkaRaw).replace(',', '.'))
      : undefined;
  const cenaPobytu =
    cenaOverride !== undefined && Number.isFinite(cenaOverride) && cenaOverride > 0
      ? Math.round(cenaOverride * 100) / 100
      : undefined;

  const origin = url.origin;
  const doklad = sestavDokladZRezervace(rec, {
    typ,
    lang,
    vystaveno: jeDatum(url.searchParams.get('vystaveno')),
    splatnost: jeDatum(url.searchParams.get('splatnost')),
    cenaPobytu,
    odberatel,
    bezHosta,
    bezEmailu,
    bezPoznamky,
    poznamkaDokladu: bezPoznamky ? null : poznamkaQ != null ? poznamkaQ : undefined,
    zpusobUhrady: typ === 'faktura' ? normalizujZpusobUhrady(url.searchParams.get('zpusob')) : 'prevodem',
    apartmanNazev: nazevApartmanu(rec.apartman, lang),
    logoUrl: `${origin}/pruvodce/va-logo-faktura.png`,
  });

  return new NextResponse(await htmlDokladuSQr(doklad), {
    status: 200,
    headers: {
      ...noStore,
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
