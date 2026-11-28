import { NextResponse } from 'next/server';
import { aptRecord } from '@/lib/guide-data';
import { tvarNoci } from '@/lib/kalendar-texty';
import { sestavKalendarProHosta } from '@/lib/kalendar-uloziste';
import { nociMezi } from '@/lib/poptavka';
import { spocitejCenuPoptavky, textCenyPoptavky } from '@/lib/poptavka-cena';
import {
  htmlZpravaPoptavkyHostovi,
  nadpisPotvrzeniPoptavky,
  predmetPotvrzeniPoptavky,
  textPotvrzeniProEmail,
} from '@/lib/poptavka-potvrzeni-email';
import { formatRozsahPoptavky } from '@/lib/poptavka-texty';
import { ceskyVokativ } from '@/lib/osloveni';
import { createProcessStore } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function osloveni(jmeno: string): string {
  const cast = jmeno.trim().split(/\s+/).filter(Boolean)[0] || '';
  if (!cast) return '';
  return ceskyVokativ(cast) || cast;
}

/**
 * Veřejná stránka potvrzení poptávky (stejný vzhled jako e-mail verze 4).
 * Odkaz se posílá ve WhatsApp / SMS.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token: raw } = await ctx.params;
  const token = (raw || '').trim();
  if (!token || token.length < 8 || token.length > 64) {
    return new NextResponse('Potvrzení nenalezeno.', { status: 404 });
  }

  const store = createProcessStore();
  const seznam = await store.listPoptavky();
  const z = seznam.find((x) => x.potvrzeniToken === token);
  if (!z) {
    return new NextResponse('Potvrzení nenalezeno.', { status: 404 });
  }

  let cenaKc = z.cenaKc ?? null;
  let cenaSeSlevouKc = z.cenaSeSlevouKc ?? null;
  if (cenaKc == null) {
    try {
      const { dny } = await sestavKalendarProHosta(store);
      const spoc = spocitejCenuPoptavky(dny, z);
      cenaKc = spoc.cenaKc;
      cenaSeSlevouKc = spoc.cenaSeSlevouKc;
    } catch {
      /* bez kalendáře necháme prázdnou cenu */
    }
  }
  const noci = nociMezi(z.prijezd, z.odjezd);
  const apt = z.blokApt || z.apartmany[0];
  const apartman = apt
    ? aptRecord(apt).nazev.cs
    : z.libovolnyApartman
      ? 'libovolný'
      : z.apartmany.map((a) => aptRecord(a).nazev.cs).join(', ') || '—';
  const termin = `${formatRozsahPoptavky(z.prijezd, z.odjezd, 'cs')} · ${tvarNoci(noci, 'cs')}`;
  const jmeno = osloveni(z.jmeno) || z.jmeno;

  const html = htmlZpravaPoptavkyHostovi({
    predmet: predmetPotvrzeniPoptavky(false),
    nadpis: nadpisPotvrzeniPoptavky(),
    text: textPotvrzeniProEmail(jmeno),
    jmeno,
    termin,
    apartman,
    cena: textCenyPoptavky(cenaKc, cenaSeSlevouKc) || '',
    verze: 4,
  });

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
