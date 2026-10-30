import { NextResponse } from 'next/server';
import { denPraha } from '@/lib/brana';
import { oznacUklid, vratUklid } from '@/lib/dnesek';
import { posliEmailZpravy } from '@/lib/email-zprava';
import { odkazPripraveno, predmetPripraveno, textPripraveno } from '@/lib/okno-pobytu';
import { dnesVPraze } from '@/lib/prehled';
import { odkazNaPruvodce } from '@/lib/posli-pruvodce';
import { createProcessStore, type RezervaceRecord } from '@/lib/store';
import { casPrahaKratky, uzPoslanPripravenoEmail } from '@/lib/uklid-den';
import { uklidPrihlasen } from '@/lib/uklid-session';
import { upozorniMajitele } from '@/lib/upozorneni';
import { jeKdoZavad, normalizujTextZavad } from '@/lib/zavady-predani';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status, headers: noStore });
}

function pridej(rec: RezervaceRecord, co: string, patch: Partial<RezervaceRecord> = {}): RezervaceRecord {
  const cas = new Date().toISOString();
  return {
    ...rec,
    ...patch,
    posledniPokus: cas,
    historie: [...rec.historie, { cas, co }].slice(-40),
  };
}

function odkazPoUklidu(
  dalsi: RezervaceRecord | null,
): string {
  if (!dalsi) return '/prehled';
  return `/prehled#${dalsi.rezervace}?zprava=pripraveno`;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await uklidPrihlasen())) return chyba(401, 'Nepřihlášen.');

  const body = (await request.json().catch(() => null)) as {
    rezervace?: string;
    akce?: string;
    text?: string;
    dalsiRezervace?: string;
  } | null;

  const id = (body?.rezervace || '').trim();
  const akce = body?.akce;
  if (
    !id ||
    (akce !== 'uklid' &&
      akce !== 'vratit-uklid' &&
      akce !== 'zavady' &&
      akce !== 'email-pripraveno')
  ) {
    return chyba(400, 'Neznámá akce.');
  }

  const store = createProcessStore();
  const rec = await store.getRezervace(id);
  if (!rec) return chyba(404, 'Rezervace není.');
  const dnes = dnesVPraze();

  if (akce === 'uklid') {
    if (rec.odjezd !== dnes) return chyba(400, 'Uklizeno jde jen pro dnešek.');
    if (!rec.prevzatoKdy) {
      return chyba(400, 'Uklizeno půjde po převzetí.');
    }
    const dalsi = oznacUklid(rec, 'miluska');
    await store.setRezervace(id, dalsi);

    const vse = (await store.listRezervace()).map((e) => e.record);
    const prijizdi = vse.find(
      (h) =>
        h.rezervace !== id &&
        h.apartman === rec.apartman &&
        h.prijezd === dnes &&
        h.stav !== 'zruseno' &&
        !h.predano,
    );
    const apt = rec.apartman || 'Apartmán';
    let text = `${apt} uklizeno · Miluška`;
    if (prijizdi) {
      const maEmail = Boolean((prijizdi.emailHosta || '').trim());
      if (!maEmail) {
        text = `${apt} uklizeno, host nemá e-mail. Pošlete prosím ‚Apartmán je připravený‘ sami.`;
      } else if (uzPoslanPripravenoEmail(prijizdi)) {
        text = `${apt} uklizeno · Miluška · e-mail hostovi odeslán`;
      } else {
        text = `${apt} uklizeno · Miluška · e-mail zatím neodešel`;
      }
    }
    await upozorniMajitele(store, text, odkazPoUklidu(prijizdi || null));
    return NextResponse.json(
      {
        ok: true,
        uklizenoKdy: dalsi.uklizenoKdy,
        uklizenoKdo: dalsi.uklizenoKdo,
      },
      { headers: noStore },
    );
  }

  if (akce === 'vratit-uklid') {
    if (rec.odjezd !== dnes) return chyba(400, 'Vrátit jde jen pro dnešek.');
    const dalsi = vratUklid(rec);
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (akce === 'zavady') {
    const text = normalizujTextZavad(typeof body?.text === 'string' ? body.text : '');
    if (!text) return chyba(400, 'Napište, co není v pořádku.');
    const kdo = jeKdoZavad('miluska') || 'miluska';
    const kdy = new Date().toISOString();
    const dalsi = pridej(rec, 'Závady po odjezdu zapsány', {
      zavadyPoOdjezdu: { text, kdy, kdo, odeslanoKdy: null },
    });
    await store.setRezervace(id, dalsi);

    const dalsiId = typeof body?.dalsiRezervace === 'string' ? body.dalsiRezervace.trim() : '';
    if (dalsiId) {
      const dalsiHost = await store.getRezervace(dalsiId);
      if (dalsiHost && !dalsiHost.zavadyPredani) {
        const zapis = pridej(dalsiHost, 'Závady z předání zapsány', {
          zavadyPredani: { text, kdy, kdo, odeslanoKdy: null, potvrzenoKdy: null },
        });
        await store.setRezervace(dalsiId, zapis);
      }
    }
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (akce === 'email-pripraveno') {
    const vse = (await store.listRezervace()).map((e) => e.record);
    const den = denPraha(new Date());
    const prijizdi = vse.find(
      (h) =>
        h.rezervace !== id &&
        h.apartman === rec.apartman &&
        h.prijezd === den &&
        h.stav !== 'zruseno' &&
        !h.predano,
    );
    if (!prijizdi) return chyba(400, 'Dnes nepřijíždí další host.');
    if (!rec.uklizenoKdy) return chyba(400, 'Nejdřív označte Uklizeno.');
    if (uzPoslanPripravenoEmail(prijizdi)) {
      return chyba(400, 'E-mail už odešel.');
    }
    const komu = (prijizdi.emailHosta || '').trim();
    if (!komu) return chyba(400, 'Host nemá e-mail.');
    let odkaz: string | null = null;
    try {
      odkaz = odkazNaPruvodce(prijizdi);
    } catch {
      odkaz = null;
    }
    if (!odkaz) return chyba(400, 'Chybí údaje pro průvodce.');
    const lang = prijizdi.jazyk;
    try {
      await posliEmailZpravy({
        to: komu,
        subject: predmetPripraveno(lang),
        text: textPripraveno(lang, odkazPripraveno(odkaz)),
        lang,
        telefon: false,
      });
    } catch {
      return chyba(502, 'E-mail se nepodařilo odeslat.');
    }
    const cas = new Date().toISOString();
    const zapis = pridej(prijizdi, 'E-mailem: Apartmán je připravený (Miluška)');
    await store.setRezervace(prijizdi.rezervace, zapis);
    return NextResponse.json(
      {
        ok: true,
        odeslanoText: `E-mail odeslán ${casPrahaKratky(cas) || ''} ✓`.replace(
          'E-mail odeslán  ✓',
          'E-mail odeslán ✓',
        ),
      },
      { headers: noStore },
    );
  }

  return chyba(400, 'Neznámá akce.');
}
