import nodemailer from 'nodemailer';
import { PARKING_OWNER_PHONE } from './constants';
import type { GuideLang } from './types';
import { PREDMET_ODJEZDU } from './odjezd';
import type { DruhZpravy } from './whatsapp-zprava';

const TELEFON = PARKING_OWNER_PHONE;

function jazyk(lang: GuideLang | null): GuideLang {
  return lang || 'en';
}

const PRIJEZD: Record<GuideLang, string> = {
  cs: 'VIVIEN · Váš příjezd {datum}',
  en: 'VIVIEN · Your arrival {datum}',
  de: 'VIVIEN · Ihre Anreise {datum}',
  pl: 'VIVIEN · Wasz przyjazd {datum}',
  uk: 'VIVIEN · Ваш приїзд {datum}',
  'zh-Hant': 'VIVIEN · 您的抵達 {datum}',
  es: 'VIVIEN · Su llegada {datum}',
  fr: 'VIVIEN · Votre arrivée {datum}',
  it: 'VIVIEN · Il vostro arrivo {datum}',
  sv: 'VIVIEN · Er ankomst {datum}',
  hu: 'VIVIEN · Az érkezésük {datum}',
};

const CHECKIN: Record<GuideLang, string> = {
  cs: 'VIVIEN · Online check-in {datum}',
  en: 'VIVIEN · Online check-in {datum}',
  de: 'VIVIEN · Online-Check-in {datum}',
  pl: 'VIVIEN · Check-in online {datum}',
  uk: 'VIVIEN · Онлайн-реєстрація {datum}',
  'zh-Hant': 'VIVIEN · 線上入住登記 {datum}',
  es: 'VIVIEN · Check-in en línea {datum}',
  fr: 'VIVIEN · Check-in en ligne {datum}',
  it: 'VIVIEN · Check-in online {datum}',
  sv: 'VIVIEN · Online-incheckning {datum}',
  hu: 'VIVIEN · Online bejelentkezés {datum}',
};

const PRUVODCE: Record<GuideLang, string> = {
  cs: 'VIVIEN · Váš průvodce {datum}',
  en: 'VIVIEN · Your guide {datum}',
  de: 'VIVIEN · Ihr Leitfaden {datum}',
  pl: 'VIVIEN · Wasz przewodnik {datum}',
  uk: 'VIVIEN · Ваш путівник {datum}',
  'zh-Hant': 'VIVIEN · 您的指南 {datum}',
  es: 'VIVIEN · Su guía {datum}',
  fr: 'VIVIEN · Votre guide {datum}',
  it: 'VIVIEN · La vostra guida {datum}',
  sv: 'VIVIEN · Er guide {datum}',
  hu: 'VIVIEN · Az útmutatójuk {datum}',
};

const BRANA: Record<GuideLang, string> = {
  cs: 'VIVIEN · Údaje k bráně {datum}',
  en: 'VIVIEN · Gate details {datum}',
  de: 'VIVIEN · Angaben zur Schranke {datum}',
  pl: 'VIVIEN · Dane do szlabanu {datum}',
  uk: 'VIVIEN · Дані для шлагбаума {datum}',
  'zh-Hant': 'VIVIEN · 閘門資料 {datum}',
  es: 'VIVIEN · Datos de la barrera {datum}',
  fr: 'VIVIEN · Données de la barrière {datum}',
  it: 'VIVIEN · Dati della sbarra {datum}',
  sv: 'VIVIEN · Uppgifter till bommen {datum}',
  hu: 'VIVIEN · A sorompó adatai {datum}',
};

export function datumPobytu(ymd: string | null): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '';
  const [rok, mesic, den] = ymd.split('-');
  return `${Number(den)}. ${Number(mesic)}. ${rok}`;
}

export function predmetZpravy(id: DruhZpravy, lang: GuideLang | null, prijezd: string | null): string {
  const tabulka =
    id === 'checkin' ? CHECKIN : id === 'neotevrel' ? PRUVODCE : id === 'brana' ? BRANA : id === 'odjezd' ? PREDMET_ODJEZDU : PRIJEZD;
  return tabulka[jazyk(lang)].replaceAll('{datum}', datumPobytu(prijezd));
}

/** Stejný text jako zpráva. Když v něm číslo není, doplní se pod podpis. */
export function textEmailuHostovi(text: string, doplnitTelefon = true): string {
  if (!doplnitTelefon || (text.includes('604') && text.includes('692'))) return text;
  return `${text.trim()}\n\n${TELEFON}`;
}

function uvodniHtml(text: string, doplnitTelefon: boolean): string {
  const bezpecny = text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  const cislo = `<span style="white-space:nowrap">${TELEFON.replaceAll(' ', '&nbsp;')}</span>`;
  const sCislem = doplnitTelefon
    ? bezpecny.replaceAll(TELEFON.replaceAll(' ', '\u00A0'), cislo).replaceAll(TELEFON, cislo)
    : bezpecny;
  return sCislem
    .split('\n\n')
    .map((odstavec) => `<p style="margin:0 0 0.9em;text-align:justify;hyphens:auto">${odstavec.replaceAll('\n', '<br>')}</p>`)
    .join('');
}

export function htmlEmailuHostovi(text: string, lang: GuideLang | null = 'cs', doplnitTelefon = true): string {
  return `<div lang="${lang || 'en'}" style="font-family:Georgia,serif;font-size:17px;line-height:1.45;color:#1c1714">${uvodniHtml(textEmailuHostovi(text, doplnitTelefon), doplnitTelefon)}</div>`;
}

export async function posliEmailZpravy(opts: {
  to: string;
  subject: string;
  text: string;
  lang?: GuideLang | null;
  /** Schválený dotaz na odjezd číslo nepřidává. */
  telefon?: boolean;
}): Promise<void> {
  if (process.env.VITEST) throw new Error('V testu se e-mail neposílá.');
  const majitel = process.env.MAJITEL_EMAIL?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_HESLO?.trim();
  if (!majitel) throw new Error('MAJITEL_EMAIL chybí');
  if (!user || !pass || pass.startsWith('SEM_NAPIS')) throw new Error('SMTP není vyplněné');
  const testMode = (process.env.TEST_REZIM ?? '1') !== '0';
  const transporter = nodemailer.createTransport({
    host: 'smtp.seznam.cz',
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  const doplnit = opts.telefon !== false;
  const text = textEmailuHostovi(opts.text, doplnit);
  await transporter.sendMail({
    from: `VIVIEN Apartments <${user}>`,
    to: testMode ? majitel : opts.to,
    bcc: testMode ? undefined : majitel,
    subject: testMode ? `[TEST] ${opts.subject}` : opts.subject,
    text,
    html: htmlEmailuHostovi(opts.text, opts.lang, doplnit),
  });
}
