import { NextResponse } from 'next/server';
import { aptRecord } from '@/lib/guide-data';
import { aptyVolneVeTerminu, nejlevnejsiVolnyPobyt } from '@/lib/kalendar-denni';
import { formatKc, tvarNoci } from '@/lib/kalendar-texty';
import { sestavKalendarProHosta } from '@/lib/kalendar-uloziste';
import {
  doplnKontaktZKarty,
  nociMezi,
  POPTAVKA_SLEVA_PCT,
  type PoptavkaZaznam,
} from '@/lib/poptavka';
import type { ProcessStore } from '@/lib/store';
import { formatRozsahPoptavky } from '@/lib/poptavka-texty';
import {
  jeZkouskaPoptavky,
  odkazZpravyHostovi,
  POPTAVKA_STAVY_BLOKUJI,
  stitekStavu,
  textNejdeHostovi,
  textPotvrditHostovi,
  nactiPoptavkaStav,
} from '@/lib/poptavka-vyrizeni';
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

async function cenaPro(z: PoptavkaZaznam, store: ReturnType<typeof createProcessStore>) {
  try {
    const { dny } = await sestavKalendarProHosta(store);
    const kandidati = z.blokApt
      ? [z.blokApt]
      : z.libovolnyApartman || !z.apartmany.length
        ? undefined
        : z.apartmany;
    const cena = nejlevnejsiVolnyPobyt(dny, z.prijezd, z.odjezd, kandidati);
    if (!cena) return { text: '', kc: null as number | null, seSlevou: false };
    const sleva = z.zdroj === 'vernost' || z.zdroj === 'doporucitel';
    return {
      text: sleva
        ? `${formatKc(cena.seSlevou)}, sleva ${POPTAVKA_SLEVA_PCT} %`
        : formatKc(cena.suma),
      kc: sleva ? cena.seSlevou : cena.suma,
      seSlevou: sleva,
    };
  } catch {
    return { text: '', kc: null as number | null, seSlevou: false };
  }
}

function detailJson(z: PoptavkaZaznam, cenaText: string) {
  const noci = nociMezi(z.prijezd, z.odjezd);
  const aptNazvy = z.blokApt
    ? aptRecord(z.blokApt).nazev.cs
    : z.libovolnyApartman
      ? 'libovolný'
      : z.apartmany.map((a) => aptRecord(a).nazev.cs).join(', ') || '—';
  return {
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
    stavText: stitekStavu(nactiPoptavkaStav(z.stav)),
    lhutaDo: z.lhutaDo || null,
    navrhMajitele: z.navrhMajitele || '',
    kanal: z.kanal || 'formular',
    zkouska: jeZkouskaPoptavky(z),
  };
}

async function doplnPoptavkuZKarty(z: PoptavkaZaznam, store: ProcessStore): Promise<PoptavkaZaznam> {
  if (!z.rezervace || ((z.jmeno || '').trim() && (z.telefon || '').trim())) return z;
  const rec = await store.getRezervace(z.rezervace);
  const d = doplnKontaktZKarty(z, rec);
  if (!d.zmeneno) return z;
  return { ...z, jmeno: d.jmeno, telefon: d.telefon };
}

export async function GET(req: Request) {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nepřihlášen.');
  const id = new URL(req.url).searchParams.get('id')?.trim() || '';
  const store = createProcessStore();

  /** Bez id = celý seznam (nejnovější nahoře). */
  if (!id) {
    const seznam = await store.listPoptavky();
    let zmena = false;
    const doplnene: PoptavkaZaznam[] = [];
    for (const z of seznam) {
      const d = await doplnPoptavkuZKarty(z, store);
      if (d !== z) zmena = true;
      doplnene.push(d);
    }
    if (zmena) await store.ulozPoptavky(doplnene);
    const radky = [...doplnene]
      .sort((a, b) => (a.cas < b.cas ? 1 : a.cas > b.cas ? -1 : 0))
      .map((z) => {
        const noci = nociMezi(z.prijezd, z.odjezd);
        return {
          id: z.id,
          cas: z.cas,
          jmeno: z.jmeno,
          telefon: z.telefon,
          prijezd: z.prijezd,
          odjezd: z.odjezd,
          termin: `${formatRozsahPoptavky(z.prijezd, z.odjezd, 'cs')} · ${tvarNoci(noci, 'cs')}`,
          apartman: z.blokApt
            ? aptRecord(z.blokApt).nazev.cs
            : z.libovolnyApartman
              ? 'libovolný'
              : z.apartmany.map((a) => aptRecord(a).nazev.cs).join(', ') || '—',
          odkud: odkudText(z),
          stav: z.stav,
          stavText: stitekStavu(nactiPoptavkaStav(z.stav)),
          zkouska: jeZkouskaPoptavky(z),
          vyrizena: !POPTAVKA_STAVY_BLOKUJI.has(nactiPoptavkaStav(z.stav)),
        };
      });
    return NextResponse.json({ ok: true, poptavky: radky }, { headers: noStore });
  }

  const seznam = await store.listPoptavky();
  const i = seznam.findIndex((x) => x.id === id);
  if (i < 0) return chyba(404, 'Poptávka nenalezena.');
  let z = seznam[i];
  const doplnena = await doplnPoptavkuZKarty(z, store);
  if (doplnena !== z) {
    seznam[i] = doplnena;
    await store.ulozPoptavky(seznam);
    z = doplnena;
  }
  const cena = await cenaPro(z, store);
  return NextResponse.json({ ok: true, poptavka: detailJson(z, cena.text) }, { headers: noStore });
}

