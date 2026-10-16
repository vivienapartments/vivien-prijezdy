import { posunDen } from './brana';
import { seradOdjezdy } from './odjezd';
import type { RezervaceRecord } from './store';
import type { GuideLang } from './types';

const TELEFON = '+420\u00A0604\u00A0692\u00A0573';

/**
 * Jedna konstanta na jazyk. Majitel ji může nahradit vlastním zněním.
 * Podpis je součástí textu, nepřidávat znovu.
 */
export const ZPRAVA_POHODA: Record<GuideLang, string> = {
  cs: `Dobrý den, chtěli jsme se zeptat, jestli je u nás všechno v pořádku a jestli jste se dobře vyspali. Kdybyste cokoli potřebovali, stačí napsat nebo zavolat na ${TELEFON}.\n\nPřejeme vám krásný den.\nNikol a rodina VIVIEN`,
  en: `Hello, we wanted to ask if everything is fine and if you slept well. If you need anything, just write or call us at ${TELEFON}.\n\nHave a lovely day.\nNikol and the VIVIEN family`,
  de: `Guten Tag, wir wollten fragen, ob bei uns alles in Ordnung ist und ob Sie gut geschlafen haben. Wenn Sie etwas brauchen, schreiben oder rufen Sie uns einfach unter ${TELEFON} an.\n\nWir wünschen Ihnen einen schönen Tag.\nNikol und Familie VIVIEN`,
  pl: `Dzień dobry, chcieliśmy zapytać, czy u nas wszystko jest w porządku i czy dobrze się wyspaliście. Gdybyście czegoś potrzebowali, wystarczy napisać lub zadzwonić na ${TELEFON}.\n\nŻyczymy Wam miłego dnia.\nNikol i rodzina VIVIEN`,
  uk: `Добрий день, хотіли запитати, чи у нас усе гаразд і чи ви добре виспалися. Якщо щось знадобиться, досить написати або зателефонувати на ${TELEFON}.\n\nБажаємо вам гарного дня.\nNikol і родина VIVIEN`,
  'zh-Hant': `您好，我們想問問您在我們這裡是否一切順利，昨晚是否睡得好。如果需要什麼，請寫訊息或致電 ${TELEFON}。\n\n祝您有美好的一天。\nNikol 與 VIVIEN 家人`,
  es: `Hola, queríamos preguntar si todo está bien con nosotros y si han dormido bien. Si necesitan algo, basta con escribir o llamar al ${TELEFON}.\n\nLes deseamos un buen día.\nNikol y la familia VIVIEN`,
  fr: `Bonjour, nous voulions demander si tout va bien chez nous et si vous avez bien dormi. Si vous avez besoin de quoi que ce soit, il suffit d'écrire ou d'appeler le ${TELEFON}.\n\nNous vous souhaitons une belle journée.\nNikol et la famille VIVIEN`,
  it: `Buongiorno, volevamo chiedere se da noi è tutto a posto e se avete dormito bene. Se vi serve qualcosa, basta scrivere o chiamare il ${TELEFON}.\n\nVi auguriamo una bella giornata.\nNikol e la famiglia VIVIEN`,
  sv: `Hej, vi ville fråga om allt är bra hos oss och om ni sovit gott. Om ni behöver något, skriv eller ring till ${TELEFON}.\n\nVi önskar er en fin dag.\nNikol och familjen VIVIEN`,
  hu: `Jó napot, meg szerettük volna kérdezni, hogy minden rendben van-e nálunk, és jól aludtak-e. Ha bármire szükségük van, írjanak vagy hívjanak a ${TELEFON} számon.\n\nSzép napot kívánunk.\nNikol és a VIVIEN család`,
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

