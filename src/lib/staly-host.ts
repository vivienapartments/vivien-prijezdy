import { maUdajeFirmy, type FakturaUdaje } from './faktura';
import { normalizujTelefon } from './telefon';
import type { PrehledRadek } from './prehled';
import type { RezervaceRecord } from './store';

export type PredchoziPobyt = {
  rezervace: string;
  prijezd: string | null;
  odjezd: string | null;
  apartman: string | null;
  jmeno: string;
};

export type StalyHostInfo = {
  shoda: 'pevna' | 'slaba';
  /** Pořadí tohoto pobytu u stejného hosta (1 = první). */
  poradi: number;
  naposledyMesic: string | null;
  naposledyApartman: string | null;
  predchozi: PredchoziPobyt[];
  telefonZMinula: string | null;
  emailZMinula: string | null;
  /** ISO z dřívější karty, když tam už byl kontakt uložen. */
  kontaktZMinula: string | null;
  /** Firma z posledního pobytu (IČO, e-mail účetní…). null = zatím žádná. */
  fakturaZMinula: FakturaUdaje | null;
};

function jeRelayEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return e.endsWith('@guest.booking.com') || e.includes('@guest.airbnb.') || e.endsWith('@m.airbnb.com');
}

function normalizujEmail(email: string | null | undefined): string | null {
  const e = (email || '').trim().toLowerCase();
  if (!e || !e.includes('@') || jeRelayEmail(e)) return null;
  return e;
}

function normalizujJmeno(jmeno: string | null | undefined): string {
  return (jmeno || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function telefonKlic(row: PrehledRadek): string | null {
  const raw = row.telefonText || row.jinyTelefonText;
  if (!raw) return null;
  const t = normalizujTelefon(raw, row.narodnost);
  if (!t || t.nejisty) return null;
  return t.ulozeny;
}

function mesicZ(ymd: string | null): string | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m] = ymd.split('-');
  return `${Number(m)}/${y}`;
}

function shodaPevna(a: PrehledRadek, b: PrehledRadek): boolean {
  const ta = telefonKlic(a);
  const tb = telefonKlic(b);
  if (ta && tb && ta === tb) return true;
  const ea = normalizujEmail(a.email);
  const eb = normalizujEmail(b.email);
  if (ea && eb && ea === eb) return true;
  return false;
}

/**
 * Stejné jméno (bez diakritiky).
 * Národnost: když ji mají obě karty a liší se, není to shoda.
 * Když na nové kartě z BH ještě chybí, stačí jméno (Booking e-mail se stejně neshodí).
 */
function shodaSlaba(a: PrehledRadek, b: PrehledRadek): boolean {
  const ja = normalizujJmeno(a.jmeno);
  const jb = normalizujJmeno(b.jmeno);
  if (!ja || !jb || ja !== jb) return false;
  const na = (a.narodnost || '').trim().toUpperCase();
  const nb = (b.narodnost || '').trim().toUpperCase();
  if (na && nb && na !== nb) return false;
  return true;
}

function drivejsi(a: PrehledRadek, b: PrehledRadek): boolean {
  const da = a.prijezd || a.odjezd || '';
  const db = b.prijezd || b.odjezd || '';
  if (!da || !db) return false;
  return da < db;
}

/** Z už načtených karet. Bez dalších dotazů do Upstash. */
export function stalyHostPro(radek: PrehledRadek, vsechny: PrehledRadek[]): StalyHostInfo | null {
  if (radek.nelzeNacist || radek.stav === 'zruseno') return null;
  const pevni: PrehledRadek[] = [];
  const slabi: PrehledRadek[] = [];
  for (const jiny of vsechny) {
    if (jiny.rezervace === radek.rezervace || jiny.nelzeNacist || jiny.stav === 'zruseno') continue;
    if (shodaPevna(radek, jiny)) pevni.push(jiny);
    else if (shodaSlaba(radek, jiny)) slabi.push(jiny);
  }
  const shoda: 'pevna' | 'slaba' | null = pevni.length ? 'pevna' : slabi.length ? 'slaba' : null;
  if (!shoda) return null;
  const skupina = shoda === 'pevna' ? pevni : slabi;
  const predchozi = skupina
    .filter((p) => drivejsi(p, radek))
    .sort((a, b) => (b.prijezd || '').localeCompare(a.prijezd || ''))
    .map(
      (p): PredchoziPobyt => ({
        rezervace: p.rezervace,
        prijezd: p.prijezd,
        odjezd: p.odjezd,
        apartman: p.apartman,
        jmeno: p.jmeno || 'Host',
      }),
    );
  if (!predchozi.length && skupina.every((p) => !drivejsi(p, radek) && !drivejsi(radek, p))) {
    /* stejný den / bez data – ber jako stálého, když je aspoň jedna jiná karta */
  }
  const vsechnyStejne = [...skupina, radek].sort((a, b) => (a.prijezd || '').localeCompare(b.prijezd || ''));
  const poradi = Math.max(1, vsechnyStejne.findIndex((r) => r.rezervace === radek.rezervace) + 1);
  const naposled = predchozi[0] || null;
  const drivejsiKarty = predchozi
    .map((p) => skupina.find((r) => r.rezervace === p.rezervace))
    .filter((r): r is PrehledRadek => Boolean(r));

  let telefonZMinula: string | null = null;
  let emailZMinula: string | null = null;
  let kontaktZMinula: string | null = null;
  let fakturaZMinula: FakturaUdaje | null = null;
  for (const d of drivejsiKarty) {
    if (!telefonZMinula && d.telefonText) telefonZMinula = d.telefonText;
    if (!emailZMinula && normalizujEmail(d.email)) emailZMinula = d.email;
    if (!kontaktZMinula && d.kontaktUlozenKdy) kontaktZMinula = d.kontaktUlozenKdy;
    if (!fakturaZMinula && maUdajeFirmy(d.faktura)) fakturaZMinula = d.faktura;
  }

  if (!predchozi.length && poradi <= 1) return null;

  return {
    shoda,
    poradi: predchozi.length ? predchozi.length + 1 : poradi,
    naposledyMesic: naposled ? mesicZ(naposled.prijezd || naposled.odjezd) : null,
    naposledyApartman: naposled?.apartman || null,
    predchozi,
    telefonZMinula: !radek.telefonText ? telefonZMinula : null,
    emailZMinula: !normalizujEmail(radek.email) ? emailZMinula : null,
    kontaktZMinula: !radek.kontaktUlozenKdy ? kontaktZMinula : null,
    fakturaZMinula,
  };
}

