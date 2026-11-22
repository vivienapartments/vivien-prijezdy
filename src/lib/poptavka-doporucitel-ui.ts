import type { GuideLang } from './types';

export type DoporucitelUiTexty = {
  poptavkaVeta: string;
  poptavkaSleva: string;
  poptavkaNapoveda: string;
  zpravaDoporuceni: string;
  vyberteJazyk: string;
  nazevJazyka: string;
};

const MAPA: Record<GuideLang, DoporucitelUiTexty> = {
  cs: {
    poptavkaVeta: 'Pět originálních apartmánů, každý s vlastní atmosférou. Vyberete si ten svůj.',
    poptavkaSleva: 'Na první pobyt u nás máte slevu 5 %.',
    poptavkaNapoveda: 'Vyberte termín a cenu uvidíte hned.',
    zpravaDoporuceni: '(doporučení, sleva 5 %)',
    vyberteJazyk: 'Vyberte jazyk',
    nazevJazyka: 'Čeština',
  },
  en: {
    poptavkaVeta: 'Five original apartments, each with its own atmosphere. Choose the one for you.',
    poptavkaSleva: 'You get 5% off your first stay with us.',
    poptavkaNapoveda: 'Choose your dates and you will see the price right away.',
    zpravaDoporuceni: '(referral, 5% off)',
    vyberteJazyk: 'Choose your language',
    nazevJazyka: 'English',
  },
  de: {
    poptavkaVeta: 'Fünf originelle Apartments, jedes mit eigener Atmosphäre. Wählen Sie Ihres.',
    poptavkaSleva: 'Für Ihren ersten Aufenthalt bei uns erhalten Sie 5 % Rabatt.',
    poptavkaNapoveda: 'Wählen Sie den Termin, und Sie sehen den Preis sofort.',
    zpravaDoporuceni: '(Empfehlung, 5 % Rabatt)',
    vyberteJazyk: 'Sprache wählen',
    nazevJazyka: 'Deutsch',
  },
  pl: {
    poptavkaVeta: 'Pięć oryginalnych apartamentów, każdy z własną atmosferą. Wybierzcie swój.',
    poptavkaSleva: 'Na pierwszy pobyt u nas macie zniżkę 5 %.',
    poptavkaNapoveda: 'Wybierzcie termin, a cenę zobaczycie od razu.',
    zpravaDoporuceni: '(polecenie, zniżka 5 %)',
    vyberteJazyk: 'Wybierzcie język',
    nazevJazyka: 'Polski',
  },
  uk: {
    poptavkaVeta: "П'ять оригінальних апартаментів, кожен зі своєю атмосферою. Оберіть свої.",
    poptavkaSleva: 'На перше перебування у нас маєте знижку 5 %.',
    poptavkaNapoveda: 'Оберіть дати, і ціну побачите одразу.',
    zpravaDoporuceni: '(рекомендація, знижка 5 %)',
    vyberteJazyk: 'Оберіть мову',
    nazevJazyka: 'Українська',
  },
  'zh-Hant': {
    poptavkaVeta: '五間獨特的公寓，各有自己的氛圍。選一間屬於您的。',
    poptavkaSleva: '首次入住可享 5% 折扣。',
    poptavkaNapoveda: '選擇日期後，即可立即看到價格。',
    zpravaDoporuceni: '（推薦，5% 折扣）',
    vyberteJazyk: '請選擇語言',
    nazevJazyka: '中文（繁體）',
  },
  es: {
    poptavkaVeta: 'Cinco apartamentos originales, cada uno con su propio ambiente. Elijan el suyo.',
    poptavkaSleva: 'En su primera estancia tienen un 5 % de descuento.',
    poptavkaNapoveda: 'Elijan las fechas y verán el precio al instante.',
    zpravaDoporuceni: '(recomendación, 5 % de descuento)',
    vyberteJazyk: 'Elijan el idioma',
    nazevJazyka: 'Español',
  },
  fr: {
    poptavkaVeta: 'Cinq appartements originaux, chacun avec sa propre atmosphère. Choisissez le vôtre.',
    poptavkaSleva: 'Pour votre premier séjour chez nous, vous avez 5 % de réduction.',
    poptavkaNapoveda: 'Choisissez vos dates et vous verrez le prix tout de suite.',
    zpravaDoporuceni: '(recommandation, 5 % de réduction)',
    vyberteJazyk: 'Choisissez la langue',
    nazevJazyka: 'Français',
  },
  it: {
    poptavkaVeta: 'Cinque appartamenti originali, ognuno con la sua atmosfera. Scegliete il vostro.',
    poptavkaSleva: 'Per il primo soggiorno da noi avete lo sconto del 5 %.',
    poptavkaNapoveda: 'Scegliete le date e vedrete subito il prezzo.',
    zpravaDoporuceni: '(raccomandazione, sconto 5 %)',
    vyberteJazyk: 'Scegliete la lingua',
    nazevJazyka: 'Italiano',
  },
  pt: {
    poptavkaVeta: 'Cinco apartamentos originais, cada um com a sua própria atmosfera. Escolham o vosso.',
    poptavkaSleva: 'Na primeira estadia connosco têm 5 % de desconto.',
    poptavkaNapoveda: 'Escolham as datas e verão o preço de imediato.',
    zpravaDoporuceni: '(recomendação, 5 % de desconto)',
    vyberteJazyk: 'Escolham o idioma',
    nazevJazyka: 'Português',
  },
  sv: {
    poptavkaVeta: 'Fem originella lägenheter, var och en med sin egen atmosfär. Välj er favorit.',
    poptavkaSleva: 'På första vistelsen hos oss får ni 5 % rabatt.',
    poptavkaNapoveda: 'Välj datum så ser ni priset direkt.',
    zpravaDoporuceni: '(rekommendation, 5 % rabatt)',
    vyberteJazyk: 'Välj språk',
    nazevJazyka: 'Svenska',
  },
  hu: {
    poptavkaVeta: 'Öt egyedi apartman, mindegyik saját hangulattal. Válasszák ki a sajátjukat.',
    poptavkaSleva: 'Az első tartózkodásra nálunk 5 % kedvezmény jár.',
    poptavkaNapoveda: 'Válasszanak időpontot, és az árat azonnal látják.',
    zpravaDoporuceni: '(ajánlás, 5 % kedvezmény)',
    vyberteJazyk: 'Válasszanak nyelvet',
    nazevJazyka: 'Magyar',
  },
  da: {
    poptavkaVeta: 'Fem originale lejligheder, hver med sin egen stemning. Vælg jeres egen.',
    poptavkaSleva: 'På jeres første ophold hos os får I 5 % rabat.',
    poptavkaNapoveda: 'Vælg datoer, så ser I prisen med det samme.',
    zpravaDoporuceni: '(anbefaling, 5 % rabat)',
    vyberteJazyk: 'Vælg sprog',
    nazevJazyka: 'Dansk',
  },
};

const VLAJKY: Record<GuideLang, string> = {
  cs: '🇨🇿',
  en: '🇬🇧',
  de: '🇩🇪',
  pl: '🇵🇱',
  uk: '🇺🇦',
  'zh-Hant': '🇹🇼',
  es: '🇪🇸',
  fr: '🇫🇷',
  it: '🇮🇹',
  pt: '🇵🇹',
  sv: '🇸🇪',
  hu: '🇭🇺',
  da: '🇩🇰',
};

export const POPTAVKA_JAZYKY: GuideLang[] = [
  'cs',
  'en',
  'de',
  'pl',
  'uk',
  'zh-Hant',
  'es',
  'fr',
  'it',
  'pt',
  'sv',
  'hu',
  'da',
];

export function doporucitelUiTexty(lang: GuideLang): DoporucitelUiTexty {
  return MAPA[lang] || MAPA.en;
}

export function vlajkaJazyka(lang: GuideLang): string {
  return VLAJKY[lang] || '🌐';
}

export function klicJazykDoporuceni(kod: string): string {
  return `vivien-poptavka-jazyk-od:${kod || 'x'}`;
}
