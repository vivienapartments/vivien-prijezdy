import {
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/mobile/examples';
import type { GuideLang } from './types';

export type TelefonPredvolba = {
  iso: CountryCode;
  dial: string;
  vlajka: string;
  nazev: string;
};

const VLAJKY: Partial<Record<CountryCode, string>> = {
  CZ: '🇨🇿',
  SK: '🇸🇰',
  DE: '🇩🇪',
  AT: '🇦🇹',
  PL: '🇵🇱',
  UA: '🇺🇦',
  TW: '🇹🇼',
  ES: '🇪🇸',
  FR: '🇫🇷',
  IT: '🇮🇹',
  PT: '🇵🇹',
  SE: '🇸🇪',
  HU: '🇭🇺',
  DK: '🇩🇰',
  GB: '🇬🇧',
  US: '🇺🇸',
  NL: '🇳🇱',
  BE: '🇧🇪',
  CH: '🇨🇭',
  RO: '🇷🇴',
  HR: '🇭🇷',
  SI: '🇸🇮',
  IN: '🇮🇳',
  CN: '🇨🇳',
  JP: '🇯🇵',
  KR: '🇰🇷',
  BR: '🇧🇷',
  AU: '🇦🇺',
  CA: '🇨🇦',
};

const NAZEV: Partial<Record<CountryCode, string>> = {
  CZ: 'Česko',
  SK: 'Slovensko',
  DE: 'Deutschland',
  AT: 'Österreich',
  PL: 'Polska',
  UA: 'Україна',
  TW: '臺灣',
  ES: 'España',
  FR: 'France',
  IT: 'Italia',
  PT: 'Portugal',
  SE: 'Sverige',
  HU: 'Magyarország',
  DK: 'Danmark',
  GB: 'United Kingdom',
  US: 'United States',
};

/** Předvolba podle jazyka stránky. EN → region prohlížeče, jinak CZ. */
export function predvolbaProJazyk(lang: GuideLang): CountryCode {
  const mapa: Partial<Record<GuideLang, CountryCode>> = {
    cs: 'CZ',
    de: 'DE',
    pl: 'PL',
    uk: 'UA',
    'zh-Hant': 'TW',
    es: 'ES',
    fr: 'FR',
    it: 'IT',
    pt: 'PT',
    sv: 'SE',
    hu: 'HU',
    da: 'DK',
  };
  if (lang === 'en' && typeof navigator !== 'undefined') {
    const reg = (navigator.language || '').toUpperCase();
    if (reg.includes('US')) return 'US';
    if (reg.includes('GB') || reg.includes('UK')) return 'GB';
    if (reg.includes('AU')) return 'AU';
    if (reg.includes('CA')) return 'CA';
  }
  return mapa[lang] || 'CZ';
}

export function seznamPredvoleb(): TelefonPredvolba[] {
  return getCountries()
    .map((iso) => {
      const dial = `+${getCountryCallingCode(iso)}`;
      return {
        iso,
        dial,
        vlajka: VLAJKY[iso] || '🌐',
        nazev: NAZEV[iso] || iso,
      };
    })
    .sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs'));
}

export function formatujCisloProZobrazeni(narodni: string, iso: CountryCode): string {
  const ciste = narodni.replace(/[^\d]/g, '');
  if (!ciste) return '';
  try {
    const p = parsePhoneNumberFromString(ciste, iso);
    if (p) {
      const nat = p.formatNational().replace(/^\D+/, '').trim();
      return nat || ciste;
    }
  } catch {
    /* ruční */
  }
  // Skupiny po 3 od konce (CZ styl), jinak po 3
  if (iso === 'CZ' || iso === 'SK') {
    const m = ciste.match(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d*)$/);
    if (!m) return ciste;
    return [m[1], m[2], m[3], m[4]].filter(Boolean).join(' ').trim();
  }
  return ciste.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
}

export function placeholderCisla(iso: CountryCode): string {
  try {
    const ex = getExampleNumber(iso, examples);
    if (ex) return ex.formatNational().replace(/^\D+/, '').trim();
  } catch {
    /* */
  }
  return iso === 'CZ' ? '602 123 456' : '123 456 789';
}

/** Z vloženého textu vytáhne zemi a národní číslo. */
export function rozeberVlozene(
  raw: string,
  vychoziIso: CountryCode,
): { iso: CountryCode; narodni: string } {
  const t = raw.trim();
  if (!t) return { iso: vychoziIso, narodni: '' };
  let kandidat = t;
  if (kandidat.startsWith('00')) kandidat = `+${kandidat.slice(2)}`;
  try {
    const p = parsePhoneNumberFromString(kandidat, vychoziIso);
    if (p && p.country) {
      return {
        iso: p.country,
        narodni: formatujCisloProZobrazeni(p.nationalNumber, p.country),
      };
    }
  } catch {
    /* */
  }
  return { iso: vychoziIso, narodni: formatujCisloProZobrazeni(t, vychoziIso) };
}

export function naE164(narodni: string, iso: CountryCode): string | null {
  const ciste = narodni.replace(/[^\d+]/g, '');
  if (!ciste) return null;
  try {
    const p = parsePhoneNumberFromString(ciste, iso);
    if (p && isValidPhoneNumber(p.number)) return p.format('E.164');
  } catch {
    /* */
  }
  if (isValidPhoneNumber(ciste, iso)) {
    const p = parsePhoneNumberFromString(ciste, iso);
    return p ? p.format('E.164') : null;
  }
  return null;
}

export function jePlatnyTelefon(narodni: string, iso: CountryCode): boolean {
  return Boolean(naE164(narodni, iso));
}