export function textStalehoHosta(info: StalyHostInfo): string {
  if (info.shoda === 'slaba') return 'Možná stálý host';
  const casti = [`Stálý host · ${info.poradi}. pobyt`];
  if (info.naposledyMesic) {
    casti.push(
      info.naposledyApartman
        ? `naposledy ${info.naposledyMesic}, ${info.naposledyApartman}`
        : `naposledy ${info.naposledyMesic}`,
    );
  }
  return casti.join(' · ');
}

/** Doplní stalyHost na všechny karty jedním průchodem. */
export function doplnStaleHosty(radky: PrehledRadek[]): PrehledRadek[] {
  return radky.map((r) => {
    if (r.nelzeNacist) return r;
    const info = stalyHostPro(r, radky);
    return info ? { ...r, stalyHost: info } : { ...r, stalyHost: null };
  });
}

function telefonKlicRec(rec: RezervaceRecord): string | null {
  for (const raw of [rec.telefon, rec.telefonRezervace]) {
    if (!raw) continue;
    const t = normalizujTelefon(raw, rec.narodnost);
    if (t && !t.nejisty) return t.ulozeny;
  }
  return null;
}

function emailKlicRec(rec: RezervaceRecord): string | null {
  return normalizujEmail(rec.emailHosta);
}

function shodaPevnaRec(a: RezervaceRecord, b: RezervaceRecord): boolean {
  const ta = telefonKlicRec(a);
  const tb = telefonKlicRec(b);
  if (ta && tb && ta === tb) return true;
  const ea = emailKlicRec(a);
  const eb = emailKlicRec(b);
  if (ea && eb && ea === eb) return true;
  return false;
}

function drivejsiRec(a: RezervaceRecord, b: RezervaceRecord): boolean {
  const da = a.prijezd || a.odjezd || '';
  const db = b.prijezd || b.odjezd || '';
  if (!da || !db) return false;
  return da < db;
}

const HISTORIE_DOPLNENI = 'Doplněno z minulého pobytu';

/**
 * Při pevné shodě (telefon nebo e-mail) doplní prázdná pole z posledního dřívějšího pobytu.
 * Slabá shoda (jen jméno) nic. `branaRegistrovano` se nepřebírá. Jednou do historie.
 */
export function doplnUdajeZMinulehoPobytu(
  nova: RezervaceRecord,
  vsechny: RezervaceRecord[],
  cas: string,
): RezervaceRecord {
  if (nova.stav === 'zruseno') return nova;
  if (nova.historie.some((h) => h.co.startsWith(HISTORIE_DOPLNENI))) return nova;

  const predchozi = vsechny
    .filter(
      (jiny) =>
        jiny.rezervace !== nova.rezervace &&
        jiny.stav !== 'zruseno' &&
        shodaPevnaRec(nova, jiny) &&
        drivejsiRec(jiny, nova),
    )
    .sort((a, b) => (b.prijezd || '').localeCompare(a.prijezd || ''));
  if (!predchozi.length) return nova;

  const zdroj = predchozi[0];
  const casti: string[] = [];
  const out: RezervaceRecord = { ...nova };

  if (!out.telefon && !out.telefonRezervace) {
    if (zdroj.telefon) {
      out.telefon = zdroj.telefon;
      out.telefonWa = zdroj.telefonWa;
      out.telefonPuvodni = zdroj.telefonPuvodni;
      casti.push('telefon');
    } else if (zdroj.telefonRezervace) {
      out.telefonRezervace = zdroj.telefonRezervace;
      out.telefonRezervaceWa = zdroj.telefonRezervaceWa;
      out.telefonRezervacePuvodni = zdroj.telefonRezervacePuvodni;
      casti.push('telefon');
    }
  }

  if (!emailKlicRec(out) && emailKlicRec(zdroj)) {
    out.emailHosta = zdroj.emailHosta;
    casti.push('e-mail');
  }

  if (!out.jazyk && zdroj.jazyk) {
    out.jazyk = zdroj.jazyk;
    casti.push('jazyk');
  }

  if (!(out.telefonBrana || '').trim() && (zdroj.telefonBrana || '').trim()) {
    out.telefonBrana = zdroj.telefonBrana;
    casti.push('telefon k bráně');
  }

  if (!(out.spz || '').trim() && !out.spzPujcene && (zdroj.spz || '').trim()) {
    out.spz = zdroj.spz;
    casti.push('SPZ');
  }

  if (!casti.length) return nova;
  return {
    ...out,
    historie: [...out.historie, { cas, co: `${HISTORIE_DOPLNENI} (${casti.join(', ')})` }].slice(-40),
  };
}
