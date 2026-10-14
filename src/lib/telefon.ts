export type TelefonUlozeny = {
  /** Mezinárodní tvar +předvolbačíslo, nebo původní text, když tvar neznáme. */
  ulozeny: string;
  /** Číslice pro wa.me, bez plus. Když tlačítko nemá být, null. */
  wa: string | null;
  /** Přesně tak, jak číslo přišlo. */
  puvodni: string;
  /** Nejisté číslo. V přehledu je poznámka a není tlačítko. */
  nejisty: boolean;
};

/** Známé předvolby a celková délka čísla včetně předvolby. Delší kód se zkouší dřív. */
const PREDVOLBY: { kod: string; min: number; max: number }[] = [
  { kod: '886', min: 11, max: 13 },
  { kod: '852', min: 11, max: 11 },
  { kod: '420', min: 12, max: 12 },
  { kod: '421', min: 12, max: 12 },
  { kod: '380', min: 12, max: 12 },
  { kod: '49', min: 11, max: 14 },
  { kod: '48', min: 11, max: 11 },
  { kod: '46', min: 11, max: 12 },
  { kod: '44', min: 12, max: 13 },
  { kod: '43', min: 11, max: 15 },
  { kod: '41', min: 11, max: 12 },
  { kod: '39', min: 11, max: 13 },
  { kod: '36', min: 10, max: 11 },
  { kod: '33', min: 11, max: 11 },
  { kod: '31', min: 11, max: 11 },
  { kod: '86', min: 13, max: 13 },
  { kod: '1', min: 11, max: 11 },
];

const NARODNOST_KOD: Record<string, string> = {
  CZE: '420',
  SVK: '421',
  DEU: '49',
  GERMANY: '49',
  AUT: '43',
  AUSTRIA: '43',
  CHE: '41',
  SWITZERLAND: '41',
  POL: '48',
  POLAND: '48',
  UKR: '380',
  UKRAINE: '380',
  HUN: '36',
  HUNGARY: '36',
  NLD: '31',
  NETHERLANDS: '31',
  GBR: '44',
  UK: '44',
  SWE: '46',
  SE: '46',
  SWEDEN: '46',
  SVERIGE: '46',
  ITA: '39',
  ITALY: '39',
  FRA: '33',
  FRANCE: '33',
  USA: '1',
  CHN: '86',
  CN: '86',
  CHINA: '86',
  TWN: '886',
  TW: '886',
  TAIWAN: '886',
  HKG: '852',
  HK: '852',
  HONGKONG: '852',
};

function jePrazdnyMerge(s: string): boolean {
  return /^\(?\s*GUEST_?PHONE\s*\)?$/i.test(s) || s === '—' || s === '-' || s === '–';
}

function kodNarodnosti(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw
    .trim()
    .toUpperCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');
  return NARODNOST_KOD[code] || null;
}

function znaPredvolbu(digits: string): boolean {
  return PREDVOLBY.some((p) => digits.startsWith(p.kod) && digits.length >= p.min && digits.length <= p.max);
}

/** Dokud není národnost z check-inu, jen čeština nebo angličtina. Volá se až na upravené číslo. */
export function jazykZPredvolby(ulozeny: string | null | undefined): 'cs' | 'en' {
  const s = (ulozeny || '').replace(/\s/g, '');
  if (s.startsWith('+420') || s.startsWith('+421')) return 'cs';
  return 'en';
}

/**
 * Sjednotí telefon na +předvolbačíslo.
 * Původní zápis zůstane v `puvodni`. Nejisté číslo se neupraví a nemá WhatsApp.
 */
export function normalizujTelefon(raw: string | null | undefined, narodnost?: string | null): TelefonUlozeny | null {
  const trimmed = (raw || '').trim().replace(/\s+/g, ' ');
  if (!trimmed || jePrazdnyMerge(trimmed)) return null;

  const puvodni = trimmed;
  const nejisty = (): TelefonUlozeny => ({ ulozeny: puvodni, wa: null, puvodni, nejisty: true });
  const jisty = (digits: string): TelefonUlozeny => ({
    ulozeny: `+${digits}`,
    wa: digits,
    puvodni,
    nejisty: false,
  });

  let compact = trimmed.replace(/[\s()./\\\-–—]/g, '');
  if (compact.startsWith('00')) compact = `+${compact.slice(2)}`;

  let digits = compact;
  let plus = false;
  if (digits.startsWith('+')) {
    plus = true;
    digits = digits.slice(1);
  }
  if (!digits || !/^\d+$/.test(digits)) return nejisty();

  if (plus) {
    if (digits.length >= 8 && digits.length <= 15) return jisty(digits);
    return nejisty();
  }

  if (znaPredvolbu(digits)) return jisty(digits);

  const kod = kodNarodnosti(narodnost);
  if (kod) {
    const mistni = digits.startsWith('0') ? digits.slice(1) : digits;
    if (mistni && !mistni.startsWith('0')) {
      const cele = mistni.startsWith(kod) ? mistni : `${kod}${mistni}`;
      const pravidlo = PREDVOLBY.find((p) => p.kod === kod);
      if (pravidlo && cele.length >= pravidlo.min && cele.length <= pravidlo.max) return jisty(cele);
    }
  }

  if (digits.length === 9 && /^[67]/.test(digits)) return jisty(`420${digits}`);

  return nejisty();
}

/** Čitelné číslo do přehledu. Na dva řádky se lámat nesmí. */
export function textTelefonu(ulozeny: string): string {
  const m = ulozeny.match(/^\+(\d+)$/);
  if (!m) return ulozeny;
  const d = m[1];
  if (d.startsWith('420') && d.length === 12) {
    const n = d.slice(3);
    return `+420 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  }
  if (d.startsWith('421') && d.length === 12) {
    const n = d.slice(3);
    return `+421 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  }
  if (d.startsWith('49') && d.length >= 11 && d.length <= 15) {
    return `+49 ${d.slice(2)}`;
  }
  return `+${d}`;
}
