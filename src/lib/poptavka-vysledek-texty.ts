import type { GuideLang } from './types';
import { tvarApartmanu } from './kalendar-texty';

type T = {
  uvodPred: string;
  uvodPo: string;
  sediNejvíc: string;
  sedeloBy: string;
  obsazene: string;
  najitTermin: string;
  volba: (n: number) => string;
};

const VOLBA: Record<GuideLang, [string, string, string, string]> = {
  cs: ['Druhá volba', 'Třetí volba', 'Čtvrtá volba', 'Pátá volba'],
  en: ['Second choice', 'Third choice', 'Fourth choice', 'Fifth choice'],
  de: ['Zweite Wahl', 'Dritte Wahl', 'Vierte Wahl', 'Fünfte Wahl'],
  pl: ['Drugi wybór', 'Trzeci wybór', 'Czwarty wybór', 'Piąty wybór'],
  uk: ['Другий вибір', 'Третій вибір', 'Четвертий вибір', 'П’ятий вибір'],
  'zh-Hant': ['第二選擇', '第三選擇', '第四選擇', '第五選擇'],
  es: ['Segunda opción', 'Tercera opción', 'Cuarta opción', 'Quinta opción'],
  fr: ['Deuxième choix', 'Troisième choix', 'Quatrième choix', 'Cinquième choix'],
  it: ['Seconda scelta', 'Terza scelta', 'Quarta scelta', 'Quinta scelta'],
  pt: ['Segunda escolha', 'Terceira escolha', 'Quarta escolha', 'Quinta escolha'],
  sv: ['Andra valet', 'Tredje valet', 'Fjärde valet', 'Femte valet'],
  hu: ['Második választás', 'Harmadik választás', 'Negyedik választás', 'Ötödik választás'],
  da: ['Andet valg', 'Tredje valg', 'Fjerde valg', 'Femte valg'],
  fi: ['Second choice', 'Third choice', 'Fourth choice', 'Fifth choice'],
};

