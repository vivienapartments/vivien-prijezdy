import type { GuideLang } from './types';

type JazykZpravy = 'cs' | 'en' | 'de' | 'pl' | 'uk' | 'zh-Hant';

function textVJazyce(tabulka: Record<JazykZpravy, string>, lang: GuideLang | null): string {
  if (lang && lang in tabulka) return tabulka[lang as JazykZpravy];
  return tabulka.en;
}

function sOdkazem(text: string, odkaz: string | null): string {
  return odkaz ? `${text}\n${odkaz}` : text;
}

/**
 * Zpráva, když průvodce neotevřel.
 * Čeština je schválená 11. 10. 2026. Ostatní jazyky čekají na souhlas.
 * Odkaz na průvodce se přidá na vlastní řádek.
 */
const NEOTEVREL: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, posíláme průvodce k vašemu příjezdu. Napište nám prosím čas příjezdu, ať na nás nemusíte čekat.',
  en: "Hello, we are sending the guide for your arrival. Please tell us what time you will arrive, so you don't have to wait for us.",
  de: 'Guten Tag, wir schicken Ihnen den Leitfaden zu Ihrer Anreise. Schreiben Sie uns bitte, wann Sie ankommen, damit Sie nicht auf uns warten müssen.',
  pl: 'Dzień dobry, przesyłamy przewodnik do przyjazdu. Napiszcie proszę, o której przyjedziecie, żebyście na nas nie czekali.',
  uk: 'Добрий день, надсилаємо путівник до вашого приїзду. Напишіть, будь ласка, о котрій приїдете, щоб вам не довелося на нас чекати.',
  'zh-Hant': '您好，寄上您的入住指南。請告訴我們抵達時間，這樣就不用等我們。',
};

/**
 * Zpráva, když host ještě nevyplnil online check-in.
 * Všechny jazyky schválené 11. 10. 2026. Angličtina má po „check-in“ tečku.
 * Odkaz, který majitel vloží, se přidá na vlastní řádek.
 */
const CHECKIN: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, děkujeme za rezervaci. Prosím vyplňte si online check-in, odkaz najdete v e-mailu s potvrzením rezervace. Hned potom vám pošleme průvodce se vstupem a parkováním.',
  en: 'Hello, thank you for your booking. Please complete the online check-in. You will find the link in your booking confirmation email. Right after that we will send you the guide with all the information about entry and parking.',
  de: 'Guten Tag, vielen Dank für Ihre Buchung. Bitte füllen Sie den Online-Check-in aus, den Link finden Sie in Ihrer Buchungsbestätigung. Gleich danach senden wir Ihnen den Leitfaden mit allen Infos zu Eingang und Parken.',
  pl: 'Dzień dobry, dziękujemy za rezerwację. Prosimy o wypełnienie online check-inu, link jest w e-mailu z potwierdzeniem rezerwacji. Zaraz potem wyślemy przewodnik ze wszystkimi informacjami o wejściu i parkowaniu.',
  uk: 'Добрий день, дякуємо за бронювання. Будь ласка, заповніть онлайн-реєстрацію, посилання є в листі з підтвердженням бронювання. Одразу після цього надішлемо путівник з усією інформацією про вхід і паркування.',
  'zh-Hant': '您好，謝謝您的預訂。請先完成線上入住登記，連結在預訂確認信裡。完成後我們會寄上指南，裡面有入口和停車的全部說明。',
};

/** Nenapsal čas. Všechny jazyky schválené 11. 10. 2026. */
const CAS: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, děkujeme. Napište nám prosím ještě, v kolik zhruba dorazíte, ať na nás nemusíte čekat.',
  en: "Hello, thank you. Please also tell us roughly what time you will arrive, so you don't have to wait for us.",
  de: 'Guten Tag, vielen Dank. Schreiben Sie uns bitte noch, um wie viel Uhr Sie ungefähr ankommen, damit Sie nicht auf uns warten müssen.',
  pl: 'Dzień dobry, dziękujemy. Napiszcie proszę jeszcze, o której mniej więcej przyjedziecie, żebyście na nas nie czekali.',
  uk: 'Добрий день, дякуємо. Напишіть, будь ласка, ще приблизно о котрій приїдете, щоб вам не довелося на нас чекати.',
  'zh-Hant': '您好，謝謝。請再告訴我們大約幾點到，這樣就不用等我們。',
};

