import { describe, expect, it } from 'vitest';
import { textCenyPoptavky } from './poptavka-cena';
import { nactiPoptavkySeznam } from './poptavka';

describe('poptavka-cena', () => {
  it('text před i po slevě', () => {
    const t = textCenyPoptavky(2250, 2138);
    expect(t).toContain('2 250');
    expect(t).toContain('5 %');
    expect(t).toContain('2 138');
  });

  it('text bez slevy', () => {
    expect(textCenyPoptavky(2250, null)).toContain('2 250');
    expect(textCenyPoptavky(2250, null)).not.toContain('slevou');
  });

  it('nactiPoptavkySeznam zachová uloženou cenu', () => {
    const seznam = nactiPoptavkySeznam([
      {
        id: 'p1',
        cas: '2026-11-28T10:00:00.000Z',
        zdroj: 'doporucitel',
        jmeno: 'Pravoslav',
        telefon: '+420604692573',
        prijezd: '2026-11-29',
        odjezd: '2026-11-30',
        apartmany: ['V4'],
        stav: 'hotovo',
        cenaKc: 2250,
        cenaSeSlevouKc: 2138,
      },
    ]);
    expect(seznam).toHaveLength(1);
    expect(seznam[0].cenaKc).toBe(2250);
    expect(seznam[0].cenaSeSlevouKc).toBe(2138);
  });
});
