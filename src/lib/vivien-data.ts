import apartmanyJson from '@/data/apartmany.json';
import { nightsBetween, parseCzechDate } from './dates';
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
  const code = raw.trim().toUpperCase().replace(/\s+/g, '');
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

  let noci: number | null = computedNights;
  if (f.NOCI) {
    const declared = Number(f.NOCI);
    if (Number.isFinite(declared) && declared > 0) {
      if (declared !== computedNights) {
        warnings.push(`NOCI v datech=${declared}, z dat=${computedNights}`);
      }
      noci = declared;
    }
  }

  let osob: number | null = null;
  if (f.OSOB) {
    const o = Number(f.OSOB);
    if (!Number.isFinite(o) || o < 1) return { ok: false, reason: `Neplatné OSOB: ${f.OSOB}` };
    osob = Math.floor(o);
  }

  const narodnost = f.NARODNOST?.trim() || null;

  const accessPinRaw = (f.ACCESS_PIN || f.ACCESSPIN || '').trim();
  // Prázdný / nevyplněný merge field z BH nemá hodnotu.
  if (
    !accessPinRaw ||
    /^\(?\s*ACCESS_PIN\s*\)?$/i.test(accessPinRaw) ||
    accessPinRaw === '—' ||
    accessPinRaw === '-'
  ) {
    return { ok: false, reason: 'Chybí ACCESS_PIN' };
  }
  const accessPin = accessPinRaw;

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
      zdroj: f.ZDROJ?.trim() || null,
      klic: f.KLIC?.trim() || null,
      accessPin,
    },
    warnings,
  };
}
