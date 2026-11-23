import type { GuideLang } from './types';

/** Kde se ve větě „Cena za pobyt od …“ vloží „od“. */
export type CenaOdPozice = 'pred' | 'za';

export type KalendarTexty = {
  cenaLegenda: string;
  cenaZaPobyt: string;
  /** Slovo „od“ u ceny na kroku Termín (ještě bez zvoleného apartmánu). */
  cenaOd: string;
  /** pred = před částkou, za = hned za částkou (zh-Hant 起, hu -tól). */
  cenaOdPozice: CenaOdPozice;
  cenaSleva: string;
  cenaPoznamka: string;
  zaPobyt: string;
  plno: string;
  obsazeno: string;
  terminPlno: string;
  tedVyberteOdjezd: string;
  terminBezVolneho: string;
  ukazNejblizsi: string;
  veTerminuObsazeno: string;
  kdyJeVolny: string;
  aptObsazenOdeslani: string;
};

const EXTRA = {
  tedVyberteOdjezd: {
    cs: 'Teď vyberte den odjezdu',
    en: 'Now choose your departure day',
    de: 'Wählen Sie jetzt den Abreisetag',
    pl: 'Teraz wybierzcie dzień wyjazdu',
    uk: 'Тепер оберіть день виїзду',
    'zh-Hant': '現在請選擇退房日',
    es: 'Ahora elijan el día de salida',
    fr: 'Choisissez maintenant le jour de départ',
    it: 'Ora scegliete il giorno di partenza',
    pt: 'Agora escolham o dia de partida',
    sv: 'Välj nu avresedagen',
    hu: 'Most válasszák ki a távozás napját',
    da: 'Vælg nu afrejsedagen',
    fi: 'Now choose your departure day',
  },
  terminBezVolneho: {
    cs: 'V tomto termínu nemáme jeden apartmán volný na všechny noci.',
    en: 'For these dates we do not have one apartment free for all nights.',
    de: 'In diesem Zeitraum haben wir kein Apartment für alle Nächte frei.',
    pl: 'W tym terminie nie mamy jednego apartamentu wolnego na wszystkie noce.',
    uk: 'На ці дати немає одного апартаменту вільного на всі ночі.',
    'zh-Hant': '此期間沒有一間公寓能連續空出所有晚數。',
    es: 'En estas fechas no tenemos un apartamento libre para todas las noches.',
    fr: 'Sur ces dates, aucun appartement n’est libre pour toutes les nuits.',
    it: 'In queste date non abbiamo un appartamento libero per tutte le notti.',
    pt: 'Nestas datas não temos um apartamento livre para todas as noites.',
    sv: 'Under dessa datum har vi ingen lägenhet ledig alla nätter.',
    hu: 'Ebben az időszakban nincs olyan apartman, amely az összes éjszakára szabad.',
    da: 'I denne periode har vi ikke én lejlighed ledig alle nætter.',
    fi: 'For these dates we do not have one apartment free for all nights.',
  },
  ukazNejblizsi: {
    cs: 'Ukázat nejbližší volný termín',
    en: 'Show the nearest free dates',
    de: 'Nächsten freien Termin zeigen',
    pl: 'Pokaż najbliższy wolny termin',
    uk: 'Показати найближчі вільні дати',
    'zh-Hant': '顯示最近的空房日期',
    es: 'Mostrar la fecha libre más cercana',
    fr: 'Afficher la prochaine date libre',
    it: 'Mostrare la data libera più vicina',
    pt: 'Mostrar a data livre mais próxima',
    sv: 'Visa närmaste lediga datum',
    hu: 'A legközelebbi szabad időpont mutatása',
    da: 'Vis nærmeste ledige dato',
    fi: 'Show the nearest free dates',
  },
  veTerminuObsazeno: {
    cs: 'Ve vašem termínu obsazeno',
    en: 'Booked for your dates',
    de: 'In Ihrem Zeitraum belegt',
    pl: 'Zajęte w Waszym terminie',
    uk: 'Зайнято у ваші дати',
    'zh-Hant': '您的日期已訂滿',
    es: 'Ocupado en sus fechas',
    fr: 'Complet à vos dates',
    it: 'Occupato nelle vostre date',
    pt: 'Ocupado nas vossas datas',
    sv: 'Upptaget på era datum',
    hu: 'Az önök időpontjában foglalt',
    da: 'Optaget på jeres datoer',
    fi: 'Booked for your dates',
  },
  kdyJeVolny: {
    cs: 'Kdy je volný?',
    en: 'When is it free?',
    de: 'Wann ist es frei?',
    pl: 'Kiedy jest wolne?',
    uk: 'Коли вільний?',
    'zh-Hant': '何時有空？',
    es: '¿Cuándo está libre?',
    fr: 'Quand est-il libre ?',
    it: 'Quando è libero?',
    pt: 'Quando está livre?',
    sv: 'När är den ledig?',
    hu: 'Mikor szabad?',
    da: 'Hvornår er den ledig?',
    fi: 'When is it free?',
  },
  aptObsazenOdeslani: {
    cs: 'Tento apartmán je ve vašem termínu obsazený.',
    en: 'This apartment is booked for your dates.',
    de: 'Dieses Apartment ist in Ihrem Zeitraum belegt.',
    pl: 'Ten apartament jest zajęty w Waszym terminie.',
    uk: 'Ці апартаменти зайняті у ваші дати.',
    'zh-Hant': '這間公寓在您的日期已訂滿。',
    es: 'Este apartamento está ocupado en sus fechas.',
    fr: 'Cet appartement est complet à vos dates.',
    it: 'Questo appartamento è occupato nelle vostre date.',
    pt: 'Este apartamento está ocupado nas vossas datas.',
    sv: 'Denna lägenhet är upptagen på era datum.',
    hu: 'Ez az apartman az önök időpontjában foglalt.',
    da: 'Denne lejlighed er optaget på jeres datoer.',
    fi: 'This apartment is booked for your dates.',
  },
} as const;

