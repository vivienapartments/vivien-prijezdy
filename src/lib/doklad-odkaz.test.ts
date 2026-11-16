import { describe, expect, it } from 'vitest';
import {
  overDokladToken,
  textDokladuHostovi,
  urlDokladu,
  vytvorDokladToken,
} from './doklad-odkaz';

describe('doklad-odkaz', () => {
  it('vytvoří a ověří token', () => {
    process.env.PRUVODCE_TOKEN_SECRET = 'x'.repeat(40);
    const token = vytvorDokladToken({
      r: '120260042',
      typ: 'faktura',
      odberatel: 'firma',
      lang: 'cs',
      castka: 3000,
    });
    const over = overDokladToken(token);
    expect(over.ok).toBe(true);
    if (!over.ok) return;
    expect(over.payload.r).toBe('120260042');
    expect(over.payload.typ).toBe('faktura');
    expect(over.payload.castka).toBe(3000);
    expect(urlDokladu('https://example.com', token)).toContain('/doklad/');
  });

  it('prošlý token odmítne', () => {
    process.env.PRUVODCE_TOKEN_SECRET = 'x'.repeat(40);
    const token = vytvorDokladToken({
      r: '1',
      typ: 'zalohova',
      odberatel: 'host',
      lang: 'en',
      exp: 10,
    });
    expect(overDokladToken(token, 20)).toEqual({ ok: false, reason: 'expired' });
  });

  it('sestaví české texty s odkazem', () => {
    const t = textDokladuHostovi('cs', 'faktura', 'https://example.com/doklad/abc');
    expect(t.predmet).toContain('Doklad');
    expect(t.text).toContain('https://example.com/doklad/abc');
    expect(t.wa).toContain('PDF');
  });
});
