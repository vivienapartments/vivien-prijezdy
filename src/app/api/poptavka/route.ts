import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { jeBlokPokus, zapisPokus } from '@/lib/okno-pobytu';
import { vytvorDoporuceni } from '@/lib/doporuceni';
import {
  jmenoDoporucitele,
  kanalZParamu,
  nactiKartuPodleKodu,
  pridejDoporuceniZPoptavky,
} from '@/lib/doporucitel-karta';
import { aptyVolneVeTerminu, nejlevnejsiVolnyPobyt } from '@/lib/kalendar-denni';
import { sestavKalendarProHosta } from '@/lib/kalendar-uloziste';
import {
  firmaZKodu,
  filtrApartmany,
  jmenoZKarty,
  novyIdPoptavky,
  overTerminy,
  POPTAVKA_SLEVA_PCT,
  telefonZKarty,
  textTelegramPoptavky,
  type PoptavkaZaznam,
  type PoptavkaZdroj,
} from '@/lib/poptavka';
import { spocitejCenuPoptavky } from '@/lib/poptavka-cena';
import { createProcessStore } from '@/lib/store';
import { kontaktZKlubTajnehoKlice } from '@/lib/poptavka-klub-klic';
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
    k?: string;
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
    sdileni?: string;
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
        /* Věrný host: jméno a telefon z karty mají přednost. Host je znovu nepíše. */
        jmeno = (jmenoZKarty(rec) || jmeno).slice(0, 120);
        telefon = (telefonZKarty(rec) || telefon).slice(0, 40);
      }
    } catch {
      /* neplatný token = obecná poptávka */
    }
  }

  const klubKlic = (body.k || '').trim();
  if (klubKlic && zdroj === 'obecna') {
    try {
      const kontakt = await kontaktZKlubTajnehoKlice(store, klubKlic);
      if (kontakt) {
        zdroj = 'vernost';
        rezervace = kontakt.rezervace;
        jmeno = (kontakt.jmeno || jmeno).slice(0, 120);
        telefon = (kontakt.telefon || telefon).slice(0, 40);
      }
    } catch {
      /* zůstane obecná */
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
    Boolean(body.zkouska === true || body.zkouska === '1' || body.zkouska === 'ano') ||
    doporucitelKod === 'zkouska';

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
    cenaKc: null,
    cenaSeSlevouKc: null,
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

  // Cenu uložíme hned se záznamem (host ji viděl, majitel ji uvidí v přehledu i ve zprávě).
  if (dnyKal) {
    const cena = spocitejCenuPoptavky(dnyKal, zaznam);
    zaznam.cenaKc = cena.cenaKc;
    zaznam.cenaSeSlevouKc = cena.cenaSeSlevouKc;
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

  const cenaKc = zaznam.cenaKc ?? null;
  let seSlevouKc = zaznam.cenaSeSlevouKc ?? null;
  let slevaPct: number | null =
    seSlevouKc != null && cenaKc != null ? POPTAVKA_SLEVA_PCT : null;

  let doporucitelJmeno: string | null = null;
  let tgExtra = '';
  if (zdroj === 'doporucitel' && doporucitelKod) {
    const slevaPred = slevaPct;
    const cenaPred = seSlevouKc;
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
      console.error('poptavka: doporuceni-osoba', err instanceof Error ? err.message : err);
      tgExtra = `\nDoporučení: starý zápis kódu ${doporucitelKod} selhal.`;
    }
    // Karta doporučitele (nový systém) musí dostat poptávku i když starý zápis osoby selže.
    try {
      const kartaDop = await nactiKartuPodleKodu(store, doporucitelKod);
      if (kartaDop && kartaDop.stav === 'aktivni') {
        const popisek = jmenoDoporucitele(kartaDop);
        if (popisek) doporucitelJmeno = popisek;
        if (slevaPct == null && slevaPred != null) {
          slevaPct = slevaPred;
          seSlevouKc = cenaPred;
        }
        await pridejDoporuceniZPoptavky(store, {
          kod: doporucitelKod,
          poptavkaId: zaznam.id,
          krestniJmeno: jmeno,
          telefon,
          kanal: kanalZParamu(body.sdileni),
          termin:
            zaznam.prijezd && zaznam.odjezd
              ? `${zaznam.prijezd}–${zaznam.odjezd}`
              : zaznam.prijezd,
          apartman: zaznam.apartmany[0] || zaznam.blokApt || null,
          cenaPredSlevou: cenaKc,
          odjezd: zaznam.odjezd,
        });
      } else {
        tgExtra += `\nDoporučení: karta kódu ${doporucitelKod} chybí nebo není aktivní.`;
      }
    } catch (err) {
      console.error('poptavka: doporuceni-karta', err instanceof Error ? err.message : err);
      tgExtra += `\nDoporučení: zápis na kartu ${doporucitelKod} selhal.`;
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
