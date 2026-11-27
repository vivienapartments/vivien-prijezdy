/**
 * Okno „Ubytováno – poslat kartu“ (PROMPT-PODEKOVANI-KLUB bod 5b).
 * Příjezd: klíče. Útrata až po převzetí zpět (odjezd).
 */

import { jeRelayEmail } from './staly-host';
import { zpravaWaPoslatKartu } from './klub-pozdravy';
import type { GuideLang } from './types';

/** Zkouška: e-maily karty na info@, WhatsApp/SMS na toto číslo. */
export const TEST_KARTA_EMAIL = 'info@vivienapartments.cz';
export const TEST_KARTA_TEL = '420777702272';

export function jeTestRezimKarty(): boolean {
  return (process.env.TEST_REZIM ?? '1') !== '0';
}

export type KartaPredanaKanal = 'email' | 'whatsapp' | 'sms' | 'kopie';

export type KartaPredana = {
  kdy: string;
  kanaly: KartaPredanaKanal[];
};

export function jeKartaPredanaKanal(v: unknown): v is KartaPredanaKanal {
  return v === 'email' || v === 'whatsapp' || v === 'sms' || v === 'kopie';
}

export function normalizujKartaPredana(raw: unknown): KartaPredana | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as { kdy?: unknown; kanaly?: unknown };
  if (typeof o.kdy !== 'string' || !o.kdy) return null;
  const kanaly = Array.isArray(o.kanaly)
    ? o.kanaly.filter(jeKartaPredanaKanal)
    : [];
  return { kdy: o.kdy, kanaly };
}

export function pridejKanalKartaPredana(
  prev: KartaPredana | null | undefined,
  kanal: KartaPredanaKanal,
  kdy = new Date().toISOString(),
): KartaPredana {
  const kanaly = [...(prev?.kanaly || [])];
  if (!kanaly.includes(kanal)) kanaly.push(kanal);
  return { kdy, kanaly };
}

const STITKY: Record<KartaPredanaKanal, string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  kopie: 'Odkaz',
};

/** „Karta poslána · E-mail + WhatsApp 15:42“ */
export function textKartaPoslana(
  predana: KartaPredana | null | undefined,
  hodina: string,
): string | null {
  if (!predana?.kdy) return null;
  const kanaly = predana.kanaly.map((k) => STITKY[k]).filter(Boolean);
  const cast = kanaly.length ? ` · ${kanaly.join(' + ')}` : '';
  return `Karta poslána${cast} ${hodina}`.trim();
}

export function jeBookingZdroj(zdroj: string | null | undefined, email: string | null | undefined): boolean {
  return /booking|airbnb|expedia/i.test(`${zdroj || ''} ${email || ''}`);
}

export function emailProKartu(vstup: {
  emailHosta?: string | null;
  email?: string | null;
}): { email: string | null; relay: boolean; relayPoznamka: string | null } {
  const raw = (vstup.emailHosta || vstup.email || '').trim();
  if (!raw || !raw.includes('@')) {
    return { email: null, relay: false, relayPoznamka: null };
  }
  if (jeRelayEmail(raw)) {
    return {
      email: raw,
      relay: true,
      relayPoznamka: 'adresa z Bookingu',
    };
  }
  return { email: raw, relay: false, relayPoznamka: null };
}

/** Cíle pro odeslání karty: v testu vždy info@ a +420 777 702 272. */
export function cileOdeslaniKarty(vstup: {
  email: string | null;
  emailRelay: boolean;
  telefonWa: string | null;
}): {
  email: string | null;
  emailRelay: boolean;
  telefonWa: string | null;
  test: boolean;
  emailPoznamka: string | null;
} {
  if (!jeTestRezimKarty()) {
    return {
      email: vstup.email,
      emailRelay: vstup.emailRelay,
      telefonWa: vstup.telefonWa,
      test: false,
      emailPoznamka: null,
    };
  }
  return {
    email: TEST_KARTA_EMAIL,
    emailRelay: false,
    telefonWa: TEST_KARTA_TEL,
    test: true,
    emailPoznamka: 'zkouška',
  };
}

export function sestavZpravuKarty(opts: {
  lang: GuideLang;
  krestniJmeno: string;
  odkaz: string;
  booking: boolean;
}): string {
  return zpravaWaPoslatKartu(opts.lang, {
    krestniJmeno: opts.krestniJmeno,
    odkaz: opts.odkaz,
    booking: opts.booking,
  });
}

export function mailtoKarty(opts: {
  email: string;
  zprava: string;
  odkaz: string;
}): string {
  const subject = encodeURIComponent('VIVIEN Club');
  const body = encodeURIComponent(`${opts.zprava}`);
  return `mailto:${encodeURIComponent(opts.email)}?subject=${subject}&body=${body}`;
}
