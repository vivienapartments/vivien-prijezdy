import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import {
  jmenoDoporucitele,
  nactiKartuPodleKodu,
  nactiPozvanku,
  nactiPravidla,
  potvrdVyplaceno,
  schvalPozvanku,
  seznamKaret,
  seznamPozvanek,
  smazKartuDoporucitele,
  smazPozvankuDoporucitele,
  ulozPravidla,
  zalozPozvanku,
  verejnaKartaProUi,
  zmenStavDoporuceniRucne,
  type DoporuceniNaKarteStav,
  type DoporucitelPravidla,
  type UdajeDoporucitele,
} from '@/lib/doporucitel-karta';
import {
  htmlKartaDoporuciteleSchvalena,
  htmlPozvankaDoporucitele,
  predmetPozvankaDoporucitele,
  textKartaDoporuciteleSchvalena,
  textPozvankaDoporucitele,
} from '@/lib/doporucitel-pozvanka-email';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore } from '@/lib/store';
import { GUIDE_LANGS, type GuideLang } from '@/lib/types';
import { adresaKlub } from '@/lib/verejna-adresa';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, text: string) {
  return NextResponse.json({ ok: false, chyba: text }, { status, headers: noStore });
}

export async function GET() {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nejste přihlášeni.');
  const store = createProcessStore();
  const karty = await seznamKaret(store);
  const pozvanky = await seznamPozvanek(store);
  const pravidla = await nactiPravidla(store);
  const pocetKeSchvaleni = pozvanky.filter((p) => p.stav === 'ke_schvaleni').length;
  return NextResponse.json(
    {
      ok: true,
      pravidla,
      pozvanky,
      pocetKeSchvaleni,
      karty: karty.map((k) => ({
        ...verejnaKartaProUi(k),
        tajnyKlic: k.tajnyKlic,
      })),
    },
    { headers: noStore },
  );
}

