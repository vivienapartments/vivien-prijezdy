/**
 * Poptávka dalšího pobytu (věrnost / firma / doporučitel).
 * Etapa 1: bez ostrých cen z Better Hotelu.
 */

import { apartmany } from './guide-data';
import { NIKOL_PHONE, PARKING_OWNER_PHONE } from './constants';
import { odkazSmsPodekovani } from './podekovani';
import { doporucitelUiTexty } from './poptavka-doporucitel-ui';
import type { AptId, GuideLang } from './types';
import { APT_IDS } from './types';
import { odkazWhatsApp } from './whatsapp-zprava';

export type PoptavkaZdroj = 'vernost' | 'firma' | 'doporucitel' | 'obecna';

export type PoptavkaKanal = 'formular' | 'whatsapp' | 'sms';

export type PoptavkaZaznam = {
  id: string;
  cas: string;
  zdroj: PoptavkaZdroj;
  firmaKod: string | null;
  firmaNazev: string | null;
  doporucitelKod: string | null;
  rezervace: string | null;
  jmeno: string;
  telefon: string;
  prijezd: string;
  odjezd: string;
  apartmany: AptId[];
  libovolnyApartman: boolean;
  doprava: 'auto' | 'pesky' | 'nevim' | null;
  poznamka: string;
  jazyk: GuideLang;
  /** Jak host pokračoval. Chybí = klasický formulář. */
  kanal?: PoptavkaKanal | null;
  stav: 'nova' | 'hotovo';
};

/** Firmy spravujeme tady (kód v odkazu ?f=). Hesla tu nejsou. */
export const POPTAVKA_FIRMY: Record<string, { nazev: string }> = {
  raccoon: { nazev: 'RACCOON' },
};

export const POPTAVKA_SLEVA_PCT = 5;

export const POPTAVKA_TEL_HOVOR = NIKOL_PHONE;
export const POPTAVKA_TEL_ZALOHA = PARKING_OWNER_PHONE;
/** WhatsApp / SMS na pracovní číslo VIVIEN (stejné jako u hostů). */
export const POPTAVKA_TEL_ZPRAVY = PARKING_OWNER_PHONE;

export function normalizujKod(raw: string | null | undefined): string {
  return (raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 40);
}

export function firmaZKodu(kod: string | null | undefined): { kod: string; nazev: string } | null {
  const k = normalizujKod(kod);
  if (!k) return null;
  const f = POPTAVKA_FIRMY[k];
  if (!f) return null;
  return { kod: k, nazev: f.nazev };
}

