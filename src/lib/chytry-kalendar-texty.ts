import type { GuideLang } from './types';
import { tvarNoci } from './kalendar-texty';

type T = {
  predVyberem: string;
  poPrijezdu: (d: string) => string;
  dosah: (d: string, n: number) => string;
  podDnemOdjezd: string;
  denPrijezdu: string;
  denOdjezdu: string;
  ranoOdjezd: string;
  souhrnOdjezdRano: (d: string) => string;
};

const RAW: Record<
  GuideLang,
  {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
    F: string;
    G: string;
    souhrn: string;
  }
> = {
  cs: {
    A: 'Klepněte na den příjezdu.',
    B: 'Příjezd {d}. Teď klepněte na den odjezdu.',
    C: 'Od {d} máme jeden apartmán volný nejvýš na {n} {noci}.',
    D: 'odjezd',
    E: 'Den příjezdu',
    F: 'Den odjezdu',
    G: 'Ráno odjíždíte, tuto noc už neplatíte.',
    souhrn: '(odjezd {d} ráno)',
  },
  en: {
    A: 'Tap your arrival day.',
    B: 'Arrival {d}. Now tap your departure day.',
    C: 'From {d} we have one apartment free for up to {n} {nights}.',
    D: 'departure',
    E: 'Arrival day',
    F: 'Departure day',
    G: 'You leave in the morning, this night is not charged.',
    souhrn: '(leaving {d} morning)',
  },
  de: {
    A: 'Tippen Sie auf den Anreisetag.',
    B: 'Anreise {d}. Tippen Sie jetzt auf den Abreisetag.',
    C: 'Ab {d} ist ein Apartment höchstens {n} {Nächte} frei.',
    D: 'Abreise',
    E: 'Anreisetag',
    F: 'Abreisetag',
    G: 'Sie reisen morgens ab, diese Nacht zahlen Sie nicht.',
    souhrn: '(Abreise {d} morgens)',
  },
  pl: {
    A: 'Kliknijcie dzień przyjazdu.',
    B: 'Przyjazd {d}. Teraz kliknijcie dzień wyjazdu.',
    C: 'Od {d} mamy jeden apartament wolny najwyżej na {n} {noce}.',
    D: 'wyjazd',
    E: 'Dzień przyjazdu',
    F: 'Dzień wyjazdu',
    G: 'Wyjeżdżacie rano, tej nocy już nie płacicie.',
    souhrn: '(wyjazd {d} rano)',
  },
  uk: {
    A: 'Натисніть день заїзду.',
    B: 'Заїзд {d}. Тепер натисніть день виїзду.',
    C: 'З {d} маємо одні апартаменти вільні щонайбільше на {n} {ночі}.',
    D: 'виїзд',
    E: 'День заїзду',
    F: 'День виїзду',
    G: 'Ви виїжджаєте вранці, цю ніч не оплачуєте.',
    souhrn: '(виїзд {d} вранці)',
  },
  'zh-Hant': {
    A: '請點選入住日。',
    B: '入住 {d}。請點選退房日。',
    C: '從 {d} 起，同一間公寓最多可住 {n} 晚。',
    D: '退房',
    E: '入住日',
    F: '退房日',
    G: '您當天早上退房，這一晚不收費。',
    souhrn: '（{d} 早上退房）',
  },
  es: {
    A: 'Toquen el día de llegada.',
    B: 'Llegada {d}. Ahora toquen el día de salida.',
    C: 'Desde el {d} tenemos un apartamento libre como máximo {n} {noches}.',
    D: 'salida',
    E: 'Día de llegada',
    F: 'Día de salida',
    G: 'Salen por la mañana, esa noche no se cobra.',
    souhrn: '(salida {d} por la mañana)',
  },
  fr: {
    A: 'Touchez le jour d’arrivée.',
    B: 'Arrivée le {d}. Touchez maintenant le jour de départ.',
    C: 'À partir du {d}, un appartement est libre pour {n} {nuits} au maximum.',
    D: 'départ',
    E: 'Jour d’arrivée',
    F: 'Jour de départ',
    G: 'Vous partez le matin, cette nuit n’est pas facturée.',
    souhrn: '(départ le {d} au matin)',
  },
  it: {
    A: 'Toccate il giorno di arrivo.',
    B: 'Arrivo {d}. Ora toccate il giorno di partenza.',
    C: 'Dal {d} abbiamo un appartamento libero per al massimo {n} {notti}.',
    D: 'partenza',
    E: 'Giorno di arrivo',
    F: 'Giorno di partenza',
    G: 'Partite al mattino, quella notte non si paga.',
    souhrn: '(partenza {d} al mattino)',
  },
  pt: {
    A: 'Toquem no dia de chegada.',
    B: 'Chegada {d}. Agora toquem no dia de partida.',
    C: 'A partir de {d} temos um apartamento livre no máximo {n} {noites}.',
    D: 'partida',
    E: 'Dia de chegada',
    F: 'Dia de partida',
    G: 'Partem de manhã, essa noite não é paga.',
    souhrn: '(partida {d} de manhã)',
  },
  sv: {
    A: 'Tryck på ankomstdagen.',
    B: 'Ankomst {d}. Tryck nu på avresedagen.',
    C: 'Från {d} har vi en lägenhet ledig i högst {n} {nätter}.',
    D: 'avresa',
    E: 'Ankomstdag',
    F: 'Avresedag',
    G: 'Ni åker på morgonen, den natten betalar ni inte.',
    souhrn: '(avresa {d} på morgonen)',
  },
  hu: {
    A: 'Koppintsanak az érkezés napjára.',
    B: 'Érkezés {d}. Most koppintsanak a távozás napjára.',
    C: '{d}-tól egy apartman legfeljebb {n} éjszakára szabad.',
    D: 'távozás',
    E: 'Érkezés napja',
    F: 'Távozás napja',
    G: 'Reggel távoznak, ezt az éjszakát már nem fizetik.',
    souhrn: '(távozás {d} reggel)',
  },
  da: {
    A: 'Tryk på ankomstdagen.',
    B: 'Ankomst {d}. Tryk nu på afrejsedagen.',
    C: 'Fra {d} har vi en lejlighed ledig i højst {n} {nætter}.',
    D: 'afrejse',
    E: 'Ankomstdag',
    F: 'Afrejsedag',
    G: 'I rejser om morgenen, den nat betaler I ikke.',
    souhrn: '(afrejse {d} om morgenen)',
  },
  fi: {
    A: 'Tap your arrival day.',
    B: 'Arrival {d}. Now tap your departure day.',
    C: 'From {d} we have one apartment free for up to {n} {nights}.',
    D: 'departure',
    E: 'Arrival day',
    F: 'Departure day',
    G: 'You leave in the morning, this night is not charged.',
    souhrn: '(leaving {d} morning)',
  },
};

