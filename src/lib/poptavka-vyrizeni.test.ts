import { describe, expect, it } from 'vitest';
import {
  jeNocPraha,
  jeZkouskaPoptavky,
  rozhodniPripominku,
  spocitejLhutu,
  textNejdeHostovi,
  textPotvrditHostovi,
} from './poptavka-vyrizeni';
import type { PoptavkaZaznam } from './poptavka';

function baza(partial: Partial<PoptavkaZaznam> = {}): PoptavkaZaznam {
  return {
    id: 'p1',
    cas: '2026-11-23T10:00:00.000Z',
    zdroj: 'vernost',
    firmaKod: null,
    firmaNazev: null,
    doporucitelKod: null,
    rezervace: null,
    jmeno: 'Jana Nováková',
    telefon: '+420777111222',
    prijezd: '2026-12-10',
    odjezd: '2026-12-12',
    apartmany: ['V1'],
    libovolnyApartman: false,
    doprava: null,
    poznamka: '',
    jazyk: 'cs',
    kanal: 'formular',
    stav: 'predbezne',
    blokApt: 'V1',
    ...partial,
  };
}

describe('poptavka-vyrizeni', () => {
  it('zkouška podle TEST rezervace', () => {
    expect(jeZkouskaPoptavky(baza({ rezervace: 'TESTPOMAJ' }))).toBe(true);
    expect(jeZkouskaPoptavky(baza({ zkouska: true }))).toBe(true);
    expect(jeZkouskaPoptavky(baza())).toBe(false);
  });

  it('lhůta u vzdáleného termínu není v noci', () => {
    const now = new Date('2026-11-23T09:00:00+01:00');
    const lhuta = spocitejLhutu('2026-12-20', now);
    expect(jeNocPraha(new Date(lhuta))).toBe(false);
  });

  it('text POTVRDIT má lhůtu před podpisem', () => {
    const t = textPotvrditHostovi(baza(), {
      cenaKc: 1473,
      seSlevou: true,
      lhutaIso: '2026-11-24T21:00:00.000Z',
    });
    expect(t).toContain('Jana');
    expect(t).toContain('5 %');
    expect(t.indexOf('Napište nám')).toBeLessThan(t.indexOf('Nikol'));
  });

  it('text NEJDE cs', () => {
    const t = textNejdeHostovi(baza(), '26.–28. 11. ve V2');
    expect(t).toContain('nemáme volný');
    expect(t).toContain('26.–28. 11. ve V2');
  });

  it('připomínka se u zkoušky neposílá', () => {
    const r = rozhodniPripominku(baza({ rezervace: 'TEST1', stav: 'predbezne' }));
    expect(r.poslat).toBe(false);
  });

  it('připomínka nová poptávka', () => {
    const r = rozhodniPripominku(baza({ stav: 'predbezne' }), new Date('2026-11-23T10:00:00+01:00'));
    expect(r.poslat).toBe(true);
    if (r.poslat) expect(r.text).toContain('Nová poptávka čeká');
  });
});
