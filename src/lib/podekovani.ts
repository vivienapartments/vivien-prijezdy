import { posunDen } from './brana';
import { isDepartureExpired } from './token';
import type { GuideLang } from './types';

/** Kolik dní po odjezdu zůstane host v seznamu poděkování. */
export const PODEKOVANI_DNU = 14;

/** Denní upomínka majiteli (Praha). */
export const HODINA_PODEKOVANI = 17;

export type PodekovaniKanal = 'whatsapp' | 'sms' | 'email';

/**
 * Zpráva v den odjezdu (WhatsApp, SMS, e-mail).
 * Doporučení: dárek pro blízké, 21. 11. 2026.
 * Schváleno majitelem 21. 11. 2026 (bez rodu). Pod text patří prázdný řádek a odkaz.
 */
export const ZPRAVA_PODEKOVANI: Record<GuideLang, string> = {
  cs: 'Dobrý den, doufáme, že cesta domů proběhla v pořádku. Moc děkujeme za vaši návštěvu. V průvodci na vás čeká krátký vzkaz od nás, malý dárek na příští pobyt a také dárek pro vaše blízké.',
  en: 'Hyvää päivää, toivomme, että kotimatka sujui hyvin. Kiitos paljon vierailustanne. Oppaassa teitä odottaa lyhyt viesti meiltä, pieni lahja seuraavaan majoitukseen ja myös lahja läheisillenne.',
  de: 'Guten Tag, wir hoffen, Ihre Heimreise ist gut verlaufen. Vielen Dank für Ihren Besuch bei uns. Im Leitfaden wartet eine kurze Nachricht von uns, ein kleines Geschenk für Ihren nächsten Aufenthalt und auch ein Geschenk für Ihre Liebsten.',
  pl: 'Dzień dobry, mamy nadzieję, że podróż do domu minęła dobrze. Bardzo dziękujemy za pobyt u nas. W przewodniku czeka krótka wiadomość od nas, mały prezent na kolejny pobyt, a także prezent dla Waszych bliskich.',
  uk: 'Добрий день, сподіваємося, дорога додому минула добре. Дуже дякуємо за ваш візит до нас. У путівнику на вас чекає коротке повідомлення від нас, невеликий подарунок на наступне перебування, а також подарунок для ваших близьких.',
  'zh-Hant': '您好，希望您回程一路平安。非常感謝您的光臨。指南裡有我們的一小段話、下次入住的小禮物，還有送給您親友的禮物。',
  sv: 'Hej, vi hoppas att hemresan gick bra. Tack så mycket för ert besök hos oss. I guiden väntar ett kort meddelande från oss, en liten present till nästa vistelse och även en present till era nära och kära.',
  es: 'Buenos días, esperamos que el viaje de vuelta haya ido bien. Muchas gracias por su visita. En la guía les espera un breve mensaje nuestro, un pequeño detalle para la próxima estancia y también un detalle para sus seres queridos.',
  hu: 'Jó napot kívánunk, reméljük, jól telt a hazaút. Nagyon köszönjük, hogy nálunk jártak. Az útmutatóban egy rövid üzenet vár Önökre tőlünk, egy kis ajándék a következő tartózkodáshoz, és egy ajándék az Önökhöz közel állóknak is.',
  da: 'Hej, vi håber, hjemrejsen gik godt. Mange tak for jeres besøg hos os. I guiden venter en kort besked fra os, en lille gave til jeres næste ophold og også en gave til jeres nærmeste.',
  fi: 'Hello, we hope your journey home went well. Thank you so much for staying with us. In the guide there is a short note from us, a small gift for your next stay and also a gift for the people close to you.',
  fr: 'Bonjour, nous espérons que votre retour s’est bien passé. Merci beaucoup pour votre séjour chez nous. Dans le guide vous attend un court message de notre part, un petit cadeau pour votre prochain séjour et aussi un cadeau pour vos proches.',
  it: 'Buongiorno, speriamo che il viaggio di ritorno sia andato bene. Grazie di cuore per il vostro soggiorno da noi. Nella guida vi aspetta un breve messaggio da parte nostra, un piccolo regalo per il prossimo soggiorno e anche un regalo per le persone a voi care.',
  pt: 'Bom dia, esperamos que a viagem de regresso tenha corrido bem. Muito obrigado pela vossa estadia connosco. No guia espera-vos uma breve mensagem nossa, um pequeno presente para a próxima estadia e também um presente para as pessoas próximas.',
};

/**
 * Zpráva další dny po odjezdu. Doporučení: dárek pro blízké, 21. 11. 2026.
 * Schváleno majitelem 21. 11. 2026 (bez rodu).
 * Bez „ještě jednou“. Sleva 5 % jen uvnitř stránky, ne ve zprávě.
 */
