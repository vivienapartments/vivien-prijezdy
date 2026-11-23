import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { problemEmailu } from '@/lib/chyby';
import { najdiNeboVytvorOsobu, nactiOsobaIdRezervace, nactiOsobuPodleKodu } from '@/lib/doporuceni';
import {
  fromTipKamaradovi,
  htmlTipKamaradovi,
  predmetTipKamaradovi,
  textTipKamaradovi,
} from '@/lib/tip-kamarad-email';
import { createProcessStore } from '@/lib/store';
import { parseSignedToken } from '@/lib/token';
import { GUIDE_LANGS, type GuideLang } from '@/lib/types';
import { normalizujKod } from '@/lib/poptavka';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };
const LIMIT_DEN = 5;

/** Odkazy v tip e-mailu vždy na ostrou (ne Preview, ne localhost). */
const BASE = 'https://vivien-prijezdy-six.vercel.app';

function denPraha(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Prague' });
}

function jazykZ(raw: unknown): GuideLang {
  const s = String(raw || '').trim();
  return GUIDE_LANGS.includes(s as GuideLang) ? (s as GuideLang) : 'cs';
}

function krestniZ(jmeno: string | null | undefined): string {
  const cast = (jmeno || '').trim().split(/\s+/)[0] || '';
  return cast.slice(0, 40);
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, duvod: 'body' }, { status: 400, headers: noStore });
  }

  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  if (problemEmailu(email)) {
    return NextResponse.json({ ok: false, duvod: 'email' }, { status: 400, headers: noStore });
  }

  const jmeno = krestniZ(String(body.jmeno || ''));
  if (!jmeno) {
    return NextResponse.json({ ok: false, duvod: 'jmeno' }, { status: 400, headers: noStore });
  }

  const lang = jazykZ(body.lang);
  const store = createProcessStore();

  let kod: string | null = null;
  const tokenRaw = String(body.token || '').trim();
  if (tokenRaw) {
    try {
      const parsed = parseSignedToken(decodeURIComponent(tokenRaw));
      if (!parsed.ok) {
        return NextResponse.json({ ok: false, duvod: 'token' }, { status: 400, headers: noStore });
      }
      const rezervaceId = parsed.payload.r;
      const rec = await store.getRezervace(rezervaceId);
      if (!rec) {
        return NextResponse.json({ ok: false, duvod: 'rezervace' }, { status: 404, headers: noStore });
      }
      const osobaId = await nactiOsobaIdRezervace(store, rezervaceId, rec);
      const osoba = await najdiNeboVytvorOsobu(store, {
        rezervaceId,
        jmeno: rec.jmeno,
        telefon: rec.telefon || rec.telefonRezervace,
        email: rec.emailHosta,
        narodnost: rec.narodnost,
        osobaId,
      });
      kod = osoba.kod;
    } catch {
      return NextResponse.json({ ok: false, duvod: 'token' }, { status: 400, headers: noStore });
    }
  } else {
    const rawKod = normalizujKod(String(body.kod || ''));
    if (!rawKod) {
      return NextResponse.json({ ok: false, duvod: 'kod' }, { status: 400, headers: noStore });
    }
    /** Zkouška /nahled: kód zkouska. */
    if (rawKod === 'zkouska') {
      kod = rawKod;
    } else {
      const osoba = await nactiOsobuPodleKodu(store, rawKod);
      if (!osoba) {
        return NextResponse.json({ ok: false, duvod: 'kod' }, { status: 404, headers: noStore });
      }
      kod = osoba.kod;
    }
  }

  if (!kod) {
    return NextResponse.json({ ok: false, duvod: 'kod' }, { status: 400, headers: noStore });
  }

  const klic = `tip-email:${kod}:${denPraha()}`;
  const dosud = Number((await store.getKv(klic)) || '0') || 0;
  if (dosud >= LIMIT_DEN) {
    return NextResponse.json({ ok: false, duvod: 'limit' }, { status: 429, headers: noStore });
  }

  const odkaz = `${BASE}/poptavka?od=${encodeURIComponent(kod)}&lang=${encodeURIComponent(lang)}&k=e`;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_HESLO?.trim();
  if (!user || !pass || pass.startsWith('SEM_NAPIS')) {
    return NextResponse.json({ ok: false, duvod: 'smtp' }, { status: 503, headers: noStore });
  }

  const testMode = (process.env.TEST_REZIM ?? '1') !== '0';
  const majitel = process.env.MAJITEL_EMAIL?.trim();
  const to = testMode && majitel ? majitel : email;

  try {
    if (!process.env.VITEST) {
      const transporter = nodemailer.createTransport({
        host: 'smtp.seznam.cz',
        port: 465,
        secure: true,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from: fromTipKamaradovi(jmeno, user, lang),
        to,
        bcc: testMode ? undefined : majitel || undefined,
        subject: testMode ? `[TEST] ${predmetTipKamaradovi(lang)}` : predmetTipKamaradovi(lang),
        text: textTipKamaradovi(lang, jmeno, odkaz),
        html: htmlTipKamaradovi(lang, jmeno, odkaz, BASE),
        replyTo: majitel || undefined,
      });
    }
  } catch {
    return NextResponse.json({ ok: false, duvod: 'odeslani' }, { status: 502, headers: noStore });
  }

  await store.setKv(klic, String(dosud + 1));
  return NextResponse.json({ ok: true }, { headers: noStore });
}
