/**
 * Centrální ochrana odchozích zpráv hostovi (Booking/Airbnb relay).
 * Marketing na agenturní e-mail = zákaz.
 * Marketing SMS/WA jen na telefon z check-inu.
 * Bez potvrzeného zdroje = žádné obchodní zprávy.
 */

import { jeRelayEmail } from './staly-host';
import { smíObchodniAktivita, telefonJeZCheckinu } from './zdroj-rezervace';
import type { RezervaceRecord } from './store';

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

export const CHYBA_TELEFON_REZERVACE =
  'Obchodní WhatsApp/SMS jen na telefon z check-inu, ne z rezervace Booking/Airbnb';

export const CHYBA_ZDROJ_CEKA =
  'Zdroj rezervace ještě není potvrzený – obchodní zprávy nejdou';

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
  let out = html
    .replace(/<a\b[^>]*href=["'][^"']*(?:poptavka|klub|doporucitel|klient|[?&#]od=|[?&#]k=|#doporucit)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/href=["'][^"']*(?:poptavka|klub|doporucitel|klient|[?&#]od=|[?&#]k=|#doporucit)[^"']*["']/gi, 'href="#"');
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
  /** Cílový telefon (SMS/WA). */
  telefonCil?: string | null;
  /** Karta rezervace (zdrojCeka, telefony). */
  rezervaceRec?: Pick<
    RezervaceRecord,
    'zdrojCeka' | 'telefon' | 'telefonWa' | 'telefonRezervace' | 'telefonRezervaceWa'
  > | null;
  text?: string;
  html?: string | null;
  /** Když true, neposílej Telegram (testy). */
  tichy?: boolean;
  rezervace?: string | null;
};

async function upozorniZablokovani(vstup: OdchoziVstup, duvod: string): Promise<void> {
  if (vstup.tichy || process.env.VITEST) return;
  const rez = vstup.rezervace ? ` · ${vstup.rezervace}` : '';
  const text = `Zablokováno (Booking/Airbnb)${rez}: ${vstup.kanal}/${vstup.druh}. ${duvod}`;
  try {
    const { posliTelegram } = await import('./telegram');
    await posliTelegram(text, 'automat', '/prehled');
  } catch {
    /* neházej ven */
  }
}

/**
 * Centrální brána.
 * - Zdroj čeká + marketing → stop.
 * - E-mail + marketing + agenturní adresa → stop.
 * - SMS/WA + marketing → jen telefon z check-inu.
 * - E-mail/SMS/WA + provoz + agenturní adresa → vyčistit obsah.
 */
export async function overOdchoziHostovi(vstup: OdchoziVstup): Promise<OvereniOdchozi> {
  const email = (vstup.emailCil || '').trim();
  const jeRelay = Boolean(email && jeRelayEmail(email));
  const text = vstup.text || '';
  const html = vstup.html ?? null;
  const marketing = jeMarketingDruh(vstup.druh);

  if (marketing && !smíObchodniAktivita(vstup.rezervaceRec)) {
    await upozorniZablokovani(vstup, CHYBA_ZDROJ_CEKA);
    return { ok: false, duvod: CHYBA_ZDROJ_CEKA, zablokovano: true };
  }

  if (marketing && vstup.kanal !== 'email') {
    const okTel = telefonJeZCheckinu(vstup.telefonCil, vstup.rezervaceRec);
    if (!okTel) {
      await upozorniZablokovani(vstup, CHYBA_TELEFON_REZERVACE);
      return { ok: false, duvod: CHYBA_TELEFON_REZERVACE, zablokovano: true };
    }
    return { ok: true, text, html };
  }

  if (!jeRelay) {
    return { ok: true, text, html };
  }

  if (vstup.kanal === 'email' && marketing) {
    await upozorniZablokovani(vstup, CHYBA_RELAY_EMAIL);
    return { ok: false, duvod: CHYBA_RELAY_EMAIL, zablokovano: true };
  }

  // Provoz na agenturní e-mail: bez slevy, poptávky, klubu, doporučení.
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
 * Marketing jen když je telefon z check-inu (volající předá příznak).
 */
export function pripravTextSmsWa(
  text: string,
  emailCil: string | null | undefined,
  druh: OdchoziDruh,
  opts?: {
    telefonCil?: string | null;
    rezervaceRec?: OdchoziVstup['rezervaceRec'];
  },
): { ok: true; text: string } | { ok: false; duvod: string } {
  if (jeMarketingDruh(druh)) {
    if (!smíObchodniAktivita(opts?.rezervaceRec)) {
      return { ok: false, duvod: CHYBA_ZDROJ_CEKA };
    }
    if (!telefonJeZCheckinu(opts?.telefonCil, opts?.rezervaceRec)) {
      return { ok: false, duvod: CHYBA_TELEFON_REZERVACE };
    }
    return { ok: true, text };
  }
  const email = (emailCil || '').trim();
  if (!email || !jeRelayEmail(email)) return { ok: true, text };
  const cisty = vycistiTextProRelay(text);
  if (cisty == null) return { ok: false, duvod: CHYBA_RELAY_OBSAH };
  return { ok: true, text: cisty };
}