function kratkeDatum(ymd: string, lang: GuideLang): string {
  const [, m, d] = ymd.split('-').map(Number);
  if (lang === 'zh-Hant') return `${m}/${d}`;
  return `${d}. ${m}.`;
}

export function chytryKalendarTexty(lang: GuideLang): T {
  const r = RAW[lang] || RAW.en;
  return {
    predVyberem: r.A,
    poPrijezdu: (d) => r.B.replace('{d}', d),
    dosah: (d, n) =>
      r.C.replace('{d}', d)
        .replace('{n}', String(n))
        .replace('{noci}', tvarNoci(n, lang).replace(/^\d+\s*/, ''))
        .replace('{nights}', tvarNoci(n, lang).replace(/^\d+\s*/, ''))
        .replace('{Nächte}', tvarNoci(n, lang).replace(/^\d+\s*/, ''))
        .replace('{noce}', tvarNoci(n, lang).replace(/^\d+\s*/, ''))
        .replace('{ночі}', tvarNoci(n, lang).replace(/^\d+\s*/, ''))
        .replace('{noches}', tvarNoci(n, lang).replace(/^\d+\s*/, ''))
        .replace('{nuits}', tvarNoci(n, lang).replace(/^\d+\s*/, ''))
        .replace('{notti}', tvarNoci(n, lang).replace(/^\d+\s*/, ''))
        .replace('{noites}', tvarNoci(n, lang).replace(/^\d+\s*/, ''))
        .replace('{nätter}', tvarNoci(n, lang).replace(/^\d+\s*/, ''))
        .replace('{nætter}', tvarNoci(n, lang).replace(/^\d+\s*/, '')),
    podDnemOdjezd: r.D,
    denPrijezdu: r.E,
    denOdjezdu: r.F,
    ranoOdjezd: r.G,
    souhrnOdjezdRano: (d) => r.souhrn.replace('{d}', d),
  };
}

export function formatChytryDatum(ymd: string, lang: GuideLang): string {
  return kratkeDatum(ymd, lang);
}
