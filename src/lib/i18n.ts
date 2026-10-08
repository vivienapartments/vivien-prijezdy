import type { AptId, GuideLang, LText, StayFacts } from './types';

export function t(map: LText | undefined, lang: GuideLang): string {
  if (!map) return '';
  return (map[lang] || '').trim() || (map.en || '').trim() || (map.cs || '').trim();
}

export function fillPlaceholders(
  text: string,
  opts: {
    stani: number;
    kodZahrada: string;
    branaTelefon: string;
    stay: StayFacts;
  },
): string {
  const noci = opts.stay.noci == null ? 'XXX' : String(opts.stay.noci);
  const osob = opts.stay.osob == null ? 'XXX' : String(opts.stay.osob);
  const odhad =
    opts.stay.noci == null || opts.stay.osob == null
      ? 'XXX'
      : String(opts.stay.noci * opts.stay.osob * 50);
  return text
    .replaceAll('{{STANI}}', String(opts.stani))
    .replaceAll('{{KOD_ZAHRADA}} + #', opts.kodZahrada)
    .replaceAll('{{KOD_ZAHRADA}}', opts.kodZahrada)
    .replaceAll('{{BRANA_TELEFON}}', opts.branaTelefon)
    .replaceAll('{{POPLATEK_NOCI}}', noci)
    .replaceAll('{{POPLATEK_OSOB}}', osob)
    .replaceAll('{{POPLATEK_ODHAD}}', odhad);
}

export function apartmentTitle(
  nazev: { cs: string; en: string },
  lang: GuideLang,
): string {
  return lang === 'cs' ? `${nazev.cs} (${nazev.en})` : nazev.en;
}

export function photoSrc(foto: string | null | undefined): string | null {
  if (!foto) return null;
  return '/' + foto.replace(/^fotky\//, 'pruvodce/');
}

export function phoneParts(raw: string): { text: string; bold: boolean }[] {
  const re = /(\+420\s*)?777\s*702\s*272/g;
  const out: { text: string; bold: boolean }[] = [];
  let last = 0;
  for (const m of raw.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ text: raw.slice(last, start), bold: false });
    out.push({ text: m[0], bold: true });
    last = start + m[0].length;
  }
  if (last < raw.length) out.push({ text: raw.slice(last), bold: false });
  return out.length ? out : [{ text: raw, bold: false }];
}

export function wifiPayload(ssid: string, password: string): string {
  const esc = (v: string) => v.replace(/([\\;,:"])/g, '\\$1');
  return `WIFI:T:WPA;S:${esc(ssid)};P:${esc(password)};;`;
}

export function parseApt(raw: string | null | undefined): AptId {
  const v = (raw || '').toUpperCase();
  if (v === 'V1' || v === 'V2' || v === 'V3' || v === 'V4' || v === 'V5') return v;
  return 'V1';
}

export function parseLang(raw: string | null | undefined): GuideLang {
  const v = raw || '';
  if (v === 'cs' || v === 'en' || v === 'de' || v === 'pl' || v === 'uk' || v === 'zh-Hant') {
    return v;
  }
  if (v === 'zh') return 'zh-Hant';
  return 'cs';
}
export function wifiHesloProApt(
  secrets: {
    WIFI_HESLO_V1: string;
    WIFI_HESLO_V2: string;
    WIFI_HESLO_V3: string;
    WIFI_HESLO_V4: string;
    WIFI_HESLO_V5: string;
  },
  apt: AptId,
): string {
  switch (apt) {
    case 'V1':
      return secrets.WIFI_HESLO_V1;
    case 'V2':
      return secrets.WIFI_HESLO_V2;
    case 'V3':
      return secrets.WIFI_HESLO_V3;
    case 'V4':
      return secrets.WIFI_HESLO_V4;
    case 'V5':
      return secrets.WIFI_HESLO_V5;
  }
}