export function ymdDnesPraha(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function jeYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Příjezd nejdřív dnes (Praha), odjezd po příjezdu. */
export function overTerminy(
  prijezd: string,
  odjezd: string,
  dnes = ymdDnesPraha(),
): { ok: true } | { ok: false; duvod: 'format' | 'minulost' | 'poradi' } {
  if (!jeYmd(prijezd) || !jeYmd(odjezd)) return { ok: false, duvod: 'format' };
  if (prijezd < dnes) return { ok: false, duvod: 'minulost' };
  if (odjezd <= prijezd) return { ok: false, duvod: 'poradi' };
  return { ok: true };
}

export function nociMezi(prijezd: string, odjezd: string): number {
  if (!jeYmd(prijezd) || !jeYmd(odjezd)) return 0;
  const a = Date.parse(`${prijezd}T12:00:00Z`);
  const b = Date.parse(`${odjezd}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.round((b - a) / 86_400_000);
}

export function nazevApartmanuCs(id: AptId): string {
  const a = apartmany.find((x) => x.id === id);
  return a?.nazev.cs || id;
}

export function formatDatumCs(ymd: string): string {
  if (!jeYmd(ymd)) return ymd;
  const [y, m, d] = ymd.split('-');
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

export function filtrApartmany(ids: string[]): AptId[] {
  const out: AptId[] = [];
  for (const raw of ids) {
    const id = String(raw || '').toUpperCase() as AptId;
    if ((APT_IDS as readonly string[]).includes(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

export type PoptavkaVstup = {
  zdroj: PoptavkaZdroj;
  firmaKod?: string | null;
  firmaNazev?: string | null;
  doporucitelKod?: string | null;
  rezervace?: string | null;
  jmeno: string;
  telefon: string;
  prijezd: string;
  odjezd: string;
  apartmany?: string[];
  libovolnyApartman?: boolean;
  doprava?: string | null;
  poznamka?: string;
  jazyk?: GuideLang;
  /** Cena za pobyt v Kč (už se slevou, pokud platí). */
  cenaKc?: number | null;
  /** Je uplatněná sleva 5 %. */
  cenaSeSlevou?: boolean;
};

export function sestavZpravuPoptavky(v: PoptavkaVstup): string {
  const kdo =
    v.zdroj === 'firma' && v.firmaNazev
      ? v.firmaNazev
      : v.zdroj === 'vernost' && v.rezervace
        ? `věrný host · rezervace ${v.rezervace}`
        : v.zdroj === 'doporucitel' && v.doporucitelKod
          ? `doporučitel ${v.doporucitelKod}`
          : 'poptávka z webu';
  const apts = filtrApartmany(v.apartmany || []);
  const aptText = v.libovolnyApartman
    ? 'apartmán libovolný (doporučíme)'
    : apts.length
      ? apts.map(nazevApartmanuCs).join(', ')
      : 'apartmán neuveden';
  const noci = nociMezi(v.prijezd, v.odjezd);
  const termin = `${formatDatumCs(v.prijezd)}–${formatDatumCs(v.odjezd)}${noci ? ` (${noci} noci)` : ''}`;
  const doprava =
    v.doprava === 'auto' ? 'přijede autem' : v.doprava === 'pesky' ? 'přijede pěšky' : '';
  const maCenu = typeof v.cenaKc === 'number' && v.cenaKc > 0;
  const radky = [
    `Dobrý den, ${kdo}.`,
    `Poptávka ubytování: ${aptText}, ${termin}.`,
    `${(v.jmeno || '').trim() || 'bez jména'}, ${(v.telefon || '').trim() || 'bez telefonu'}.`,
  ];
  if (maCenu) {
    const sleva =
      v.cenaSeSlevou || v.zdroj === 'vernost' || v.zdroj === 'doporucitel'
        ? ` (sleva ${POPTAVKA_SLEVA_PCT} %)`
        : '';
    radky.push(`Cena za pobyt ${Math.round(v.cenaKc!)} Kč${sleva}.`);
  } else {
    radky.push(
      `Sleva ${POPTAVKA_SLEVA_PCT} % (věrnostní / partnerská cesta). Cenu dopočítáme.`,
    );
  }
  if (doprava) radky.push(doprava.charAt(0).toUpperCase() + doprava.slice(1) + '.');
  const poz = (v.poznamka || '').trim();
  if (poz) radky.push(`Poznámka: ${poz.slice(0, 300)}`);
  let text = radky.join(' ');
  if (v.zdroj === 'doporucitel') {
    const z = doporucitelUiTexty(v.jazyk || 'cs').zpravaDoporuceni;
    text = `${text} ${z}`;
  }
  return text;
}

export function odkazWaPoptavky(text: string): string {
  const wa = POPTAVKA_TEL_ZPRAVY.replace(/\D/g, '');
  return odkazWhatsApp(wa, text);
}

export function odkazSmsPoptavky(text: string, ios: boolean): string {
  return odkazSmsPodekovani(POPTAVKA_TEL_ZPRAVY, text, ios);
}

export function textTelegramPoptavky(z: PoptavkaZaznam): string {
  const noci = nociMezi(z.prijezd, z.odjezd);
  const apt = z.libovolnyApartman
    ? 'libovolný'
    : z.apartmany.length
      ? z.apartmany.join('+')
      : '?';
  const kdo = z.firmaNazev || z.rezervace || z.doporucitelKod || z.zdroj;
  const zaklad = `Poptávka ${kdo}: ${z.jmeno}, ${z.prijezd}→${z.odjezd} (${noci} n.), ${apt}, ${z.telefon}`;
  if (z.kanal === 'whatsapp') return `${zaklad}\nhost pokračuje na WhatsApp`;
  if (z.kanal === 'sms') return `${zaklad}\nhost pokračuje na SMS`;
  return zaklad;
}

export function novyIdPoptavky(now = new Date()): string {
  return `p${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function nactiPoptavkySeznam(raw: unknown): PoptavkaZaznam[] {
  if (!Array.isArray(raw)) return [];
  const out: PoptavkaZaznam[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id : '';
    const cas = typeof r.cas === 'string' ? r.cas : '';
    const jmeno = typeof r.jmeno === 'string' ? r.jmeno.trim() : '';
    const telefon = typeof r.telefon === 'string' ? r.telefon.trim() : '';
    const prijezd = typeof r.prijezd === 'string' ? r.prijezd : '';
    const odjezd = typeof r.odjezd === 'string' ? r.odjezd : '';
    if (!id || !cas || !jeYmd(prijezd) || !jeYmd(odjezd)) continue;
    const zdroj =
      r.zdroj === 'vernost' || r.zdroj === 'firma' || r.zdroj === 'doporucitel' || r.zdroj === 'obecna'
        ? r.zdroj
        : 'obecna';
    const doprava =
      r.doprava === 'auto' || r.doprava === 'pesky' || r.doprava === 'nevim' ? r.doprava : null;
    out.push({
      id,
      cas,
      zdroj,
      firmaKod: typeof r.firmaKod === 'string' ? r.firmaKod : null,
      firmaNazev: typeof r.firmaNazev === 'string' ? r.firmaNazev : null,
      doporucitelKod: typeof r.doporucitelKod === 'string' ? r.doporucitelKod : null,
      rezervace: typeof r.rezervace === 'string' ? r.rezervace : null,
      jmeno: jmeno || '—',
      telefon: telefon || '—',
      prijezd,
      odjezd,
      apartmany: filtrApartmany(Array.isArray(r.apartmany) ? r.apartmany.map(String) : []),
      libovolnyApartman: Boolean(r.libovolnyApartman),
      doprava,
      poznamka: typeof r.poznamka === 'string' ? r.poznamka.slice(0, 500) : '',
      jazyk: (typeof r.jazyk === 'string' ? r.jazyk : 'cs') as GuideLang,
      kanal:
        r.kanal === 'whatsapp' || r.kanal === 'sms' || r.kanal === 'formular' ? r.kanal : null,
      stav: r.stav === 'hotovo' ? 'hotovo' : 'nova',
    });
    if (out.length >= 200) break;
  }
  return out;
}
