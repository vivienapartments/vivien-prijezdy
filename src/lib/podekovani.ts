import { posunDen } from './brana';
import { isDepartureExpired } from './token';
import type { GuideLang } from './types';

/** Kolik dní po odjezdu zůstane host v seznamu poděkování. */
export const PODEKOVANI_DNU = 3;

/** Denní upomínka majiteli (Praha). */
export const HODINA_PODEKOVANI = 17;

export type PodekovaniKanal = 'whatsapp' | 'sms' | 'email';

/**
 * Text zprávy (WhatsApp, SMS, e-mail). Schváleno majitelem 19. 11. 2026.
 * Pod text patří prázdný řádek a odkaz na průvodce.
 */
export const ZPRAVA_PODEKOVANI: Record<GuideLang, string> = {
  cs: `Dobrý den, doufáme, že jste dojeli v pořádku. Ještě jsme se s vámi chtěli rozloučit. Otevřete si odkaz na průvodce, nechali jsme vám tam pár řádků.`,
  en: `Hello, we hope you got home safely. We wanted to say goodbye. Open the guide link, we left you a few lines there.`,
  de: `Guten Tag, wir hoffen, Sie sind gut nach Hause gekommen. Wir wollten uns noch von Ihnen verabschieden. Öffnen Sie den Link zum Leitfaden, dort haben wir Ihnen ein paar Zeilen hinterlassen.`,
  pl: `Dzień dobry, mamy nadzieję, że dotarliście szczęśliwie. Chcieliśmy się jeszcze z Wami pożegnać. Otwórzcie link do przewodnika, zostawiliśmy Wam tam kilka słów.`,
  uk: `Добрий день, сподіваємося, ви добре доїхали. Ми хотіли ще попрощатися з вами. Відкрийте посилання на путівник, ми залишили вам там кілька рядків.`,
  'zh-Hant': `您好，希望您已平安到家。我們想再跟您道別。請打開指南連結，我們在那裡留了幾句話給您。`,
  sv: `Hej, vi hoppas att ni har kommit hem väl. Vi ville säga hej då. Öppna länken till guiden, där har vi lämnat några rader till er.`,
  es: `Buenos días, esperamos que hayan llegado bien. Queríamos despedirnos. Abran el enlace de la guía, allí les hemos dejado unas líneas.`,
  hu: `Jó napot kívánunk, reméljük, szerencsésen hazaértek. Szerettünk volna még elköszönni. Nyissák meg az útmutató linkjét, hagytunk ott néhány sort.`,
  da: `Hej, vi håber, I er kommet godt hjem. Vi ville gerne sige farvel. Åbn linket til guiden, der har vi efterladt et par linjer til jer.`,
  fr: `Bonjour, nous espérons que vous êtes bien rentrés. Nous voulions encore vous dire au revoir. Ouvrez le lien du guide, nous vous y avons laissé quelques lignes.`,
  it: `Buongiorno, speriamo che siate arrivati a casa bene. Volevamo ancora salutarvi. Aprite il link della guida, vi abbiamo lasciato qualche riga.`,
  pt: `Bom dia, esperamos que tenham chegado bem. Queríamos ainda despedir-nos. Abram o link do guia, deixámos-vos lá algumas linhas.`,
};

/** Předmět e-mailu. Schváleno 19. 11. 2026: VIVIEN · Než odkaz na průvodce skončí. */
export const PREDMET_PODEKOVANI: Record<GuideLang, string> = {
  cs: 'VIVIEN · Než odkaz na průvodce skončí',
  en: 'VIVIEN · Before the guide link ends',
  de: 'VIVIEN · Bevor der Leitfaden-Link endet',
  pl: 'VIVIEN · Zanim link do przewodnika wygaśnie',
  uk: 'VIVIEN · Поки посилання на путівник ще діє',
  'zh-Hant': 'VIVIEN · 在指南連結結束前',
  sv: 'VIVIEN · Innan guidenlänken tar slut',
  es: 'VIVIEN · Antes de que termine el enlace de la guía',
  hu: 'VIVIEN · Mielőtt az útmutató linkje lejár',
  da: 'VIVIEN · Før guidelinket udløber',
  fr: 'VIVIEN · Avant que le lien du guide ne se termine',
  it: 'VIVIEN · Prima che il link della guida scada',
  pt: 'VIVIEN · Antes de o link do guia terminar',
};

export function textPodekovani(lang: GuideLang | null, odkaz: string | null): string {
  const zaklad =
    lang && lang in ZPRAVA_PODEKOVANI ? ZPRAVA_PODEKOVANI[lang] : ZPRAVA_PODEKOVANI.en;
  const url = (odkaz || '').trim();
  if (!url) return zaklad;
  return `${zaklad}\n\n${url}`;
}

export function predmetPodekovani(lang: GuideLang | null): string {
  if (lang && lang in PREDMET_PODEKOVANI) return PREDMET_PODEKOVANI[lang];
  return PREDMET_PODEKOVANI.en;
}

