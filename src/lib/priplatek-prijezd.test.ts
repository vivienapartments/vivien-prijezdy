import { describe, expect, it } from 'vitest';
import { priplatekCasu } from './priplatek-prijezd';

describe('příplatek za čas', () => {
  it('100 Kč za každou započatou půlhodinu po 20:00, po 23:00 jen po domluvě', () => {
    expect(priplatekCasu('20:00')).toEqual({ stav: 'nic', kc: 0 });
    expect(priplatekCasu('20:01')).toEqual({ stav: 'castka', kc: 100 });
    expect(priplatekCasu('20:30')).toEqual({ stav: 'castka', kc: 100 });
    expect(priplatekCasu('20:31')).toEqual({ stav: 'castka', kc: 200 });
    expect(priplatekCasu('21:00')).toEqual({ stav: 'castka', kc: 200 });
    expect(priplatekCasu('22:31')).toEqual({ stav: 'castka', kc: 600 });
    expect(priplatekCasu('23:00')).toEqual({ stav: 'castka', kc: 600 });
    expect(priplatekCasu('23:01')).toEqual({ stav: 'domluva' });
    expect(priplatekCasu('po23')).toEqual({ stav: 'domluva' });
    expect(priplatekCasu(null)).toEqual({ stav: 'neznamo' });
  });
});
