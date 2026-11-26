/** Pozdravy na kartě a text WhatsAppu „Předáno – poslat kartu“. */
import { t } from './i18n';
import { ceskyVokativ } from './osloveni';
import type { GuideLang, LText } from './types';

export const klubPozdravDo7Dni: LText = {
  cs: 'Děkujeme za váš pobyt, {jmeno}.',
  en: 'Thank you for your stay, {jmeno}.',
  de: 'Danke für Ihren Aufenthalt, {jmeno}.',
  pl: 'Dziękujemy za pobyt, {jmeno}.',
  uk: 'Дякуємо за перебування, {jmeno}.',
  'zh-Hant': '謝謝您的住宿，{jmeno}。',
  es: 'Gracias por su estancia, {jmeno}.',
  fr: 'Merci pour votre séjour, {jmeno}.',
  it: 'Grazie per il soggiorno, {jmeno}.',
  pt: 'Obrigado pela estadia, {jmeno}.',
  sv: 'Tack för vistelsen, {jmeno}.',
  hu: 'Köszönjük a tartózkodást, {jmeno}.',
  da: 'Tak for opholdet, {jmeno}.',
  fi: 'Kiitos majoituksesta, {jmeno}.',
};

export const klubPozdravDo7DniBez: LText = {
  cs: 'Děkujeme za váš pobyt.',
  en: 'Thank you for your stay.',
  de: 'Danke für Ihren Aufenthalt.',
  pl: 'Dziękujemy za pobyt.',
  uk: 'Дякуємо за перебування.',
  'zh-Hant': '謝謝您的住宿。',
  es: 'Gracias por su estancia.',
  fr: 'Merci pour votre séjour.',
  it: 'Grazie per il soggiorno.',
  pt: 'Obrigado pela estadia.',
  sv: 'Tack för vistelsen.',
  hu: 'Köszönjük a tartózkodást.',
  da: 'Tak for opholdet.',
  fi: 'Kiitos majoituksesta.',
};

export const klubPozdravPozdeji: LText = {
  cs: 'Rádi vás zase uvidíme, {jmeno}.',
  en: 'We look forward to seeing you again, {jmeno}.',
  de: 'Wir freuen uns, Sie wiederzusehen, {jmeno}.',
  pl: 'Chętnie zobaczymy Was znowu, {jmeno}.',
  uk: 'Раді знову вас побачити, {jmeno}.',
  'zh-Hant': '期待再次見到您，{jmeno}。',
  es: 'Nos alegra volver a verle, {jmeno}.',
  fr: 'Nous serons heureux de vous revoir, {jmeno}.',
  it: 'Saremo lieti di rivedervi, {jmeno}.',
  pt: 'Teremos gosto em vê-los de novo, {jmeno}.',
  sv: 'Vi ser fram emot att träffas igen, {jmeno}.',
  hu: 'Örömmel látjuk Önöket újra, {jmeno}.',
  da: 'Vi glæder os til at se jer igen, {jmeno}.',
  fi: 'Nähdään taas, {jmeno}.',
};

export const klubPozdravPozdejiBez: LText = {
  cs: 'Rádi vás zase uvidíme.',
  en: 'We look forward to seeing you again.',
  de: 'Wir freuen uns, Sie wiederzusehen.',
  pl: 'Chętnie zobaczymy Was znowu.',
  uk: 'Раді знову вас побачити.',
  'zh-Hant': '期待再次見到您。',
  es: 'Nos alegra volver a verle.',
  fr: 'Nous serons heureux de vous revoir.',
  it: 'Saremo lieti di rivedervi.',
  pt: 'Teremos gosto em vê-los de novo.',
  sv: 'Vi ser fram emot att träffas igen.',
  hu: 'Örömmel látjuk Önöket újra.',
  da: 'Vi glæder os til at se jer igen.',
  fi: 'Nähdään taas.',
};

