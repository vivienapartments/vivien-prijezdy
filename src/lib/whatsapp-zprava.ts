import type { GuideLang } from './types';

type JazykZpravy = 'cs' | 'en' | 'de' | 'pl' | 'uk' | 'zh-Hant' | 'sv' | 'hu';
type ZdrojZpravy = 'booking' | 'airbnb' | 'prima' | 'jiny';

function textVJazyce(tabulka: Record<JazykZpravy, string>, lang: GuideLang | null): string {
  if (lang && lang in tabulka) return tabulka[lang as JazykZpravy];
  return tabulka.en;
}

/** Podpis pod každou zprávou. Čeština, angličtina a němčina jsou dané. */
const PODPIS: Record<JazykZpravy, string> = {
  cs: 'Nikol a rodina VIVIEN',
  en: 'Nikol and the VIVIEN family',
  de: 'Nikol und Familie VIVIEN',
  pl: 'Nikol i rodzina VIVIEN',
  uk: 'Nikol і родина VIVIEN',
  'zh-Hant': 'Nikol 與 VIVIEN 家人',
  sv: 'Nikol och familjen VIVIEN',
  hu: "Nikol és a VIVIEN család",
};

/**
 * Text, pak prázdný řádek, případně odkaz, pak prázdný řádek a podpis.
 * Odkaz z políčka na check-in se sem nedává.
 */
function sestav(text: string, odkaz: string | null, lang: GuideLang | null): string {
  const dily = [text.trim()];
  if (odkaz) dily.push(odkaz);
  dily.push(textVJazyce(PODPIS, lang));
  return dily.join('\n\n');
}

/** Booking, Airbnb, přímá, jinak záložní věta. */
export function druhZdroje(raw: string | null | undefined): ZdrojZpravy {
  const s = (raw || '').trim();
  if (!s) return 'jiny';
  const n = s.toLowerCase();
  if (n.includes('airbnb')) return 'airbnb';
  if (n.includes('booking')) return 'booking';
  if (n.includes('prim') || n.includes('přím') || n.includes('direct') || n === 'web' || n.includes('vivien')) {
    return 'prima';
  }
  return 'jiny';
}

const CHECKIN_UVOD: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, ještě nemáte vyplněný online check-in. Bez něj vám nemůžeme poslat průvodce k příjezdu, a bez průvodce se u nás neubytujete ani nezaparkujete.',
  en: 'Hello, you have not completed the online check-in yet. Without it we cannot send you the arrival guide, and without the guide you cannot stay with us or park.',
  de: 'Guten Tag, Ihr Online-Check-in ist noch nicht ausgefüllt. Ohne ihn können wir Ihnen den Leitfaden zur Anreise nicht schicken, und ohne den Leitfaden können Sie bei uns weder übernachten noch parken.',
  pl: 'Dzień dobry, nie macie jeszcze wypełnionego online check-inu. Bez niego nie możemy wysłać przewodnika do przyjazdu, a bez przewodnika nie zakwaterujecie się u nas ani nie zaparkujecie.',
  uk: 'Добрий день, ви ще не заповнили онлайн-реєстрацію. Без неї ми не можемо надіслати путівник до приїзду, а без путівника ви не заселитеся і не припаркуєтесь.',
  'zh-Hant': '您好，您還沒有完成線上入住登記。沒有它，我們無法寄上抵達指南，沒有指南就無法入住，也無法停車。',
  sv: 'Hej, ni har inte fyllt i online-incheckningen ännu. Utan den kan vi inte skicka ankomstguiden, och utan guiden kan ni varken bo hos oss eller parkera.',
  hu: "Jó napot, az online bejelentkezést még nem töltötték ki. Enélkül nem tudjuk elküldeni az érkezési útmutatót, útmutató nélkül pedig nem tudnak nálunk megszállni és parkolni.",
};