function s(lang: GuideLang, key: keyof typeof EXTRA): string {
  return EXTRA[key][lang] || EXTRA[key].en;
}

const MAPA: Record<GuideLang, KalendarTexty> = {
  cs: {
    cenaLegenda: 'Ceny za noc, od nejlevnějšího volného apartmánu',
    cenaZaPobyt: 'Cena za pobyt',
    cenaOd: 'od',
    cenaOdPozice: 'pred',
    cenaSleva: 'se slevou 5 %',
    cenaPoznamka: 'za apartmán · včetně poplatku z pobytu',
    zaPobyt: 'za pobyt',
    plno: 'plno',
    obsazeno: 'obsazeno',
    terminPlno: 'V tomto termínu už máme plno. Zkuste prosím jiný.',
    tedVyberteOdjezd: s('cs', 'tedVyberteOdjezd'),
    terminBezVolneho: s('cs', 'terminBezVolneho'),
    ukazNejblizsi: s('cs', 'ukazNejblizsi'),
    veTerminuObsazeno: s('cs', 'veTerminuObsazeno'),
    kdyJeVolny: s('cs', 'kdyJeVolny'),
    aptObsazenOdeslani: s('cs', 'aptObsazenOdeslani'),
  },
  en: {
    cenaLegenda: 'Prices per night, from the lowest-priced available apartment',
    cenaZaPobyt: 'Price for your stay',
    cenaOd: 'from',
    cenaOdPozice: 'pred',
    cenaSleva: 'with 5% off',
    cenaPoznamka: 'per apartment · tourist tax included',
    zaPobyt: 'for your stay',
    plno: 'full',
    obsazeno: 'booked',
    terminPlno: 'We are fully booked on these dates. Please try other dates.',
    tedVyberteOdjezd: s('en', 'tedVyberteOdjezd'),
    terminBezVolneho: s('en', 'terminBezVolneho'),
    ukazNejblizsi: s('en', 'ukazNejblizsi'),
    veTerminuObsazeno: s('en', 'veTerminuObsazeno'),
    kdyJeVolny: s('en', 'kdyJeVolny'),
    aptObsazenOdeslani: s('en', 'aptObsazenOdeslani'),
  },
  de: {
    cenaLegenda: 'Preise pro Nacht, ab dem günstigsten freien Apartment',
    cenaZaPobyt: 'Preis für den Aufenthalt',
    cenaOd: 'ab',
    cenaOdPozice: 'pred',
    cenaSleva: 'mit 5 % Rabatt',
    cenaPoznamka: 'pro Apartment · inkl. Kurtaxe',
    zaPobyt: 'für den Aufenthalt',
    plno: 'belegt',
    obsazeno: 'belegt',
    terminPlno: 'In diesem Zeitraum sind wir ausgebucht. Bitte wählen Sie einen anderen Termin.',
    tedVyberteOdjezd: s('de', 'tedVyberteOdjezd'),
    terminBezVolneho: s('de', 'terminBezVolneho'),
    ukazNejblizsi: s('de', 'ukazNejblizsi'),
    veTerminuObsazeno: s('de', 'veTerminuObsazeno'),
    kdyJeVolny: s('de', 'kdyJeVolny'),
    aptObsazenOdeslani: s('de', 'aptObsazenOdeslani'),
  },
  pl: {
    cenaLegenda: 'Ceny za noc, od najtańszego wolnego apartamentu',
    cenaZaPobyt: 'Cena za pobyt',
    cenaOd: 'od',
    cenaOdPozice: 'pred',
    cenaSleva: 'ze zniżką 5 %',
    cenaPoznamka: 'za apartament · z opłatą miejscową',
    zaPobyt: 'za pobyt',
    plno: 'brak',
    obsazeno: 'zajęte',
    terminPlno: 'W tym terminie nie mamy już wolnych miejsc. Wybierzcie proszę inny.',
    tedVyberteOdjezd: s('pl', 'tedVyberteOdjezd'),
    terminBezVolneho: s('pl', 'terminBezVolneho'),
    ukazNejblizsi: s('pl', 'ukazNejblizsi'),
    veTerminuObsazeno: s('pl', 'veTerminuObsazeno'),
    kdyJeVolny: s('pl', 'kdyJeVolny'),
    aptObsazenOdeslani: s('pl', 'aptObsazenOdeslani'),
  },
  uk: {
    cenaLegenda: 'Ціни за ніч, від найдешевших вільних апартаментів',
    cenaZaPobyt: 'Ціна за перебування',
    cenaOd: 'від',
    cenaOdPozice: 'pred',
    cenaSleva: 'зі знижкою 5 %',
    cenaPoznamka: 'за апартаменти · туристичний збір включено',
    zaPobyt: 'за перебування',
    plno: 'зайнято',
    obsazeno: 'зайнято',
    terminPlno: 'На ці дати вільних місць уже немає. Оберіть, будь ласка, інші.',
    tedVyberteOdjezd: s('uk', 'tedVyberteOdjezd'),
    terminBezVolneho: s('uk', 'terminBezVolneho'),
    ukazNejblizsi: s('uk', 'ukazNejblizsi'),
    veTerminuObsazeno: s('uk', 'veTerminuObsazeno'),
    kdyJeVolny: s('uk', 'kdyJeVolny'),
    aptObsazenOdeslani: s('uk', 'aptObsazenOdeslani'),
  },
  'zh-Hant': {
    cenaLegenda: '每晚價格，以最便宜的空房公寓計',
    cenaZaPobyt: '住宿總價',
    cenaOd: '起',
    cenaOdPozice: 'za',
    cenaSleva: '已含 5% 折扣',
    cenaPoznamka: '以整間公寓計價 · 含住宿稅',
    zaPobyt: '總價',
    plno: '客滿',
    obsazeno: '已訂滿',
    terminPlno: '此期間已客滿，請選擇其他日期。',
    tedVyberteOdjezd: s('zh-Hant', 'tedVyberteOdjezd'),
    terminBezVolneho: s('zh-Hant', 'terminBezVolneho'),
    ukazNejblizsi: s('zh-Hant', 'ukazNejblizsi'),
    veTerminuObsazeno: s('zh-Hant', 'veTerminuObsazeno'),
    kdyJeVolny: s('zh-Hant', 'kdyJeVolny'),
    aptObsazenOdeslani: s('zh-Hant', 'aptObsazenOdeslani'),
  },
  es: {
    cenaLegenda: 'Precios por noche, desde el apartamento libre más económico',
    cenaZaPobyt: 'Precio de la estancia',
    cenaOd: 'desde',
    cenaOdPozice: 'pred',
    cenaSleva: 'con 5 % de descuento',
    cenaPoznamka: 'por apartamento · tasa turística incluida',
    zaPobyt: 'por la estancia',
    plno: 'completo',
    obsazeno: 'ocupado',
    terminPlno: 'En estas fechas ya no tenemos disponibilidad. Elijan otras, por favor.',
    tedVyberteOdjezd: s('es', 'tedVyberteOdjezd'),
    terminBezVolneho: s('es', 'terminBezVolneho'),
    ukazNejblizsi: s('es', 'ukazNejblizsi'),
    veTerminuObsazeno: s('es', 'veTerminuObsazeno'),
    kdyJeVolny: s('es', 'kdyJeVolny'),
    aptObsazenOdeslani: s('es', 'aptObsazenOdeslani'),
  },
  fr: {
    cenaLegenda: 'Prix par nuit, à partir de l’appartement libre le moins cher',
    cenaZaPobyt: 'Prix du séjour',
    cenaOd: 'à partir de',
    cenaOdPozice: 'pred',
    cenaSleva: 'avec 5 % de réduction',
    cenaPoznamka: 'par appartement · taxe de séjour incluse',
    zaPobyt: 'pour le séjour',
    plno: 'complet',
    obsazeno: 'occupé',
    terminPlno: 'Nous sommes complets à ces dates. Merci de choisir d’autres dates.',
    tedVyberteOdjezd: s('fr', 'tedVyberteOdjezd'),
    terminBezVolneho: s('fr', 'terminBezVolneho'),
    ukazNejblizsi: s('fr', 'ukazNejblizsi'),
    veTerminuObsazeno: s('fr', 'veTerminuObsazeno'),
    kdyJeVolny: s('fr', 'kdyJeVolny'),
    aptObsazenOdeslani: s('fr', 'aptObsazenOdeslani'),
  },
  it: {
    cenaLegenda: 'Prezzi a notte, dall’appartamento libero più economico',
    cenaZaPobyt: 'Prezzo del soggiorno',
    cenaOd: 'da',
    cenaOdPozice: 'pred',
    cenaSleva: 'con sconto del 5 %',
    cenaPoznamka: 'per appartamento · tassa di soggiorno inclusa',
    zaPobyt: 'per il soggiorno',
    plno: 'pieno',
    obsazeno: 'occupato',
    terminPlno: 'In queste date siamo al completo. Scegliete altre date, per favore.',
    tedVyberteOdjezd: s('it', 'tedVyberteOdjezd'),
    terminBezVolneho: s('it', 'terminBezVolneho'),
    ukazNejblizsi: s('it', 'ukazNejblizsi'),
    veTerminuObsazeno: s('it', 'veTerminuObsazeno'),
    kdyJeVolny: s('it', 'kdyJeVolny'),
    aptObsazenOdeslani: s('it', 'aptObsazenOdeslani'),
  },
  pt: {
    cenaLegenda: 'Preços por noite, a partir do apartamento livre mais económico',
    cenaZaPobyt: 'Preço da estadia',
    cenaOd: 'desde',
    cenaOdPozice: 'pred',
    cenaSleva: 'com 5 % de desconto',
    cenaPoznamka: 'por apartamento · taxa turística incluída',
    zaPobyt: 'pela estadia',
    plno: 'cheio',
    obsazeno: 'ocupado',
    terminPlno: 'Nestas datas já não temos disponibilidade. Escolham outras, por favor.',
    tedVyberteOdjezd: s('pt', 'tedVyberteOdjezd'),
    terminBezVolneho: s('pt', 'terminBezVolneho'),
    ukazNejblizsi: s('pt', 'ukazNejblizsi'),
    veTerminuObsazeno: s('pt', 'veTerminuObsazeno'),
    kdyJeVolny: s('pt', 'kdyJeVolny'),
    aptObsazenOdeslani: s('pt', 'aptObsazenOdeslani'),
  },
  sv: {
    cenaLegenda: 'Pris per natt, från den billigaste lediga lägenheten',
    cenaZaPobyt: 'Pris för vistelsen',
    cenaOd: 'från',
    cenaOdPozice: 'pred',
    cenaSleva: 'med 5 % rabatt',
    cenaPoznamka: 'per lägenhet · turistskatt ingår',
    zaPobyt: 'för vistelsen',
    plno: 'fullt',
    obsazeno: 'upptaget',
    terminPlno: 'Vi är fullbokade dessa datum. Välj gärna andra datum.',
    tedVyberteOdjezd: s('sv', 'tedVyberteOdjezd'),
    terminBezVolneho: s('sv', 'terminBezVolneho'),
    ukazNejblizsi: s('sv', 'ukazNejblizsi'),
    veTerminuObsazeno: s('sv', 'veTerminuObsazeno'),
    kdyJeVolny: s('sv', 'kdyJeVolny'),
    aptObsazenOdeslani: s('sv', 'aptObsazenOdeslani'),
  },
  hu: {
    cenaLegenda: 'Éjszakánkénti árak a legolcsóbb szabad apartmantól',
    cenaZaPobyt: 'A tartózkodás ára',
    cenaOd: '-tól',
    cenaOdPozice: 'za',
    cenaSleva: '5 % kedvezménnyel',
    cenaPoznamka: 'apartmanonként · az idegenforgalmi adóval együtt',
    zaPobyt: 'a teljes tartózkodásra',
    plno: 'foglalt',
    obsazeno: 'foglalt',
    terminPlno: 'Ebben az időszakban már nincs szabad helyünk. Kérjük, válasszanak másik időpontot.',
    tedVyberteOdjezd: s('hu', 'tedVyberteOdjezd'),
    terminBezVolneho: s('hu', 'terminBezVolneho'),
    ukazNejblizsi: s('hu', 'ukazNejblizsi'),
    veTerminuObsazeno: s('hu', 'veTerminuObsazeno'),
    kdyJeVolny: s('hu', 'kdyJeVolny'),
    aptObsazenOdeslani: s('hu', 'aptObsazenOdeslani'),
  },
  da: {
    cenaLegenda: 'Priser pr. nat, fra den billigste ledige lejlighed',
    cenaZaPobyt: 'Pris for opholdet',
    cenaOd: 'fra',
    cenaOdPozice: 'pred',
    cenaSleva: 'med 5 % rabat',
    cenaPoznamka: 'pr. lejlighed · inkl. turistafgift',
    zaPobyt: 'for opholdet',
    plno: 'optaget',
    obsazeno: 'optaget',
    terminPlno: 'Vi er fuldt booket i denne periode. Vælg venligst andre datoer.',
    tedVyberteOdjezd: s('da', 'tedVyberteOdjezd'),
    terminBezVolneho: s('da', 'terminBezVolneho'),
    ukazNejblizsi: s('da', 'ukazNejblizsi'),
    veTerminuObsazeno: s('da', 'veTerminuObsazeno'),
    kdyJeVolny: s('da', 'kdyJeVolny'),
    aptObsazenOdeslani: s('da', 'aptObsazenOdeslani'),
  },
  fi: {
    cenaLegenda: 'Prices per night, from the lowest-priced available apartment',
    cenaZaPobyt: 'Price for your stay',
    cenaOd: 'from',
    cenaOdPozice: 'pred',
    cenaSleva: 'with 5% off',
    cenaPoznamka: 'per apartment · tourist tax included',
    zaPobyt: 'for your stay',
    plno: 'full',
    obsazeno: 'booked',
    terminPlno: 'We are fully booked on these dates. Please try other dates.',
    tedVyberteOdjezd: s('en', 'tedVyberteOdjezd'),
    terminBezVolneho: s('en', 'terminBezVolneho'),
    ukazNejblizsi: s('en', 'ukazNejblizsi'),
    veTerminuObsazeno: s('en', 'veTerminuObsazeno'),
    kdyJeVolny: s('en', 'kdyJeVolny'),
    aptObsazenOdeslani: s('en', 'aptObsazenOdeslani'),
  },
};