export const klubPozdravZaNDni: LText = {
  cs: 'Těšíme se na vás za {n} dní.',
  en: 'We look forward to seeing you in {n} days.',
  de: 'Wir freuen uns auf Sie in {n} Tagen.',
  pl: 'Cieszymy się, że zobaczymy Was za {n} dni.',
  uk: 'Чекаємо на вас за {n} дні.',
  'zh-Hant': '期待 {n} 天後見到您。',
  es: 'Le esperamos en {n} días.',
  fr: 'Nous avons hâte de vous voir dans {n} jours.',
  it: 'Non vediamo l’ora di vedervi tra {n} giorni.',
  pt: 'Esperamos por vocês daqui a {n} dias.',
  sv: 'Vi ser fram emot att träffas om {n} dagar.',
  hu: '{n} nap múlva várjuk Önöket.',
  da: 'Vi glæder os til at se jer om {n} dage.',
  fi: 'Nähdään {n} päivän päästä.',
};

export const klubPozdravVitejte: LText = {
  cs: 'Vítejte u nás, {jmeno}.',
  en: 'Welcome, {jmeno}.',
  de: 'Willkommen, {jmeno}.',
  pl: 'Witamy, {jmeno}.',
  uk: 'Ласкаво просимо, {jmeno}.',
  'zh-Hant': '歡迎您，{jmeno}。',
  es: 'Bienvenido, {jmeno}.',
  fr: 'Bienvenue, {jmeno}.',
  it: 'Benvenuti, {jmeno}.',
  pt: 'Bem-vindos, {jmeno}.',
  sv: 'Välkomna, {jmeno}.',
  hu: 'Üdvözöljük, {jmeno}.',
  da: 'Velkommen, {jmeno}.',
  fi: 'Tervetuloa, {jmeno}.',
};

export const klubPozdravVitejteBez: LText = {
  cs: 'Vítejte u nás.',
  en: 'Welcome.',
  de: 'Willkommen.',
  pl: 'Witamy.',
  uk: 'Ласкаво просимо.',
  'zh-Hant': '歡迎。',
  es: 'Bienvenido.',
  fr: 'Bienvenue.',
  it: 'Benvenuti.',
  pt: 'Bem-vindos.',
  sv: 'Välkomna.',
  hu: 'Üdvözöljük.',
  da: 'Velkommen.',
  fi: 'Tervetuloa.',
};

export const klubPozdravDnesOdjezd: LText = {
  cs: 'Dnes odjíždíte, děkujeme. Po předání vám pobyt započítáme.',
  en: 'You are leaving today, thank you. After handover we will count your stay.',
  de: 'Sie reisen heute ab, danke. Nach der Übergabe rechnen wir den Aufenthalt an.',
  pl: 'Dziś wyjeżdżacie, dziękujemy. Po przekazaniu zaliczymy pobyt.',
  uk: 'Сьогодні від’їжджаєте, дякуємо. Після передачі зарахуємо перебування.',
  'zh-Hant': '您今天退房，謝謝。交接後我們會計入住宿。',
  es: 'Sale hoy, gracias. Tras la entrega contabilizaremos la estancia.',
  fr: 'Vous partez aujourd’hui, merci. Après la remise, nous comptabiliserons le séjour.',
  it: 'Partite oggi, grazie. Dopo la consegna conteggeremo il soggiorno.',
  pt: 'Partem hoje, obrigado. Após a entrega contamos a estadia.',
  sv: 'Ni reser i dag, tack. Efter överlämningen räknar vi vistelsen.',
  hu: 'Ma utaznak el, köszönjük. Átadás után beszámítjuk a tartózkodást.',
  da: 'I tjekker ud i dag, tak. Efter overdragelsen medregner vi opholdet.',
  fi: 'Lähdette tänään, kiitos. Luovutuksen jälkeen laskemme majoituksen.',
};

export const klubBookingRamecekPo: LText = {
  cs: 'Jako poděkování máte 5 % na další pobyt, když rezervujete napřímo u nás.',
  en: 'As a thank you, you have 5 % off your next stay when you book directly with us.',
  de: 'Als Dankeschön 5 % auf den nächsten Aufenthalt bei Direktbuchung bei uns.',
  pl: 'W podziękowaniu 5 % na kolejny pobyt przy rezerwacji bezpośrednio u nas.',
  uk: 'Як подяку маєте 5 % на наступне перебування при прямому бронюванні в нас.',
  'zh-Hant': '為感謝您，若直接向我們預訂，下次住宿享 5%。',
  es: 'Como agradecimiento tiene un 5 % en la próxima estancia si reserva directamente.',
  fr: 'En remerciement, 5 % sur le prochain séjour en réservant directement chez nous.',
  it: 'Come ringraziamento il 5 % sul prossimo soggiorno prenotando direttamente da noi.',
  pt: 'Como agradecimento 5 % na próxima estadia ao reservarem diretamente connosco.',
  sv: 'Som tack 5 % på nästa vistelse när ni bokar direkt hos oss.',
  hu: 'Köszönetképpen 5 % a következő tartózkodásra közvetlen foglalásnál.',
  da: 'Som tak 5 % på næste ophold ved direkte booking hos os.',
  fi: 'Kiitoksena 5 % seuraavasta majoituksesta suorassa varauksessa.',
};

