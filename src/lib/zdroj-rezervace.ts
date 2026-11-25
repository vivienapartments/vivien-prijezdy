/**
 * Zdroj rezervace (Booking / Airbnb / přímá) a párování s poptávkou.
 */

import { jeZdrojAirbnb, jeZdrojBooking } from './poplatek';
import type { PoptavkaZaznam } from './poptavka';
import { normalizujTelefon } from './telefon';
import type { RezervaceRecord } from './store';

export type ZdrojKanal = 'Booking' | 'Airbnb' | 'přímá';

export type ZdrojRozhodnuti = {
  zdroj: string | null;
  /** Čeká na volbu majitele (Přímá / Booking / Airbnb). */
  zdrojCeka: boolean;
  /** Spárovaná poptávka (přímá). */
  poptavkaId: string | null;
  /** Pro Telegram, když zdrojCeka. */
  telegram?: string;
};

/** Adresa obsahuje booking / airbnb / expedia (bez ohledu na doménu). */
export function emailJeAgenturni(email: string | null | undefined): boolean {
  const e = (email || '').trim().toLowerCase();
  if (!e.includes('@')) return false;
  return /booking|airbnb|expedia/.test(e);
}

export function zdrojZAgentury(raw: string | null | undefined): string | null {
  const s = (raw || '').trim();
  if (!s) return null;
  if (/booking/i.test(s)) return 'Booking';
  if (/air\s*bn/i.test(s)) return 'Airbnb';
  if (/expedia/i.test(s)) return 'Booking';
  if (/přím|prim[aá]|direct|^web$|recepce|vivien/i.test(s)) return 'přímá';
  return s;
}

export function zdrojZEmailu(email: string | null | undefined): ZdrojKanal | null {
  const e = (email || '').trim().toLowerCase();
  if (!e.includes('@')) return null;
  if (/airbnb/.test(e)) return 'Airbnb';
  if (/booking|expedia/.test(e)) return 'Booking';
  return null;
}

function normalizujJmeno(jmeno: string | null | undefined): string {
  return (jmeno || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function prijmeniZ(jmeno: string | null | undefined): string {
  const casti = normalizujJmeno(jmeno).split(' ').filter(Boolean);
  if (casti.length < 2) return casti[0] || '';
  return casti[casti.length - 1];
}

function telefonyShoda(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  const ta = normalizujTelefon(a);
  const tb = normalizujTelefon(b);
  if (!ta || !tb || ta.nejisty || tb.nejisty) return false;
  return ta.ulozeny === tb.ulozeny;
}

/** Spáruje rezervaci s poptávkou (příjmení + termín, případně telefon). */
export function sparujPoptavku(
  vstup: {
    jmeno?: string | null;
    prijezd?: string | null;
    odjezd?: string | null;
    telefon?: string | null;
  },
  poptavky: PoptavkaZaznam[],
): PoptavkaZaznam | null {
  const prijmeni = prijmeniZ(vstup.jmeno);
  if (!prijmeni || !vstup.prijezd || !vstup.odjezd) return null;
  const kandidati = poptavky.filter((p) => {
    if (p.prijezd !== vstup.prijezd || p.odjezd !== vstup.odjezd) return false;
    const pj = prijmeniZ(p.jmeno);
    if (!pj || pj !== prijmeni) return false;
    return true;
  });
  if (!kandidati.length) return null;
  if (kandidati.length === 1) return kandidati[0];
  if (vstup.telefon) {
    const tel = kandidati.find((p) => telefonyShoda(p.telefon, vstup.telefon));
    if (tel) return tel;
  }
  return kandidati[0];
}

/**
 * Určí zdroj při nové rezervaci z BH (interní mail).
 * Agentura / e-mail → jistý zdroj.
 * Bez agentury → párování poptávky → přímá, jinak čeká na majitele.
 */
export function rozhodniZdroj(vstup: {
  agentura?: string | null;
  email?: string | null;
  jmeno?: string | null;
  prijezd?: string | null;
  odjezd?: string | null;
  telefon?: string | null;
  /** Už uložený zdroj (ruční / dřívější). */
  zdrojUz?: string | null;
  /** Majitel už potvrdil (zdrojCeka=false a zdroj je). */
  zdrojPotvrzenRucne?: boolean;
  poptavky?: PoptavkaZaznam[];
}): ZdrojRozhodnuti {
  if (vstup.zdrojPotvrzenRucne && vstup.zdrojUz) {
    return { zdroj: vstup.zdrojUz, zdrojCeka: false, poptavkaId: null };
  }

  const zEmailu = zdrojZEmailu(vstup.email);
  if (zEmailu) {
    return { zdroj: zEmailu, zdrojCeka: false, poptavkaId: null };
  }

  const zAgentury = zdrojZAgentury(vstup.agentura);
  if (zAgentury && (jeZdrojBooking(zAgentury) || jeZdrojAirbnb(zAgentury) || /přím/i.test(zAgentury))) {
    return { zdroj: zAgentury, zdrojCeka: false, poptavkaId: null };
  }
  if (zAgentury) {
    // Neznámá agentura (např. Booking-like string už pokryt) — necháme text, nečekáme.
    return { zdroj: zAgentury, zdrojCeka: false, poptavkaId: null };
  }

  // Bez agentury = ruční rezervace v kalendáři BH.
  const popt = sparujPoptavku(vstup, vstup.poptavky || []);
  if (popt) {
    return {
      zdroj: 'přímá',
      zdrojCeka: false,
      poptavkaId: popt.id,
    };
  }

  const jmeno = (vstup.jmeno || '').trim() || '?';
  const termin =
    vstup.prijezd && vstup.odjezd ? `${vstup.prijezd}–${vstup.odjezd}` : 'termín neznámý';
  return {
    zdroj: null,
    zdrojCeka: true,
    poptavkaId: null,
    telegram: `Rezervace bez zdroje: ${jmeno}, ${termin}. Je přímá?`,
  };
}

/** Obchodní zprávy a klubová útrata jen když zdroj není ve stavu „čeká“. */
export function smíObchodniAktivita(rec: Pick<RezervaceRecord, 'zdrojCeka'> | null | undefined): boolean {
  return !rec?.zdrojCeka;
}

/** Marketing SMS/WA jen na telefon z check-inu. */
export function telefonJeZCheckinu(
  telefonCil: string | null | undefined,
  rec: Pick<RezervaceRecord, 'telefon' | 'telefonWa' | 'telefonRezervace' | 'telefonRezervaceWa'> | null | undefined,
): boolean {
  const cil = (telefonCil || '').trim();
  if (!cil || !rec) return false;
  const checkiny = [rec.telefon, rec.telefonWa].filter(Boolean) as string[];
  if (!checkiny.length) return false;
  const rezervacni = [rec.telefonRezervace, rec.telefonRezervaceWa].filter(Boolean) as string[];
  for (const c of checkiny) {
    if (c === cil || telefonyShoda(c, cil)) {
      // Když je stejný jako rezervace a check-in chybí odděleně, pořád ber jako check-in jen když rec.telefon je.
      return true;
    }
  }
  for (const r of rezervacni) {
    if (r === cil || telefonyShoda(r, cil)) return false;
  }
  return false;
}

export function smíUtrataKlubu(rec: Pick<RezervaceRecord, 'zdrojCeka' | 'zdroj'> | null | undefined): boolean {
  if (!rec) return false;
  if (rec.zdrojCeka) return false;
  if (!rec.zdroj) return false;
  return true;
}