function sklonHostu(n: number): string {
  if (n === 1) return '1 hostu';
  if (n >= 2 && n <= 4) return `${n} hostům`;
  return `${n} hostům`;
}

export function textPushPodekovani(pocet: number): string {
  return `Pošlete ${sklonHostu(pocet)} poděkování.`;
}

/** SMS odkaz: iPhone &body=, Android ?body=. */
export function odkazSmsPodekovani(telefon: string, text: string, ios: boolean): string {
  const cil = telefon.replace(/[^\d+]/g, '');
  const body = encodeURIComponent(text);
  return ios ? `sms:${cil}&body=${body}` : `sms:${cil}?body=${body}`;
}

export function stitekPodekovaniKanalu(kanal: PodekovaniKanal | null | undefined): string {
  if (kanal === 'whatsapp') return 'WhatsApp';
  if (kanal === 'sms') return 'SMS';
  if (kanal === 'email') return 'E-mail';
  return '';
}

/**
 * Host patří do seznamu / menu, když už platí stránka po odjezdu
 * a od odjezdu neuplynulo víc než PODEKOVANI_DNU dní.
 */
export function jeProPodekovani(
  r: {
    stav: string;
    predano?: string | null;
    odjezd?: string | null;
    nedojezdKdy?: string | null;
  },
  dnes: string,
  now = new Date(),
): boolean {
  if (r.stav === 'zruseno' || r.nedojezdKdy) return false;
  if (!r.predano || !r.odjezd) return false;
  if (r.odjezd > dnes) return false;
  const lim = posunDen(dnes, -PODEKOVANI_DNU);
  if (r.odjezd < lim) return false;
  if (!isDepartureExpired(r.odjezd, now)) return false;
  return true;
}

/** Ještě čeká na odeslání (pro push a počítadlo akce). */
export function cekaPodekovani(
  r: {
    stav: string;
    predano?: string | null;
    odjezd?: string | null;
    nedojezdKdy?: string | null;
    podekovaniKdy?: string | null;
  },
  dnes: string,
  now = new Date(),
): boolean {
  return jeProPodekovani(r, dnes, now) && !r.podekovaniKdy;
}

/** Nejstarší odjezd nahoře, pak apartmán / jméno. */
export function seradPodekovani<T extends { odjezd: string | null; apartman: string | null; jmeno?: string | null }>(
  radky: T[],
): T[] {
  return [...radky].sort((a, b) => {
    const da = a.odjezd || '';
    const db = b.odjezd || '';
    if (da !== db) return da.localeCompare(db);
    const pa = a.apartman || '';
    const pb = b.apartman || '';
    if (pa !== pb) return pa.localeCompare(pb, 'cs');
    return (a.jmeno || '').localeCompare(b.jmeno || '', 'cs');
  });
}

export function hosteProPodekovani<T extends {
  stav: string;
  predano?: string | null;
  odjezd: string | null;
  nedojezdKdy?: string | null;
  apartman: string | null;
  jmeno?: string | null;
  podekovaniKdy?: string | null;
}>(list: T[], dnes: string, now = new Date()): T[] {
  return seradPodekovani(list.filter((r) => jeProPodekovani(r, dnes, now)));
}

export function hosteCekajiciPodekovani<T extends {
  stav: string;
  predano?: string | null;
  odjezd: string | null;
  nedojezdKdy?: string | null;
  apartman: string | null;
  jmeno?: string | null;
  podekovaniKdy?: string | null;
}>(list: T[], dnes: string, now = new Date()): T[] {
  return seradPodekovani(list.filter((r) => cekaPodekovani(r, dnes, now)));
}

/** V menu na kartě po odjezdu (i když už odesláno, ať jde poslat znovu). */
export function ukazatPodekovani(opts: {
  stav?: string;
  predano?: string | null;
  odjezd?: string | null;
  nedojezdKdy?: string | null;
  dnes: string;
  now?: Date;
}): boolean {
  if (opts.stav === 'zruseno' || opts.nedojezdKdy || !opts.predano || !opts.odjezd) return false;
  if (opts.odjezd > opts.dnes) return false;
  const lim = posunDen(opts.dnes, -PODEKOVANI_DNU);
  if (opts.odjezd < lim) return false;
  return isDepartureExpired(opts.odjezd, opts.now || new Date());
}

/** Po odjezdu (v okně poděkování) předvybrat tuto zprávu. */
export function predvybratPodekovani(opts: {
  predano?: string | null;
  odjezd?: string | null;
  dnes: string;
  now?: Date;
}): boolean {
  if (!opts.predano || !opts.odjezd) return false;
  if (opts.odjezd > opts.dnes) return false;
  const lim = posunDen(opts.dnes, -PODEKOVANI_DNU);
  if (opts.odjezd < lim) return false;
  return isDepartureExpired(opts.odjezd, opts.now || new Date());
}
