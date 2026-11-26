import { NextResponse } from 'next/server';
import { nactiKlientPodleTajnehoKlice, ulozKlientKartu } from '@/lib/klient-karta';
import { klubZapnut } from '@/lib/klub-klic';
import type { PodekovaniVariantaId } from '@/lib/klub-podekovani-varianty';
import { createProcessStore } from '@/lib/store';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store' };

const POVOLENE = new Set(['1', '2', 'd1', 'd2', 'd3', 'd4', 'd5']);

/** Označí otevření poděkování a pevně uloží variantu textu k pobytu. */
export async function POST(req: Request) {
  if (!klubZapnut()) {
    return NextResponse.json({ ok: false, chyba: 'klub-vypnuty' }, { status: 400, headers: noStore });
  }
  let body: { k?: string; varianta?: string; pobytKlic?: string } = {};
  try {
    body = (await req.json()) as { k?: string; varianta?: string; pobytKlic?: string };
  } catch {
    return NextResponse.json({ ok: false, chyba: 'json' }, { status: 400, headers: noStore });
  }
  const klic = (body.k || '').trim();
  if (!klic || klic.startsWith('ukazka-') || klic.startsWith('test-')) {
    return NextResponse.json({ ok: true, ukazka: true }, { headers: noStore });
  }
  const store = createProcessStore();
  const karta = await nactiKlientPodleTajnehoKlice(store, klic);
  if (!karta) {
    return NextResponse.json({ ok: false, chyba: 'missing' }, { status: 404, headers: noStore });
  }

  const pobytKlic = (body.pobytKlic || '').trim();
  const variantaRaw = (body.varianta || '').trim();
  const varianta = POVOLENE.has(variantaRaw) ? (variantaRaw as PodekovaniVariantaId) : null;

  let zmena = false;
  if (!karta.podekovaniVidel) {
    karta.podekovaniVidel = new Date().toISOString();
    zmena = true;
  }

  /** Stejný pobyt už má variantu → neměnit. Nový pobyt → uložit a posunout předchozí. */
  if (varianta && pobytKlic) {
    if (karta.podekovaniVariantaPobyt === pobytKlic && karta.podekovaniVarianta) {
      /* beze změny */
    } else {
      karta.podekovaniVariantaPred = karta.podekovaniVarianta;
      karta.podekovaniVarianta = varianta;
      karta.podekovaniVariantaPobyt = pobytKlic;
      zmena = true;
    }
  }

  if (zmena) await ulozKlientKartu(store, karta);

  return NextResponse.json(
    {
      ok: true,
      podekovaniVidel: karta.podekovaniVidel,
      podekovaniVarianta: karta.podekovaniVarianta,
      podekovaniVariantaPobyt: karta.podekovaniVariantaPobyt,
    },
    { headers: noStore },
  );
}
