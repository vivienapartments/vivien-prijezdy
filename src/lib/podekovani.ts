import { posunDen } from './brana';
import { isDepartureExpired } from './token';
import type { GuideLang } from './types';

/** Kolik dní po odjezdu zůstane host v seznamu poděkování. */
export const PODEKOVANI_DNU = 3;

/** Denní upomínka majiteli (Praha). */
export const HODINA_PODEKOVANI = 17;

export type PodekovaniKanal = 'whatsapp' | 'sms' | 'email';

/**
 * Zpráva v den odjezdu (WhatsApp, SMS, e-mail).
 * Schváleno majitelem 20. 11. 2026. Pod text patří prázdný řádek a odkaz.
 */
export const ZPRAVA_PODEKOVANI: Record<GuideLang, string> = {
  cs: `Dobrý den, doufáme, že jste dojeli v pořádku. Moc děkujeme, že jste byli našimi hosty. V průvodci na vás čeká krátký vzkaz od nás a malý dárek na příští pobyt.`,
  en: `Hello, we hope you got home safely. Thank you so much for being our guests. In the guide there is a short note from us and a small gift for your next stay.`,
  de: `Guten Tag, wir hoffen, Sie sind gut nach Hause gekommen. Vielen Dank, dass Sie unsere Gäste waren. Im Leitfaden wartet eine kurze Nachricht von uns und ein kleines Geschenk für Ihren nächsten Aufenthalt.`,
  pl: `Dzień dobry, mamy nadzieję, że dotarliście szczęśliwie. Bardzo dziękujemy, że byliście naszymi gośćmi. W przewodniku czeka krótka wiadomość od nas i mały prezent na kolejny pobyt.`,
  uk: `Добрий день, сподіваємося, ви добре доїхали. Дуже дякуємо, що були нашими гостями. У путівнику на вас чекає коротке повідомлення від нас і невеликий подарунок на наступне перебування.`,
  'zh-Hant': `您好，希望您已平安到家。非常感謝您成為我們的客人。指南裡有我們的一小段話，以及下次入住的小禮物。`,
  sv: `Hej, vi hoppas att ni har kommit hem väl. Tack så mycket för att ni var våra gäster. I guiden väntar ett kort meddelande från oss och en liten present till nästa vistelse.`,
  es: `Buenos días, esperamos que hayan llegado bien. Muchas gracias por haber sido nuestros huéspedes. En la guía les espera un breve mensaje nuestro y un pequeño detalle para la próxima estancia.`,
  hu: `Jó napot kívánunk, reméljük, szerencsésen hazaértek. Nagyon köszönjük, hogy a vendégeink voltak. Az útmutatóban egy rövid üzenet vár Önökre tőlünk, és egy kis ajándék a következő tartózkodáshoz.`,
  da: `Hej, vi håber, I er kommet godt hjem. Mange tak fordi I var vores gæster. I guiden venter en kort besked fra os og en lille gave til jeres næste ophold.`,
  fr: `Bonjour, nous espérons que vous êtes bien rentrés. Merci beaucoup d’avoir été nos hôtes. Dans le guide vous attend un court message de notre part et un petit cadeau pour votre prochain séjour.`,
  it: `Buongiorno, speriamo che siate arrivati a casa bene. Grazie di cuore per essere stati nostri ospiti. Nella guida vi aspetta un breve messaggio da parte nostra e un piccolo regalo per il prossimo soggiorno.`,
  pt: `Bom dia, esperamos que tenham chegado bem. Muito obrigado por terem sido nossos hóspedes. No guia espera-vos uma breve mensagem nossa e um pequeno presente para a próxima estadia.`,
};

/**
 * Zpráva další dny po odjezdu. Schváleno majitelem 20. 11. 2026.
 * Bez „ještě jednou“. Sleva 5 % jen uvnitř stránky, ne ve zprávě.
 */
export const ZPRAVA_PODEKOVANI_POZDEJI: Record<GuideLang, string> = {
  cs: `Dobrý den, děkujeme, že jste byli našimi hosty. V průvodci na vás čeká krátký vzkaz od nás a malý dárek na příští pobyt.`,
  en: `Hello, thank you for being our guests. In the guide there is a short note from us and a small gift for your next stay.`,
  de: `Guten Tag, danke, dass Sie unsere Gäste waren. Im Leitfaden wartet eine kurze Nachricht von uns und ein kleines Geschenk für Ihren nächsten Aufenthalt.`,
  pl: `Dzień dobry, dziękujemy, że byliście naszymi gośćmi. W przewodniku czeka krótka wiadomość od nas i mały prezent na kolejny pobyt.`,
  uk: `Добрий день, дякуємо, що були нашими гостями. У путівнику на вас чекає коротке повідомлення від нас і невеликий подарунок на наступне перебування.`,
  'zh-Hant': `您好，感謝您成為我們的客人。指南裡有我們的一小段話，以及下次入住的小禮物。`,
  sv: `Hej, tack för att ni var våra gäster. I guiden väntar ett kort meddelande från oss och en liten present till nästa vistelse.`,
  es: `Buenos días, gracias por haber sido nuestros huéspedes. En la guía les espera un breve mensaje nuestro y un pequeño detalle para la próxima estancia.`,
  hu: `Jó napot kívánunk, köszönjük, hogy a vendégeink voltak. Az útmutatóban egy rövid üzenet vár Önökre tőlünk, és egy kis ajándék a következő tartózkodáshoz.`,
  da: `Hej, tak fordi I var vores gæster. I guiden venter en kort besked fra os og en lille gave til jeres næste ophold.`,
  fr: `Bonjour, merci d’avoir été nos hôtes. Dans le guide vous attend un court message de notre part et un petit cadeau pour votre prochain séjour.`,
  it: `Buongiorno, grazie per essere stati nostri ospiti. Nella guida vi aspetta un breve messaggio da parte nostra e un piccolo regalo per il prossimo soggiorno.`,
  pt: `Bom dia, obrigado por terem sido nossos hóspedes. No guia espera-vos uma breve mensagem nossa e um pequeno presente para a próxima estadia.`,
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

/** `odjezd < dnes` → pozdější verze. Chybí-li odjezd nebo dnes → den odjezdu. */
export function textPodekovani(
  lang: GuideLang | null,
  odkaz: string | null,
  odjezd?: string | null,
  dnes?: string | null,
): string {
  const pozdeji = Boolean(odjezd && dnes && odjezd < dnes);
  const mapa = pozdeji ? ZPRAVA_PODEKOVANI_POZDEJI : ZPRAVA_PODEKOVANI;
  const zaklad = lang && lang in mapa ? mapa[lang] : mapa.en;
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
