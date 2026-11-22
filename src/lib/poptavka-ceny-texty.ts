/**
 * Texty při zapnutých cenách v poptávce (PROMPT-FINAL bod 6).
 * Firma se nemění. Vypínač cen (bod 5) je vrátí na staré „pošleme cenu“.
 */
import type { GuideLang } from './types';

/** Úvod kroku 1 u věrného hosta. */
export const UVOD_VERNOST_CENA: Record<GuideLang, string> = {
  cs: 'Vyberte termín a cenu se slíbenou slevou uvidíte hned.',
  en: 'Choose your dates and you will see the price with your promised discount right away.',
  de: 'Wählen Sie den Termin, und Sie sehen den Preis mit dem versprochenen Rabatt sofort.',
  pl: 'Wybierzcie termin, a cenę z obiecaną zniżką zobaczycie od razu.',
  uk: 'Оберіть дати, і ціну з обіцяною знижкою побачите одразу.',
  'zh-Hant': '選擇日期後，即可立即看到含承諾折扣的價格。',
  es: 'Elijan las fechas y verán al instante el precio con el descuento prometido.',
  fr: 'Choisissez vos dates et vous verrez tout de suite le prix avec la réduction promise.',
  it: 'Scegliete le date e vedrete subito il prezzo con lo sconto promesso.',
  pt: 'Escolham as datas e verão de imediato o preço com o desconto prometido.',
  sv: 'Välj datum så ser ni direkt priset med den utlovade rabatten.',
  hu: 'Válasszanak időpontot, és az ígért kedvezménnyel csökkentett árat azonnal látják.',
  da: 'Vælg datoer, så ser I med det samme prisen med den lovede rabat.',
};

/** Děkujeme (všechny druhy kromě firmy). */
export const DEKUJEME_POTVRDIME: Record<GuideLang, string> = {
  cs: 'Termín pro vás blokujeme. Obvykle do hodiny vám ho potvrdíme. Odpovídáme od 8 do 20 hodin.',
  en: 'We are holding the dates for you. We will usually confirm them within an hour. We reply between 8 am and 8 pm.',
  de: 'Wir halten den Termin für Sie frei. In der Regel bestätigen wir ihn innerhalb einer Stunde. Wir antworten von 8 bis 20 Uhr.',
  pl: 'Blokujemy dla Was ten termin. Zwykle potwierdzimy go w ciągu godziny. Odpowiadamy od 8 do 20.',
  uk: 'Ми бронюємо для вас ці дати. Зазвичай підтвердимо їх протягом години. Відповідаємо з 8 до 20 години.',
  'zh-Hant': '我們正在為您保留日期，通常會在一小時內確認。回覆時間為 8:00 至 20:00。',
  es: 'Les reservamos las fechas. Normalmente se las confirmaremos en una hora. Respondemos de 8 a 20 h.',
  fr: 'Nous bloquons ces dates pour vous. Nous vous les confirmerons en général dans l’heure. Nous répondons de 8 h à 20 h.',
  it: 'Blocchiamo le date per voi. Di solito ve le confermiamo entro un’ora. Rispondiamo dalle 8 alle 20.',
  pt: 'Estamos a reservar as datas para vocês. Normalmente confirmamos dentro de uma hora. Respondemos das 8h às 20h.',
  sv: 'Vi håller datumen åt er. Vi bekräftar dem vanligtvis inom en timme. Vi svarar mellan 8 och 20.',
  hu: 'Lefoglaljuk Önöknek az időpontot. Általában egy órán belül visszaigazoljuk. 8 és 20 óra között válaszolunk.',
  da: 'Vi holder datoerne for jer. Vi bekræfter dem normalt inden for en time. Vi svarer mellem kl. 8 og 20.',
};
