import type { GuideLang } from './types';

type T = {
  nadpis: (apt: string) => string;
  nejblizsi: (termin: string) => string;
  vybrat: string;
};

const RAW: Record<
  GuideLang,
  { nadpis: string; nejblizsi: string; vybrat: string }
> = {
  cs: {
    nadpis: 'Volné termíny: {apt}',
    nejblizsi: 'Nejbližší volný termín: {termin}',
    vybrat: 'Vybrat tento termín',
  },
  en: {
    nadpis: 'Free dates: {apt}',
    nejblizsi: 'Nearest free stay: {termin}',
    vybrat: 'Choose these dates',
  },
  de: {
    nadpis: 'Freie Termine: {apt}',
    nejblizsi: 'Nächster freier Termin: {termin}',
    vybrat: 'Diesen Termin wählen',
  },
  pl: {
    nadpis: 'Wolne terminy: {apt}',
    nejblizsi: 'Najbliższy wolny termin: {termin}',
    vybrat: 'Wybrać ten termin',
  },
  uk: {
    nadpis: 'Вільні дати: {apt}',
    nejblizsi: 'Найближчий вільний термін: {termin}',
    vybrat: 'Вибрати цей термін',
  },
  'zh-Hant': {
    nadpis: '可訂日期：{apt}',
    nejblizsi: '最近的空房：{termin}',
    vybrat: '選擇此日期',
  },
  es: {
    nadpis: 'Fechas libres: {apt}',
    nejblizsi: 'Fecha libre más cercana: {termin}',
    vybrat: 'Elegir estas fechas',
  },
  fr: {
    nadpis: 'Dates libres : {apt}',
    nejblizsi: 'Prochaine date libre : {termin}',
    vybrat: 'Choisir ces dates',
  },
  it: {
    nadpis: 'Date libere: {apt}',
    nejblizsi: 'Data libera più vicina: {termin}',
    vybrat: 'Scegliere queste date',
  },
  pt: {
    nadpis: 'Datas livres: {apt}',
    nejblizsi: 'Data livre mais próxima: {termin}',
    vybrat: 'Escolher estas datas',
  },
  sv: {
    nadpis: 'Lediga datum: {apt}',
    nejblizsi: 'Närmaste lediga datum: {termin}',
    vybrat: 'Välj dessa datum',
  },
  hu: {
    nadpis: 'Szabad időpontok: {apt}',
    nejblizsi: 'Legközelebbi szabad időpont: {termin}',
    vybrat: 'Ezt az időpontot választom',
  },
  da: {
    nadpis: 'Ledige datoer: {apt}',
    nejblizsi: 'Nærmeste ledige dato: {termin}',
    vybrat: 'Vælg denne dato',
  },
  fi: {
    nadpis: 'Free dates: {apt}',
    nejblizsi: 'Nearest free stay: {termin}',
    vybrat: 'Choose these dates',
  },
};

export function volneTerminyTexty(lang: GuideLang): T {
  const r = RAW[lang] || RAW.en;
  return {
    nadpis: (apt: string) => r.nadpis.replace('{apt}', apt),
    nejblizsi: (termin: string) => r.nejblizsi.replace('{termin}', termin),
    vybrat: r.vybrat,
  };
}
