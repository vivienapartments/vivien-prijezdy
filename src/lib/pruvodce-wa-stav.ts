/**
 * Stav „e-mail s průvodcem odešel, WhatsApp ještě ne“.
 * Bez Node závislostí (smí do PrehledClient).
 */

const ODESLANI_EMAIL =
  /Průvodce odeslán|Odesláno znovu|Opraveno a odesláno/i;

/** Názvy průvodcovských zpráv v historii (WhatsApp / SMS). */
const WA_PRUVODCE = [
  'Průvodce · po e-mailu',
  'Průvodce · 1. stupeň',
  'Průvodce · 1. stupeň (čas)',
  'Průvodce · 2. stupeň',
  'Průvodce · 3. stupeň',
  'Neotevřel průvodce',
  'Průvodce nerozbalen',
  'Den příjezdu, průvodce nerozbalen',
  'Průvodce, důrazný',
  'Poslední výzva (nedojezd)',
];

export function jeOdeslaniPruvodceEmail(co: string): boolean {
  return ODESLANI_EMAIL.test(co || '');
}

function jeWhatsAppPruvodce(co: string): boolean {
  return WA_PRUVODCE.some((n) => co === `WhatsApp: ${n}` || co === `SMS: ${n}`);
}

/**
 * E-mail s průvodcem už odešel a po něm ještě nešel WhatsApp / SMS s průvodcem.
 * Po klepnutí na WhatsApp (zápis do historie) zhasne.
 */
export function cekaWhatsAppPoPruvodci(historie: { co: string }[]): boolean {
  let lastEmail = -1;
  let lastWa = -1;
  for (let i = 0; i < historie.length; i++) {
    const co = historie[i]?.co || '';
    if (jeOdeslaniPruvodceEmail(co)) lastEmail = i;
    if (jeWhatsAppPruvodce(co)) lastWa = i;
  }
  return lastEmail >= 0 && lastWa < lastEmail;
}

export function textUpozorneniPoPruvodci(opts: {
  apartman: string | null;
  jmeno: string | null;
  rezervace: string;
  telefonWa: string | null;
}): string {
  const casti = (opts.jmeno || '').trim().split(/\s+/).filter(Boolean);
  const prijmeni = casti.length ? casti[casti.length - 1] : opts.rezervace;
  const kdo = `${opts.apartman || 'Apartmán'} ${prijmeni}`;
  if (opts.telefonWa) {
    return `${kdo}: průvodce odešel e-mailem. Pošlete WhatsApp.`;
  }
  return `${kdo}: průvodce odešel e-mailem. Chybí telefon na WhatsApp.`;
}
