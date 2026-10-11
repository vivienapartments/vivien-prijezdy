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

export function zpravaHostovi(lang: GuideLang | null, odkaz: string | null): string {
  const text = textZpravy(lang);
  return odkaz ? `${text}\n${odkaz}` : text;
}

export function odkazWhatsApp(wa: string, zprava: string): string {
  return `https://wa.me/${wa}?text=${encodeURIComponent(zprava)}`;
}