export const klubWaKartaBooking: LText = {
  cs: 'Dobrý den, {jmeno}, vítejte u nás. Tady je vaše karta VIVIEN Klubu – najdete v ní průvodce a slevu 5 % na příští pobyt, když rezervujete napřímo: {odkaz}',
  en: 'Hello {jmeno}, welcome. Here is your VIVIEN Club card – it has the guide and 5 % off your next stay when you book directly: {odkaz}',
  de: 'Guten Tag, {jmeno}, willkommen. Hier ist Ihre VIVIEN-Club-Karte – darin finden Sie den Guide und 5 % auf den nächsten Aufenthalt bei Direktbuchung: {odkaz}',
  pl: 'Dzień dobry, {jmeno}, witamy. Oto Wasza karta VIVIEN Klubu – znajdziecie w niej przewodnik i 5 % na kolejny pobyt przy rezerwacji bezpośrednio: {odkaz}',
  uk: 'Добрий день, {jmeno}, ласкаво просимо. Ось ваша картка VIVIEN Klubu – у ній гід і 5 % на наступне перебування при прямому бронюванні: {odkaz}',
  'zh-Hant': '您好，{jmeno}，歡迎。這是您的 VIVIEN 俱樂部卡片，內有指南與下次直接預訂 5% 優惠：{odkaz}',
  es: 'Buenos días, {jmeno}, bienvenido. Aquí tiene su tarjeta VIVIEN Club: guía y 5 % en la próxima estancia si reserva directamente: {odkaz}',
  fr: 'Bonjour {jmeno}, bienvenue. Voici votre carte VIVIEN Club – guide et 5 % sur le prochain séjour en réservant directement : {odkaz}',
  it: 'Buongiorno {jmeno}, benvenuti. Ecco la vostra carta VIVIEN Club – guida e 5 % sul prossimo soggiorno prenotando direttamente: {odkaz}',
  pt: 'Olá {jmeno}, bem-vindos. Aqui está o vosso cartão VIVIEN Club – guia e 5 % na próxima estadia ao reservarem diretamente: {odkaz}',
  sv: 'Hej {jmeno}, välkomna. Här är ert VIVIEN Club-kort – guide och 5 % på nästa vistelse vid direktbokning: {odkaz}',
  hu: 'Jó napot, {jmeno}, üdvözöljük. Itt a VIVIEN Club kártyájuk – útmutató és 5 % a következő tartózkodásra közvetlen foglalásnál: {odkaz}',
  da: 'Goddag {jmeno}, velkommen. Her er jeres VIVIEN Club-kort – guide og 5 % på næste ophold ved direkte booking: {odkaz}',
  fi: 'Hyvää päivää {jmeno}, tervetuloa. Tässä VIVIEN Club -korttinne – opas ja 5 % seuraavasta majoituksesta suorassa varauksessa: {odkaz}',
};