const CHECKIN_KONEC: Record<JazykZpravy, string> = {
  cs: 'Děkujeme a těšíme se na setkání.',
  en: 'Thank you, and we look forward to seeing you.',
  de: 'Vielen Dank, wir freuen uns auf Sie.',
  pl: 'Dziękujemy i do zobaczenia.',
  uk: 'Дякуємо і до зустрічі.',
  'zh-Hant': '謝謝，期待與您見面。',
  sv: 'Tack, vi ser fram emot att träffas.',
  hu: "Köszönjük, várjuk önöket.",
};

const CHECKIN_ODKAZ: Record<ZdrojZpravy, Record<JazykZpravy, string>> = {
  booking: {
    cs: 'Odkaz najdete ve zprávách na Booking.com.',
    en: 'You will find the link in your messages on Booking.com.',
    de: 'Den Link finden Sie in den Nachrichten auf Booking.com.',
    pl: 'Link znajdziecie w wiadomościach na Booking.com.',
    uk: 'Посилання є у повідомленнях на Booking.com.',
    'zh-Hant': '連結在 Booking.com 的訊息裡。',
    sv: 'Länken finns i era meddelanden på Booking.com.',
    hu: "A linket a Booking.com üzenetei között találják.",
  },
  airbnb: {
    cs: 'Odkaz najdete ve zprávách na Airbnb.',
    en: 'You will find the link in your messages on Airbnb.',
    de: 'Den Link finden Sie in den Nachrichten auf Airbnb.',
    pl: 'Link znajdziecie w wiadomościach na Airbnb.',
    uk: 'Посилання є у повідомленнях на Airbnb.',
    'zh-Hant': '連結在 Airbnb 的訊息裡。',
    sv: 'Länken finns i era meddelanden på Airbnb.',
    hu: "A linket az Airbnb üzenetei között találják.",
  },
  prima: {
    cs: 'Odkaz najdete v e-mailu s potvrzením rezervace.',
    en: 'You will find the link in your booking confirmation email.',
    de: 'Den Link finden Sie in der E-Mail mit der Buchungsbestätigung.',
    pl: 'Link znajdziecie w e-mailu z potwierdzeniem rezerwacji.',
    uk: 'Посилання є в листі з підтвердженням бронювання.',
    'zh-Hant': '連結在預訂確認信裡。',
    sv: 'Länken finns i mejlet med bokningsbekräftelsen.',
    hu: "A linket a foglalás visszaigazoló e-mailjében találják.",
  },
  jiny: {
    cs: 'Odkaz najdete ve zprávách od webu, kde jste rezervovali.',
    en: 'You will find the link in the messages from the website where you booked.',
    de: 'Den Link finden Sie in den Nachrichten von der Website, auf der Sie gebucht haben.',
    pl: 'Link znajdziecie w wiadomościach ze strony, na której rezerwowaliście.',
    uk: 'Посилання є у повідомленнях із сайту, де ви бронювали.',
    'zh-Hant': '連結在您預訂的那個網站的訊息裡。',
    sv: 'Länken finns i meddelandena från sidan där ni bokade.',
    hu: "A linket annak az oldalnak az üzenetei között találják, ahol foglaltak.",
  },
};

const ODKAZ_NIZE: Record<JazykZpravy, string> = {
  cs: 'Odkaz posíláme níže.',
  en: 'We are sending the link below.',
  de: 'Den Link senden wir unten.',
  pl: 'Link wysyłamy poniżej.',
  uk: 'Посилання надсилаємо нижче.',
  'zh-Hant': '連結我們放在下面。',
  sv: 'Länken skickar vi nedan.',
  hu: 'A linket alább küldjük.',
};

