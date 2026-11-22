import type { GuideLang } from './types';

export type ExpiredVyhodyTexty = {
  vyzva: string;
  radek1Pod: string;
  radek2Pod: string;
  radek3Nadpis: string;
  dalsiVeta: string;
};

const MAPA: Record<GuideLang, ExpiredVyhodyTexty> = {
  cs: {
    vyzva: 'A kdybyste se k nám chtěli vrátit, máme pro vás 3 výhody.',
    radek1Pod: 'Váš dárek: sleva 5 %',
    radek2Pod: 'Příště bez hledání a se slevou 5 %',
    radek3Nadpis: 'Poslat odkaz přátelům',
    dalsiVeta: 'Vaše výhody na další pobyt jsou tady připravené.',
  },
  en: {
    vyzva: 'And if you would like to come back, we have 3 benefits for you.',
    radek1Pod: 'Your gift: 5% off',
    radek2Pod: 'Next time without searching, with 5% off',
    radek3Nadpis: 'Send the link to friends',
    dalsiVeta: 'Your benefits for your next stay are ready here.',
  },
  de: {
    vyzva: 'Und falls Sie wiederkommen möchten, haben wir 3 Vorteile für Sie.',
    radek1Pod: 'Ihr Geschenk: 5 % Rabatt',
    radek2Pod: 'Nächstes Mal ohne Suchen, mit 5 % Rabatt',
    radek3Nadpis: 'Link an Freunde senden',
    dalsiVeta: 'Ihre Vorteile für den nächsten Aufenthalt sind hier für Sie bereit.',
  },
  pl: {
    vyzva: 'A jeśli zechcecie do nas wrócić, mamy dla Was 3 korzyści.',
    radek1Pod: 'Wasz prezent: zniżka 5 %',
    radek2Pod: 'Następnym razem bez szukania i ze zniżką 5 %',
    radek3Nadpis: 'Wyślij link bliskim',
    dalsiVeta: 'Wasze korzyści na kolejny pobyt czekają tutaj.',
  },
  uk: {
    vyzva: 'А якщо захочете повернутися до нас, маємо для вас 3 переваги.',
    radek1Pod: 'Ваш подарунок: знижка 5 %',
    radek2Pod: 'Наступного разу без пошуку та зі знижкою 5 %',
    radek3Nadpis: 'Надіслати посилання друзям',
    dalsiVeta: 'Ваші переваги для наступного перебування вже тут.',
  },
  'zh-Hant': {
    vyzva: '如果您想再次光臨，我們為您準備了 3 項優惠。',
    radek1Pod: '您的禮物：5% 折扣',
    radek2Pod: '下次不用再找，還享 5% 折扣',
    radek3Nadpis: '把連結傳給親友',
    dalsiVeta: '您下次入住的優惠都在這裡。',
  },
  es: {
    vyzva: 'Y si quieren volver con nosotros, tenemos 3 ventajas para ustedes.',
    radek1Pod: 'Su regalo: 5 % de descuento',
    radek2Pod: 'La próxima vez sin buscar y con un 5 % de descuento',
    radek3Nadpis: 'Compartir el enlace',
    dalsiVeta: 'Sus ventajas para la próxima estancia les esperan aquí.',
  },
  fr: {
    vyzva: 'Et si vous souhaitez revenir, nous avons 3 avantages pour vous.',
    radek1Pod: 'Votre cadeau : 5 % de réduction',
    radek2Pod: 'La prochaine fois sans chercher, avec 5 % de réduction',
    radek3Nadpis: 'Envoyer le lien à vos proches',
    dalsiVeta: 'Vos avantages pour votre prochain séjour vous attendent ici.',
  },
  it: {
    vyzva: 'E se vorrete tornare da noi, abbiamo 3 vantaggi per voi.',
    radek1Pod: 'Il vostro regalo: sconto del 5 %',
    radek2Pod: 'La prossima volta senza cercare, con il 5 % di sconto',
    radek3Nadpis: 'Inviare il link alle persone care',
    dalsiVeta: 'I vostri vantaggi per il prossimo soggiorno sono qui.',
  },
  pt: {
    vyzva: 'E se quiserem voltar, temos 3 vantagens para vocês.',
    radek1Pod: 'O vosso presente: 5 % de desconto',
    radek2Pod: 'Da próxima vez sem procurar e com 5 % de desconto',
    radek3Nadpis: 'Enviar a ligação a pessoas próximas',
    dalsiVeta: 'As vossas vantagens para a próxima estadia estão aqui.',
  },
  sv: {
    vyzva: 'Och om ni vill komma tillbaka har vi 3 förmåner till er.',
    radek1Pod: 'Er present: 5 % rabatt',
    radek2Pod: 'Nästa gång utan att leta, med 5 % rabatt',
    radek3Nadpis: 'Skicka länken till vänner',
    dalsiVeta: 'Era förmåner för nästa vistelse finns här.',
  },
  hu: {
    vyzva: 'Ha szeretnének visszatérni hozzánk, 3 előnnyel várjuk Önöket.',
    radek1Pod: 'Ajándékuk: 5 % kedvezmény',
    radek2Pod: 'Legközelebb keresgélés nélkül, 5 % kedvezménnyel',
    radek3Nadpis: 'Link küldése ismerősöknek',
    dalsiVeta: 'A következő tartózkodáshoz tartozó előnyeik itt várják Önöket.',
  },
  da: {
    vyzva: 'Og hvis I vil komme igen, har vi 3 fordele til jer.',
    radek1Pod: 'Jeres gave: 5 % rabat',
    radek2Pod: 'Næste gang uden at lede, med 5 % rabat',
    radek3Nadpis: 'Send linket til venner',
    dalsiVeta: 'Jeres fordele til næste ophold er klar her.',
  },
};

export function expiredVyhodyTexty(lang: GuideLang): ExpiredVyhodyTexty {
  return MAPA[lang] || MAPA.en;
}

/** Zvýrazní „5 %“ / „5%“ zlatě v podtitulu řádku 1. */
export function zlatSlevaVTextu(text: string): { pred: string; sleva: string; po: string } | null {
  const m = text.match(/(sleva\s+5\s*%|5\s*%\s*off|5\s*%\s*Rabatt|zniżka\s+5\s*%|знижка\s+5\s*%|5%\s*折扣|5\s*%\s*de\s+descuento|5\s*%\s*de\s+réduction|sconto\s+del\s+5\s*%|5\s*%\s*de\s+desconto|5\s*%\s*rabatt|5\s*%\s*kedvezmény|5\s*%\s*rabat)/i);
  if (!m || m.index == null) return null;
  return {
    pred: text.slice(0, m.index),
    sleva: m[0],
    po: text.slice(m.index + m[0].length),
  };
}

/** Zvýrazní „3 výhody“ (a obdobu) zlatě ve výzvě. */
export function zlatTriVyhodyVTextu(text: string): { pred: string; vyhody: string; po: string } | null {
  const m = text.match(
    /(3\s+výhody|3\s+benefits|3\s+Vorteile|3\s+korzyści|3\s+переваги|3\s+項優惠|3\s+ventajas|3\s+avantages|3\s+vantaggi|3\s+vantagens|3\s+förmåner|3\s+előnnyel|3\s+fordele)/i,
  );
  if (!m || m.index == null) return null;
  return {
    pred: text.slice(0, m.index),
    vyhody: m[0],
    po: text.slice(m.index + m[0].length),
  };
}