export const klubWaKartaPrima: LText = {
  cs: 'Dobrý den, {jmeno}, vítejte u nás. Tady je karta VIVIEN Klubu s průvodcem: {odkaz}',
  en: 'Hello {jmeno}, welcome. Here is your guide and VIVIEN Club card: {odkaz}',
  de: 'Guten Tag, {jmeno}, willkommen. Hier sind Ihr Guide und Ihre VIVIEN-Club-Karte: {odkaz}',
  pl: 'Dzień dobry, {jmeno}, witamy. Oto Wasz przewodnik i karta VIVIEN Klubu: {odkaz}',
  uk: 'Добрий день, {jmeno}, ласкаво просимо. Ось ваш гід і картка VIVIEN Klubu: {odkaz}',
  'zh-Hant': '您好，{jmeno}，歡迎。這是您的指南與 VIVIEN 俱樂部卡片：{odkaz}',
  es: 'Buenos días, {jmeno}, bienvenido. Aquí tiene su guía y tarjeta VIVIEN Club: {odkaz}',
  fr: 'Bonjour {jmeno}, bienvenue. Voici votre guide et carte VIVIEN Club : {odkaz}',
  it: 'Buongiorno {jmeno}, benvenuti. Ecco la guida e la carta VIVIEN Club: {odkaz}',
  pt: 'Olá {jmeno}, bem-vindos. Aqui está o vosso guia e cartão VIVIEN Club: {odkaz}',
  sv: 'Hej {jmeno}, välkomna. Här är er guide och VIVIEN Club-kort: {odkaz}',
  hu: 'Jó napot, {jmeno}, üdvözöljük. Itt az útmutató és a VIVIEN Club kártyájuk: {odkaz}',
  da: 'Goddag {jmeno}, velkommen. Her er jeres guide og VIVIEN Club-kort: {odkaz}',
  fi: 'Hyvää päivää {jmeno}, tervetuloa. Tässä oppaanne ja VIVIEN Club -korttinne: {odkaz}',
};

function vypln(s: string, vars: Record<string, string>): string {
  let out = s;
  for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, v);
  return out;
}

function ymdDnesPraha(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function dnyMezi(a: string, b: string): number {
  const da = Date.parse(`${a}T12:00:00`);
  const db = Date.parse(`${b}T12:00:00`);
  if (!Number.isFinite(da) || !Number.isFinite(db)) return 0;
  return Math.round((db - da) / 86400000);
}

/** Čeština: 5. pád ze slovníku. Jinak null → věta bez jména. */
export function osloveniProPozdrav(lang: GuideLang, krestniJmeno: string): string | null {
  const raw = (krestniJmeno || '').trim();
  if (!raw) return null;
  if (lang === 'cs') return ceskyVokativ(raw);
  if (/[\s\-–—]/.test(raw)) return null;
  return raw;
}

/** Kurzívový pozdrav při dalším otevření karty (ne první poděkování). */
export function pozdravDalsiOtevreni(
  lang: GuideLang,
  opts: {
    krestniJmeno: string;
    posledniOdjezdYmd: string | null;
    pristiPrijezdYmd: string | null;
    dnesOdjezdPredPredanim?: boolean;
    praveBydli?: boolean;
    bookingKlub?: boolean;
  },
): string | null {
  const jmeno = osloveniProPozdrav(lang, opts.krestniJmeno);
  if (opts.dnesOdjezdPredPredanim) return t(klubPozdravDnesOdjezd, lang);
  /** Právě bydlí: vždy „Vítejte u nás, Karle.“ (5. pád). */
  if (opts.praveBydli) {
    return jmeno
      ? vypln(t(klubPozdravVitejte, lang), { jmeno })
      : t(klubPozdravVitejteBez, lang);
  }
  const dnes = ymdDnesPraha();
  if (opts.pristiPrijezdYmd) {
    const n = dnyMezi(dnes, opts.pristiPrijezdYmd);
    if (n >= 1) return vypln(t(klubPozdravZaNDni, lang), { n: String(n) });
  }
  if (opts.posledniOdjezdYmd) {
    const po = dnyMezi(opts.posledniOdjezdYmd, dnes);
    if (po >= 0 && po <= 7) {
      return jmeno
        ? vypln(t(klubPozdravDo7Dni, lang), { jmeno })
        : t(klubPozdravDo7DniBez, lang);
    }
    if (po > 7) {
      return jmeno
        ? vypln(t(klubPozdravPozdeji, lang), { jmeno })
        : t(klubPozdravPozdejiBez, lang);
    }
  }
  return null;
}

export function zpravaWaPoslatKartu(
  lang: GuideLang,
  opts: { krestniJmeno: string; odkaz: string; booking: boolean },
): string {
  const jmeno =
    osloveniProPozdrav(lang, opts.krestniJmeno) ||
    (opts.krestniJmeno || '').trim() ||
    '…';
  const sablona = opts.booking ? klubWaKartaBooking : klubWaKartaPrima;
  return vypln(t(sablona, lang), { jmeno, odkaz: opts.odkaz });
}