export async function POST(req: Request) {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nejste přihlášeni.');
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return chyba(400, 'Špatný požadavek.');
  }
  const akce = String(body.akce || '').trim();
  const store = createProcessStore();

  if (akce === 'pozvat') {
    const poznamka = String(body.poznamka || '').trim().slice(0, 80);
    const pozvanka = await zalozPozvanku(store, poznamka);
    return NextResponse.json({ ok: true, pozvanka }, { headers: noStore });
  }

  if (akce === 'poslat-email') {
    const email = String(body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return chyba(400, 'Chybí e-mail.');
    let klic = String(body.klic || '').trim();
    if (!klic) {
      const poz = await zalozPozvanku(store, email.slice(0, 80));
      klic = poz.klic;
    }
    let base = adresaKlub();
    try {
      const u = new URL(req.url);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') base = u.origin;
    } catch {
      /* veřejná */
    }
    const odkaz = `${base}/doporucitel/pozvanka?p=${encodeURIComponent(klic)}`;
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_HESLO?.trim();
    if (!user || !pass || pass.startsWith('SEM_NAPIS')) {
      return NextResponse.json({ ok: true, klic, odkaz, poslano: false, mailto: true }, { headers: noStore });
    }
    const testMode = (process.env.TEST_REZIM ?? '1') !== '0';
    const majitel = process.env.MAJITEL_EMAIL?.trim();
    const text = textPozvankaDoporucitele(odkaz);
    const html = htmlPozvankaDoporucitele(odkaz);
    const transporter = nodemailer.createTransport({
      host: 'smtp.seznam.cz',
      port: 465,
      secure: true,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: `VIVIEN Apartments <${user}>`,
      to: testMode && majitel ? majitel : email,
      subject: predmetPozvankaDoporucitele(testMode),
      text,
      html,
    });
    return NextResponse.json({ ok: true, klic, odkaz, poslano: true }, { headers: noStore });
  }

  if (akce === 'schvalit') {
    const klic = String(body.klic || '').trim();
    const uprava = (body.udaje || undefined) as Partial<UdajeDoporucitele> | undefined;
    const karta = await schvalPozvanku(store, klic, uprava);
    if (!karta) return chyba(404, 'Pozvánka ke schválení není.');
    let base = adresaKlub();
    try {
      const u = new URL(req.url);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') base = u.origin;
    } catch {
      /* */
    }
    const odkazKarta = `${base}/doporucitel?k=${encodeURIComponent(karta.tajnyKlic)}`;
    let emailPoslan = false;
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_HESLO?.trim();
    if (karta.email && user && pass && !pass.startsWith('SEM_NAPIS')) {
      try {
        const testMode = (process.env.TEST_REZIM ?? '1') !== '0';
        const majitel = process.env.MAJITEL_EMAIL?.trim();
        const jmeno = jmenoDoporucitele(karta);
        const transporter = nodemailer.createTransport({
          host: 'smtp.seznam.cz',
          port: 465,
          secure: true,
          auth: { user, pass },
        });
        await transporter.sendMail({
          from: `VIVIEN Apartments <${user}>`,
          to: testMode && majitel ? majitel : karta.email,
          subject: testMode ? '[TEST] Vaše karta VIVIEN Club' : 'Vaše karta VIVIEN Club',
          text: textKartaDoporuciteleSchvalena(karta.jmeno, odkazKarta),
          html: htmlKartaDoporuciteleSchvalena(karta.jmeno, odkazKarta),
        });
        emailPoslan = true;
      } catch {
        /* karta je hotová i bez mailu */
      }
    }
    return NextResponse.json(
      {
        ok: true,
        karta: verejnaKartaProUi(karta),
        tajnyKlic: karta.tajnyKlic,
        odkazKarta,
        emailPoslan,
        telefon: karta.telefon || null,
      },
      { headers: noStore },
    );
  }

  if (akce === 'detail-pozvanky') {
    const poz = await nactiPozvanku(store, String(body.klic || ''));
    if (!poz) return chyba(404, 'Pozvánka nenalezena.');
    return NextResponse.json({ ok: true, pozvanka: poz }, { headers: noStore });
  }

  if (akce === 'novy') {
    return chyba(400, 'Kartu nezakládejte rovnou. Použijte Nový doporučitel → on vyplní → vy schválíte.');
  }

  if (akce === 'smazat-kartu') {
    const ok = await smazKartuDoporucitele(store, String(body.kod || ''));
    if (!ok) return chyba(404, 'Karta nenalezena.');
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (akce === 'smazat-pozvanku') {
    const ok = await smazPozvankuDoporucitele(store, String(body.klic || ''));
    if (!ok) return chyba(404, 'Pozvánka nenalezena.');
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (akce === 'vyplaceno') {
    const kod = String(body.kod || '').trim();
    const castka = Number(body.castka || 0);
    const karta = await potvrdVyplaceno(store, kod, castka, String(body.poznamka || ''));
    if (!karta) return chyba(404, 'Karta nenalezena.');
    return NextResponse.json({ ok: true, karta: verejnaKartaProUi(karta) }, { headers: noStore });
  }

  if (akce === 'stav') {
    const karta = await zmenStavDoporuceniRucne(
      store,
      String(body.kod || ''),
      String(body.doporuceniId || ''),
      String(body.stav || '') as DoporuceniNaKarteStav,
    );
    if (!karta) return chyba(404, 'Karta nenalezena.');
    return NextResponse.json({ ok: true, karta: verejnaKartaProUi(karta) }, { headers: noStore });
  }

  if (akce === 'pravidla') {
    const aktualni = await nactiPravidla(store);
    const dalsi: DoporucitelPravidla = {
      ...aktualni,
      odmenaPct: Number(body.odmenaPct ?? aktualni.odmenaPct),
      azPoOdjezdu: body.azPoOdjezdu !== false,
      jenPrvniPobyt: body.jenPrvniPobyt !== false,
      stejnaProHostyINehosty: body.stejnaProHostyINehosty !== false,
      kodNeomezene: body.kodNeomezene !== false,
      minVyplata: Number(body.minVyplata ?? aktualni.minVyplata),
    };
    await ulozPravidla(store, dalsi);
    return NextResponse.json({ ok: true, pravidla: dalsi }, { headers: noStore });
  }

  if (akce === 'detail') {
    const karta = await nactiKartuPodleKodu(store, String(body.kod || ''));
    if (!karta) return chyba(404, 'Karta nenalezena.');
    return NextResponse.json(
      { ok: true, karta: verejnaKartaProUi(karta), tajnyKlic: karta.tajnyKlic },
      { headers: noStore },
    );
  }

  return chyba(400, 'Neznámá akce.');
}
