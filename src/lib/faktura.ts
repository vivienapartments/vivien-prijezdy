import { denPraha, posunDen } from './brana';

export type FakturaTyp = 'cz' | 'zahranici';

export type FakturaUdaje = {
  typ: FakturaTyp;
  ico?: string;
  nazev?: string;
  adresa?: string;
  zeme?: string;
  dic?: string;
  email?: string;
  poznamka?: string;
  zadal: 'host' | 'majitel';
  kdy: string;
  upraveno?: string;
  hotovo?: string | null;
};

type RecFaktury = {
  rezervace: string;
  jmeno: string | null;
  apartman: string | null;
  odjezd: string | null;
  stav: string;
  faktura: FakturaUdaje | null;
};

const MAX_POLE = 200;
const MAX_POZNAMKA = 500;
const MAX_ICO_ZAHRANICI = 30;

export function normalizujIco(raw: string): string {
  return String(raw || '')
    .replace(/\s+/g, '')
    .replace(/\D/g, '')
    .slice(0, 8);
}

/** Registrační číslo zahraniční firmy (bez kontrolního součtu). */
export function normalizujIcoZahranici(raw: string): string {
  return String(raw || '')
    .trim()
    .slice(0, MAX_ICO_ZAHRANICI);
}

/** Výchozí typ firmy podle jazyka průvodce. */
export function vychoziTypFaktury(lang: string | null | undefined): FakturaTyp {
  return lang === 'cs' ? 'cz' : 'zahranici';
}

/** Kontrolní součet českého IČO (8 číslic). */
export function jePlatneIco(ico: string): boolean {
  const c = normalizujIco(ico);
  if (!/^\d{8}$/.test(c)) return false;
  let soucet = 0;
  for (let i = 0; i < 7; i += 1) soucet += Number(c[i]) * (8 - i);
  const zbytek = soucet % 11;
  const kontrola = zbytek === 0 ? 1 : zbytek === 1 ? 0 : 11 - zbytek;
  return kontrola === Number(c[7]);
}

function orez(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export function nactiFakturu(raw: unknown): FakturaUdaje | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.typ !== 'cz' && r.typ !== 'zahranici') return null;
  if (r.zadal !== 'host' && r.zadal !== 'majitel') return null;
  if (typeof r.kdy !== 'string' || !r.kdy) return null;
  return {
    typ: r.typ,
    ico: typeof r.ico === 'string' && r.ico ? r.ico : undefined,
    nazev: typeof r.nazev === 'string' && r.nazev ? r.nazev : undefined,
    adresa: typeof r.adresa === 'string' && r.adresa ? r.adresa : undefined,
    zeme: typeof r.zeme === 'string' && r.zeme ? r.zeme : undefined,
    dic: typeof r.dic === 'string' && r.dic ? r.dic : undefined,
    email: typeof r.email === 'string' && r.email ? r.email : undefined,
    poznamka: typeof r.poznamka === 'string' && r.poznamka ? r.poznamka : undefined,
    zadal: r.zadal,
    kdy: r.kdy,
    upraveno: typeof r.upraveno === 'string' && r.upraveno ? r.upraveno : undefined,
    hotovo: typeof r.hotovo === 'string' && r.hotovo ? r.hotovo : r.hotovo === null ? null : undefined,
  };
}

export type FakturaVstup = {
  typ?: string;
  ico?: string;
  nazev?: string;
  adresa?: string;
  zeme?: string;
  dic?: string;
  email?: string;
  poznamka?: string;
};

export function sestavFakturu(
  vstup: FakturaVstup,
  zadal: 'host' | 'majitel',
  ted: string,
  prev: FakturaUdaje | null,
): { ok: true; faktura: FakturaUdaje } | { ok: false; duvod: 'chybi_ico' | 'chybi_udaje' } {
  const typ: FakturaTyp = vstup.typ === 'zahranici' ? 'zahranici' : 'cz';
  const ico = typ === 'cz' ? normalizujIco(vstup.ico || '') : normalizujIcoZahranici(vstup.ico || '');
  const nazev = orez(vstup.nazev, MAX_POLE);
  const adresa = orez(vstup.adresa, MAX_POLE);
  const zeme = orez(vstup.zeme, MAX_POLE);
  const dic = orez(vstup.dic, MAX_POLE);
  const email = orez(vstup.email, MAX_POLE);
  const poznamka = orez(vstup.poznamka, MAX_POZNAMKA);

  if (typ === 'cz') {
    if (!jePlatneIco(ico)) return { ok: false, duvod: 'chybi_ico' };
  } else if (!nazev || !adresa || !zeme) {
    return { ok: false, duvod: 'chybi_udaje' };
  }

  return {
    ok: true,
    faktura: {
      typ,
      ...(ico ? { ico } : {}),
      ...(nazev ? { nazev } : {}),
      ...(adresa ? { adresa } : {}),
      ...(zeme ? { zeme } : {}),
      ...(dic ? { dic } : {}),
      ...(email ? { email } : {}),
      ...(poznamka ? { poznamka } : {}),
      zadal,
      kdy: prev?.kdy || ted,
      upraveno: prev ? ted : undefined,
      hotovo: null,
    },
  };
}

export type AresVysledek = {
  ok: boolean;
  nazev?: string;
  adresa?: string;
  dic?: string;
};

