import { describe, expect, it } from 'vitest';
import { phoneParts, toTelHref } from './i18n';

describe('toTelHref', () => {
  it('normalizes spaced +420 number', () => {
    expect(toTelHref('+420 725 582 214')).toBe('tel:+420725582214');
  });

  it('adds country code for 9 digits', () => {
    expect(toTelHref('777 702 272')).toBe('tel:+420777702272');
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
    const parts = phoneParts('Pošlete SMS na 777 702 272 hned teď.');
    expect(parts.find((p) => p.href)?.href).toBe('tel:+420777702272');
  });
});
