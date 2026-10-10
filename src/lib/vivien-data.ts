import apartmanyJson from '@/data/apartmany.json';
import { duvod, problemEmailu, type Duvod } from './chyby';
import { nightsBetween, parseCzechDate } from './dates';
import { parseDatumVytvoreni } from './poplatek';
import type { AptId, GuideLang } from './types';
import { APT_IDS } from './types';

export type VivienData = {
  rezervace: string;
  apartman: AptId;
  prijezd: string;
  odjezd: string;
  noci: number | null;
  osob: number | null;
  email: string;
  narodnost: string | null;
  jazyk: GuideLang;
  osloveni: string | null;
  /** Křestní jméno hosta z BH: GUEST_NAME: (GUEST_NAME). */
  jmeno: string | null;
  zdroj: string | null;
  klic: string | null;
  /** PIN apartmánu z BH (ACCESS_PIN), mění se podle pobytu. */
  accessPin: string | null;
};

export type ParseResult =
  | { ok: true; data: VivienData; warnings: string[] }
  | { ok: false; reason: string };

type AptRow = { id: AptId; nazev: { cs: string; en: string } };

const apartmany = (apartmanyJson as { apartmany: AptRow[] }).apartmany;
const jazykyMap = (apartmanyJson as { jazyky: Record<string, string> }).jazyky;

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\u00a0/g, ' ');
}

function htmlToText(input: string): string {
  return decodeHtmlEntities(
    input
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
      .replace(/<a[^>]*href=["']mailto:([^"']+)["'][^>]*>/gi, '$1 ')
      .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi, '$1 ')
      .replace(/<[^>]+>/g, ' '),
  );
}

function extractBlock(raw: string): string | null {
  const text = raw.includes('<') ? htmlToText(raw) : raw;
  const normalized = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/^[\s>]+/, '').trimEnd())
    .join('\n');

  const start = normalized.search(/VIVIEN-DATA\s+v1/i);
  if (start < 0) return null;
  const after = normalized.slice(start);
  const end = after.search(/\n\s*KONEC\s*(?:\n|$)/i);
  if (end < 0) return null;
  return after.slice(0, end);
}

function parseFields(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || /^VIVIEN-DATA/i.test(trimmed)) continue;
    const m = trimmed.match(/^([A-ZÁÉÍÓÚÝŽČŘŠĎŤŇ_]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
    out[key] = decodeHtmlEntities(m[2].trim());
  }
  return out;
}

export function aptFromCzechName(name: string): AptId | null {
  const n = name.trim().toLowerCase();
  for (const a of apartmany) {
    if (a.nazev.cs.toLowerCase() === n || a.nazev.en.toLowerCase() === n) {
      return a.id;
    }
    const combo = `${a.nazev.cs} (${a.nazev.en})`.toLowerCase();
    const slash = `${a.nazev.cs} / ${a.nazev.en}`.toLowerCase();
    if (n === combo || n === slash) return a.id;
  }
  const asId = name.trim().toUpperCase() as AptId;
  return APT_IDS.includes(asId) ? asId : null;
}

