import { describe, expect, it } from 'vitest';
import {
  HLASKA_NESPAROVANO,
  HLASKA_ZAPNUTO,
  hlaskaChybyZapnuti,
  jeSparovano,
  nadpisPushSekce,
  radekDiagnostikyPush,
  textPovoleni,
} from './push-stav';

describe('push-stav', () => {
  it('jeSparovano podle endpointu', () => {
    expect(jeSparovano('a', [{ endpoint: 'a' }, { endpoint: 'b' }])).toBe(true);
    expect(jeSparovano('c', [{ endpoint: 'a' }])).toBe(false);
    expect(jeSparovano('', [{ endpoint: 'a' }])).toBe(false);
    expect(jeSparovano(null, [{ endpoint: 'a' }])).toBe(false);
  });

  it('texty povolení a diagnostiky', () => {
    expect(textPovoleni('granted')).toBe('ano');
    expect(textPovoleni('denied')).toBe('ne');
    expect(textPovoleni('neurceno')).toBe('neurčeno');
    expect(
      radekDiagnostikyPush({ povoleni: 'granted', odber: true, sparovano: false }),
    ).toBe('Povolení: ano · Odběr v prohlížeči: ano · Spárováno se serverem: ne');
  });

  it('hlášky zapnutí', () => {
    expect(HLASKA_ZAPNUTO).toMatch(/zapnutá/i);
    expect(HLASKA_NESPAROVANO).toMatch(/nespároval/i);
    expect(hlaskaChybyZapnuti(new DOMException('x', 'AbortError'))).toContain('AbortError');
    expect(hlaskaChybyZapnuti('x')).toMatch(/Zkuste znovu/);
  });

  it('nadpis sekce', () => {
    expect(nadpisPushSekce({ sparovano: false, nazev: 'Pravoslav' }).varovani).toBe(true);
    expect(nadpisPushSekce({ sparovano: false, nazev: 'Pravoslav' }).text).toMatch(
      /nedostává/,
    );
    expect(nadpisPushSekce({ sparovano: true, nazev: 'Pravoslav' }).text).toBe(
      '⚙ Telefon a upozornění · Pravoslav ✓',
    );
  });
});