const NEOTEVREL: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, abyste se u nás mohli ubytovat a zaparkovat, přečtěte si průvodce k příjezdu a pošlete nám podle něj potřebné údaje. Děkujeme a těšíme se na setkání.',
  en: 'Hello, to check in and park with us, you need to read the arrival guide and send us the details it asks for. Thank you, and we look forward to seeing you.',
  de: 'Guten Tag, damit Sie bei uns übernachten und parken können, lesen Sie den Leitfaden zur Anreise und schicken Sie uns die darin genannten Angaben. Vielen Dank, wir freuen uns auf Sie.',
  pl: 'Dzień dobry, żebyście mogli się u nas zakwaterować i zaparkować, przeczytajcie przewodnik do przyjazdu i wyślijcie nam według niego potrzebne dane. Dziękujemy i do zobaczenia.',
  uk: 'Добрий день, щоб ви могли заселитися і припаркуватися, прочитайте путівник до приїзду і надішліть нам потрібні дані з нього. Дякуємо і до зустрічі.',
  'zh-Hant': '您好，要入住和停車，先看抵達指南，並依指南把需要的資料傳給我們。謝謝，期待與您見面。',
  sv: 'Hej, för att kunna checka in och parkera hos oss behöver ni läsa ankomstguiden och skicka oss uppgifterna den ber om. Tack, vi ser fram emot att träffas.',
  hu: "Jó napot, a bejelentkezéshez és a parkoláshoz el kell olvasniuk az érkezési útmutatót, és el kell küldeniük, amit kér. Köszönjük, várjuk önöket.",
};

const CAS: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, napište nám, v kolik zhruba dorazíte. Apartmán předáváme osobně, a bez času příjezdu se nepotkáme. Děkujeme a těšíme se na setkání.',
  en: 'Hello, tell us roughly what time you will arrive. We hand the apartment over in person, and without your arrival time we won\'t be able to meet you. Thank you, and we look forward to seeing you.',
  de: 'Guten Tag, schreiben Sie uns, um wie viel Uhr Sie ungefähr ankommen. Wir übergeben das Apartment persönlich, und ohne Ihre Ankunftszeit können wir uns nicht treffen. Vielen Dank, wir freuen uns auf Sie.',
  pl: 'Dzień dobry, napiszcie nam, o której mniej więcej przyjedziecie. Apartament przekazujemy osobiście, a bez godziny przyjazdu się nie spotkamy. Dziękujemy i do zobaczenia.',
  uk: 'Добрий день, напишіть нам, приблизно о котрій приїдете. Апартаменти передаємо особисто, і без часу приїзду ми не зустрінемося. Дякуємо і до зустрічі.',
  'zh-Hant': '您好，告訴我們大約幾點到。公寓由我們當面交接，沒有抵達時間就見不到面。謝謝，期待與您見面。',
  sv: 'Hej, skriv till oss ungefär vilken tid ni kommer. Lägenheten lämnar vi över personligen, och utan er ankomsttid kan vi inte träffa er. Tack, vi ser fram emot att träffas.',
  hu: "Jó napot, írják meg körülbelül, hánykor érkeznek. Az apartmant személyesen adjuk át, az érkezés ideje nélkül nem tudunk önökkel találkozni. Köszönjük, várjuk önöket.",
};

const DEN_BEZ: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, dnes se na vás těšíme. V kolik zhruba dorazíte? Potřebujeme to vědět, abychom vám mohli apartmán osobně předat.',
  en: 'Hello, we are looking forward to seeing you today. Roughly what time will you arrive? We need to know so that we can hand the apartment over to you in person.',
  de: 'Guten Tag, wir freuen uns heute auf Sie. Um wie viel Uhr kommen Sie ungefähr an? Wir müssen das wissen, damit wir Ihnen das Apartment persönlich übergeben können.',
  pl: 'Dzień dobry, cieszymy się, że dziś przyjedziecie. O której mniej więcej będziecie? Musimy to wiedzieć, żebyśmy mogli przekazać wam apartament osobiście.',
  uk: 'Добрий день, сьогодні на вас чекаємо. Приблизно о котрій приїдете? Нам треба це знати, щоб передати вам апартаменти особисто.',
  'zh-Hant': '您好，今天期待您的到來。大約幾點到？我們需要知道時間，才能當面把公寓交給您。',
  sv: 'Hej, vi ser fram emot att träffa er i dag. Ungefär vilken tid kommer ni? Vi behöver veta det för att kunna lämna över lägenheten personligen.',
  hu: "Jó napot, ma várjuk önöket. Körülbelül hánykor érkeznek? Tudnunk kell, hogy személyesen át tudjuk adni az apartmant.",
};

