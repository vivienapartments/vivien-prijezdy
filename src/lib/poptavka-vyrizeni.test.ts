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
  it('zkouška podle TEST rezervace / id test:', () => {
    expect(jeZkouskaPoptavky(baza({ rezervace: 'TESTPOMAJ' }))).toBe(true);
    expect(jeZkouskaPoptavky(baza({ zkouska: true }))).toBe(true);
    expect(jeZkouskaPoptavky(baza({ id: 'test:p123' }))).toBe(true);
    expect(jeZkouskaPoptavky(baza())).toBe(false);
  });

  it('lhůta u vzdáleného termínu není v noci', () => {
    const now = new Date('2026-11-23T09:00:00+01:00');
    const lhuta = spocitejLhutu('2026-12-20', now);
    expect(jeNocPraha(new Date(lhuta))).toBe(false);
  });

  it('text POTVRDIT potvrzuje pobyt bez druhého ano', () => {
    const t = textPotvrditHostovi(baza(), {
      cenaKc: 1473,
      seSlevou: true,
    });
    expect(t).toContain('Jana');
    expect(t).toContain('5 %');
    expect(t).toContain('potvrzujeme');
    expect(t).not.toContain('Napište nám');
  });

  it('text NEJDE cs s návrhem', () => {
    const t = textNejdeHostovi(baza(), '26.–28. 11. ve V2');
    expect(t).toContain('Dobrý den, Jano,');
    expect(t).toContain('nemáme volný');
    expect(t).toContain('26.–28. 11. ve V2');
    expect(t).toContain('Nikol, VIVIEN Apartments');
    expect(t).toMatch(/\n\nNikol/);
  });

  it('text NEJDE cs bez návrhu', () => {
    const t = textNejdeHostovi(baza(), '  ');
    expect(t).toContain('je bohužel už obsazený');
    expect(t).not.toContain('Můžeme vám nabídnout');
  });

  it('text NEJDE en bez návrhu má britské datum a novou větu', () => {
    const t = textNejdeHostovi(baza({ jmeno: 'Jana', jazyk: 'en' }), '');
    expect(t.startsWith('Hello, Jana,')).toBe(true);
    expect(t).toContain('already taken');
    expect(t).toMatch(/10\s*[–-]\s*12 Dec 2026/);
    expect(t).toContain("We'd be glad to find you other dates");
    expect(t).not.toMatch(/10\/12\/2026/);
  });

  it('text NEJDE cs u cizího jména jen Dobrý den,', () => {
    const t = textNejdeHostovi(baza({ jmeno: 'Xyzqwerty' }), 'jindy');
    expect(t.startsWith('Dobrý den,\n')).toBe(true);
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
