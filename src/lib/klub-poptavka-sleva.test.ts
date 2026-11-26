import { describe, expect, it } from 'vitest';
import {
  cenaPoKreditu,
  slevaPoptavkyBezKlubu,
  textSlevyPobytu,
} from './klub-poptavka-sleva';
import { vyslednaSlevaPct } from './klub-pravidla';

describe('klub poptávka sleva', () => {
  it('bez klubu: věrný 5 %, obecná 0', () => {
    expect(slevaPoptavkyBezKlubu('vernost').pct).toBe(5);
    expect(slevaPoptavkyBezKlubu('doporucitel').pct).toBe(5);
    expect(slevaPoptavkyBezKlubu('obecna').pct).toBe(0);
  });

  it('text slevy s důvodem', () => {
    expect(textSlevyPobytu(10, 'delka')).toContain('10 %');
    expect(textSlevyPobytu(10, 'delka')).toContain('délku');
    expect(textSlevyPobytu(8, 'staly')).toContain('věrný');
    expect(textSlevyPobytu(0, null)).toBe('');
  });

  it('3 noci věrný po odjezdu vs 8 nocí délka', () => {
    expect(
      vyslednaSlevaPct({
        noci: 3,
        maDokoncenyPobyt: true,
        utrataKc: 25000,
      }),
    ).toBe(8);
    expect(vyslednaSlevaPct({ noci: 8 })).toBe(10);
  });

  it('kredit po slevě', () => {
    expect(cenaPoKreditu(9000, 500, true)).toBe(8500);
    expect(cenaPoKreditu(400, 500, true)).toBe(0);
    expect(cenaPoKreditu(9000, 500, false)).toBe(9000);
  });
});
