import { posunDen } from './prehled';

/** Věta do historie, když se hostův e-mail vrátí ze spamu. */
export const VETA_SPAM = 'E-mail od hosta vytažen ze spamu';

/** Věta do „Co se stalo“, když se přesun nepodaří. */
export const VETA_SPAM_CHYBA = 'E-mail ve spamu se nepodařilo přesunout.';

export type DuvodSpamu = 'adresa' | 'booking' | 'airbnb' | 'predmet';

export type HostOkno = {
  rezervace: string;
  email: string | null;
  prijezd: string | null;
  odjezd: string | null;
};

export type SpamZprava = {
  uid: number;
  messageId: string;
  from: string;
  subject: string;
  date: Date | null;
};

/**
 * Přeposílací adresy, ze kterých píše host přes Booking nebo Airbnb.
 * guest.booking.com je zpráva z Bookingu.
 * m.expediapartnercentral.com je stejná zpráva, když Booking jede přes Expedia Partner Central.
 * reply.airbnb.com a guest.airbnb.com jsou odpovědi hosta z Airbnb.
 * Ostatní poštu z booking.com a airbnb.com (newslettery) nebereme.
 */
const PREPOSILACI: { duvod: 'booking' | 'airbnb'; koncovka: string }[] = [
  { duvod: 'booking', koncovka: '@guest.booking.com' },
  { duvod: 'booking', koncovka: '@m.expediapartnercentral.com' },
  { duvod: 'airbnb', koncovka: '@reply.airbnb.com' },
  { duvod: 'airbnb', koncovka: '@guest.airbnb.com' },
];

export function adresaZHlavicky(from: string): string {
  const vZavorkach = from.match(/<([^<>\s]+@[^<>\s]+)>/);
  const volna = from.match(/[^\s<>"']+@[^\s<>"']+/);
  const raw = (vZavorkach?.[1] || volna?.[0] || '').replace(/[.,;]+$/, '');
  return raw.trim().toLowerCase();
}

/** Příjezd od 14 dní zpátky, nebo host, který ještě neodjel. */
export function jeHostVOkne(host: HostOkno, dnes: string): boolean {
  const od = posunDen(dnes, -14);
  if (host.prijezd && host.prijezd >= od) return true;
  if (host.odjezd && host.odjezd >= dnes) return true;
  return false;
}

export function jeNovejsiNezDni(date: Date | null, ted: Date, dnu: number): boolean {
  if (!date || Number.isNaN(date.getTime())) return false;
  return date.getTime() >= ted.getTime() - dnu * 24 * 60 * 60 * 1000;
}

function predmetObsahuje(subject: string, kus: string): boolean {
  const a = subject.toLocaleLowerCase('cs').replace(/\s+/g, ' ').trim();
  const b = kus.toLocaleLowerCase('cs').replace(/\s+/g, ' ').trim();
  return Boolean(b) && a.includes(b);
}

function predmetMaCislo(subject: string, rezervace: string): boolean {
  if (!/^\d{6,}$/.test(rezervace)) return false;
  return new RegExp(`(^|\\D)${rezervace}(\\D|$)`).test(subject);
}

export function duvodVytazeni(
  zprava: Pick<SpamZprava, 'from' | 'subject' | 'date'>,
  hosti: HostOkno[],
  predmety: string[],
  ted: Date,
  dnes: string,
): { duvod: DuvodSpamu; rezervace: string[] } | null {
  if (!jeNovejsiNezDni(zprava.date, ted, 7)) return null;

  const email = adresaZHlavicky(zprava.from);
  const vOkne = hosti.filter((h) => jeHostVOkne(h, dnes));
  const podleAdresy = email
    ? vOkne.filter((h) => (h.email || '').trim().toLowerCase() === email).map((h) => h.rezervace)
    : [];
  if (podleAdresy.length) return { duvod: 'adresa', rezervace: podleAdresy };

  const preposilac = PREPOSILACI.find((p) => email.endsWith(p.koncovka));
  if (preposilac) {
    const cisla = vOkne.filter((h) => predmetMaCislo(zprava.subject, h.rezervace)).map((h) => h.rezervace);
    return { duvod: preposilac.duvod, rezervace: cisla };
  }

  const maPredmet = predmety.some((p) => predmetObsahuje(zprava.subject, p));
  const cisla = vOkne.filter((h) => predmetMaCislo(zprava.subject, h.rezervace)).map((h) => h.rezervace);
  if (maPredmet || cisla.length) return { duvod: 'predmet', rezervace: cisla };
  return null;
}

/** Předmět pro výpis majiteli. Cizí text neukazujeme, může v něm být jméno. */
export function predmetProVypis(subject: string, predmety: string[]): string {
  const nas = predmety.find((p) => predmetObsahuje(subject, p));
  return nas || '(vlastní předmět)';
}
