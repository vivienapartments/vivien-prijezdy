/**
 * Texty stránky poptávky.
 * Cesty firma / doporučitel / obecná: CS + EN (ostatní jazyky → EN).
 * Věrný host (`vernost`): `poptavka-texty-vernost.ts` (PROMPT-76).
 */

import { poptavkaTextyVernost } from './poptavka-texty-vernost';
import type { PoptavkaZdroj } from './poptavka';
import type { GuideLang } from './types';

export type PoptavkaTexty = {
  nadpis: string;
  uvod: string;
  firmaRadek: string;
  sleva: string;
  cenaPozdeji: string;
  krokTermin: string;
  krokZpusob: string;
  krokApartmany: string;
  krokKontakt: string;
  prijezd: string;
  odjezd: string;
  dale: string;
  zpet: string;
  zpusobDoporucit: string;
  zpusobDoporucitPopis: string;
  zpusobVybrat: string;
  zpusobVybratPopis: string;
  /** Jen věrnost. Třetí volba: průvodce uvnitř. */
  zpusobPruvodce: string;
  zpusobPruvodcePopis: string;
  nadpisPruvodce: string;
  pruvodceVybrat: string;
  pruvodceZnovu: string;
  zkouskaBanner: string;
  vyberteApartmany: string;
  galerieKomplet: string;
  /** Jen věrnost. U ostatních cest prázdné. */
  kvizOtazka: string;
  kvizAtmosfery: string;
  vybratTento: string;
  zrusitVyber: string;
  zavritGalerie: string;
  /** Galerie otevřená z výsledku průvodce. */
  zpetNaVysledek: string;
  jmeno: string;
  telefon: string;
  doprava: string;
  auto: string;
  pesky: string;
  nevim: string;
  poznamka: string;
  odeslat: string;
  /** Řádek nad menšími tlačítky WA/SMS. Zatím cs + en, ostatní → en. */
  neboOdeslatPres: string;
  whatsapp: string;
  sms: string;
  dekujeme: string;
  /** Jen věrnost. Zlatá věta „zavolejte“ v jednom odstavci s dekujeme. U ostatních cest prázdné. */
  dekujemeVolejte: string;
  /** Jen věrnost (PROMPT-76B). U ostatních cest prázdné. */
  nadpisZpusob: string;
  nadpisApartmany: string;
  nadpisKontakt: string;
  nadpisOdeslano: string;
  /** Šablona s `{n}` (2 nebo 3). Jen věrnost. */
  malyKrok: string;
  malyPosledni: string;
  zavolat: string;
  zaloha: string;
  chybaTermin: string;
  chybaKontakt: string;
  chybaApartman: string;
  chybaObecna: string;
  chybaBlok: string;
};

const CS: PoptavkaTexty = {
  nadpis: 'Další pobyt u nás',
  uvod: 'Do hodiny ověříme volno a ozveme se s cenou se slevou 5 %.',
  firmaRadek: 'Poptávka pro {firma}',
  sleva: 'Na této cestě máte slevu 5 %.',
  cenaPozdeji: 'Přesnou cenu dopočítáme po ověření termínu.',
  krokTermin: '1. Termín',
  krokZpusob: '2. Jak vybrat apartmán',
  krokApartmany: '3. Apartmány',
  krokKontakt: 'Kontakt a odeslání',
  prijezd: 'Příjezd',
  odjezd: 'Odjezd',
  dale: 'Pokračovat',
  zpet: 'Zpět',
  zpusobDoporucit: 'Stačí termín, apartmán doporučte',
  zpusobDoporucitPopis: 'Vyberete jen kdy chcete přijet. My napíšeme, které apartmány jsou volné.',
  zpusobVybrat: 'Chci si vybrat apartmán',
  zpusobVybratPopis: 'Uvidíte fotky. Můžete vybrat jeden nebo víc.',
  zpusobPruvodce: '',
  zpusobPruvodcePopis: '',
  nadpisPruvodce: '',
  pruvodceVybrat: '',
  pruvodceZnovu: '',
  zkouskaBanner: '',
  vyberteApartmany: 'Klepněte na fotku. Otevře se galerie. Pak apartmán vyberte tlačítkem.',
  galerieKomplet: 'Galerie komplet',
  kvizOtazka: '',
  kvizAtmosfery: 'Nevíte, který vybrat? Krátký průvodce doporučením apartmánů',
  vybratTento: 'Vybrat tento apartmán',
  zrusitVyber: 'Zrušit výběr',
  zavritGalerie: 'Zpět k dlaždicím',
  zpetNaVysledek: 'Zpět na výsledek',
  jmeno: 'Jméno',
  telefon: 'Telefon',
  doprava: 'Doprava',
  auto: 'Autem',
  pesky: 'Pěšky',
  nevim: 'Zatím nevím',
  poznamka: 'Poznámka (volitelné)',
  odeslat: 'Odeslat poptávku',
  neboOdeslatPres: 'nebo odeslat přes',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  dekujeme: 'Děkujeme. Do hodiny se ozveme s cenou.',
  dekujemeVolejte: '',
  nadpisZpusob: '',
  nadpisApartmany: '',
  nadpisKontakt: '',
  nadpisOdeslano: '',
  malyKrok: '',
  malyPosledni: '',
  zavolat: 'Zavolat Nikol',
  zaloha: 'Když se nedovoláte',
  chybaTermin: 'Zvolte příjezd a odjezd. Odjezd musí být po příjezdu.',
  chybaKontakt: 'Vyplňte jméno a telefon.',
  chybaApartman: 'Vyberte aspoň jeden apartmán, nebo zvolte doporučení od nás.',
  chybaObecna: 'Poptávku teď nešlo uložit. Zavolejte nebo napište.',
  chybaBlok: 'Příliš mnoho pokusů. Zkuste to později, nebo zavolejte.',
};