export async function dotazAres(icoRaw: string, signal?: AbortSignal): Promise<AresVysledek> {
  const ico = normalizujIco(icoRaw);
  if (!jePlatneIco(ico)) return { ok: false };
  try {
    const res = await fetch(
      `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}`,
      {
        signal,
        headers: { Accept: 'application/json' },
      },
    );
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as {
      obchodniJmeno?: string;
      dic?: string;
      sidlo?: { textovaAdresa?: string };
    };
    const nazev = orez(data.obchodniJmeno, MAX_POLE);
    const adresa = orez(data.sidlo?.textovaAdresa, MAX_POLE);
    const dic = orez(data.dic, MAX_POLE);
    if (!nazev && !adresa) return { ok: false };
    return { ok: true, ...(nazev ? { nazev } : {}), ...(adresa ? { adresa } : {}), ...(dic ? { dic } : {}) };
  } catch {
    return { ok: false };
  }
}

export function shrnutiFaktury(f: FakturaUdaje | null | undefined): string {
  if (!f) return '';
  if (f.nazev && f.ico) return `${f.nazev}, IČO ${f.ico}`;
  if (f.nazev) return f.nazev;
  if (f.ico) return `IČO ${f.ico}`;
  return 'Údaje na fakturu';
}

export function fakturaCeka(rec: Pick<RecFaktury, 'faktura'>): boolean {
  return Boolean(rec.faktura && !rec.faktura.hotovo);
}

/** Odjezd dnes nebo dřív. Zrušené se v přehledu neukazují (záznam v úložišti zůstane). */
export function fakturaKeVystaveni(
  rec: Pick<RecFaktury, 'faktura' | 'odjezd' | 'stav'>,
  dnes: string,
): boolean {
  if (rec.stav === 'zruseno') return false;
  if (!fakturaCeka(rec) || !rec.odjezd) return false;
  return rec.odjezd <= dnes;
}

export function fakturaPozdeji(
  rec: Pick<RecFaktury, 'faktura' | 'odjezd' | 'stav'>,
  dnes: string,
): boolean {
  if (!fakturaCeka(rec) || !rec.odjezd) return false;
  if (rec.stav === 'zruseno') return false;
  return rec.odjezd > dnes;
}

export function fakturyKeVystaveni<T extends RecFaktury>(list: T[], dnes: string): T[] {
  return list
    .filter((r) => fakturaKeVystaveni(r, dnes))
    .sort(
      (a, b) =>
        String(a.odjezd).localeCompare(String(b.odjezd)) || a.rezervace.localeCompare(b.rezervace),
    );
}

export function fakturyPozdeji<T extends RecFaktury>(list: T[], dnes: string): T[] {
  return list
    .filter((r) => fakturaPozdeji(r, dnes))
    .sort(
      (a, b) =>
        String(a.odjezd).localeCompare(String(b.odjezd)) || a.rezervace.localeCompare(b.rezervace),
    );
}

export function fakturyVyrizene<T extends RecFaktury>(list: T[], dnes: string, dni = 30): T[] {
  const od = posunDen(dnes, -dni);
  return list
    .filter((r) => r.faktura?.hotovo && r.odjezd && r.odjezd >= od)
    .sort((a, b) => String(b.faktura?.hotovo).localeCompare(String(a.faktura?.hotovo)));
}

export function textTelegramFaktury(
  sablona: string,
  rec: Pick<RecFaktury, 'jmeno' | 'apartman' | 'odjezd' | 'faktura'>,
): string {
  return sablona
    .replace('{host}', rec.jmeno || 'Host')
    .replace('{apartman}', rec.apartman || '—')
    .replace('{firma}', shrnutiFaktury(rec.faktura) || 'firma')
    .replace('{datum}', rec.odjezd || '—');
}

export function seznamFakturProTelegram(list: RecFaktury[]): string {
  return list
    .map((r) => {
      const kdo = (r.jmeno || 'Host').split(/\s+/)[0] || 'Host';
      return `${kdo} ${r.apartman || ''}`.trim();
    })
    .join(', ');
}

export function denProFaktury(now = new Date()): string {
  return denPraha(now);
}

/** Co na faktuře ještě chybí (pro WhatsApp hostovi). */
export function coChybiNaFakture(f: FakturaUdaje | null | undefined): string[] {
  if (!f) return [];
  const out: string[] = [];
  if (!f.nazev) out.push('název firmy');
  if (!f.adresa) out.push('adresa');
  if (f.typ === 'zahranici' && !f.zeme) out.push('země');
  if (!f.email) out.push('e-mail');
  return out;
}

export type ZpravaFakturyVysledek =
  | { ok: true; text: string; druh: 'pruvodce' | 'checkin' }
  | { ok: false; duvod: 'chybi_checkin_odkaz' };

/** Sestaví zprávu o faktuře: s průvodcem, nebo s check-inem, nebo chyba. */
export function sestavZpravuFaktury(
  sablonaPruvodce: string,
  sablonaCheckin: string,
  odkazPruvodce: string | null | undefined,
  checkinUrl: string | null | undefined,
): ZpravaFakturyVysledek {
  const pruvodce = String(odkazPruvodce || '').trim();
  if (pruvodce) {
    const odkaz = pruvodce.includes('#') ? pruvodce : `${pruvodce}#faktura`;
    return { ok: true, text: sablonaPruvodce.replace(/\{odkaz\}/g, odkaz), druh: 'pruvodce' };
  }
  const checkin = String(checkinUrl || '').trim();
  if (checkin) {
    return { ok: true, text: sablonaCheckin.replace(/\{odkaz\}/g, checkin), druh: 'checkin' };
  }
  return { ok: false, duvod: 'chybi_checkin_odkaz' };
}

/** Text přání / zprávy zmiňuje fakturu (bez ohledu na velikost písmen). */
export function textZminujeFakturu(text: string, slova: readonly string[]): boolean {
  const t = String(text || '').toLowerCase();
  if (!t) return false;
  return slova.some((s) => t.includes(String(s).toLowerCase()));
}
