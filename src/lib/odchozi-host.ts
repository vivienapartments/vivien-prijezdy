/**
 * Centrální ochrana odchozích zpráv hostovi (Booking/Airbnb relay).
 * Marketing na relay = zákaz. Provoz na relay = jen bez zakázaného obsahu.
 */

import { jeRelayEmail } from './staly-host';

export type OdchoziKanal = 'email' | 'sms' | 'whatsapp';

/** Marketing / nabídka / klub / doporučení / poděkování se slevou. */
export type OdchoziDruh =
  | 'podekovani'
  | 'tip-kamaradovi'
  | 'doporuceni'
  | 'klub'
  | 'vernost'
  | 'provozni';

export const CHYBA_RELAY_EMAIL =
  'Zástupná adresa Booking/Airbnb – chybí skutečný e-mail';

export const CHYBA_RELAY_OBSAH =
  'Zpráva na zástupnou adresu nesmí obsahovat slevu, poptávku, klub ani doporučení';

/** Druhy, které na relay e-mail vůbec nejdou. */
const MARKETING: ReadonlySet<OdchoziDruh> = new Set([
  'podekovani',
  'tip-kamaradovi',
  'doporuceni',
  'klub',
  'vernost',
]);

/** Slova „sleva“ / „discount“ atd. (celá slova, bez ohledu na velikost). */
const SLEVA_RE =
  /\b(slev[aueyů]|discount|rabatt|zni[zż]k\w*|знижк\w*|descuento|r[eé]duction|riduzione|desconto|kedvezm[eé]ny|rabat|alennus|優惠|折扣)\b/i;

