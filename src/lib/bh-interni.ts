import { nightsBetween, parseCzechDate } from './dates';
import { normalizujTelefon } from './telefon';
import type { AptId } from './types';
import { aptFromCzechName } from './vivien-data';

export type InterniDruh = 'nova' | 'zmena' | 'zruseni';

export type InterniUdaje = {
  druh: InterniDruh;
  rezervace: string | null;
  apartman: AptId | null;
  prijezd: string | null;
  odjezd: string | null;
  noci: number | null;
  osob: number | null;
  jmeno: string | null;
  krestni: string | null;
  email: string | null;
  telefon: string | null;
  telefonWa: string | null;
  zdroj: string | null;
  vytvoreno: string | null;
  checkinUrl: string | null;
  /** Co se nepodařilo přečíst. Bez osobních údajů. */
  chybi: string[];
};

const LABELY = new Set([
  'nová rezervace',
  'modifikace rezervace',
  'storno rezervace',
  'zrušení rezervace',
  'rezervace',
  'číslo',
  'zarezervováno',
  'příjezd',
  'odjezd',
  'agentura',
  'rate type',
  'detail',
  'klient',
  'email',
  'telefon',
  'celková cena',
  'rezervované pokoje',
]);

/** Předmět interního mailu z Better Hotelu. Check-in (VIVIEN-DATA) sem nepatří. */
export function jeInterniPredmet(subject: string): boolean {
  return /\|\s*(nová rezervace|modifikace rezervace|zrušení rezervace)\b/i.test(subject);
}

export function druhZeSubjectu(subject: string): InterniDruh | null {
  if (/\|\s*nová rezervace\b/i.test(subject)) return 'nova';
  if (/\|\s*modifikace rezervace\b/i.test(subject)) return 'zmena';
  if (/\|\s*zrušení rezervace\b/i.test(subject)) return 'zruseni';
  return null;
}

