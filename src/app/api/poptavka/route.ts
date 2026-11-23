import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { jeBlokPokus, zapisPokus } from '@/lib/okno-pobytu';
import { vytvorDoporuceni } from '@/lib/doporuceni';
import { aptyVolneVeTerminu, nejlevnejsiVolnyPobyt } from '@/lib/kalendar-denni';
import { sestavKalendarProHosta } from '@/lib/kalendar-uloziste';
import {
  firmaZKodu,
  filtrApartmany,
  novyIdPoptavky,
  overTerminy,
  POPTAVKA_SLEVA_PCT,
  textTelegramPoptavky,
  type PoptavkaZaznam,
  type PoptavkaZdroj,
} from '@/lib/poptavka';
import { createProcessStore } from '@/lib/store';
import { parseSignedToken } from '@/lib/token';
import { GUIDE_LANGS, type AptId, type GuideLang } from '@/lib/types';
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

  const zkouska =
    suchyBeh ||
    Boolean(rezervace && /^TEST/i.test(rezervace)) ||
    Boolean(body.zkouska === true || body.zkouska === '1' || body.zkouska === 'ano');

  const zaznam: PoptavkaZaznam = {
    id: zkouska ? `test:${novyIdPoptavky()}` : novyIdPoptavky(),
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
    // Zkouška: hned hotovo, bez blokace a bez připomínek.
    stav: zkouska ? 'hotovo' : 'predbezne',
    blokApt: null,
    lhutaDo: null,
    navrhMajitele: null,
    pripominkaPosledni: new Date().toISOString(),
    pripominkaNocniPocet: 0,
    zkouska,
  };

  let dnyKal = null as Awaited<ReturnType<typeof sestavKalendarProHosta>>['dny'] | null;
  try {
    const kal = await sestavKalendarProHosta(store);
    dnyKal = kal.dny;
    const volne = aptyVolneVeTerminu(kal.dny, zaznam.prijezd, zaznam.odjezd);
    if (zaznam.libovolnyApartman || zaznam.apartmany.length === 0) {
      if (volne.length === 0) {
        return NextResponse.json(
          { ok: false, duvod: 'obsazeno', nabidka: [] as AptId[] },
          { status: 409, headers: noStore },
        );
      }
      if (!zkouska) {
        const nej = nejlevnejsiVolnyPobyt(kal.dny, zaznam.prijezd, zaznam.odjezd);
        zaznam.blokApt = nej?.apt || volne[0] || null;
      }
    } else {
      const okApt = zaznam.apartmany.some((id) => volne.includes(id));
      if (!okApt) {
        return NextResponse.json(
          { ok: false, duvod: 'obsazeno', nabidka: volne.slice(0, 3) },
          { status: 409, headers: noStore },
        );
      }
      if (!zkouska) {
        const nej = nejlevnejsiVolnyPobyt(kal.dny, zaznam.prijezd, zaznam.odjezd, zaznam.apartmany);
        zaznam.blokApt = nej?.apt || zaznam.apartmany.find((id) => volne.includes(id)) || null;
      }
    }
  } catch (err) {
    console.error('poptavka: obsazenost', err instanceof Error ? err.message : err);
  }

  // Suchý beh v prohlížeči (?zkouska=1): nic neukládat.
  if (suchyBeh) {
    return NextResponse.json({ ok: true, id: zaznam.id, suchy: true, zkouska: true }, { headers: noStore });
  }

  try {
    await store.pridejPoptavku(zaznam);
  } catch (err) {
    console.error('poptavka: ulozeni', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, duvod: 'ulozit' }, { status: 500, headers: noStore });
  }

  if (zkouska) {
    return NextResponse.json({ ok: true, id: zaznam.id, zkouska: true }, { headers: noStore });
  }

  const slevaCesty = zdroj === 'vernost' || zdroj === 'doporucitel';
  let cenaKc: number | null = null;
  let seSlevouKc: number | null = null;
  let slevaPct: number | null = null;
  if (dnyKal) {
    const cena = nejlevnejsiVolnyPobyt(
      dnyKal,
      zaznam.prijezd,
      zaznam.odjezd,
      zaznam.libovolnyApartman || !zaznam.apartmany.length ? undefined : zaznam.apartmany,
    );
    if (cena) {
      cenaKc = cena.suma;
      if (slevaCesty) {
        seSlevouKc = cena.seSlevou;
        slevaPct = POPTAVKA_SLEVA_PCT;
      }
    }
  }

  let doporucitelJmeno: string | null = null;
  let tgExtra = '';
  if (zdroj === 'doporucitel' && doporucitelKod) {
    try {
      const d = await vytvorDoporuceni(store, {
        kod: doporucitelKod,
        poptavkaId: zaznam.id,
        jmeno,
        telefon,
        prijezd: zaznam.prijezd,
        odjezd: zaznam.odjezd,
      });
      doporucitelJmeno = d.doporucitel?.jmeno || null;
      if (d.slevaPct == null) {
        seSlevouKc = null;
        slevaPct = null;
      } else if (d.telegramPoznamka && /mnoho poptávek/i.test(d.telegramPoznamka)) {
        tgExtra = `\nZkontroluj kód ${doporucitelKod}, mnoho poptávek.`;
      }
    } catch (err) {
      console.error('poptavka: doporuceni', err instanceof Error ? err.message : err);
      tgExtra = `\nDoporučení: neznámý kód ${doporucitelKod}.`;
    }
  }

  const tg =
    textTelegramPoptavky(zaznam, {
      cenaKc,
      seSlevouKc,
      slevaPct,
      doporucitelJmeno,
    }) + tgExtra;

  await upozorniMajitele(store, tg, `/prehled?poptavka=${encodeURIComponent(zaznam.id)}`, {
    telegram: 'zadost',
  });

  return NextResponse.json({ ok: true, id: zaznam.id }, { headers: noStore });
}