const EN: PoptavkaTexty = {
  nadpis: 'Your next stay with us',
  uvod: 'Within an hour we will check availability and reply with the price, including a 5% discount.',
  firmaRadek: 'Request for {firma}',
  sleva: 'On this path you get a 5% discount.',
  cenaPozdeji: 'We will calculate the exact price after we check the dates.',
  krokTermin: '1. Dates',
  krokZpusob: '2. How to choose',
  krokApartmany: '3. Apartments',
  krokKontakt: 'Contact and send',
  prijezd: 'Arrival',
  odjezd: 'Departure',
  dale: 'Continue',
  zpet: 'Back',
  zpusobDoporucit: 'Dates only, we will recommend',
  zpusobDoporucitPopis: 'Tell us when you want to stay. We will say which apartments are free.',
  zpusobVybrat: 'I want to choose an apartment',
  zpusobVybratPopis: 'You will see photos. You can pick one or more.',
  zpusobPruvodce: '',
  zpusobPruvodcePopis: '',
  nadpisPruvodce: '',
  pruvodceVybrat: '',
  pruvodceZnovu: '',
  zkouskaBanner: '',
  vyberteApartmany: 'Tap a photo to open the gallery. Then select the apartment.',
  galerieKomplet: 'Full gallery',
  kvizOtazka: '',
  kvizAtmosfery: 'Not sure which to pick? Short guide to apartment recommendations',
  vybratTento: 'Select this apartment',
  zrusitVyber: 'Remove selection',
  zavritGalerie: 'Back to tiles',
  zpetNaVysledek: 'Back to result',
  jmeno: 'Name',
  telefon: 'Phone',
  doprava: 'Travel',
  auto: 'By car',
  pesky: 'On foot',
  nevim: 'Not sure yet',
  poznamka: 'Note (optional)',
  odeslat: 'Send request',
  neboOdeslatPres: 'or send via',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  dekujeme: 'Thank you. We will reply within an hour with the price.',
  dekujemeVolejte: '',
  nadpisZpusob: '',
  nadpisApartmany: '',
  nadpisKontakt: '',
  nadpisOdeslano: '',
  malyKrok: '',
  malyPosledni: '',
  zavolat: 'Call Nikol',
  zaloha: 'If you cannot reach her',
  chybaTermin: 'Choose arrival and departure. Departure must be after arrival.',
  chybaKontakt: 'Please fill in name and phone.',
  chybaApartman: 'Pick at least one apartment, or choose our recommendation.',
  chybaObecna: 'We could not save the request. Please call or write.',
  chybaBlok: 'Too many attempts. Try later, or call us.',
};

export function poptavkaTexty(lang: GuideLang, zdroj?: PoptavkaZdroj): PoptavkaTexty {
  if (zdroj === 'vernost') return poptavkaTextyVernost(lang);
  return lang === 'cs' ? CS : EN;
}

function poptavkaLocale(lang: GuideLang): string {
  if (lang === 'zh-Hant') return 'zh-Hant';
  if (lang === 'cs') return 'cs-CZ';
  if (lang === 'en') return 'en-GB';
  return lang;
}

function ymdNaUtc(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Datum YMD → lokalizovaný zápis (cs: 12. 12. 2026). */
export function formatDatumPoptavky(ymd: string, lang: GuideLang): string {
  const dt = ymdNaUtc(ymd);
  if (!dt) return ymd;
  const [y, m, d] = ymd.split('-').map(Number);
  try {
    return new Intl.DateTimeFormat(poptavkaLocale(lang), {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(dt);
  } catch {
    return `${d}. ${m}. ${y}`;
  }
}

/**
 * Rozsah příjezd–odjezd pro souhrn (věrnost).
 * Stejný měsíc zkrátí, jiný měsíc obě data se společným rokem, jiný rok obě celá.
 * Ostatní jazyky přes Intl formatRange; cs přesně podle zvyku s mezerami.
 */
export function formatRozsahPoptavky(od: string, doYmd: string, lang: GuideLang): string {
  const a = ymdNaUtc(od);
  const b = ymdNaUtc(doYmd);
  if (!a || !b) {
    return `${formatDatumPoptavky(od, lang)} – ${formatDatumPoptavky(doYmd, lang)}`;
  }

  const [y1, m1, d1] = od.split('-').map(Number);
  const [y2, m2, d2] = doYmd.split('-').map(Number);

  if (lang === 'cs') {
    if (y1 === y2 && m1 === m2) return `${d1}.–${d2}. ${m1}. ${y1}`;
    if (y1 === y2) return `${d1}. ${m1}. – ${d2}. ${m2}. ${y1}`;
    return `${d1}. ${m1}. ${y1} – ${d2}. ${m2}. ${y2}`;
  }

  const locale = poptavkaLocale(lang);
  try {
    const fmt = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    if (typeof fmt.formatRange === 'function') return fmt.formatRange(a, b);
  } catch {
    /* fallback níže */
  }
  return `${formatDatumPoptavky(od, lang)} – ${formatDatumPoptavky(doYmd, lang)}`;
}
