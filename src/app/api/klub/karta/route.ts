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
import { nadpisPobytuKlub } from '@/lib/klub-termin-format';
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
    const role = preview.karta?.role || [];
    const defaultPohled: KlientRole =
      pohled ||
      (preview.typ === 'firma' || role.includes('firma')
        ? 'firma'
        : role.includes('doporucitel') && !role.includes('host')
          ? 'doporucitel'
          : 'host');
    const testExtra = preview as {
      pratele?: import('@/lib/klub-ukazka').KlubPratelRadek[];
      bookingRezim?: 'bez-klubu' | 'po-ubytovani' | null;
    };
    return NextResponse.json(
      {
        ok: true,
        karta: pohledZPreviewDetailu(
          {
            ...preview,
            pratele: testExtra.pratele || [],
            bookingRezim: testExtra.bookingRezim ?? null,
          },
          base,
          { pohled: defaultPohled },
        ),
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
  const { jeBookingZdroj } = await import('@/lib/klub-karta-predana');
  const { odkazNaPruvodce } = await import('@/lib/posli-pruvodce');
  const { denPraha } = await import('@/lib/brana');
  const dnes = denPraha(new Date());
  const nadchazejici: import('@/lib/klub-ukazka').KlubPobytRadek[] = [];
  const pobyty: import('@/lib/klub-ukazka').KlubPobytRadek[] = [];

  for (const rezId of karta.rezervace || []) {
    const rec = await store.getRezervace(rezId);
    if (!rec || !rec.prijezd || !rec.odjezd) continue;
    if (bookingRezim == null && jeBookingZdroj(rec.zdroj, rec.emailHosta)) {
      bookingRezim = rec.kartaPredana?.kdy ? 'po-ubytovani' : 'bez-klubu';
    }
    const apt = rec.apartman || 'Apartmán';
    const castka =
      typeof rec.cenaPobytu === 'number' && rec.cenaPobytu > 0 ? rec.cenaPobytu : null;
    const nadpisBox = nadpisPobytuKlub(rec.prijezd, rec.odjezd, apt);
    const nadpisSeznam = nadpisPobytuKlub(rec.prijezd, rec.odjezd, apt, castka);
    const pruvodceUrl = odkazNaPruvodce(rec);
    const probiha = rec.prijezd <= dnes && rec.odjezd > dnes;
    const ceka = rec.prijezd > dnes;
    if (probiha || ceka) {
      nadchazejici.push({
        nadpis: nadpisBox,
        podnadpis: 'Adresa, příjezd, kódy',
        pruvodceUrl,
        barva: probiha ? 'probiha' : 'ceka',
        stavText: probiha ? 'započítáno' : 'čeká',
      });
      pobyty.push({
        nadpis: nadpisSeznam,
        podnadpis: '',
        barva: probiha ? 'probiha' : 'ceka',
        stavText: probiha ? 'započítáno' : 'čeká',
      });
    } else {
      pobyty.push({
        nadpis: nadpisSeznam,
        podnadpis: '',
        barva: 'zapocteno',
        stavText: 'započítáno',
      });
    }
  }

  const kartaPohled = pohledZKarty(karta, base, { ukazka: false, pohled, bookingRezim });
  if (nadchazejici.length || pobyty.length) {
    kartaPohled.nadchazejici = nadchazejici;
    kartaPohled.pobyty = pobyty;
    kartaPohled.praveBydli = nadchazejici.some((r) => r.barva === 'probiha');
  }

  return NextResponse.json(
    {
      ok: true,
      karta: kartaPohled,
    },
    { headers: noStore },
  );
}