const DEN_CAS: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, dnes se na vás těšíme. Počítáme s vámi kolem {čas}, platí to? Kdyby se čas změnil, napište nám prosím hned. Asi 15 minut před příjezdem se nám prosím ozvěte, ať jsme na místě.',
  en: 'Hello, we are looking forward to seeing you today. We are expecting you around {čas}. Does that still work? If the time changes, please write to us right away. About 15 minutes before you arrive, please message us so we are there.',
  de: 'Guten Tag, wir freuen uns heute auf Sie. Wir rechnen mit Ihnen gegen {čas}. Passt das? Wenn sich die Zeit ändert, schreiben Sie uns bitte sofort. Etwa 15 Minuten vor der Ankunft melden Sie sich bitte, damit wir vor Ort sind.',
  pl: 'Dzień dobry, cieszymy się, że dziś przyjedziecie. Spodziewamy się Was około {čas}. Zgadza się? Gdyby godzina się zmieniła, napiszcie proszę od razu. Około 15 minut przed przyjazdem odezwijcie się proszę, żebyśmy byli na miejscu.',
  uk: 'Добрий день, сьогодні на вас чекаємо. Розраховуємо на вас близько {čas}. Це ще актуально? Якщо час зміниться, напишіть нам, будь ласка, одразу. Приблизно за 15 хвилин до приїзду напишіть, будь ласка, щоб ми були на місці.',
  'zh-Hant': '您好，今天期待您的到來。我們預計您大約 {čas} 到，這個時間還對嗎？如果時間有變，請立刻傳訊息給我們。抵達前大約 15 分鐘請再傳一次，我們才會在現場。',
  sv: 'Hej, vi ser fram emot att träffa er i dag. Vi räknar med er omkring {čas}. Stämmer det? Om tiden ändras, skriv till oss genast. Ungefär 15 minuter före ankomsten hör ni av er, så att vi är på plats.',
  hu: "Jó napot, ma várjuk önöket. Körülbelül {čas} körül számítunk önökre. Így marad? Ha az időpont változik, írjanak azonnal. Körülbelül 15 perccel az érkezés előtt írjanak, hogy ott legyünk.",
};

export type DruhZpravy = 'checkin' | 'neotevrel' | 'cas' | 'denBez' | 'denCas';

export type ZpravaMenu = { id: DruhZpravy; nazev: string; text: string; vychozi: boolean };

const PORADI: DruhZpravy[] = ['checkin', 'neotevrel', 'cas', 'denBez', 'denCas'];

const NAZEV: Record<DruhZpravy, string> = {
  checkin: 'Vyplňte check-in',
  neotevrel: 'Neotevřel průvodce',
  cas: 'Nenapsal čas',
  denBez: 'Den příjezdu, čas neznáme',
  denCas: 'Den příjezdu, čas známe',
};

function vetaCheckinu(lang: GuideLang | null, zdroj: string | null | undefined, sOdkazem = false): string {
  const druh = druhZdroje(zdroj);
  const uvod = textVJazyce(CHECKIN_UVOD, lang);
  const odkaz = sOdkazem ? textVJazyce(ODKAZ_NIZE, lang) : textVJazyce(CHECKIN_ODKAZ[druh], lang);
  const konec = textVJazyce(CHECKIN_KONEC, lang);
  return `${uvod} ${odkaz} ${konec}`;
}

export function textZpravy(lang: GuideLang | null): string {
  return textVJazyce(NEOTEVREL, lang);
}

export function textCheckinu(lang: GuideLang | null, zdroj?: string | null, sOdkazem = false): string {
  return vetaCheckinu(lang, zdroj, sOdkazem);
}

