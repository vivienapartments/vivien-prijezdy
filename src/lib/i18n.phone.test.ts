import { describe, expect, it } from 'vitest';
import { fillPlaceholders, formatTelefonCs, phoneParts, toTelHref } from './i18n';

describe('toTelHref', () => {
  it('normalizes spaced +420 number', () => {
    expect(toTelHref('+420 725 582 214')).toBe('tel:+420725582214');
  });

  it('adds country code for 9 digits', () => {
    expect(toTelHref('604 692 573')).toBe('tel:+420604692573');
  });
});

describe('formatTelefonCs', () => {
  it('splits compact Czech mobile for display', () => {
    expect(formatTelefonCs('+420725582214')).toBe('+420 725 582 214');
    expect(formatTelefonCs('725 582 214')).toBe('+420 725 582 214');
    expect(formatTelefonCs('00420725582214')).toBe('+420 725 582 214');
  });
});

describe('phoneParts', () => {
  it('makes gate phone clickable and keeps surrounding text', () => {
    const parts = phoneParts(
      'Otevřete si ji telefonním hovorem na číslo +420 725 582 214. Hovor nikdo nepřijme.',
    );
    expect(parts.some((p) => p.href === 'tel:+420725582214')).toBe(true);
    expect(parts.map((p) => p.text).join('')).toContain('Hovor nikdo nepřijme');
  });

  it('handles parking SMS number without +420', () => {
    const parts = phoneParts('Pošlete SMS na +420 604 692 573 hned teď.');
    expect(parts.find((p) => p.href)?.href).toBe('tel:+420604692573');
  });

  it('also matches number without spaces from env', () => {
    const parts = phoneParts('Otevřete si ji hovorem na číslo +420725582214. Hovor nikdo nepřijme.');
    expect(parts.find((p) => p.href)?.href).toBe('tel:+420725582214');
    expect(parts.find((p) => p.href)?.text).toBe('+420 725 582 214');
  });

  it('makes 00420 gate number clickable and readable', () => {
    const parts = phoneParts('volejte na 00420725582214. Hovor nikdo nepřijme.');
    expect(parts.find((p) => p.href)?.href).toBe('tel:+420725582214');
    expect(parts.find((p) => p.href)?.text).toBe('+420 725 582 214');
  });
});

describe('fillPlaceholders BRANA_TELEFON', () => {
  it('formats gate phone so it stays readable in guide text', () => {
    const out = fillPlaceholders('volejte {{BRANA_TELEFON}}', {
      stani: 14,
      kodZahrada: '1234',
      branaTelefon: '+420725582214',
      stay: { noci: 2, osob: 2 },
    });
    expect(out).toBe('volejte +420 725 582 214');
  });

  it('formats 00420 env value to clickable Czech display', () => {
    const out = fillPlaceholders('volejte {{BRANA_TELEFON}}', {
      stani: 14,
      kodZahrada: '1234',
      branaTelefon: '00420725582214',
      stay: { noci: 2, osob: 2 },
    });
    expect(out).toBe('volejte +420 725 582 214');
  });
});