/** Den příjezdu. Všechny jazyky schválené 11. 10. 2026. Odkaz na průvodce je na dalším řádku. */
const DEN: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, dnes se na vás těšíme. Napište nám prosím asi 15 minut před příjezdem, ať jsme na místě. Průvodce s parkováním máte tady',
  en: 'Hello, we are looking forward to seeing you today. Please message us about 15 minutes before you arrive, so we can be there to meet you. Your guide with parking directions is here',
  de: 'Guten Tag, wir freuen uns heute auf Sie. Schreiben Sie uns bitte etwa 15 Minuten vor der Ankunft, damit wir vor Ort sind. Ihren Leitfaden mit allen Infos zum Parken finden Sie hier',
  pl: 'Dzień dobry, cieszymy się, że dziś przyjedziecie. Napiszcie proszę około 15 minut przed przyjazdem, żebyśmy byli na miejscu. Przewodnik z parkowaniem jest tutaj',
  uk: 'Добрий день, сьогодні на вас чекаємо. Напишіть, будь ласка, приблизно за 15 хвилин до приїзду, щоб ми були на місці. Путівник з паркуванням ось тут',
  'zh-Hant': '您好，今天期待您的到來。請在抵達前大約 15 分鐘傳訊息給我們，我們才會在現場。停車指南在這裡',
};

export type DruhZpravy = 'checkin' | 'neotevrel' | 'cas' | 'den';

export type ZpravaMenu = { id: DruhZpravy; nazev: string; text: string };

const PORADI: DruhZpravy[] = ['checkin', 'neotevrel', 'cas', 'den'];

const NAZEV: Record<DruhZpravy, string> = {
  checkin: 'Vyplňte check-in',
  neotevrel: 'Neotevřel průvodce',
  cas: 'Nenapsal čas',
  den: 'Den příjezdu',
};

export function textZpravy(lang: GuideLang | null): string {
  return textVJazyce(NEOTEVREL, lang);
}

export function textCheckinu(lang: GuideLang | null): string {
  return textVJazyce(CHECKIN, lang);
}

export function textCasu(lang: GuideLang | null): string {
  return textVJazyce(CAS, lang);
}

export function textDne(lang: GuideLang | null): string {
  return textVJazyce(DEN, lang);
}

export function zpravaCheckinu(lang: GuideLang | null, odkaz: string | null): string {
  return sOdkazem(textCheckinu(lang), odkaz);
}

export function zpravaHostovi(lang: GuideLang | null, odkaz: string | null): string {
  return sOdkazem(textZpravy(lang), odkaz);
}

export function zpravaCasu(lang: GuideLang | null): string {
  return textCasu(lang);
}

export function zpravaDne(lang: GuideLang | null, odkaz: string | null): string {
  return sOdkazem(textDne(lang), odkaz);
}

/** Která zpráva sedí na stav hosta. Ta je v menu nahoře. */
export function hlavniZprava(opts: {
  stav: string;
  otevrenoPocet: number | null;
  casPrijezdu: string | null;
  prijezd: string | null;
  dnes: string;
}): DruhZpravy {
  if (opts.stav === 'bez_checkinu') return 'checkin';
  if (opts.otevrenoPocet === 0) return 'neotevrel';
  if (!opts.casPrijezdu) return 'cas';
  if (opts.prijezd && opts.prijezd === opts.dnes) return 'den';
  return 'neotevrel';
}

export function zpravyMenu(opts: {
  stav: string;
  lang: GuideLang | null;
  checkinUrl: string | null;
  pruvodce: string | null;
  otevrenoPocet: number | null;
  casPrijezdu: string | null;
  prijezd: string | null;
  dnes: string;
}): ZpravaMenu[] {
  const texty: Record<DruhZpravy, string> = {
    checkin: zpravaCheckinu(opts.lang, opts.checkinUrl),
    neotevrel: zpravaHostovi(opts.lang, opts.pruvodce),
    cas: zpravaCasu(opts.lang),
    den: zpravaDne(opts.lang, opts.pruvodce),
  };
  const hlavni = hlavniZprava(opts);
  const poradi = [hlavni, ...PORADI.filter((id) => id !== hlavni)];
  return poradi.map((id) => ({ id, nazev: NAZEV[id], text: texty[id] }));
}

export function odkazWhatsApp(wa: string, zprava: string): string {
  return `https://wa.me/${wa}?text=${encodeURIComponent(zprava)}`;
}