export function langFromNarodnost(raw: string | null | undefined): GuideLang {
  if (!raw) return 'en';
  // BH někdy pošle "TWN", jindy "Taiwan" / "TW" / "Taiwan, Province of China"
  const code = raw
    .trim()
    .toUpperCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '');
  const mapped = jazykyMap[code];
  if (
    mapped === 'cs' ||
    mapped === 'en' ||
    mapped === 'de' ||
    mapped === 'pl' ||
    mapped === 'uk' ||
    mapped === 'zh-Hant' ||
    mapped === 'es' ||
    mapped === 'fr' ||
    mapped === 'it'
  ) {
    return mapped;
  }
  // Ostatní národnosti / neznámý kód → angličtina
  return 'en';
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function parseVivienData(raw: string): ParseResult {
  const block = extractBlock(raw);
  if (!block) {
    return { ok: false, reason: 'Chybí blok VIVIEN-DATA v1 … KONEC' };
  }
  const f = parseFields(block);
  const warnings: string[] = [];

  const rezervace = (f.REZERVACE || '').trim();
  const apartmanRaw = (f.APARTMAN || '').trim();
  const prijezdRaw = (f.PRIJEZD || '').trim();
  const odjezdRaw = (f.ODJEZD || '').trim();
  const emailRaw = (f.EMAIL || '').trim();
  const emailMatch = emailRaw.match(/[^\s<>"]+@[^\s<>"]+\.[^\s<>"]+/);
  const email = emailMatch ? emailMatch[0] : emailRaw;

  if (!rezervace) return { ok: false, reason: 'Chybí REZERVACE' };
  if (!apartmanRaw) return { ok: false, reason: 'Chybí APARTMAN' };
  if (!prijezdRaw) return { ok: false, reason: 'Chybí PRIJEZD' };
  if (!odjezdRaw) return { ok: false, reason: 'Chybí ODJEZD' };
  if (!email) return { ok: false, reason: 'Chybí EMAIL' };
  if (!looksLikeEmail(email)) return { ok: false, reason: 'EMAIL nemá platný tvar' };

  const apartman = aptFromCzechName(apartmanRaw);
  if (!apartman) return { ok: false, reason: `Neznámý apartmán: ${apartmanRaw}` };

  const prijezd = parseCzechDate(prijezdRaw);
  if (!prijezd) return { ok: false, reason: `Neplatný PRIJEZD: ${prijezdRaw}` };
  const odjezd = parseCzechDate(odjezdRaw);
  if (!odjezd) return { ok: false, reason: `Neplatný ODJEZD: ${odjezdRaw}` };

  const computedNights = nightsBetween(prijezd, odjezd);
  if (computedNights == null) {
    return { ok: false, reason: 'ODJEZD musí být po PRIJEZDU' };
  }

  const noci: number | null = computedNights;
  if (f.NOCI) {
    const declared = Number(f.NOCI);
    if (Number.isFinite(declared) && declared > 0 && declared !== computedNights) {
      warnings.push(`NOCI v datech=${declared}, z dat=${computedNights}`);
    }
  }

  let osob: number | null = null;
  if (f.OSOB) {
    const o = Number(f.OSOB);
    if (!Number.isFinite(o) || o < 1) return { ok: false, reason: `Neplatné OSOB: ${f.OSOB}` };
    osob = Math.floor(o);
  }

  const narodnost = f.NARODNOST?.trim() || null;

  const accessPin = cleanAccessPin(f.ACCESS_PIN || f.ACCESSPIN || '');
  if (!accessPin) return { ok: false, reason: 'Chybí ACCESS_PIN' };

  // BH šablona: GUEST_NAME: (GUEST_NAME) — křestní jméno do pozdravu. OSLOVENI se nepoužívá.
  const jmeno = cleanGuestFirstName(
    f.GUEST_NAME || f.JMENO || f.FIRSTNAME || f.FIRST_NAME || '',
  );

  return {
    ok: true,
    data: {
      rezervace,
      apartman,
      prijezd,
      odjezd,
      noci,
      osob,
      email,
      narodnost,
      jazyk: langFromNarodnost(narodnost),
      osloveni: f.OSLOVENI?.trim() || null,
      jmeno,
      zdroj: f.ZDROJ?.trim() || null,
      klic: f.KLIC?.trim() || null,
      accessPin,
    },
    warnings,
  };
}

function cleanAccessPin(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\(?\s*ACCESS_?PIN\s*\)?$/i.test(s)) return null;
  if (s === '—' || s === '-' || s === '–') return null;
  return s;
}

/** Křestní jméno z BH; prázdný / nevyplněný merge field → null. */
export function cleanGuestFirstName(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, ' ');
  if (!s) return null;
  if (/^\([A-Z0-9_ ]+\)$/i.test(s)) return null;
  if (/^\(?\s*(JMENO|GUEST_?NAME|MAIN_GUEST_NAME|FIRST_?NAME|FIRSTNAME)\s*\)?$/i.test(s)) return null;
  if (s === '—' || s === '-' || s === '–') return null;
  // max 40 znaků, bez e-mailu / čísla rezervace
  if (s.length > 40 || /@|\d{5,}/.test(s)) return null;
  return s;
}