const MAPA: Record<GuideLang, Omit<T, 'volba'>> = {
  cs: {
    uvodPred: 'Ve vašem termínu máme volné',
    uvodPo: 'Podle odpovědí vám nejvíc sedí:',
    sediNejvíc: 'Sedí vám nejvíc',
    sedeloBy: 'Sedělo by vám nejvíc',
    obsazene: 'Ve vašem termínu obsazené',
    najitTermin: 'Najít nejbližší volný termín ›',
  },
  en: {
    uvodPred: 'For your dates we have',
    uvodPo: 'From your answers, these suit you best:',
    sediNejvíc: 'Suits you best',
    sedeloBy: 'Would have suited you best',
    obsazene: 'Booked for your dates',
    najitTermin: 'Find the nearest free dates ›',
  },
  de: {
    uvodPred: 'Für Ihren Termin haben wir',
    uvodPo: 'Nach Ihren Antworten passt Ihnen am besten:',
    sediNejvíc: 'Passt Ihnen am besten',
    sedeloBy: 'Hätte Ihnen am besten gepasst',
    obsazene: 'In Ihrem Termin belegt',
    najitTermin: 'Nächsten freien Termin finden ›',
  },
  pl: {
    uvodPred: 'W Waszym terminie mamy wolne',
    uvodPo: 'Według odpowiedzi najbardziej Wam pasuje:',
    sediNejvíc: 'Pasuje Wam najbardziej',
    sedeloBy: 'Pasowałoby Wam najbardziej',
    obsazene: 'Zajęte w Waszym terminie',
    najitTermin: 'Znaleźć najbliższy wolny termin ›',
  },
  uk: {
    uvodPred: 'На ваші дати маємо вільні',
    uvodPo: 'За відповідями вам найбільше пасує:',
    sediNejvíc: 'Пасує вам найбільше',
    sedeloBy: 'Пасувало б вам найбільше',
    obsazene: 'Зайнято у ваші дати',
    najitTermin: 'Знайти найближчий вільний термін ›',
  },
  'zh-Hant': {
    uvodPred: '您的日期尚有',
    uvodPo: '依您的回答，最適合您的是：',
    sediNejvíc: '最適合您',
    sedeloBy: '本來最適合您',
    obsazene: '您的日期已訂滿',
    najitTermin: '尋找最近的空房日期 ›',
  },
  es: {
    uvodPred: 'Para sus fechas tenemos',
    uvodPo: 'Según sus respuestas, les conviene más:',
    sediNejvíc: 'Les conviene más',
    sedeloBy: 'Les habría convenido más',
    obsazene: 'Ocupado en sus fechas',
    najitTermin: 'Buscar la fecha libre más cercana ›',
  },
  fr: {
    uvodPred: 'Pour vos dates, nous avons',
    uvodPo: 'D’après vos réponses, ceci vous convient le mieux :',
    sediNejvíc: 'Vous convient le mieux',
    sedeloBy: 'Vous aurait le mieux convenu',
    obsazene: 'Complet à vos dates',
    najitTermin: 'Trouver la prochaine date libre ›',
  },
  it: {
    uvodPred: 'Per le vostre date abbiamo',
    uvodPo: 'In base alle risposte, vi si addice di più:',
    sediNejvíc: 'Vi si addice di più',
    sedeloBy: 'Vi sarebbe stato più adatto',
    obsazene: 'Occupato nelle vostre date',
    najitTermin: 'Trovare la data libera più vicina ›',
  },
  pt: {
    uvodPred: 'Para as vossas datas temos',
    uvodPo: 'Segundo as respostas, convém-vos mais:',
    sediNejvíc: 'Convém-vos mais',
    sedeloBy: 'Convinha-vos mais',
    obsazene: 'Ocupado nas vossas datas',
    najitTermin: 'Encontrar a data livre mais próxima ›',
  },
  sv: {
    uvodPred: 'För era datum har vi',
    uvodPo: 'Efter era svar passar detta er bäst:',
    sediNejvíc: 'Passar er bäst',
    sedeloBy: 'Skulle ha passat er bäst',
    obsazene: 'Upptaget på era datum',
    najitTermin: 'Hitta närmaste lediga datum ›',
  },
  hu: {
    uvodPred: 'Az Önök időpontjában',
    uvodPo: 'A válaszok alapján Önöknek leginkább ez illik:',
    sediNejvíc: 'Önöknek illik a legjobban',
    sedeloBy: 'Önöknek illene a legjobban',
    obsazene: 'Az Önök időpontjában foglalt',
    najitTermin: 'A legközelebbi szabad időpont ›',
  },
  da: {
    uvodPred: 'Til jeres datoer har vi',
    uvodPo: 'Efter jeres svar passer dette jer bedst:',
    sediNejvíc: 'Passer jer bedst',
    sedeloBy: 'Ville have passet jer bedst',
    obsazene: 'Optaget på jeres datoer',
    najitTermin: 'Find nærmeste ledige dato ›',
  },
  fi: {
    uvodPred: 'For your dates we have',
    uvodPo: 'From your answers, these suit you best:',
    sediNejvíc: 'Suits you best',
    sedeloBy: 'Would have suited you best',
    obsazene: 'Booked for your dates',
    najitTermin: 'Find the nearest free dates ›',
  },
};

/** Úvod výsledku: „Ve vašem termínu máme volné 2&nbsp;apartmány. Podle…“ */
export function uvodVysledkuVolne(lang: GuideLang, pocet: number): string {
  const t = MAPA[lang] || MAPA.en;
  const n = Math.max(0, Math.floor(pocet));
  const apt = tvarApartmanu(n, lang);
  const nbsp = '\u00a0';
  if (lang === 'hu') {
    return `${t.uvodPred} ${n}${nbsp}${apt} van. ${t.uvodPo}`;
  }
  if (lang === 'zh-Hant') {
    return `${t.uvodPred} ${n}${nbsp}${apt}。${t.uvodPo}`;
  }
  if (lang === 'de') {
    return `${t.uvodPred} ${n}${nbsp}${apt} frei. ${t.uvodPo}`;
  }
  if (lang === 'en' || lang === 'fi') {
    return `${t.uvodPred} ${n}${nbsp}${apt} free. ${t.uvodPo}`;
  }
  if (lang === 'fr') {
    return `${t.uvodPred} ${n}${nbsp}${apt}. ${t.uvodPo}`;
  }
  return `${t.uvodPred} ${n}${nbsp}${apt}. ${t.uvodPo}`;
}

export function vysledekTexty(lang: GuideLang): T {
  const base = MAPA[lang] || MAPA.en;
  const volby = VOLBA[lang] || VOLBA.en;
  return {
    ...base,
    volba: (n: number) => {
      if (n <= 1) return base.sediNejvíc;
      return volby[Math.min(n - 2, volby.length - 1)] || volby[volby.length - 1];
    },
  };
}
