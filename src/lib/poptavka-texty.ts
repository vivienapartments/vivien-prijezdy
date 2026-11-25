/**
 * Texty stránky poptávky.
 * Cesty firma / doporučitel / obecná: CS + EN (ostatní jazyky → EN).
 * Věrný host (`vernost`): `poptavka-texty-vernost.ts` (PROMPT-76).
 */

import { doporuceniTexty } from './doporuceni-texty';
import { DEKUJEME_POTVRDIME, UVOD_VERNOST_CENA } from './poptavka-ceny-texty';
import { doporucitelUiTexty } from './poptavka-doporucitel-ui';
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
  /** Neplatný telefon (všechny zdroje). */
  chybaTelefon: string;
};

const CHYBA_TELEFON: Record<GuideLang, string> = {
  cs: 'Zkontrolujte telefonní číslo, i s předvolbou.',
  en: 'Please check the phone number, including the country code.',
  de: 'Bitte prüfen Sie die Telefonnummer samt Ländervorwahl.',
  pl: 'Sprawdźcie numer telefonu razem z numerem kierunkowym kraju.',
  uk: 'Перевірте номер телефону разом із кодом країни.',
  'zh-Hant': '請檢查電話號碼，包括國碼。',
  es: 'Comprueben el número de teléfono, con el prefijo del país.',
  fr: 'Vérifiez le numéro de téléphone, avec l’indicatif du pays.',
  it: 'Controllate il numero di telefono, con il prefisso internazionale.',
  pt: 'Verifiquem o número de telefone, com o indicativo do país.',
  sv: 'Kontrollera telefonnumret, inklusive landsnummer.',
  hu: 'Ellenőrizzék a telefonszámot az országhívószámmal együtt.',
  da: 'Tjek telefonnummeret, inklusive landekode.',
  fi: 'Tarkistakaa puhelinnumero suuntanumeroineen.',
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
  chybaTelefon: CHYBA_TELEFON.cs,
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
  chybaTelefon: CHYBA_TELEFON.en,
};

/**
 * @param cenyZapnuto výchozí true. Vypnuto = staré texty „pošleme cenu“.
 */
export function poptavkaTexty(
  lang: GuideLang,
  zdroj?: PoptavkaZdroj,
  cenyZapnuto = true,
): PoptavkaTexty {
  const chybaTelefon = CHYBA_TELEFON[lang] || CHYBA_TELEFON.en;
  if (zdroj === 'vernost') {
    const base = poptavkaTextyVernost(lang);
    if (!cenyZapnuto) return { ...base, chybaTelefon };
    return {
      ...base,
      uvod: UVOD_VERNOST_CENA[lang] || UVOD_VERNOST_CENA.en,
      dekujeme: DEKUJEME_POTVRDIME[lang] || DEKUJEME_POTVRDIME.en,
      chybaTelefon,
    };
  }
  if (zdroj === 'doporucitel') {
    const base = poptavkaTextyVernost(lang);
    const d = doporuceniTexty(lang);
    return {
      ...base,
      nadpis: d.poptavkaNadpis,
      uvod: d.poptavkaUvod,
      sleva: '',
      nadpisApartmany: d.poptavkaNadpisApartmany,
      nadpisOdeslano: d.poptavkaNadpisOdeslano,
      dekujeme: cenyZapnuto
        ? DEKUJEME_POTVRDIME[lang] || DEKUJEME_POTVRDIME.en
        : base.dekujeme,
      chybaTelefon,
    };
  }
  /** Firma: staré texty (bez „ceny hned“ / „blokujeme termín“). */
  if (zdroj === 'firma') {
    const base = lang === 'cs' ? CS : EN;
    return { ...base, chybaTelefon };
  }
  const base = lang === 'cs' ? CS : EN;
  if (!cenyZapnuto) return { ...base, chybaTelefon };
  /** Běžná poptávka: poslední věta o ceně → napověda, děkujeme → potvrzení termínu. */
  const napoveda = doporucitelUiTexty(lang).poptavkaNapoveda;
  return {
    ...base,
    uvod: napoveda,
    dekujeme: DEKUJEME_POTVRDIME[lang] || DEKUJEME_POTVRDIME.en,
    chybaTelefon,
  };
}

/** Štítek na první obrazovce doporučeného hosta. */
export function poptavkaStitekDoporuceni(lang: GuideLang): string {
  return doporuceniTexty(lang).poptavkaStitek;
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

/** Datum YMD → lokalizovaný zápis (cs: 12. 12. 2026, en: 12 Dec 2026). */
export function formatDatumPoptavky(ymd: string, lang: GuideLang): string {
  const dt = ymdNaUtc(ymd);
  if (!dt) return ymd;
  const [y, m, d] = ymd.split('-').map(Number);
  try {
    return new Intl.DateTimeFormat(poptavkaLocale(lang), {
      day: 'numeric',
      month: lang === 'cs' ? 'numeric' : 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(dt);
  } catch {
    return `${d}. ${m}. ${y}`;
  }
}

/**
 * Rozsah příjezd–odjezd pro souhrn (věrnost / NEJDE).
 * Stejný měsíc zkrátí, jiný měsíc obě data se společným rokem, jiný rok obě celá.
 * cs přesně podle zvyku s mezerami. Ostatní jazyky: den + zkratka měsíce (en-GB: 10–12 Dec 2026),
 * ať 10/12 není dvojznačné.
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
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
    if (typeof fmt.formatRange === 'function') return fmt.formatRange(a, b);
  } catch {
    /* fallback níže */
  }
  return `${formatDatumPoptavky(od, lang)} – ${formatDatumPoptavky(doYmd, lang)}`;
}

/** Rozsah bez roku pro hustý souhrn na Termínu: „25.–26. 11.“ */
export function formatRozsahPoptavkyBezRoku(od: string, doYmd: string, lang: GuideLang): string {
  const [y1, m1, d1] = od.split('-').map(Number);
  const [y2, m2, d2] = doYmd.split('-').map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) {
    return formatRozsahPoptavky(od, doYmd, lang);
  }
  if (lang === 'zh-Hant') {
    if (m1 === m2) return `${m1}/${d1}–${d2}`;
    return `${m1}/${d1}–${m2}/${d2}`;
  }
  if (lang === 'cs') {
    if (m1 === m2) return `${d1}.–${d2}. ${m1}.`;
    return `${d1}. ${m1}. – ${d2}. ${m2}.`;
  }
  const a = ymdNaUtc(od);
  const b = ymdNaUtc(doYmd);
  if (a && b) {
    try {
      const fmt = new Intl.DateTimeFormat(poptavkaLocale(lang), {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      });
      if (typeof fmt.formatRange === 'function') return fmt.formatRange(a, b);
    } catch {
      /* */
    }
  }
  if (m1 === m2) return `${d1}.–${d2}. ${m1}.`;
  return `${d1}. ${m1}. – ${d2}. ${m2}.`;
}