export function kalendarTexty(lang: GuideLang): KalendarTexty {
  return MAPA[lang] || MAPA.en;
}

/** Tvar „noc / noci / …“ podle jazyka. */
export function tvarNoci(pocet: number, lang: GuideLang): string {
  const n = Math.max(0, Math.floor(pocet));
  const pr = new Intl.PluralRules(lang === 'zh-Hant' ? 'zh-Hant' : lang);
  const f = pr.select(n);
  const tvary: Partial<Record<GuideLang, Record<string, string>>> = {
    cs: { one: 'noc', few: 'noci', many: 'nocí', other: 'nocí' },
    en: { one: 'night', other: 'nights' },
    de: { one: 'Nacht', other: 'Nächte' },
    pl: { one: 'noc', few: 'noce', many: 'nocy', other: 'nocy' },
    uk: { one: 'ніч', few: 'ночі', many: 'ночей', other: 'ночей' },
    'zh-Hant': { other: '晚' },
    es: { one: 'noche', other: 'noches' },
    fr: { one: 'nuit', other: 'nuits' },
    it: { one: 'notte', other: 'notti' },
    pt: { one: 'noite', other: 'noites' },
    sv: { one: 'natt', other: 'nätter' },
    hu: { other: 'éj' },
    da: { one: 'nat', other: 'nætter' },
    fi: { one: 'night', other: 'nights' },
  };
  const m = tvary[lang] || tvary.en!;
  const slovo = m[f] || m.other || m.one || '';
  if (lang === 'zh-Hant') return `${n} ${slovo}`.trim();
  if (lang === 'hu') return `${n} ${slovo}`.trim();
  return `${n} ${slovo}`.trim();
}

