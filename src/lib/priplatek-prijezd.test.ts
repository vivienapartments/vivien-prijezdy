import { describe, expect, it } from 'vitest';
import { priplatekCasu } from './priplatek-prijezd';

describe('příplatek za pozdní příjezd', () => {
  it('hranice 20:00 / 20:30 / 21:00 a po 21:00 jen domluva', () => {
    expect(priplatekCasu('20:00')).toEqual({ stav: 'nic', kc: 0 });
    expect(priplatekCasu('20:01')).toEqual({ stav: 'castka', kc: 100 });
    expect(priplatekCasu('20:30')).toEqual({ stav: 'castka', kc: 100 });
    expect(priplatekCasu('20:31')).toEqual({ stav: 'castka', kc: 200 });
    expect(priplatekCasu('21:00')).toEqual({ stav: 'castka', kc: 200 });
    expect(priplatekCasu('21:01')).toEqual({ stav: 'domluva' });
    expect(priplatekCasu('22:31')).toEqual({ stav: 'domluva' });
    expect(priplatekCasu('23:00')).toEqual({ stav: 'domluva' });
    expect(priplatekCasu('23:01')).toEqual({ stav: 'domluva' });
    expect(priplatekCasu('po23')).toEqual({ stav: 'domluva' });
    expect(priplatekCasu(null)).toEqual({ stav: 'neznamo' });
  });
});
