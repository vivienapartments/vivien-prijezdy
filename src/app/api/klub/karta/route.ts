import { NextResponse } from 'next/server';
import { nactiKlientPodleTajnehoKlice } from '@/lib/klient-karta';
import { jeZkouskaKlubu, klubZapnut } from '@/lib/klub-klic';
import {
  jeUkazkaKlic,
  pohledZKarty,
  pohledZPreviewDetailu,
  ukazkovaKlientKarta,
  type KlubUkazkaId,
} from '@/lib/klub-ukazka';
import { najdiPreviewPodleKlice } from '@/lib/klub-preview-klienti';
import { createProcessStore } from '@/lib/store';
import type { KlientRole } from '@/lib/klient-karta';
import { adresaKlub } from '@/lib/verejna-adresa';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store' };

function klubPovolen(): boolean {
  return (
    klubZapnut() ||
    jeZkouskaKlubu() ||
    process.env.NODE_ENV === 'development'
  );
}

export async function GET(req: Request) {
  if (!klubPovolen()) {
    return NextResponse.json(
      { ok: false, chyba: 'Klub je vypnutý.' },
      { status: 404, headers: noStore },
    );
  }

  const url = new URL(req.url);
  const k = (url.searchParams.get('k') || '').trim();
  const pohledRaw = (url.searchParams.get('pohled') || '').trim();
  const pohled =
    pohledRaw === 'host' || pohledRaw === 'doporucitel' || pohledRaw === 'firma'
      ? (pohledRaw as KlientRole)
      : undefined;

  if (!k) {
    return NextResponse.json({ ok: false, chyba: 'Chybí kód karty.' }, { status: 400, headers: noStore });
  }

  const base = adresaKlub();

  const preview = najdiPreviewPodleKlice(k);
  if (preview) {
    const defaultPohled: KlientRole = preview.typ === 'firma' ? 'firma' : 'host';
    return NextResponse.json(
      {
        ok: true,
        karta: pohledZPreviewDetailu(preview, base, { pohled: pohled || defaultPohled }),
      },
      { headers: noStore },
    );
  }

  if (jeUkazkaKlic(k)) {
    const karta = ukazkovaKlientKarta(k as KlubUkazkaId);
    const defaultPohled: KlientRole =
      k === 'ukazka-firma' ? 'firma' : k === 'ukazka-dop' ? 'doporucitel' : 'host';
    return NextResponse.json(
      {
        ok: true,
        karta: pohledZKarty(karta, base, {
          ukazka: true,
          pohled: pohled || defaultPohled,
        }),
      },
      { headers: noStore },
    );
  }

  const store = createProcessStore();
  const karta = await nactiKlientPodleTajnehoKlice(store, k);
  if (!karta || karta.stav === 'zrusena') {
    return NextResponse.json(
      { ok: false, chyba: 'Kartu se nepodařilo otevřít.' },
      { status: 404, headers: noStore },
    );
  }

  /** Booking host: klub až po kartaPredana (PROMPT 5b). */
  let bookingRezim: 'bez-klubu' | 'po-ubytovani' | null = null;
  for (const rezId of karta.rezervace || []) {
    const rec = await store.getRezervace(rezId);
    if (!rec) continue;
    const { jeBookingZdroj } = await import('@/lib/klub-karta-predana');
    if (!jeBookingZdroj(rec.zdroj, rec.emailHosta)) continue;
    bookingRezim = rec.kartaPredana?.kdy ? 'po-ubytovani' : 'bez-klubu';
    break;
  }

  return NextResponse.json(
    {
      ok: true,
      karta: pohledZKarty(karta, base, { ukazka: false, pohled, bookingRezim }),
    },
    { headers: noStore },
  );
}