export const ZPRAVA_PODEKOVANI_POZDEJI: Record<GuideLang, string> = {
  cs: 'Dobrý den, moc děkujeme za vaši návštěvu u nás. V průvodci na vás čeká krátký vzkaz od nás, malý dárek na příští pobyt a také dárek pro vaše blízké.',
  en: 'Hyvää päivää, kiitos paljon vierailustanne luonamme. Oppaassa teitä odottaa lyhyt viesti meiltä, pieni lahja seuraavaan majoitukseen ja myös lahja läheisillenne.',
  de: 'Guten Tag, vielen Dank für Ihren Besuch bei uns. Im Leitfaden wartet eine kurze Nachricht von uns, ein kleines Geschenk für Ihren nächsten Aufenthalt und auch ein Geschenk für Ihre Liebsten.',
  pl: 'Dzień dobry, bardzo dziękujemy za pobyt u nas. W przewodniku czeka krótka wiadomość od nas, mały prezent na kolejny pobyt, a także prezent dla Waszych bliskich.',
  uk: 'Добрий день, дуже дякуємо за ваш візит до нас. У путівнику на вас чекає коротке повідомлення від нас, невеликий подарунок на наступне перебування, а також подарунок для ваших близьких.',
  'zh-Hant': '您好，非常感謝您的光臨。指南裡有我們的一小段話、下次入住的小禮物，還有送給您親友的禮物。',
  sv: 'Hej, tack så mycket för ert besök hos oss. I guiden väntar ett kort meddelande från oss, en liten present till nästa vistelse och även en present till era nära och kära.',
  es: 'Buenos días, muchas gracias por su visita. En la guía les espera un breve mensaje nuestro, un pequeño detalle para la próxima estancia y también un detalle para sus seres queridos.',
  fr: 'Bonjour, merci beaucoup pour votre séjour chez nous. Dans le guide vous attend un court message de notre part, un petit cadeau pour votre prochain séjour et aussi un cadeau pour vos proches.',
  it: 'Buongiorno, grazie di cuore per il vostro soggiorno da noi. Nella guida vi aspetta un breve messaggio da parte nostra, un piccolo regalo per il prossimo soggiorno e anche un regalo per le persone a voi care.',
  pt: 'Bom dia, muito obrigado pela vossa estadia connosco. No guia espera-vos uma breve mensagem nossa, um pequeno presente para a próxima estadia e também um presente para as pessoas próximas.',
  hu: 'Jó napot kívánunk, nagyon köszönjük, hogy nálunk jártak. Az útmutatóban egy rövid üzenet vár Önökre tőlünk, egy kis ajándék a következő tartózkodáshoz, és egy ajándék az Önökhöz közel állóknak is.',
  da: 'Hej, mange tak for jeres besøg hos os. I guiden venter en kort besked fra os, en lille gave til jeres næste ophold og også en gave til jeres nærmeste.',
  fi: 'Hello, thank you so much for staying with us. In the guide there is a short note from us, a small gift for your next stay and also a gift for the people close to you.',
};

/** Předmět e-mailu. Schváleno 22. 11. 2026: VIVIEN · Děkujeme za návštěvu. */
export { PREDMET_PODEKOVANI, predmetPodekovani } from './podekovani-email';

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

function bezDiakritiky(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Host už odjel a byl předán. Bez limitu dnů (pro ruční hledání starších).
 */
export function muzePodekovatKdykoliv(
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
  return isDepartureExpired(r.odjezd, now);
}

/** Filtr ručního hledání na poděkování. Hlavní je jméno. */
export type HledaniPodekovaniFiltr = {
  jmeno?: string;
  rezervace?: string;
  telefon?: string;
};

/** Hledání odjetých hostů. Výchozí jméno (min. 2 znaky), volitelně rezervace / telefon. */
export function hledejProPodekovani<
  T extends {
    stav: string;
    predano?: string | null;
    odjezd: string | null;
    nedojezdKdy?: string | null;
    apartman: string | null;
    jmeno?: string | null;
    rezervace?: string;
    telefonText?: string | null;
    telefonWa?: string | null;
    jinyTelefonText?: string | null;
    jinyTelefonWa?: string | null;
  },
>(list: T[], filtr: HledaniPodekovaniFiltr | string, dnes: string, now = new Date()): T[] {
  const f: HledaniPodekovaniFiltr =
    typeof filtr === 'string' ? { jmeno: filtr } : filtr || {};
  const jmenoQ = bezDiakritiky(f.jmeno || '');
  const rezQ = String(f.rezervace || '')
    .trim()
    .toLowerCase();
  const telQ = String(f.telefon || '').replace(/\D/g, '');
  const maJmeno = jmenoQ.length >= 2;
  const maRez = rezQ.length >= 1;
  const maTel = telQ.length >= 3;
  if (!maJmeno && !maRez && !maTel) return [];

  const nalezeni = list.filter((r) => {
    if (!muzePodekovatKdykoliv(r, dnes, now)) return false;
    if (maJmeno && !bezDiakritiky(r.jmeno || '').includes(jmenoQ)) return false;
    if (maRez && !String(r.rezervace || '').toLowerCase().includes(rezQ)) return false;
    if (maTel) {
      const tel = [
        r.telefonText,
        r.telefonWa,
        r.jinyTelefonText,
        r.jinyTelefonWa,
      ]
        .map((x) => String(x || '').replace(/\D/g, ''))
        .join(' ');
      if (!tel.includes(telQ)) return false;
    }
    return true;
  });
  return seradPodekovani(nalezeni).slice(0, 25);
}