function emailZHlavicky(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

export function fromBetterHotel(from: string): boolean {
  const email = emailZHlavicky(from);
  const at = email.lastIndexOf('@');
  const domain = at >= 0 ? email.slice(at + 1) : '';
  return domain === 'better-hotel.com' || domain.endsWith('.better-hotel.com');
}

/**
 * Authentication-Results musí mít dkim=pass pro better-hotel.com nebo jeho subdoménu.
 * Samotné spf=pass nestačí.
 */
export function authDkimPass(header: string | null | undefined): boolean {
  if (!header) return false;
  return /dkim=pass\b[\s\S]{0,180}(?:[a-z0-9-]+\.)*better-hotel\.com\b/i.test(header);
}

/** Obě podmínky. Když hlavička chybí, platí jen ověřený podpis (dkimBetterHotel). */
export function puvodInterniOk(mail: {
  from: string;
  authenticationResults?: string | null;
  dkimBetterHotel?: boolean;
}): boolean {
  if (!fromBetterHotel(mail.from)) return false;
  if (mail.authenticationResults) return authDkimPass(mail.authenticationResults);
  return mail.dkimBetterHotel === true;
}

function decode(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function radkyZTela(html: string, text: string): string[] {
  const raw = html || text || '';
  const plain = decode(raw)
    .replace(/\r\n/g, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|td|th)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return plain
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function hodnota(lines: string[], label: string): string | null {
  const i = lines.findIndex((l) => l.toLowerCase() === label);
  if (i < 0) return null;
  const next = lines[i + 1];
  if (!next || LABELY.has(next.toLowerCase())) return null;
  return next;
}

function datum(raw: string | null): string | null {
  if (!raw) return null;
  return parseCzechDate(raw.replace(/\s+/g, ''));
}

function zdrojZAgentury(raw: string | null): string | null {
  const s = (raw || '').trim();
  if (!s) return null;
  if (/booking/i.test(s)) return 'Booking';
  if (/air\s*bn/i.test(s)) return 'Airbnb';
  if (/přím|prim[aá]|direct|^web$|recepce/i.test(s)) return 'přímá';
  return s;
}

function jmenoZKlienta(raw: string | null): { jmeno: string | null; krestni: string | null } {
  const s = (raw || '').replace(/\s+/g, ' ').trim();
  if (!s || LABELY.has(s.toLowerCase())) return { jmeno: null, krestni: null };
  const prvni = s.split(' ')[0] || null;
  return { jmeno: s, krestni: prvni };
}

function emailZ(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/[^\s<>"]+@[^\s<>"]+\.[^\s<>"]+/);
  return m ? m[0].replace(/[.,;]+$/, '') : null;
}

function telefonZ(raw: string | null): { telefon: string | null; telefonWa: string | null } {
  if (!raw || !/\d/.test(raw)) return { telefon: null, telefonWa: null };
  const tel = normalizujTelefon(raw);
  if (!tel) return { telefon: null, telefonWa: null };
  return { telefon: tel.ulozeny, telefonWa: tel.wa };
}

function pokoj(lines: string[]): { apartman: AptId | null; osob: number | null } {
  for (const line of lines) {
    if (!/počet hostů/i.test(line)) continue;
    const m = line.match(/^(.*?)\s*[-–]\s*počet hostů\s*:\s*(\d+)/i);
    if (!m) continue;
    const osob = Number(m[2]);
    const name = m[1].replace(/\s*\[stornováno\]\s*/gi, '').trim();
    const apartman = aptFromCzechName(name) || aptFromCzechName(name.split('(')[0]?.trim() || '');
    return { apartman, osob: Number.isFinite(osob) && osob > 0 ? Math.floor(osob) : null };
  }
  return { apartman: null, osob: null };
}

function jeSledovaci(href: string): boolean {
  let host = '';
  try {
    host = new URL(href).hostname.toLowerCase();
  } catch {
    return true;
  }
  if (host === 'www.w3.org' || host.endsWith('w3.org')) return true;
  if (host.endsWith('better-hotel.com')) return true;
  if (host.endsWith('mailjet.com') || host.endsWith('booking.com')) return true;
  if (host.includes('facebook') || host.includes('google') || host.includes('gstatic')) return true;
  return false;
}

function checkinOdkaz(html: string, text: string): string | null {
  const hrefs = [...html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)].map((m) => decode(m[1]));
  const plain = [...`${html}\n${text}`.matchAll(/https?:\/\/[^\s<>"']+/gi)].map((m) => m[0]);
  for (const href of [...hrefs, ...plain]) {
    const cisty = href.replace(/[),.;]+$/, '');
    if (jeSledovaci(cisty)) continue;
    if (/check-?in|online-check|onlinecheck/i.test(cisty)) return cisty;
  }
  return null;
}

/** Přečte interní e-mail. Když předmět není tenhle druh, vrátí null. */
export function parsujInterni(subject: string, html = '', text = ''): InterniUdaje | null {
  const druh = druhZeSubjectu(subject);
  if (!druh) return null;
  const lines = radkyZTela(html, text);
  const zeSubjectu = (subject.match(/#\s*(\d{4,})/) || [])[1] || null;
  const zTela = (hodnota(lines, 'číslo') || '').match(/(\d{4,})/);
  const rezervace = zeSubjectu || (zTela ? zTela[1] : null);
  const prijezd = datum(hodnota(lines, 'příjezd'));
  const odjezd = datum(hodnota(lines, 'odjezd'));
  const pokojUdaj = pokoj(lines);
  const jmeno = jmenoZKlienta(hodnota(lines, 'klient'));
  const email = emailZ(hodnota(lines, 'email'));
  const telefon = telefonZ(hodnota(lines, 'telefon'));
  const chybi: string[] = [];
  if (!pokojUdaj.apartman) chybi.push('apartmán');
  if (!prijezd) chybi.push('příjezd');
  if (!odjezd) chybi.push('odjezd');
  if (!pokojUdaj.osob) chybi.push('počet osob');
  if (!jmeno.jmeno) chybi.push('jméno');
  if (!telefon.telefon) chybi.push('telefon');

  return {
    druh,
    rezervace,
    apartman: pokojUdaj.apartman,
    prijezd,
    odjezd,
    noci: prijezd && odjezd ? nightsBetween(prijezd, odjezd) : null,
    osob: pokojUdaj.osob,
    jmeno: jmeno.jmeno,
    krestni: jmeno.krestni,
    email,
    telefon: telefon.telefon,
    telefonWa: telefon.telefonWa,
    zdroj: zdrojZAgentury(hodnota(lines, 'agentura')),
    vytvoreno: datum(hodnota(lines, 'zarezervováno')),
    checkinUrl: checkinOdkaz(html, text),
    chybi,
  };
}

export function vetaChybi(chybi: string[]): string | null {
  if (!chybi.length) return null;
  if (chybi.length === 1) return `Chybí ${chybi[0]}.`;
  const posledni = chybi[chybi.length - 1];
  return `Chybí ${chybi.slice(0, -1).join(', ')} a ${posledni}.`;
}
