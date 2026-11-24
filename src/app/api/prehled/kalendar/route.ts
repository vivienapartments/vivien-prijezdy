import { NextRequest, NextResponse } from 'next/server';
import {
  denPlno,
  minCenaVolnych,
  parsujCenyXlsx,
  parsujObsazenostXlsx,
  rozpoznajXlsx,
  sloucitKalendar,
  type KalendarDenni,
} from '@/lib/kalendar-denni';
import {
  nactiIcalUloziste,
  obnovIcalObsazenost,
  pocetIcalNoci90,
} from '@/lib/kalendar-ical';
import { nactiUlozenyKalendar, sestavKalendarProHosta, ulozKalendar } from '@/lib/kalendar-uloziste';
import { nactiKalendarUvolneni, pridejUvolneni } from '@/lib/kalendar-uvolneni';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore } from '@/lib/store';
import { APT_IDS, type AptId } from '@/lib/types';
import { ymdDnesPraha } from '@/lib/poptavka';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status, headers: noStore });
}

/** Náhled po měsících + rozdíly (tabulka vs průvodce jen z uloženého + rezervace). */
function nahledMesice(dny: KalendarDenni, bezApt: Record<string, number>) {
  const poMesicich: Record<
    string,
    { od: number | null; do: number | null; plnych: number; dni: number }
  > = {};
  for (const [ymd, den] of Object.entries(dny)) {
    const mes = ymd.slice(0, 7);
    if (!poMesicich[mes]) poMesicich[mes] = { od: null, do: null, plnych: 0, dni: 0 };
    const m = poMesicich[mes];
    m.dni += 1;
    if (denPlno(den, bezApt[ymd] || 0)) m.plnych += 1;
    for (const id of APT_IDS) {
      const c = den[id]?.cena;
      if (c == null) continue;
      if (m.od == null || c < m.od) m.od = c;
      if (m.do == null || c > m.do) m.do = c;
    }
  }
  return Object.entries(poMesicich)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mesic, v]) => ({ mesic, ...v }));
}

/** Jednotlivé dny jednoho měsíce (cena od / plno) pro rozbalení v přehledu. */
function dnyMesice(dny: KalendarDenni, bezApt: Record<string, number>, mesic: string) {
  return Object.keys(dny)
    .filter((ymd) => ymd.startsWith(mesic))
    .sort()
    .map((ymd) => {
      const den = dny[ymd];
      const ba = bezApt[ymd] || 0;
      return {
        ymd,
        plno: denPlno(den, ba),
        cenaOd: minCenaVolnych(den),
      };
    });
}

export async function GET(req: NextRequest) {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nepřihlášen.');
  try {
    const store = createProcessStore();
    const { dny, meta, bezAptPoDnech } = await sestavKalendarProHosta(store);
    const stariObs =
      meta.obsazenostNahrano &&
      Date.now() - Date.parse(meta.obsazenostNahrano) > 3 * 24 * 60 * 60 * 1000;
    const mesic = req.nextUrl.searchParams.get('mesic');
    if (mesic && /^\d{4}-\d{2}$/.test(mesic)) {
      return NextResponse.json(
        {
          ok: true,
          mesic,
          dny: dnyMesice(dny, bezAptPoDnech, mesic),
        },
        { headers: noStore },
      );
    }
    const ical = await nactiIcalUloziste(store);
    const dnes = ymdDnesPraha();
    return NextResponse.json(
      {
        ok: true,
        meta,
        stariObsazenost: Boolean(stariObs),
        mesice: nahledMesice(dny, bezAptPoDnech),
        pocetDni: Object.keys(dny).length,
        ical: {
          nacteno: ical.nacteno,
          noci90: pocetIcalNoci90(ical, dnes),
        },
      },
      { headers: noStore },
    );
  } catch (e) {
    return chyba(500, e instanceof Error ? e.message : 'chyba');
  }
}

export async function POST(req: NextRequest) {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nepřihlášen.');
  const store = createProcessStore();
  const ct = req.headers.get('content-type') || '';

  if (ct.includes('application/json')) {
    const telo = (await req.json()) as {
      cenyZapnuto?: boolean;
      icalNacist?: boolean;
      /** Ruční uvolnění pro poptávku (BH může zůstat zablokovaný). */
      uvolnit?: { apt?: string; den?: string }[];
    };
    if (telo.icalNacist) {
      const vysl = await obnovIcalObsazenost(store);
      const ical = await nactiIcalUloziste(store);
      return NextResponse.json(
        {
          ok: vysl.ok,
          error: vysl.chyba,
          ical: {
            nacteno: ical.nacteno,
            noci90: pocetIcalNoci90(ical, ymdDnesPraha()),
          },
        },
        { headers: noStore },
      );
    }
    if (Array.isArray(telo.uvolnit) && telo.uvolnit.length) {
      const polozky = telo.uvolnit
        .map((p) => ({
          apt: (p.apt || '').trim() as AptId,
          den: (p.den || '').trim(),
        }))
        .filter((p) => APT_IDS.includes(p.apt) && /^\d{4}-\d{2}-\d{2}$/.test(p.den));
      if (!polozky.length) return chyba(400, 'Špatné uvolnění.');
      const uvolneni = await pridejUvolneni(store, polozky);
      return NextResponse.json({ ok: true, uvolneni }, { headers: noStore });
    }
    if (typeof telo.cenyZapnuto === 'boolean') {
      const { dny, meta } = await nactiUlozenyKalendar(store);
      const dalsi = {
        ...meta,
        cenyZapnuto: telo.cenyZapnuto === false ? false : true,
      };
      await ulozKalendar(store, dny, dalsi);
      return NextResponse.json({ ok: true, meta: dalsi }, { headers: noStore });
    }
    const uvolneni = await nactiKalendarUvolneni(store);
    return NextResponse.json({ ok: true, uvolneni }, { headers: noStore });
  }

  const form = await req.formData();
  const soubor = form.get('soubor');
  if (!(soubor instanceof File)) return chyba(400, 'Chybí soubor.');
  const buf = Buffer.from(await soubor.arrayBuffer());
  const druh = rozpoznajXlsx(buf);
  if (!druh) return chyba(400, 'Soubor nepoznán. Očekávám list Denní ceny nebo obsazenost.');

  const { dny: puvodni, meta } = await nactiUlozenyKalendar(store);
  const ted = new Date().toISOString();
  let dny = puvodni;
  let novaMeta = { ...meta };

  if (druh === 'ceny') {
    const patch = parsujCenyXlsx(buf);
    dny = sloucitKalendar(puvodni, patch, 'cena');
    novaMeta = { ...novaMeta, cenyNahrano: ted, zdrojCen: 'xlsx' };
  } else {
    const patch = parsujObsazenostXlsx(buf);
    dny = sloucitKalendar(puvodni, patch, 'obsazenost');
    novaMeta = { ...novaMeta, obsazenostNahrano: ted };
  }

  await ulozKalendar(store, dny, novaMeta);
  return NextResponse.json(
    {
      ok: true,
      druh,
      meta: novaMeta,
      pocetDni: Object.keys(dny).length,
    },
    { headers: noStore },
  );
}