export function textCasu(lang: GuideLang | null): string {
  return textVJazyce(CAS, lang);
}

export function textDne(lang: GuideLang | null): string {
  return textVJazyce(DEN_BEZ, lang);
}

export function textDneSCasem(lang: GuideLang | null, cas: string | null): string {
  const cisty = cas && /^([01]\d|2[0-3]):[0-5]\d$/.test(cas) ? cas : '';
  return textVJazyce(DEN_CAS, lang).replaceAll('{čas}', cisty);
}

export function zpravaCheckinu(lang: GuideLang | null, zdroj?: string | null, url?: string | null): string {
  const ma = Boolean(url && /^https:\/\//i.test(url));
  return sestav(vetaCheckinu(lang, zdroj, ma), ma ? url!.trim() : null, lang);
}

export function zpravaHostovi(lang: GuideLang | null, odkaz: string | null): string {
  return sestav(textZpravy(lang), odkaz, lang);
}

export function zpravaCasu(lang: GuideLang | null): string {
  return sestav(textCasu(lang), null, lang);
}

export function zpravaDne(lang: GuideLang | null, odkaz: string | null): string {
  return sestav(textDne(lang), odkaz, lang);
}

export function zpravaDneSCasem(lang: GuideLang | null, cas: string | null, odkaz: string | null): string {
  return sestav(textDneSCasem(lang, cas), odkaz, lang);
}

/** Která zpráva sedí na stav hosta. Řádky menu se kvůli tomu neprohazují. */
export function hlavniZprava(opts: {
  stav: string;
  otevrenoPocet: number | null;
  casPrijezdu: string | null;
  prijezd: string | null;
  dnes: string;
}): DruhZpravy {
  if (opts.stav === 'bez_checkinu') return 'checkin';
  if (opts.otevrenoPocet === 0) return 'neotevrel';
  if (opts.prijezd && opts.prijezd === opts.dnes) return opts.casPrijezdu ? 'denCas' : 'denBez';
  if (!opts.casPrijezdu) return 'cas';
  return 'neotevrel';
}

export function zpravyMenu(opts: {
  stav: string;
  lang: GuideLang | null;
  zdroj?: string | null;
  pruvodce: string | null;
  checkinUrl?: string | null;
  otevrenoPocet: number | null;
  casPrijezdu: string | null;
  prijezd: string | null;
  dnes: string;
}): ZpravaMenu[] {
  const texty: Record<DruhZpravy, string> = {
    checkin: zpravaCheckinu(opts.lang, opts.zdroj, opts.checkinUrl),
    neotevrel: zpravaHostovi(opts.lang, opts.pruvodce),
    cas: zpravaCasu(opts.lang),
    denBez: zpravaDne(opts.lang, opts.pruvodce),
    denCas: zpravaDneSCasem(opts.lang, opts.casPrijezdu, opts.pruvodce),
  };
  const hlavni = hlavniZprava(opts);
  return PORADI.map((id) => ({ id, nazev: NAZEV[id], text: texty[id], vychozi: id === hlavni }));
}

export function odkazWhatsApp(wa: string, zprava: string): string {
  return `https://wa.me/${wa}?text=${encodeURIComponent(zprava)}`;
}

/** Android podle User-Agent prohlížeče. iPhone a počítač sem nepatří. */
export function jeAndroid(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}

/**
 * V přehledu na Androidu míří odkaz rovnou na WhatsApp Business.
 * Jinde zůstane wa.me. Text zprávy se nemění, jen se zakóduje do adresy.
 */
export function odkazWhatsAppPrehled(wa: string, zprava: string, userAgent: string): string {
  const web = odkazWhatsApp(wa, zprava);
  if (!jeAndroid(userAgent)) return web;
  const phone = wa.replace(/\D/g, '');
  const text = encodeURIComponent(zprava);
  const fallback = encodeURIComponent(web);
  return `intent://send/?phone=${phone}&text=${text}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url=${fallback};end`;
}
