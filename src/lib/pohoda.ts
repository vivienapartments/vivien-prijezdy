import { posunDen } from './brana';
import { seradOdjezdy } from './odjezd';
import type { RezervaceRecord } from './store';
import type { GuideLang } from './types';

/**
 * Jedna konstanta na jazyk. Bez telefonu: zpráva často jde WhatsAppem.
 * České znění schválil majitel 18. 10. 2026. Podpis je součástí textu.
 */
export const ZPRAVA_POHODA: Record<GuideLang, string> = {
  cs: `Dobrý den,

jen jsme se chtěli zeptat, zda je u vás všechno v pořádku a jestli jste s pobytem spokojeni. Pokud byste cokoli potřebovali, neváhejte nám napsat.

Přejeme vám krásný den.

Nikol a rodina VIVIEN`,
  en: `Hello,

we just wanted to ask whether everything is all right and whether you are happy with your stay. If you need anything, please write to us.

We wish you a lovely day.

Nikol and the VIVIEN family`,
  de: `Guten Tag,

wir wollten nur fragen, ob bei Ihnen alles in Ordnung ist und ob Sie mit dem Aufenthalt zufrieden sind. Wenn Sie etwas brauchen, schreiben Sie uns bitte.

Wir wünschen Ihnen einen schönen Tag.

Nikol und Familie VIVIEN`,
  pl: `Dzień dobry,

chcieliśmy tylko zapytać, czy u Was wszystko jest w porządku i czy jesteście zadowoleni z pobytu. Gdybyście czegoś potrzebowali, napiszcie do nas.

Życzymy Wam miłego dnia.

Nikol i rodzina VIVIEN`,
  uk: `Добрий день,

лише хотіли запитати, чи у Вас усе гаразд і чи Ви задоволені перебуванням. Якщо щось знадобиться, напишіть нам.

Бажаємо Вам гарного дня.

Nikol і родина VIVIEN`,
  'zh-Hant': `您好，

我們只想問問您一切是否順利，這次住宿是否滿意。如果需要什麼，請寫訊息給我們。

祝您有美好的一天。

Nikol 與 VIVIEN 家人`,
  es: `Hola,

solo queríamos preguntar si todo está bien y si están contentos con la estancia. Si necesitan algo, escríbannos.

Les deseamos un buen día.

Nikol y la familia VIVIEN`,
  fr: `Bonjour,

nous voulions juste demander si tout va bien et si vous êtes satisfaits du séjour. Si vous avez besoin de quoi que ce soit, écrivez-nous.

Nous vous souhaitons une belle journée.

Nikol et la famille VIVIEN`,
  it: `Buongiorno,

volevamo solo chiedere se da voi è tutto a posto e se siete soddisfatti del soggiorno. Se vi serve qualcosa, scriveteci.

Vi auguriamo una bella giornata.

Nikol e la famiglia VIVIEN`,
  sv: `Hej,

vi ville bara fråga om allt är bra och om ni är nöjda med vistelsen. Om ni behöver något, skriv till oss.

Vi önskar er en fin dag.

Nikol och familjen VIVIEN`,
  hu: `Jó napot,

csak meg szerettük volna kérdezni, hogy minden rendben van-e, és elégedettek-e a tartózkodással. Ha bármire szükségük van, írjanak nekünk.

Szép napot kívánunk.

Nikol és a VIVIEN család`,
};

export const PREDMET_POHODY: Record<GuideLang, string> = {
  cs: 'VIVIEN · Je u vás vše v pořádku?',
  en: 'VIVIEN · Is everything all right?',
  de: 'VIVIEN · Ist bei Ihnen alles in Ordnung?',
  pl: 'VIVIEN · Czy wszystko w porządku?',
  uk: 'VIVIEN · Чи все гаразд?',
  'zh-Hant': 'VIVIEN · 一切還好嗎？',
  es: 'VIVIEN · ¿Todo bien?',
  fr: 'VIVIEN · Tout va bien ?',
  it: 'VIVIEN · Va tutto bene?',
  sv: 'VIVIEN · Är allt bra?',
  hu: 'VIVIEN · Minden rendben?',
};

export function textPohody(lang: GuideLang | null): string {
  if (lang && lang in ZPRAVA_POHODA) return ZPRAVA_POHODA[lang];
  return ZPRAVA_POHODA.en;
}

function sklonHostu(n: number): string {
  if (n === 1) return '1 hostu';
  if (n >= 2 && n <= 4) return `${n} hostům`;
  return `${n} hostům`;
}

export function textPushPohody(pocet: number): string {
  return `Pošlete ${sklonHostu(pocet)} dotaz, jestli je vše v pořádku.`;
}

export function jeProPohodu(
  r: { stav: string; predano?: string | null; prijezd?: string | null; odjezd?: string | null },
  dnes: string,
): boolean {
  const vcera = posunDen(dnes, -1);
  return r.stav !== 'zruseno' && Boolean(r.predano) && r.prijezd === vcera && r.odjezd !== dnes;
}

/** Včera přijeli, jsou předaní, dnes neodjíždějí, nezrušení. */
export function hosteProPohodu(list: RezervaceRecord[], dnes: string): RezervaceRecord[] {
  return seradOdjezdy(list.filter((r) => jeProPohodu(r, dnes)));
}

/** V menu na kartě po předání, dokud host u nás je nebo právě odjel. */
export function ukazatPohodu(opts: {
  stav?: string;
  predano?: string | null;
  prijezd?: string | null;
  odjezd?: string | null;
  dnes: string;
}): boolean {
  if (opts.stav === 'zruseno' || !opts.predano) return false;
  if (!opts.prijezd || opts.prijezd > opts.dnes) return false;
  if (opts.odjezd && opts.odjezd < opts.dnes) return false;
  return true;
}