export async function POST(req: Request) {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nepřihlášen.');
  let body: { id?: string; akce?: string; navrh?: string; ios?: boolean } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const id = (body.id || '').trim();
  const akce = (body.akce || '').trim();
  if (!id || !akce) return chyba(400, 'Špatný požadavek.');

  const store = createProcessStore();
  const seznam = await store.listPoptavky();
  const i = seznam.findIndex((x) => x.id === id);
  if (i < 0) return chyba(404, 'Poptávka nenalezena.');
  let z = seznam[i];
  const cena = await cenaPro(z, store);
  let odkaz: string | null = null;
  let zprava: string | null = null;

  if (akce === 'potvrdit') {
    /* Host už termín chce. Potvrzujeme rezervaci, bez druhého „ano“. Další je platba / BH. */
    z = await doplnPoptavkuZKarty(z, store);
    zprava = textPotvrditHostovi(z, {
      cenaKc: cena.kc,
      seSlevou: cena.seSlevou,
    });
    const o = odkazZpravyHostovi(z, zprava, Boolean(body.ios));
    odkaz = o.href;
    z = {
      ...z,
      stav: 'potvrzeno',
      lhutaDo: null,
      pripominkaPosledni: null,
      pripominkaNocniPocet: 0,
    };
  } else if (akce === 'host_potvrdil') {
    /* Staré poptávky ve stavu „čeká na hosta“. Nové sem už nejdou. */
    z = {
      ...z,
      stav: 'potvrzeno',
      lhutaDo: null,
      pripominkaPosledni: null,
      pripominkaNocniPocet: 0,
    };
  } else if (akce === 'zapsano_bh') {
    z = {
      ...z,
      stav: 'hotovo',
      blokApt: null,
      lhutaDo: null,
      pripominkaPosledni: null,
      pripominkaNocniPocet: 0,
    };
  } else if (akce === 'nejde') {
    const navrh = (body.navrh || '').trim().slice(0, 500);
    if (!navrh) return chyba(400, 'Napište návrh.');
    zprava = textNejdeHostovi(z, navrh);
    const o = odkazZpravyHostovi(z, zprava, Boolean(body.ios));
    odkaz = o.href;
    z = {
      ...z,
      stav: 'nejde',
      blokApt: null,
      lhutaDo: null,
      navrhMajitele: navrh,
      pripominkaPosledni: null,
      pripominkaNocniPocet: 0,
    };
  } else if (akce === 'prodlouzit') {
    if (nactiPoptavkaStav(z.stav) !== 'neozval_se') return chyba(400, 'Nelze prodloužit.');
    const { dny } = await sestavKalendarProHosta(store);
    const apt = z.blokApt || z.apartmany[0];
    const volne = aptyVolneVeTerminu(dny, z.prijezd, z.odjezd);
    const kandidat = apt && volne.includes(apt) ? apt : volne[0] || null;
    if (!kandidat) return chyba(409, 'Termín už není volný.');
    z = {
      ...z,
      stav: 'potvrzeno',
      blokApt: kandidat,
      lhutaDo: null,
      pripominkaPosledni: null,
      pripominkaNocniPocet: 0,
    };
  } else if (akce === 'do_vyrizenych') {
    /* Archiv: pryč z nevyřízených, uvolní termín, bez zprávy hostovi. */
    z = {
      ...z,
      stav: 'hotovo',
      blokApt: null,
      lhutaDo: null,
      pripominkaPosledni: null,
      pripominkaNocniPocet: 0,
    };
  } else if (akce === 'zpet_nevyrizene') {
    z = {
      ...z,
      stav: 'predbezne',
      lhutaDo: null,
      pripominkaPosledni: new Date().toISOString(),
      pripominkaNocniPocet: 0,
    };
  } else if (akce === 'smazat') {
    const bez = seznam.filter((x) => x.id !== id);
    await store.ulozPoptavky(bez);
    return NextResponse.json({ ok: true, smazano: true }, { headers: noStore });
  } else {
    return chyba(400, 'Neznámá akce.');
  }

  seznam[i] = z;
  await store.ulozPoptavky(seznam);
  return NextResponse.json(
    { ok: true, poptavka: detailJson(z, cena.text), odkaz, zprava },
    { headers: noStore },
  );
}