export function formatKc(castka: number): string {
  const n = Math.round(castka);
  return `${n.toLocaleString('cs-CZ')} Kč`;
}

/** Tvar slova apartmán podle počtu (bez čísla). */
export function tvarApartmanu(pocet: number, lang: GuideLang): string {
  const n = Math.max(0, Math.floor(pocet));
  const f = new Intl.PluralRules(lang === 'zh-Hant' ? 'zh-Hant' : lang).select(n);
  const m: Partial<Record<GuideLang, Record<string, string>>> = {
    cs: { one: 'apartmán', few: 'apartmány', many: 'apartmánů', other: 'apartmánů' },
    en: { one: 'apartment', other: 'apartments' },
    de: { one: 'Apartment', other: 'Apartments' },
    pl: { one: 'apartament', few: 'apartamenty', many: 'apartamentów', other: 'apartamentów' },
    uk: { one: 'апартамент', few: 'апартаменти', many: 'апартаментів', other: 'апартаментів' },
    'zh-Hant': { other: '間空房' },
    es: { one: 'apartamento libre', other: 'apartamentos libres' },
    fr: { one: 'appartement libre', other: 'appartements libres' },
    it: { one: 'appartamento libero', other: 'appartamenti liberi' },
    pt: { one: 'apartamento livre', other: 'apartamentos livres' },
    sv: { one: 'ledig lägenhet', other: 'lediga lägenheter' },
    hu: { one: 'szabad apartmanunk', other: 'szabad apartmanunk' },
    da: { one: 'ledig lejlighed', other: 'ledige lejligheder' },
    fi: { one: 'apartment', other: 'apartments' },
  };
  const tv = m[lang] || m.en!;
  return tv[f] || tv.other || tv.one || '';
}

