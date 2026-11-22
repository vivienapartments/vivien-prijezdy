import { NextResponse } from 'next/server';
import { aptRecord } from '@/lib/guide-data';
import { nejlevnejsiVolnyPobyt } from '@/lib/kalendar-denni';
import { formatKc, tvarNoci } from '@/lib/kalendar-texty';
import { sestavKalendarProHosta } from '@/lib/kalendar-uloziste';
import { nociMezi, POPTAVKA_SLEVA_PCT, type PoptavkaZaznam } from '@/lib/poptavka';
import { formatRozsahPoptavky } from '@/lib/poptavka-texty';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status, headers: noStore });
}

function odkudText(z: PoptavkaZaznam): string {
  if (z.zdroj === 'vernost') return 'věrný host';
  if (z.zdroj === 'firma') return `firma: ${z.firmaNazev || z.firmaKod || '?'}`;
  if (z.zdroj === 'doporucitel') return `doporučení od: ${z.doporucitelKod || '?'}`;
  return 'web';
}

export async function GET(req: Request) {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nepřihlášen.');
  const id = new URL(req.url).searchParams.get('id')?.trim() || '';
  if (!id) return chyba(400, 'Chybí id.');

  const store = createProcessStore();
  const z = (await store.listPoptavky()).find((x) => x.id === id);
  if (!z) return chyba(404, 'Poptávka nenalezena.');

  const noci = nociMezi(z.prijezd, z.odjezd);
  const aptNazvy = z.libovolnyApartman
    ? 'libovolný'
    : z.apartmany.map((a) => aptRecord(a).nazev.cs).join(', ') || '—';

  let cenaText = '';
  try {
    const { dny } = await sestavKalendarProHosta(store);
    const cena = nejlevnejsiVolnyPobyt(
      dny,
      z.prijezd,
      z.odjezd,
      z.libovolnyApartman || !z.apartmany.length ? undefined : z.apartmany,
    );
    if (cena) {
      const sleva = z.zdroj === 'vernost' || z.zdroj === 'doporucitel';
      cenaText = sleva
        ? `${formatKc(cena.seSlevou)}, sleva ${POPTAVKA_SLEVA_PCT} %`
        : formatKc(cena.suma);
    }
  } catch {
    /* bez ceny */
  }

  return NextResponse.json(
    {
      ok: true,
      poptavka: {
        id: z.id,
        jmeno: z.jmeno,
        telefon: z.telefon,
        termin: `${formatRozsahPoptavky(z.prijezd, z.odjezd, 'cs')} · ${tvarNoci(noci, 'cs')}`,
        prijezd: z.prijezd,
        odjezd: z.odjezd,
        noci,
        apartman: aptNazvy,
        cena: cenaText,
        odkud: odkudText(z),
        jazyk: z.jazyk,
        poznamka: z.poznamka,
        stav: z.stav,
        zkouska: Boolean(z.rezervace && /^TEST/i.test(z.rezervace)),
      },
    },
    { headers: noStore },
  );
}

export async function POST(req: Request) {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nepřihlášen.');
  let body: { id?: string; akce?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const id = (body.id || '').trim();
  if (!id || body.akce !== 'potvrdit') return chyba(400, 'Špatný požadavek.');

  const store = createProcessStore();
  const seznam = await store.listPoptavky();
  const i = seznam.findIndex((x) => x.id === id);
  if (i < 0) return chyba(404, 'Poptávka nenalezena.');
  seznam[i] = { ...seznam[i], stav: 'hotovo' };
  await store.ulozPoptavky(seznam);
  return NextResponse.json({ ok: true }, { headers: noStore });
}
