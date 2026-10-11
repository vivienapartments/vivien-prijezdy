import type { GuideLang } from './types';

/**
 * Zpráva, kterou majitel pošle hostovi, když průvodce neotevřel.
 * Čeština je schválená 11. 10. 2026. Ostatní jazyky čekají na souhlas.
 * Odkaz na průvodce se přidá na vlastní řádek.
 */
const ZPRAVA: Record<'cs' | 'en' | 'de' | 'pl' | 'uk' | 'zh-Hant', string> = {
  cs: 'Dobrý den, posíláme průvodce k vašemu příjezdu. Napište nám prosím čas příjezdu, ať na nás nemusíte čekat.',
  en: "Hello, we are sending the guide for your arrival. Please tell us what time you will arrive, so you don't have to wait for us.",
  de: 'Guten Tag, wir schicken Ihnen den Wegweiser zu Ihrer Anreise. Schreiben Sie uns bitte, wann Sie ankommen, damit Sie nicht auf uns warten müssen.',
  pl: 'Dzień dobry, przesyłamy przewodnik do przyjazdu. Napiszcie proszę, o której przyjedziecie, żebyście na nas nie czekali.',
  uk: 'Добрий день, надсилаємо путівник до вашого приїзду. Напишіть, будь ласка, о котрій приїдете, щоб вам не довелося на нас чекати.',
  'zh-Hant': '您好，寄上您的入住指南。請告訴我們抵達時間，這樣就不用等我們。',
};

export function textZpravy(lang: GuideLang | null): string {
  if (lang && lang in ZPRAVA) return ZPRAVA[lang as keyof typeof ZPRAVA];
  return ZPRAVA.en;
}

/**
 * Zpráva, když host ještě nevyplnil online check-in.
 * Čeština je schválená 11. 10. 2026. Ostatní jazyky čekají na souhlas.
 * Odkaz na check-in, když ho e-mail má, se přidá na vlastní řádek.
 */
const CHECKIN: Record<'cs' | 'en' | 'de' | 'pl' | 'uk' | 'zh-Hant', string> = {
  cs: 'Dobrý den, děkujeme za rezervaci. Prosím vyplňte si online check-in, hned potom vám pošleme průvodce se vstupem a parkováním.',
  en: 'Hello, thank you for your reservation. Please fill in the online check-in. Right after that we will send you the guide with the entrance and parking.',
  de: 'Guten Tag, danke für Ihre Reservierung. Bitte füllen Sie den Online-Check-in aus. Gleich danach schicken wir Ihnen den Wegweiser mit dem Eingang und dem Parken.',
  pl: 'Dzień dobry, dziękujemy za rezerwację. Prosimy o wypełnienie online check-inu. Zaraz potem wyślemy przewodnik z wejściem i parkowaniem.',
  uk: 'Добрий день, дякуємо за бронювання. Будь ласка, заповніть онлайн-реєстрацію. Одразу після цього надішлемо путівник із входом і паркуванням.',
  'zh-Hant': '您好，謝謝您的預訂。請先填寫線上入住登記。填完後我們會寄上指南，裡面有入口和停車。',
};

export function textCheckinu(lang: GuideLang | null): string {
  if (lang && lang in CHECKIN) return CHECKIN[lang as keyof typeof CHECKIN];
  return CHECKIN.en;
}

export function zpravaCheckinu(lang: GuideLang | null, odkaz: string | null): string {
  const text = textCheckinu(lang);
  return odkaz ? `${text}\n${odkaz}` : text;
}

/**
 * Jedna zpráva podle stavu. Pořadí je bez check-inu, pak neotevřený průvodce.
 * Texty „nenapsal čas“ a „den příjezdu“ ještě nejsou schválené, proto se nenabízejí.
 */
export function zpravaPodleStavu(
  stav: string,
  lang: GuideLang | null,
  checkinUrl: string | null,
  pruvodce: string | null,
): string {
  if (stav === 'bez_checkinu') return zpravaCheckinu(lang, checkinUrl);
  return zpravaHostovi(lang, pruvodce);
}

export function zpravaHostovi(lang: GuideLang | null, odkaz: string | null): string {
  const text = textZpravy(lang);
  return odkaz ? `${text}\n${odkaz}` : text;
}

export function odkazWhatsApp(wa: string, zprava: string): string {
  return `https://wa.me/${wa}?text=${encodeURIComponent(zprava)}`;
}
