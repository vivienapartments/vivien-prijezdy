import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { problemEmailu } from '@/lib/chyby';
import {
  dokonciPozvanku,
  jmenoDoporucitele,
  nactiPozvanku,
  zalozKartuZeZkousky,
  type UdajeDoporucitele,
} from '@/lib/doporucitel-karta';
import { jeZkusebniProstredi } from '@/lib/klub-klic';
import { createProcessStore } from '@/lib/store';
import { posliTelegram } from '@/lib/telegram';
import { GUIDE_LANGS, type GuideLang } from '@/lib/types';
import { adresaKlub } from '@/lib/verejna-adresa';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, duvod: string) {
  return NextResponse.json({ ok: false, duvod }, { status, headers: noStore });
}

function udajeZ(body: Record<string, unknown>): UdajeDoporucitele | { duvod: string } {
  const jmeno = String(body.jmeno || '').trim().slice(0, 60);
  const prijmeni = String(body.prijmeni || '').trim().slice(0, 60);
  const email = String(body.email || '').trim().toLowerCase();
  const telefon = String(body.telefon || '').trim().slice(0, 40);
  const typ = body.typ === 'firma' ? 'firma' : 'osoba';
  const langRaw = String(body.jazyk || 'cs');
  const jazyk: GuideLang = GUIDE_LANGS.includes(langRaw as GuideLang) ? (langRaw as GuideLang) : 'cs';
  const podminky = body.podminky === true || body.podminky === '1';
  const zpracovani = body.zpracovani === true || body.zpracovani === '1';
  if (!jmeno || !prijmeni) return { duvod: 'jmeno' };
  if (problemEmailu(email)) return { duvod: 'email' };
  if (!telefon) return { duvod: 'telefon' };
  if (!podminky || !zpracovani) return { duvod: 'souhlas' };
  if (typ === 'firma' && !String(body.firmaNazev || '').trim()) return { duvod: 'firma' };
  return {
    typ,
    jmeno,
    prijmeni,
    email,
    telefon,
    jazyk,
    firmaNazev: String(body.firmaNazev || ''),
    firmaIco: String(body.firmaIco || ''),
    novinky: body.novinky === true || body.novinky === '1',
  };
}

function zakladOdkazu(req: Request): string {
  try {
    const u = new URL(req.url);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return u.origin;
  } catch {
    /* veřejná adresa */
  }
  return adresaKlub();
}

async function posliOdkaz(vstup: {
  jmeno: string;
  email: string;
  odkazOd: string;
  odkazKarta: string;
}): Promise<void> {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_HESLO?.trim();
  if (!user || !pass || pass.startsWith('SEM_NAPIS') || process.env.VITEST) return;
  const textMailu = [
    `Dobrý den, ${vstup.jmeno},`,
    '',
    `Váš odkaz pro lidi, které chcete pozvat: ${vstup.odkazOd}`,
    `Vaše karta: ${vstup.odkazKarta}`,
    '',
    'S pozdravem',
    'VIVIEN Apartments',
  ].join('\n');
  const { overOdchoziHostovi } = await import('@/lib/odchozi-host');
  const over = await overOdchoziHostovi({
    kanal: 'email',
    druh: 'doporuceni',
    emailCil: vstup.email,
    text: textMailu,
  });
  if (!over.ok) return;
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
    to: testMode && majitel ? majitel : vstup.email,
    subject: testMode ? '[TEST] Váš odkaz doporučení · VIVIEN' : 'Váš odkaz doporučení · VIVIEN',
    text: over.text || textMailu,
  });
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get('p') || '';
  const store = createProcessStore();
  const poz = await nactiPozvanku(store, p);
  if (!poz) return chyba(404, 'odkaz');
  return NextResponse.json({ ok: true, stav: poz.stav }, { headers: noStore });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return chyba(400, 'body');
  }

  const udaje = udajeZ(body);
  if ('duvod' in udaje) return chyba(400, udaje.duvod);

  const zkouska = body.zkouska === true || body.zkouska === '1';
  const store = createProcessStore();

  if (zkouska) {
    if (!jeZkusebniProstredi()) return chyba(400, 'zkouska');
    const karta = await zalozKartuZeZkousky(store, udaje);
    return NextResponse.json(
      { ok: true, kartaKlic: karta.tajnyKlic, kod: karta.kod },
      { headers: noStore },
    );
  }

  const p = String(body.p || '').trim();
  const poz = await nactiPozvanku(store, p);
  if (!poz) return chyba(404, 'odkaz');
  if (poz.stav !== 'ceka') return chyba(409, 'vyplneno');

  const karta = await dokonciPozvanku(store, p, udaje);
  if (!karta) return chyba(409, 'vyplneno');

  const base = zakladOdkazu(req);
  const odkazOd = `${base}/poptavka?od=${encodeURIComponent(karta.kod)}&lang=${encodeURIComponent(karta.jazyk)}`;
  const odkazKarta = `${base}/doporucitel?k=${encodeURIComponent(karta.tajnyKlic)}`;

  try {
    await posliOdkaz({ jmeno: karta.jmeno, email: karta.email, odkazOd, odkazKarta });
  } catch {
    /* karta už je */
  }

  const jmeno = jmenoDoporucitele(karta);
  await posliTelegram(`Nový doporučitel: ${jmeno}`, 'automat', '/prehled/doporucitele');

  return NextResponse.json(
    { ok: true, kartaKlic: karta.tajnyKlic, kod: karta.kod },
    { headers: noStore },
  );
}