/** Zakázané cesty / parametry v odkazech. */
const ZAKAZANE_URL_RE =
  /(?:\/poptavka\b|\/klub\b|\/doporucitel\b|\/klient\b|[?&#]od=|[?&#]k=|#doporucit\b|doporuceni|vernost)/i;

export function jeMarketingDruh(druh: OdchoziDruh): boolean {
  return MARKETING.has(druh);
}

export function textMaZakazanyObsah(text: string): boolean {
  const t = text || '';
  if (SLEVA_RE.test(t)) return true;
  if (ZAKAZANE_URL_RE.test(t)) return true;
  return false;
}

/** Odstraní řádky/odstavce se zakázaným obsahem. Vrací null, když po čištění nic nezbylo. */
export function vycistiTextProRelay(text: string): string | null {
  const casti = (text || '')
    .split(/\n{2,}/)
    .map((odstavec) =>
      odstavec
        .split('\n')
        .filter((radek) => !textMaZakazanyObsah(radek))
        .join('\n')
        .trim(),
    )
    .filter((o) => o.length > 0 && !textMaZakazanyObsah(o));
  if (!casti.length) return null;
  const out = casti.join('\n\n');
  if (textMaZakazanyObsah(out)) return null;
  return out;
}

export function vycistiHtmlProRelay(html: string): string | null {
  if (!html) return null;
  if (!textMaZakazanyObsah(html)) return html;
  // Hrubé odstranění odkazů a úseků se slevou / poptávkou.
  let out = html
    .replace(/<a\b[^>]*href=["'][^"']*(?:poptavka|klub|doporucitel|klient|[?&#]od=|[?&#]k=|#doporucit)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/href=["'][^"']*(?:poptavka|klub|doporucitel|klient|[?&#]od=|[?&#]k=|#doporucit)[^"']*["']/gi, 'href="#"');
  // Odstranit elementy, které pořád drží zakázaná slova.
  out = out.replace(/<(p|li|div|span|td|h[1-6])\b[^>]*>[\s\S]*?<\/\1>/gi, (blok) =>
    textMaZakazanyObsah(blok) ? '' : blok,
  );
  if (!out.trim() || textMaZakazanyObsah(out)) return null;
  return out;
}

export type OvereniOdchozi = {
  ok: boolean;
  duvod?: string;
  text?: string;
  html?: string | null;
  zablokovano?: boolean;
};

export type OdchoziVstup = {
  kanal: OdchoziKanal;
  druh: OdchoziDruh;
  /** Cílový e-mail (u SMS/WA e-mail hosta na kartě, ať víme o relay). */
  emailCil?: string | null;
  text?: string;
  html?: string | null;
  /** Když true, neposílej Telegram (testy). */
  tichy?: boolean;
  rezervace?: string | null;
};

async function upozorniZablokovani(vstup: OdchoziVstup, duvod: string): Promise<void> {
  if (vstup.tichy || process.env.VITEST) return;
  const rez = vstup.rezervace ? ` · ${vstup.rezervace}` : '';
  const text = `Zablokováno (Booking/Airbnb relay)${rez}: ${vstup.kanal}/${vstup.druh}. ${duvod}`;
  try {
    const { posliTelegram } = await import('./telegram');
    await posliTelegram(text, 'automat', '/prehled');
  } catch {
    /* neházej ven */
  }
}

/**
 * Centrální brána.
 * - E-mail + marketing + relay → stop (+ Telegram).
 * - E-mail + provoz + relay → vyčistit obsah; nejde-li, stop (+ Telegram).
 * - SMS / WhatsApp marketing (poděkování) na telefon → povolit (ne přes Booking schránku).
 * - SMS / WhatsApp provoz při relay e-mailu na kartě → vyčistit zakázané odkazy/slevu.
 */
export async function overOdchoziHostovi(vstup: OdchoziVstup): Promise<OvereniOdchozi> {
  const email = (vstup.emailCil || '').trim();
  const jeRelay = Boolean(email && jeRelayEmail(email));
  const text = vstup.text || '';
  const html = vstup.html ?? null;

  if (!jeRelay) {
    return { ok: true, text, html };
  }

  if (vstup.kanal === 'email' && jeMarketingDruh(vstup.druh)) {
    await upozorniZablokovani(vstup, CHYBA_RELAY_EMAIL);
    return { ok: false, duvod: CHYBA_RELAY_EMAIL, zablokovano: true };
  }

  if (vstup.kanal !== 'email' && jeMarketingDruh(vstup.druh)) {
    return { ok: true, text, html };
  }

  // Provoz na relay (e-mail / SMS / WA): bez slevy, poptávky, klubu, doporučení.
  if (vstup.kanal === 'email') {
    const cistyText = vycistiTextProRelay(text);
    const cistyHtml = html != null && html !== '' ? vycistiHtmlProRelay(html) : html;
    if (cistyText == null || (html && cistyHtml == null)) {
      await upozorniZablokovani(vstup, CHYBA_RELAY_OBSAH);
      return { ok: false, duvod: CHYBA_RELAY_OBSAH, zablokovano: true };
    }
    return { ok: true, text: cistyText, html: cistyHtml };
  }

  const cisty = vycistiTextProRelay(text);
  if (cisty == null) {
    await upozorniZablokovani(vstup, CHYBA_RELAY_OBSAH);
    return { ok: false, duvod: CHYBA_RELAY_OBSAH, zablokovano: true };
  }
  return { ok: true, text: cisty, html: null };
}

/** Mapování druhu zprávy z menu na OdchoziDruh. */
export function druhZpravyNaOdchozi(id: string): OdchoziDruh {
  if (id === 'podekovani') return 'podekovani';
  return 'provozni';
}

/**
 * Synchronní příprava textu pro SMS/WA (bez Telegramu).
 * Marketing na telefon při relay e-mailu nechá projít.
 */
export function pripravTextSmsWa(
  text: string,
  emailCil: string | null | undefined,
  druh: OdchoziDruh,
): { ok: true; text: string } | { ok: false; duvod: string } {
  const email = (emailCil || '').trim();
  if (!email || !jeRelayEmail(email)) return { ok: true, text };
  if (jeMarketingDruh(druh)) return { ok: true, text };
  const cisty = vycistiTextProRelay(text);
  if (cisty == null) return { ok: false, duvod: CHYBA_RELAY_OBSAH };
  return { ok: true, text: cisty };
}
