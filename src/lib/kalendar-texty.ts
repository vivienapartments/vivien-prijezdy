import type { GuideLang } from './types';

export type KalendarTexty = {
  cenaLegenda: string;
  cenaZaPobyt: string;
  cenaSleva: string;
  cenaPoznamka: string;
  zaPobyt: string;
  plno: string;
  obsazeno: string;
  terminPlno: string;
};

const MAPA: Record<GuideLang, KalendarTexty> = {
  cs: {
    cenaLegenda: 'Ceny za noc, od nejlevnějšího volného apartmánu',
    cenaZaPobyt: 'Cena za pobyt',
    cenaSleva: 'se slevou 5 %',
    cenaPoznamka: 'za apartmán, ne za osobu · včetně poplatku z pobytu',
    zaPobyt: 'za pobyt',
    plno: 'plno',
    obsazeno: 'obsazeno',
    terminPlno: 'V tomto termínu už máme plno. Zkuste prosím jiný.',
  },
  en: {
    cenaLegenda: 'Prices per night, from the lowest-priced available apartment',
    cenaZaPobyt: 'Price for your stay',
    cenaSleva: 'with 5% off',
    cenaPoznamka: 'per apartment, not per person · tourist tax included',
    zaPobyt: 'for your stay',
    plno: 'full',
    obsazeno: 'booked',
    terminPlno: 'We are fully booked on these dates. Please try other dates.',
  },
  de: {
    cenaLegenda: 'Preise pro Nacht, ab dem günstigsten freien Apartment',
    cenaZaPobyt: 'Preis für den Aufenthalt',
    cenaSleva: 'mit 5 % Rabatt',
    cenaPoznamka: 'pro Apartment, nicht pro Person · inkl. Kurtaxe',
    zaPobyt: 'für den Aufenthalt',
    plno: 'belegt',
    obsazeno: 'belegt',
    terminPlno: 'In diesem Zeitraum sind wir ausgebucht. Bitte wählen Sie einen anderen Termin.',
  },
  pl: {
    cenaLegenda: 'Ceny za noc, od najtańszego wolnego apartamentu',
    cenaZaPobyt: 'Cena za pobyt',
    cenaSleva: 'ze zniżką 5 %',
    cenaPoznamka: 'za apartament, nie za osobę · z opłatą miejscową',
    zaPobyt: 'za pobyt',
    plno: 'brak',
    obsazeno: 'zajęte',
    terminPlno: 'W tym terminie nie mamy już wolnych miejsc. Wybierzcie proszę inny.',
  },
  uk: {
    cenaLegenda: 'Ціни за ніч, від найдешевших вільних апартаментів',
    cenaZaPobyt: 'Ціна за перебування',
    cenaSleva: 'зі знижкою 5 %',
    cenaPoznamka: 'за апартаменти, не за особу · туристичний збір включено',
    zaPobyt: 'за перебування',
    plno: 'зайнято',
    obsazeno: 'зайнято',
    terminPlno: 'На ці дати вільних місць уже немає. Оберіть, будь ласка, інші.',
  },
  'zh-Hant': {
    cenaLegenda: '每晚價格，以最便宜的空房公寓計',
    cenaZaPobyt: '住宿總價',
    cenaSleva: '已含 5% 折扣',
    cenaPoznamka: '以整間公寓計價，非按人數 · 含住宿稅',
    zaPobyt: '總價',
    plno: '客滿',
    obsazeno: '已訂滿',
    terminPlno: '此期間已客滿，請選擇其他日期。',
  },
  es: {
    cenaLegenda: 'Precios por noche, desde el apartamento libre más económico',
    cenaZaPobyt: 'Precio de la estancia',
    cenaSleva: 'con 5 % de descuento',
    cenaPoznamka: 'por apartamento, no por persona · tasa turística incluida',
    zaPobyt: 'por la estancia',
    plno: 'completo',
    obsazeno: 'ocupado',
    terminPlno: 'En estas fechas ya no tenemos disponibilidad. Elijan otras, por favor.',
  },
  fr: {
    cenaLegenda: 'Prix par nuit, à partir de l’appartement libre le moins cher',
    cenaZaPobyt: 'Prix du séjour',
    cenaSleva: 'avec 5 % de réduction',
    cenaPoznamka: 'par appartement, pas par personne · taxe de séjour incluse',
    zaPobyt: 'pour le séjour',
    plno: 'complet',
    obsazeno: 'occupé',
    terminPlno: 'Nous sommes complets à ces dates. Merci de choisir d’autres dates.',
  },
  it: {
    cenaLegenda: 'Prezzi a notte, dall’appartamento libero più economico',
    cenaZaPobyt: 'Prezzo del soggiorno',
    cenaSleva: 'con sconto del 5 %',
    cenaPoznamka: 'per appartamento, non a persona · tassa di soggiorno inclusa',
    zaPobyt: 'per il soggiorno',
    plno: 'pieno',
    obsazeno: 'occupato',
    terminPlno: 'In queste date siamo al completo. Scegliete altre date, per favore.',
  },
  pt: {
    cenaLegenda: 'Preços por noite, a partir do apartamento livre mais económico',
    cenaZaPobyt: 'Preço da estadia',
    cenaSleva: 'com 5 % de desconto',
    cenaPoznamka: 'por apartamento, não por pessoa · taxa turística incluída',
    zaPobyt: 'pela estadia',
    plno: 'cheio',
    obsazeno: 'ocupado',
    terminPlno: 'Nestas datas já não temos disponibilidade. Escolham outras, por favor.',
  },
  sv: {
    cenaLegenda: 'Pris per natt, från den billigaste lediga lägenheten',
    cenaZaPobyt: 'Pris för vistelsen',
    cenaSleva: 'med 5 % rabatt',
    cenaPoznamka: 'per lägenhet, inte per person · turistskatt ingår',
    zaPobyt: 'för vistelsen',
    plno: 'fullt',
    obsazeno: 'upptaget',
    terminPlno: 'Vi är fullbokade dessa datum. Välj gärna andra datum.',
  },
  hu: {
    cenaLegenda: 'Éjszakánkénti árak a legolcsóbb szabad apartmantól',
    cenaZaPobyt: 'A tartózkodás ára',
    cenaSleva: '5 % kedvezménnyel',
    cenaPoznamka: 'apartmanonként, nem személyenként · az idegenforgalmi adóval együtt',
    zaPobyt: 'a teljes tartózkodásra',
    plno: 'foglalt',
    obsazeno: 'foglalt',
    terminPlno: 'Ebben az időszakban már nincs szabad helyünk. Kérjük, válasszanak másik időpontot.',
  },
  da: {
    cenaLegenda: 'Priser pr. nat, fra den billigste ledige lejlighed',
    cenaZaPobyt: 'Pris for opholdet',
    cenaSleva: 'med 5 % rabat',
    cenaPoznamka: 'pr. lejlighed, ikke pr. person · inkl. turistafgift',
    zaPobyt: 'for opholdet',
    plno: 'optaget',
    obsazeno: 'optaget',
    terminPlno: 'Vi er fuldt booket i denne periode. Vælg venligst andre datoer.',
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