/** Jméno jen do tabulky. Do pozdravu nepatří. */
export function jmenoProPrehled(
  guestName: string | null | undefined,
  osloveni: string | null | undefined,
  surname?: string | null,
): string | null {
  const fromGuest = cleanGuestFirstName(guestName || '');
  const fromSurname = cleanGuestFirstName(surname || '');
  if (fromGuest && fromSurname) return `${fromGuest} ${fromSurname}`;
  if (fromGuest) return fromGuest;
  if (fromSurname) return fromSurname;
  const raw = (osloveni || '').trim();
  if (!raw) return null;
  const cleaned = raw
    .replace(/[,.]+$/g, '')
    .replace(/\b(vážený|vážená|vázena|pane|paní|pani|herr|frau|geehrter|geehrte|sehr|dear|mr|mrs|ms)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const last = cleaned.split(' ').filter(Boolean).pop() || '';
  return cleanGuestFirstName(last);
}

export type MailInspection = {
  rezervace: string | null;
  apartman: AptId | null;
  prijezd: string | null;
  odjezd: string | null;
  noci: number | null;
  osob: number | null;
  email: string | null;
  jazyk: GuideLang | null;
  /** Jméno do tabulky (GUEST_NAME a GUEST_SURNAME, jinak příjmení z OSLOVENI). */
  jmeno: string | null;
  vytvoreno: string | null;
  /** Křestní jméno do pozdravu v e-mailu. */
  krestni: string | null;
  narodnost: string | null;
  osloveni: string | null;
  accessPin: string | null;
  duvody: Duvod[];
};

function rezervaceZeSubjectu(subject: string): string | null {
  const m = subject.match(/#\s*(\d{4,})/);
  return m ? m[1] : null;
}

/** Přečte, co z e-mailu jde. Chyby neskončí dřív, pokud je číslo rezervace. */
export function inspectVivienMail(raw: string, subject = ''): MailInspection {
  const duvody: Duvod[] = [];
  const block = extractBlock(raw);
  const zeSubjectu = rezervaceZeSubjectu(subject);

  if (!block) {
    if (zeSubjectu) duvody.push(duvod('chybi_blok'));
    return {
      rezervace: zeSubjectu,
      apartman: null,
      prijezd: null,
      odjezd: null,
      noci: null,
      osob: null,
      email: null,
      jazyk: null,
      jmeno: null,
      krestni: null,
      narodnost: null,
      osloveni: null,
      accessPin: null,
      vytvoreno: null,
      duvody,
    };
  }

  const f = parseFields(block);
  const rezervace = (f.REZERVACE || '').trim() || zeSubjectu;
  const apartmanRaw = (f.APARTMAN || '').trim();
  const prijezdRaw = (f.PRIJEZD || '').trim();
  const odjezdRaw = (f.ODJEZD || '').trim();
  const emailRaw = (f.EMAIL || '').trim();
  const emailMatch = emailRaw.match(/[^\s<>"]+@[^\s<>"]+/);
  const emailKandidat = emailMatch ? emailMatch[0] : emailRaw;
  const problem = problemEmailu(emailKandidat);
  let email: string | null = null;
  if (problem === 'chybi') duvody.push(duvod('chybi_email'));
  else if (problem === 'spatny') duvody.push(duvod('spatny_email', emailKandidat));
  else email = emailKandidat.replace(/[.,;]+$/, '');

  let apartman: AptId | null = null;
  if (!apartmanRaw) duvody.push(duvod('neznamy_apartman', 'chybí'));
  else {
    apartman = aptFromCzechName(apartmanRaw);
    if (!apartman) duvody.push(duvod('neznamy_apartman', apartmanRaw));
  }

  const prijezd = prijezdRaw ? parseCzechDate(prijezdRaw) : null;
  const odjezd = odjezdRaw ? parseCzechDate(odjezdRaw) : null;
  let noci: number | null = null;
  if (!prijezd || !odjezd) {
    duvody.push(duvod('spatne_datum'));
  } else {
    noci = nightsBetween(prijezd, odjezd);
    if (noci == null) duvody.push(duvod('odjezd_pred_prijezdem'));
    else if (f.NOCI) {
      const declared = Number(f.NOCI);
      if (Number.isFinite(declared) && declared > 0 && declared !== noci) {
        duvody.push(duvod('noci_nesedi'));
      }
    }
  }

  let osob: number | null = null;
  if (!f.OSOB?.trim()) duvody.push(duvod('chybi_osoby'));
  else {
    const o = Number(f.OSOB);
    if (!Number.isFinite(o) || o < 1) duvody.push(duvod('chybi_osoby'));
    else osob = Math.floor(o);
  }

  const osloveni = f.OSLOVENI?.trim() || null;
  const narodnost = f.NARODNOST?.trim() || null;
  const accessPin = cleanAccessPin(f.ACCESS_PIN || f.ACCESSPIN || '');
  if (!accessPin) duvody.push(duvod('chybi_pin'));
  const vytvoreno = parseDatumVytvoreni(f.DATE);

  return {
    rezervace,
    apartman,
    prijezd,
    odjezd,
    noci,
    osob,
    email,
    jazyk: langFromNarodnost(narodnost),
    jmeno: jmenoProPrehled(f.GUEST_NAME, osloveni, f.GUEST_SURNAME),
    krestni: cleanGuestFirstName(f.GUEST_NAME || ''),
    narodnost,
    osloveni,
    accessPin,
    vytvoreno,
    duvody,
  };
}
