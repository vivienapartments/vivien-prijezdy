import { createHmac, timingSafeEqual } from 'crypto';
import {
  normalizujZpusobUhrady,
  type JazykDokladu,
  type OdberatelDokladu,
  type TypDokladu,
  type ZpusobUhrady,
} from './faktura-doklad';
import { adresaKlub } from './verejna-adresa';

export type DokladOdkazPayload = {
  r: string;
  typ: TypDokladu;
  odberatel: OdberatelDokladu;
  lang: JazykDokladu;
  castka?: number;
  /** Jen firma, bez jména hosta. */
  bezHosta?: boolean;
  bezEmailu?: boolean;
  bezPoznamky?: boolean;
  zpusobUhrady?: ZpusobUhrady;
  /** Unix sekundy. */
  exp: number;
};

function secret(): string {
  const s = process.env.PRUVODCE_TOKEN_SECRET?.trim();
  if (!s || s.length < 32) throw new Error('PRUVODCE_TOKEN_SECRET missing or too short');
  return s;
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf;
  return b.toString('base64url');
}

function sign(json: string): string {
  return createHmac('sha256', secret()).update(json).digest('base64url');
}

/** Platnost odkazu 30 dní. */
export function vytvorDokladToken(
  vstup: Omit<DokladOdkazPayload, 'exp'> & { exp?: number },
  now = Math.floor(Date.now() / 1000),
): string {
  const payload: DokladOdkazPayload = {
    r: String(vstup.r || '').trim(),
    typ: vstup.typ === 'zalohova' ? 'zalohova' : 'faktura',
    odberatel: vstup.odberatel === 'host' ? 'host' : 'firma',
    lang: vstup.lang === 'en' ? 'en' : 'cs',
    exp: vstup.exp ?? now + 30 * 24 * 60 * 60,
  };
  if (vstup.castka != null && Number.isFinite(vstup.castka) && vstup.castka > 0) {
    payload.castka = Math.round(vstup.castka * 100) / 100;
  }
  if (payload.odberatel === 'firma' && vstup.bezHosta === true) {
    payload.bezHosta = true;
  }
  if (vstup.bezEmailu === true) payload.bezEmailu = true;
  if (vstup.bezPoznamky === true) payload.bezPoznamky = true;
  if (payload.typ === 'faktura' && vstup.zpusobUhrady) {
    payload.zpusobUhrady = normalizujZpusobUhrady(vstup.zpusobUhrady);
  }
  if (!payload.r) throw new Error('Chybí rezervace.');
  const json = JSON.stringify(payload);
  return `${b64url(json)}.${sign(json)}`;
}

export function overDokladToken(
  token: string,
  now = Math.floor(Date.now() / 1000),
): { ok: true; payload: DokladOdkazPayload } | { ok: false; reason: 'invalid' | 'expired' } {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return { ok: false, reason: 'invalid' };
  const [body, sig] = parts;
  let json: string;
  try {
    json = Buffer.from(body, 'base64url').toString('utf8');
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  const expected = sign(json);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'invalid' };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'invalid' };
  const o = raw as Record<string, unknown>;
  const r = typeof o.r === 'string' ? o.r.trim() : '';
  const typ: TypDokladu = o.typ === 'zalohova' ? 'zalohova' : 'faktura';
  const odberatel: OdberatelDokladu = o.odberatel === 'host' ? 'host' : 'firma';
  const lang: JazykDokladu = o.lang === 'en' ? 'en' : 'cs';
  const exp = typeof o.exp === 'number' ? o.exp : 0;
  if (!r || !exp) return { ok: false, reason: 'invalid' };
  if (exp < now) return { ok: false, reason: 'expired' };
  const castka =
    typeof o.castka === 'number' && Number.isFinite(o.castka) && o.castka > 0
      ? Math.round(o.castka * 100) / 100
      : undefined;
  const bezHosta = odberatel === 'firma' && o.bezHosta === true;
  const bezEmailu = o.bezEmailu === true;
  const bezPoznamky = o.bezPoznamky === true;
  const zpusobUhrady =
    typ === 'faktura' && typeof o.zpusobUhrady === 'string'
      ? normalizujZpusobUhrady(o.zpusobUhrady)
      : undefined;
  return {
    ok: true,
    payload: {
      r,
      typ,
      odberatel,
      lang,
      exp,
      ...(castka != null ? { castka } : {}),
      ...(bezHosta ? { bezHosta: true } : {}),
      ...(bezEmailu ? { bezEmailu: true } : {}),
      ...(bezPoznamky ? { bezPoznamky: true } : {}),
      ...(zpusobUhrady ? { zpusobUhrady } : {}),
    },
  };
}

export function urlDokladu(base: string, token: string): string {
  const root = String(base || '').replace(/\/$/, '');
  return `${root}/doklad/${encodeURIComponent(token)}`;
}

export function zakladUrlZEnv(): string {
  return adresaKlub();
}

/** Krátký text do e-mailu / WhatsApp. */
export function textDokladuHostovi(lang: JazykDokladu, typ: TypDokladu, odkaz: string): {
  predmet: string;
  text: string;
  wa: string;
} {
  if (lang === 'cs') {
    const co = typ === 'zalohova' ? 'zálohovou fakturu' : 'doklad';
    return {
      predmet: typ === 'zalohova' ? 'Zálohová faktura · VIVIEN Apartments' : 'Doklad · VIVIEN Apartments',
      text: `Dobrý den,\n\nposíláme ${co} k pobytu ve VIVIEN Apartments.\n\nOtevřete odkaz. V telefonu nebo v počítači ho uložíte jako PDF (Tisk → Uložit jako PDF).\n\n${odkaz}\n\nNikol a rodina VIVIEN`,
      wa: `Dobrý den, posíláme ${co} k pobytu ve VIVIEN Apartments.\n\nOtevřete odkaz a uložte jako PDF:\n${odkaz}\n\nNikol a rodina VIVIEN`,
    };
  }
  const what = typ === 'zalohova' ? 'proforma invoice' : 'invoice';
  return {
    predmet: typ === 'zalohova' ? 'Proforma invoice · VIVIEN Apartments' : 'Invoice · VIVIEN Apartments',
    text: `Hello,\n\nplease find your ${what} for your stay at VIVIEN Apartments.\n\nOpen the link. On your phone or computer, save it as PDF (Print → Save as PDF).\n\n${odkaz}\n\nNikol and the VIVIEN family`,
    wa: `Hello, here is your ${what} for your stay at VIVIEN Apartments.\n\nOpen the link and save as PDF:\n${odkaz}\n\nNikol and the VIVIEN family`,
  };
}
