import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { problemEmailu } from '@/lib/chyby';
import { zalozKartuRegistrace } from '@/lib/doporucitel-karta';
import { createProcessStore } from '@/lib/store';
import { posliTelegram } from '@/lib/telegram';
import { GUIDE_LANGS, type GuideLang } from '@/lib/types';
import { adresaKlub } from '@/lib/verejna-adresa';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store' };

const BASE = adresaKlub();

function denPraha(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Prague' });
}

function ipZ(req: Request): string {
  const xf = req.headers.get('x-forwarded-for') || '';
  return xf.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'x';
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, duvod: 'body' }, { status: 400, headers: noStore });
  }

  const jmeno = String(body.jmeno || '').trim().slice(0, 60);
  const prijmeni = String(body.prijmeni || '').trim().slice(0, 60);
  const email = String(body.email || '').trim().toLowerCase();
  const telefon = String(body.telefon || '').trim().slice(0, 40);
  const typ = body.typ === 'firma' ? 'firma' : 'osoba';
  const langRaw = String(body.jazyk || 'cs');
  const jazyk: GuideLang = GUIDE_LANGS.includes(langRaw as GuideLang) ? (langRaw as GuideLang) : 'cs';
  const podminky = body.podminky === true || body.podminky === '1';
  const zpracovani = body.zpracovani === true || body.zpracovani === '1';
  const novinky = body.novinky === true || body.novinky === '1';

  if (!jmeno || !prijmeni) {
    return NextResponse.json({ ok: false, duvod: 'jmeno' }, { status: 400, headers: noStore });
  }
  if (problemEmailu(email)) {
    return NextResponse.json({ ok: false, duvod: 'email' }, { status: 400, headers: noStore });
  }
  if (!telefon) {
    return NextResponse.json({ ok: false, duvod: 'telefon' }, { status: 400, headers: noStore });
  }
  if (!podminky || !zpracovani) {
    return NextResponse.json({ ok: false, duvod: 'souhlas' }, { status: 400, headers: noStore });
  }
  if (typ === 'firma' && !String(body.firmaNazev || '').trim()) {
    return NextResponse.json({ ok: false, duvod: 'firma' }, { status: 400, headers: noStore });
  }

  const store = createProcessStore();
  const klicLimit = `dop-reg-ip:${ipZ(req)}:${denPraha()}`;
  const dosud = Number((await store.getKv(klicLimit)) || '0') || 0;
  if (dosud >= 5) {
    return NextResponse.json({ ok: false, duvod: 'limit' }, { status: 429, headers: noStore });
  }

  const karta = await zalozKartuRegistrace(store, {
    typ,
    jmeno,
    prijmeni,
    email,
    telefon,
    jazyk,
    firmaNazev: String(body.firmaNazev || ''),
    firmaIco: String(body.firmaIco || ''),
    novinky,
  });
  await store.setKv(klicLimit, String(dosud + 1));

  const odkazOd = `${BASE}/poptavka?od=${encodeURIComponent(karta.kod)}&lang=${encodeURIComponent(jazyk)}`;
  const odkazKarta = `${BASE}/doporucitel?k=${encodeURIComponent(karta.tajnyKlic)}`;

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_HESLO?.trim();
  if (user && pass && !pass.startsWith('SEM_NAPIS') && !process.env.VITEST) {
    try {
      const textMailu = [
        `Dobrý den, ${jmeno},`,
        '',
        `Váš odkaz pro přátele: ${odkazOd}`,
        `Vaše karta doporučení: ${odkazKarta}`,
        '',
        'S pozdravem',
        'VIVIEN Apartments',
      ].join('\n');
      const { overOdchoziHostovi } = await import('@/lib/odchozi-host');
      const over = await overOdchoziHostovi({
        kanal: 'email',
        druh: 'doporuceni',
        emailCil: email,
        text: textMailu,
      });
      if (over.ok) {
        const transporter = nodemailer.createTransport({
          host: 'smtp.seznam.cz',
          port: 465,
          secure: true,
          auth: { user, pass },
        });
        const testMode = (process.env.TEST_REZIM ?? '1') !== '0';
        const majitel = process.env.MAJITEL_EMAIL?.trim();
        await transporter.sendMail({
          from: `VIVIEN Apartments <${user}>`,
          to: testMode && majitel ? majitel : email,
          subject: testMode
            ? `[TEST] Váš odkaz doporučení · VIVIEN`
            : 'Váš odkaz doporučení · VIVIEN',
          text: over.text || textMailu,
        });
      }
    } catch {
      /* registrace zůstane */
    }
  }

  await posliTelegram(`Nový doporučitel: ${jmeno}`, 'automat', '/prehled/doporucitele');

  return NextResponse.json(
    { ok: true, kod: karta.kod, kartaKlic: karta.tajnyKlic, odkazOd, odkazKarta },
    { headers: noStore },
  );
}
