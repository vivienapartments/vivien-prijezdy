import { describe, expect, it } from 'vitest';
import {
  jeUkazkaKlic,
  pohledZKarty,
  pokrokUrovne,
  ukazkovaKlientKarta,
} from './klub-ukazka';

describe('klub-ukazka', () => {
  it('rozpozná ukázkové klíče', () => {
    expect(jeUkazkaKlic('ukazka-host')).toBe(true);
    expect(jeUkazkaKlic('ukazka-dop')).toBe(true);
    expect(jeUkazkaKlic('ukazka-firma')).toBe(true);
    expect(jeUkazkaKlic('abc')).toBe(false);
  });

  it('host má úroveň, slevu a nadcházející pobyt s průvodcem', () => {
    const k = ukazkovaKlientKarta('ukazka-host');
    const p = pohledZKarty(k, 'https://example.com', { ukazka: true, pohled: 'host' });
    expect(p.pohled).toBe('host');
    expect(p.jmenoZobrazeni).toContain('Jana');
    expect(p.slevaPct).toBe(7);
    expect(p.urovenNazev).toMatch(/Bronz/i);
    expect(p.nadchazejici[0]?.pruvodceUrl).toContain('/nahled');
    expect(p.pobyty.length).toBeGreaterThan(0);
    expect(p.odkazDoporuceni).toContain('od=JANA4');
  });

  it('doporučitel nemá pobyty, má přátele a kredit', () => {
    const k = ukazkovaKlientKarta('ukazka-dop');
    const p = pohledZKarty(k, 'https://example.com/', { ukazka: true, pohled: 'doporucitel' });
    expect(p.pohled).toBe('doporucitel');
    expect(p.nadchazejici).toEqual([]);
    expect(p.pobyty).toEqual([]);
    expect(p.pratele.length).toBe(3);
    expect(p.kreditKc).toBe(690);
  });

  it('firma má fakturační údaje a firemní název úrovně', () => {
    const k = ukazkovaKlientKarta('ukazka-firma');
    const p = pohledZKarty(k, 'https://example.com', { ukazka: true, pohled: 'firma' });
    expect(p.pohled).toBe('firma');
    expect(p.jmenoZobrazeni).toContain('Stavby Jih');
    expect(p.firmaIco).toBe('12345678');
    expect(p.urovenNazev).toMatch(/Partner/i);
    expect(p.nadchazejici.length).toBe(2);
  });

  it('pokrokUrovne počítá zbývající Kč a firemní název', () => {
    const h = pokrokUrovne(23600);
    expect(h.chybiKc).toBe(25000 - 23600);
    expect(h.dalsiNazev).toMatch(/Stříbr/i);
    const f = pokrokUrovne(41500, { pohled: 'firma' });
    expect(f.dalsiNazev).toMatch(/Partner/i);
    expect(f.chybiKc).toBe(60000 - 41500);
  });
});
