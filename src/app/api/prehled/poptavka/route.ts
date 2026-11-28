import { NextResponse } from 'next/server';
import { aptRecord } from '@/lib/guide-data';
import { aptyVolneVeTerminu, slevaPctCastka } from '@/lib/kalendar-denni';
import { tvarNoci } from '@/lib/kalendar-texty';
import { sestavKalendarProHosta } from '@/lib/kalendar-uloziste';
import {
  doplnKontaktZKarty,
  nociMezi,
  POPTAVKA_SLEVA_PCT,
  type PoptavkaZaznam,
} from '@/lib/poptavka';
import { spocitejCenuPoptavky, textCenyPoptavky } from '@/lib/poptavka-cena';
import type { ProcessStore } from '@/lib/store';
import { formatRozsahPoptavky } from '@/lib/poptavka-texty';
import { ceskyVokativ } from '@/lib/osloveni';
import {
  htmlZpravaPoptavkyHostovi,
  nadpisNejdePoptavky,
  nadpisPotvrzeniPoptavky,
  predmetNejdePoptavky,
  predmetPotvrzeniPoptavky,
  textNejdeProEmail,
  textPotvrzeniProEmail,
} from '@/lib/poptavka-potvrzeni-email';
import {
  jeZkouskaPoptavky,
  odkazZpravyHostovi,
  type PoptavkaOdeslaniKanal,
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

function nactiKanaly(body: { kanal?: string; kanaly?: unknown }): PoptavkaOdeslaniKanal[] {
  const out: PoptavkaOdeslaniKanal[] = [];
  const pridej = (k: string) => {
    if ((k === 'whatsapp' || k === 'sms' || k === 'email') && !out.includes(k)) out.push(k);
  };
  if (Array.isArray(body.kanaly)) {
    for (const x of body.kanaly) pridej(String(x || '').trim());
  }
  if (body.kanal) pridej(String(body.kanal).trim());
  return out;
}

function osloveniEmail(jmeno: string): string {
  const cast = jmeno.trim().split(/\s+/).filter(Boolean)[0] || '';
  if (!cast) return '';
  return ceskyVokativ(cast) || cast;
}

async function odesliHtmlEmailPoptavky(opts: {
  na: string;
  predmet: string;
  nadpis: string;
  text: string;
  jmeno: string;
  termin: string;
  apartman: string;
  cena: string;
}): Promise<{ ok: true; odeslanoNa: string; testMode: boolean; mailto?: false } | { ok: true; mailto: true } | { ok: false; error: string }> {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_HESLO?.trim();
  const testMode = (process.env.TEST_REZIM ?? '1') !== '0';
  /* Na ostře (TEST_REZIM=0) e-mail odejde rovnou hostovi. Bez SMTP to není mailto. */
  if (!user || !pass || pass.startsWith('SEM_NAPIS')) {
    if (!testMode) {
      return { ok: false, error: 'E-mail nejde odeslat. Chybí SMTP na serveru.' };
    }
    return { ok: true, mailto: true };
  }
  const majitel = process.env.MAJITEL_EMAIL?.trim();
  const cil = testMode && majitel ? majitel : opts.na;
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: 'smtp.seznam.cz',
      port: 465,
      secure: true,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: `VIVIEN Apartments <${user}>`,
      to: cil,
      subject: opts.predmet,
      text: opts.text,
      html: htmlZpravaPoptavkyHostovi({
        predmet: opts.predmet.replace(/^\[TEST\]\s*/, ''),
        nadpis: opts.nadpis,
        text: opts.text,
        jmeno: opts.jmeno,
        termin: opts.termin,
        apartman: opts.apartman,
        cena: opts.cena,
      }),
    });
    return { ok: true, odeslanoNa: cil, testMode };
  } catch {
    return { ok: false, error: 'E-mail se nepodařilo odeslat (SMTP).' };
  }
}

function odkudText(z: PoptavkaZaznam): string {
  if (z.zdroj === 'vernost') return 'věrný host';
  if (z.zdroj === 'firma') return `firma: ${z.firmaNazev || z.firmaKod || '?'}`;
  if (z.zdroj === 'doporucitel') return `doporučení od: ${z.doporucitelKod || '?'}`;
  return 'web';
}

function cenaZUlozene(z: PoptavkaZaznam) {
  if (z.cenaKc == null || !(z.cenaKc > 0)) return null;
  const slevaZdroj =
    z.zdroj === 'vernost' || z.zdroj === 'doporucitel' || z.zdroj === 'obecna';
  const kcPred = z.cenaKc;
  const kcPo =
    z.cenaSeSlevouKc != null && z.cenaSeSlevouKc > 0
      ? z.cenaSeSlevouKc
      : slevaZdroj
        ? slevaPctCastka(kcPred, POPTAVKA_SLEVA_PCT)
        : kcPred;
  const seSlevou = slevaZdroj || kcPo !== kcPred;
  return {
    text: textCenyPoptavky(kcPred, seSlevou ? kcPo : null),
    kc: seSlevou ? kcPo : kcPred,
    kcPred,
    seSlevou,
  };
}

