import { NextResponse } from 'next/server';
import {
  dotazAres,
  normalizujIco,
  sestavFakturu,
  textTelegramFaktury,
  type FakturaVstup,
} from '@/lib/faktura';
import { FAKTURA_MAJITEL } from '@/lib/faktura-texty';
import { createProcessStore } from '@/lib/store';
import { denPlatnostiPruvodce, isDepartureExpired, parseSignedToken } from '@/lib/token';
import { upozorniMajitele } from '@/lib/upozorneni';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, duvod: string): NextResponse {
  return NextResponse.json({ ok: false, duvod }, { status, headers: noStore });
}

function vstupZTela(body: Record<string, unknown> | null): FakturaVstup {
  return {
    typ: typeof body?.typ === 'string' ? body.typ : undefined,
    ico: typeof body?.ico === 'string' ? body.ico : undefined,
    nazev: typeof body?.nazev === 'string' ? body.nazev : undefined,
    adresa: typeof body?.adresa === 'string' ? body.adresa : undefined,
    zeme: typeof body?.zeme === 'string' ? body.zeme : undefined,
    dic: typeof body?.dic === 'string' ? body.dic : undefined,
    email: typeof body?.email === 'string' ? body.email : undefined,
    poznamka: typeof body?.poznamka === 'string' ? body.poznamka : undefined,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const token = typeof body?.token === 'string' ? body.token : '';
  let payload;
  try {
    const vysledek = parseSignedToken(token);
    if (!vysledek.ok) return chyba(401, 'token');
    payload = vysledek.payload;
  } catch {
    return chyba(401, 'token');
  }

  const rez = String(payload.r || '').trim();
  if (!rez) return chyba(401, 'token');

  const store = createProcessStore();
  const rec = await store.getRezervace(rez);
  if (!rec) return chyba(404, 'nenalezeno');
  if (rec.stav === 'zruseno') return chyba(404, 'zruseno');
  if (isDepartureExpired(denPlatnostiPruvodce(payload.d, rec.odjezd))) {
    return chyba(401, 'token');
  }

  const akce = typeof body?.akce === 'string' ? body.akce : '';

  if (akce === 'nacti') {
    return NextResponse.json(
      { ok: true, faktura: rec.faktura, email: rec.emailHosta || '' },
      { headers: noStore },
    );
  }

  if (akce === 'ares') {
    const ico = normalizujIco(typeof body?.ico === 'string' ? body.ico : '');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      const ares = await dotazAres(ico, ctrl.signal);
      return NextResponse.json({ ok: true, ares }, { headers: noStore });
    } finally {
      clearTimeout(timer);
    }
  }

  if (akce === 'ulozit') {
    if (rec.faktura?.hotovo) return chyba(400, 'vyrizeno');
    const vstup = vstupZTela(body);
    let aresNazev = '';
    let aresAdresa = '';
    let aresDic = '';
    if ((vstup.typ || 'cz') !== 'zahranici' && vstup.ico) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      try {
        const ares = await dotazAres(vstup.ico, ctrl.signal);
        if (ares.ok) {
          aresNazev = ares.nazev || '';
          aresAdresa = ares.adresa || '';
          aresDic = ares.dic || '';
        }
      } finally {
        clearTimeout(timer);
      }
    }
    const sestava = sestavFakturu(
      {
        ...vstup,
        nazev: vstup.nazev || aresNazev,
        adresa: vstup.adresa || aresAdresa,
        dic: vstup.dic || aresDic,
      },
      'host',
      new Date().toISOString(),
      rec.faktura,
    );
    if (!sestava.ok) return chyba(400, sestava.duvod);

    const ted = new Date().toISOString();
    const zmena = Boolean(rec.faktura);
    const dalsi = {
      ...rec,
      faktura: sestava.faktura,
      posledniPokus: ted,
      historie: [...rec.historie, { cas: ted, co: FAKTURA_MAJITEL.historie_host }].slice(-40),
    };
    await store.setRezervace(rez, dalsi);
    console.log('faktura ulozena');
    const sablona = zmena ? FAKTURA_MAJITEL.telegram_zmena : FAKTURA_MAJITEL.telegram_nova;
    try {
      await upozorniMajitele(
        store,
        textTelegramFaktury(sablona, { ...dalsi, faktura: sestava.faktura }),
        `/prehled?zalozka=faktury#${rez}`,
        { telegram: 'faktura' },
      );
    } catch {
      /* není povinné */
    }
    return NextResponse.json({ ok: true, faktura: sestava.faktura }, { headers: noStore });
  }

  return chyba(400, 'akce');
}