/**
 * Malý řádek nad Celou galerií při zvoleném termínu.
 * „Ve vašem termínu {t} máme volné {n} apartmány.“
 */
export function radekVolnychVTerminu(lang: GuideLang, termin: string, pocet: number): string {
  const n = Math.max(0, Math.floor(pocet));
  const apt = tvarApartmanu(n, lang);
  switch (lang) {
    case 'cs':
      return `Ve vašem termínu ${termin} máme volné ${n} ${apt}.`;
    case 'de':
      return `Für Ihren Termin ${termin} sind ${n} ${apt} frei.`;
    case 'pl':
      return `W Waszym terminie ${termin} mamy wolne ${n} ${apt}.`;
    case 'uk':
      return `На ваші дати ${termin} вільні ${n} ${apt}.`;
    case 'zh-Hant':
      return `您的日期 ${termin} 尚有 ${n} ${apt}。`;
    case 'es':
      return `Para sus fechas ${termin} tenemos ${n} ${apt}.`;
    case 'fr':
      return `Pour vos dates ${termin}, ${n} ${apt}.`;
    case 'it':
      return `Per le vostre date ${termin} abbiamo ${n} ${apt}.`;
    case 'pt':
      return `Para as vossas datas ${termin} temos ${n} ${apt}.`;
    case 'sv':
      return `För era datum ${termin} har vi ${n} ${apt}.`;
    case 'hu':
      return `Az Önök időpontjában (${termin}) ${n} ${apt} van.`;
    case 'da':
      return `Til jeres datoer ${termin} har vi ${n} ${apt}.`;
    case 'en':
    case 'fi':
    default:
      return `For your dates ${termin} we have ${n} ${apt} free.`;
  }
}