async function cenaPro(z: PoptavkaZaznam, store: ReturnType<typeof createProcessStore>) {
  const ulozena = cenaZUlozene(z);
  if (ulozena) return ulozena;
  try {
    const { dny } = await sestavKalendarProHosta(store);
    const cena = spocitejCenuPoptavky(dny, z);
    if (cena.cenaKc == null) {
      return { text: '', kc: null as number | null, kcPred: null as number | null, seSlevou: false };
    }
    const seSlevou = cena.cenaSeSlevouKc != null;
    return {
      text: textCenyPoptavky(cena.cenaKc, cena.cenaSeSlevouKc),
      kc: seSlevou ? cena.cenaSeSlevouKc : cena.cenaKc,
      kcPred: cena.cenaKc,
      seSlevou,
    };
  } catch {
    return { text: '', kc: null as number | null, kcPred: null as number | null, seSlevou: false };
  }
}

/** Doplní chybějící cenu do starších poptávek (jednou při otevření). */
async function doplnCenuKdyzChybi(
  z: PoptavkaZaznam,
  store: ReturnType<typeof createProcessStore>,
  dnyHotove?: Awaited<ReturnType<typeof sestavKalendarProHosta>>['dny'] | null,
): Promise<PoptavkaZaznam> {
  if (z.cenaKc != null && z.cenaKc > 0) return z;
  try {
    const dny = dnyHotove ?? (await sestavKalendarProHosta(store)).dny;
    const cena = spocitejCenuPoptavky(dny, z);
    if (cena.cenaKc == null) return z;
    return { ...z, cenaKc: cena.cenaKc, cenaSeSlevouKc: cena.cenaSeSlevouKc };
  } catch {
    return z;
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
    let dnyProCenu: Awaited<ReturnType<typeof sestavKalendarProHosta>>['dny'] | null = null;
    for (const z of seznam) {
      const d = await doplnPoptavkuZKarty(z, store);
      if ((d.cenaKc == null || !(d.cenaKc > 0)) && !dnyProCenu) {
        try {
          dnyProCenu = (await sestavKalendarProHosta(store)).dny;
        } catch {
          dnyProCenu = null;
        }
      }
      const sCenou = await doplnCenuKdyzChybi(d, store, dnyProCenu);
      if (sCenou !== d || d !== z) zmena = true;
      doplnene.push(sCenou);
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
          cena: textCenyPoptavky(z.cenaKc, z.cenaSeSlevouKc),
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
  const sCenou = await doplnCenuKdyzChybi(doplnena, store);
  if (sCenou !== z) {
    seznam[i] = sCenou;
    await store.ulozPoptavky(seznam);
    z = sCenou;
  }
  const cena = await cenaPro(z, store);
  return NextResponse.json({ ok: true, poptavka: detailJson(z, cena.text) }, { headers: noStore });
}

export async function POST(req: Request) {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nepřihlášen.');
  let body: {
    id?: string;
    akce?: string;
    navrh?: string;
    ios?: boolean;
    kanal?: string;
    kanaly?: unknown;
    email?: string;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const id = (body.id || '').trim();
  const akce = (body.akce || '').trim();
  if (!id || !akce) return chyba(400, 'Špatný požadavek.');
  const kanaly = nactiKanaly(body);
  const emailOdeslani = (body.email || '').trim().slice(0, 120);

  const store = createProcessStore();
  const seznam = await store.listPoptavky();
  const i = seznam.findIndex((x) => x.id === id);
  if (i < 0) return chyba(404, 'Poptávka nenalezena.');
  let z = seznam[i];
  const cena = await cenaPro(z, store);
  let odkaz: string | null = null;
  let zprava: string | null = null;
  const odkazy: Partial<Record<PoptavkaOdeslaniKanal, string>> = {};
  let emailPoslan = false;
  let emailMailto = false;
  let emailOdeslanoNa: string | null = null;
  let emailTestMode = false;

  if (akce === 'potvrdit') {
    /* Host už termín chce. Potvrzujeme rezervaci, bez druhého „ano“. Další je platba / BH. */
    if (kanaly.includes('email') && !emailOdeslani.includes('@')) {
      return chyba(400, 'Napište e-mail hosta.');
    }
    if (kanaly.length === 0) return chyba(400, 'Zaškrtněte aspoň jeden kanál.');
    z = await doplnPoptavkuZKarty(z, store);
    zprava = textPotvrditHostovi(z, {
      cenaKc: cena.kc,
      cenaPredKc: cena.kcPred,
      seSlevou: cena.seSlevou,
    });
    const detail = detailJson(z, cena.text);
    for (const k of kanaly) {
      if (k === 'email') {
        const mail = await odesliHtmlEmailPoptavky({
          na: emailOdeslani,
          predmet: predmetPotvrzeniPoptavky((process.env.TEST_REZIM ?? '1') !== '0'),
          nadpis: nadpisPotvrzeniPoptavky(),
          text: textPotvrzeniProEmail(osloveniEmail(z.jmeno)),
          jmeno: osloveniEmail(z.jmeno) || z.jmeno,
          termin: detail.termin,
          apartman: detail.apartman,
          cena: detail.cena || '',
        });
        if (!mail.ok) return chyba(500, mail.error);
        if (mail.mailto) {
          emailMailto = true;
          const o = odkazZpravyHostovi(z, zprava, {
            ios: Boolean(body.ios),
            kanal: 'email',
            email: emailOdeslani,
          });
          odkazy.email = o.href;
          odkaz = o.href;
        } else {
          emailPoslan = true;
          emailOdeslanoNa = mail.odeslanoNa;
          emailTestMode = mail.testMode;
        }
        continue;
      }
      const o = odkazZpravyHostovi(z, zprava, {
        ios: Boolean(body.ios),
        kanal: k,
        email: emailOdeslani,
      });
      odkazy[k] = o.href;
      if (!odkaz) odkaz = o.href;
    }
    /* E-mail odešel rovnou → hned do vyřízených. WhatsApp/SMS zatím jen potvrzeno. */
    const doVyrizenych = emailPoslan || (kanaly.includes('email') && emailMailto);
    z = {
      ...z,
      stav: doVyrizenych ? 'hotovo' : 'potvrzeno',
      blokApt: doVyrizenych ? null : z.blokApt,
      lhutaDo: null,
      pripominkaPosledni: null,
      pripominkaNocniPocet: 0,
    };
    try {
      const { aktualizujStavDoporuceniPodlePoptavky } = await import('@/lib/doporucitel-karta');
      await aktualizujStavDoporuceniPodlePoptavky(store, z.id, 'potvrzeno');
    } catch {
      /* doporučitel nesmí shodit potvrzení */
    }
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
    if (kanaly.includes('email') && !emailOdeslani.includes('@')) {
      return chyba(400, 'Napište e-mail hosta.');
    }
    if (kanaly.length === 0) return chyba(400, 'Zaškrtněte aspoň jeden kanál.');
    const navrh = (body.navrh || '').trim().slice(0, 500);
    zprava = textNejdeHostovi(z, navrh);
    const detail = detailJson(z, cena.text);
    for (const k of kanaly) {
      if (k === 'email') {
        const mail = await odesliHtmlEmailPoptavky({
          na: emailOdeslani,
          predmet: predmetNejdePoptavky((process.env.TEST_REZIM ?? '1') !== '0'),
          nadpis: nadpisNejdePoptavky(),
          text: textNejdeProEmail(osloveniEmail(z.jmeno), navrh),
          jmeno: osloveniEmail(z.jmeno) || z.jmeno,
          termin: detail.termin,
          apartman: detail.apartman,
          cena: '',
        });
        if (!mail.ok) return chyba(500, mail.error);
        if (mail.mailto) {
          emailMailto = true;
          const o = odkazZpravyHostovi(z, zprava, {
            ios: Boolean(body.ios),
            kanal: 'email',
            email: emailOdeslani,
          });
          odkazy.email = o.href;
          odkaz = o.href;
        } else {
          emailPoslan = true;
          emailOdeslanoNa = mail.odeslanoNa;
          emailTestMode = mail.testMode;
        }
        continue;
      }
      const o = odkazZpravyHostovi(z, zprava, {
        ios: Boolean(body.ios),
        kanal: k,
        email: emailOdeslani,
      });
      odkazy[k] = o.href;
      if (!odkaz) odkaz = o.href;
    }
    z = {
      ...z,
      stav: 'nejde',
      blokApt: null,
      lhutaDo: null,
      navrhMajitele: navrh,
      pripominkaPosledni: null,
      pripominkaNocniPocet: 0,
    };
    try {
      const { aktualizujStavDoporuceniPodlePoptavky } = await import('@/lib/doporucitel-karta');
      await aktualizujStavDoporuceniPodlePoptavky(store, z.id, 'storno');
    } catch {
      /* doporučitel */
    }
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

  // Dávka 6: karta klienta hned při potvrzené přímé poptávce (ne až při předání).
  if (z.stav === 'potvrzeno') {
    try {
      const { klubZapnut } = await import('@/lib/klub-klic');
      if (klubZapnut()) {
        const { sparujNeboVytvorKlienta } = await import('@/lib/klub-utrata');
        await sparujNeboVytvorKlienta(store, {
          jmeno: z.jmeno,
          email: null,
          telefon: z.telefon,
          rezervace: z.rezervace || null,
          jazyk: z.jazyk || 'cs',
        });
      }
    } catch {
      /* klub nesmí shodit potvrzení */
    }
  }

  return NextResponse.json(
    {
      ok: true,
      poptavka: detailJson(z, cena.text),
      odkaz,
      odkazy,
      zprava,
      emailPoslan,
      emailMailto,
      emailOdeslanoNa,
      emailTestMode,
    },
    { headers: noStore },
  );
}
