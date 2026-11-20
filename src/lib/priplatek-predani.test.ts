import { describe, expect, it } from 'vitest';
import { dotazPriplatkuPriPredani, navrhKcPriplatkuCasu } from './priplatek-prijezd';

describe('kotva příplatku ze vzorce', () => {
  it('21:42 = 400 Kč (4 půlhodiny po 20:00)', () => {
    expect(navrhKcPriplatkuCasu('21:42')).toBe(400);
  });

  it('21:00 = 200 Kč', () => {
    expect(navrhKcPriplatkuCasu('21:00')).toBe(200);
  });
});

describe('dotaz příplatku při předání', () => {
  it('do 20:00 se neptá', () => {
    expect(
      dotazPriplatkuPriPredani({ casTed: '19:50', casNaMiste: null, rucni: null }),
    ).toEqual({ ptat: false });
  });

  it('ve 20:10 navrhne 100 Kč', () => {
    expect(
      dotazPriplatkuPriPredani({ casTed: '20:10', casNaMiste: null, rucni: null }),
    ).toEqual({ ptat: true, cas: '20:10', kc: 100, stav: 'castka' });
  });

  it('ve 20:40 navrhne 200 Kč', () => {
    expect(
      dotazPriplatkuPriPredani({ casTed: '20:40', casNaMiste: null, rucni: null }),
    ).toEqual({ ptat: true, cas: '20:40', kc: 200, stav: 'castka' });
  });

  it('po 21:00 ukáže kotvu ze vzorce', () => {
    expect(
      dotazPriplatkuPriPredani({ casTed: '21:42', casNaMiste: null, rucni: null }),
    ).toEqual({ ptat: true, cas: '21:42', kc: 400, stav: 'domluva' });
  });

  it('už odpuštěný příplatek se neptá', () => {
    expect(
      dotazPriplatkuPriPredani({ casTed: '20:10', casNaMiste: null, rucni: 0 }),
    ).toEqual({ ptat: false });
  });

  it('čas na místě má přednost před teď', () => {
    expect(
      dotazPriplatkuPriPredani({ casTed: '19:00', casNaMiste: '20:15', rucni: null }),
    ).toEqual({ ptat: true, cas: '20:15', kc: 100, stav: 'castka' });
  });
});
