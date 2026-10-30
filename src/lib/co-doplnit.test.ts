import { describe, expect, it } from 'vitest';
import { formatPrijezdDoplnit, hosteCoDoplnit } from './co-doplnit';
import type { PrehledRadek } from './prehled';

function radek(partial: Partial<PrehledRadek> & { rezervace: string }): PrehledRadek {
  return {
    rezervace: partial.rezervace,
    jmeno: partial.jmeno ?? 'Host',
    apartman: partial.apartman ?? 'V1',
    prijezd: partial.prijezd ?? '2026-10-30',
    odjezd: partial.odjezd ?? '2026-11-01',
    stav: partial.stav ?? 'odeslano',
    telefonText: partial.telefonText ?? null,
    telefonWa: partial.telefonWa ?? null,
    checkinUrl: partial.checkinUrl ?? null,
    zdroj: partial.zdroj ?? 'Booking',
    zdrojText: partial.zdrojText ?? 'Booking',
    historie: partial.historie ?? [],
  } as PrehledRadek;
}

describe('Co doplnit', () => {
  const dnes = '2026-10-30';

  it('jen hosté na 14 dní bez odkazu check-inu nebo telefonu, bez zrušených', () => {
    const list = hosteCoDoplnit(
      [
        radek({ rezervace: '1', stav: 'bez_checkinu', prijezd: '2026-10-30', telefonText: '+420 777 111 222', telefonWa: '420777111222' }),
        radek({ rezervace: '2', stav: 'odeslano', prijezd: '2026-11-02', telefonText: null, telefonWa: null }),
        radek({ rezervace: '3', stav: 'odeslano', prijezd: '2026-11-02', telefonText: '+420 604 111 222', telefonWa: '420604111222' }),
        radek({ rezervace: '4', stav: 'zruseno', prijezd: '2026-10-31', telefonText: null }),
        radek({ rezervace: '5', stav: 'bez_checkinu', prijezd: '2026-11-20' }),
        radek({ rezervace: '6', stav: 'bez_checkinu', prijezd: '2026-10-29' }),
        radek({
          rezervace: '7',
          stav: 'bez_checkinu',
          prijezd: '2026-10-31',
          checkinUrl: 'https://x.test/c',
          telefonText: '+420 777 000 111',
          telefonWa: '420777000111',
        }),
      ],
      dnes,
    );
    expect(list.map((r) => r.rezervace)).toEqual(['1', '2']);
  });

  it('po uložení odkazu check-in zmizí, telefon zůstane když chybí', () => {
    const list = hosteCoDoplnit(
      [
        radek({
          rezervace: 'a',
          stav: 'bez_checkinu',
          checkinUrl: 'https://x.test/c',
          telefonText: null,
          telefonWa: null,
        }),
      ],
      dnes,
    );
    expect(list.map((r) => r.rezervace)).toEqual(['a']);
  });

  it('řadí podle příjezdu a apartmánu', () => {
    const list = hosteCoDoplnit(
      [
        radek({ rezervace: 'b', apartman: 'V3', prijezd: '2026-11-01', stav: 'bez_checkinu' }),
        radek({ rezervace: 'a', apartman: 'V1', prijezd: '2026-11-01', stav: 'bez_checkinu' }),
        radek({ rezervace: 'c', apartman: 'V2', prijezd: '2026-10-30', stav: 'bez_checkinu' }),
      ],
      dnes,
    );
    expect(list.map((r) => r.rezervace)).toEqual(['c', 'a', 'b']);
  });

  it('formát data je Pá 6. 11.', () => {
    expect(formatPrijezdDoplnit('2026-11-06')).toBe('Pá 6.\u00A011.');
  });
});
