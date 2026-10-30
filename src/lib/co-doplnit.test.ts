import { describe, expect, it } from 'vitest';
import {
  chybiPruvodce,
  formatPrijezdDoplnit,
  hosteCoDoplnit,
  hosteCoDoplnitFiltr,
  poctyStitkuDoplnit,
} from './co-doplnit';
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
    predano: partial.predano ?? null,
    otevrenoPocet: partial.otevrenoPocet ?? 0,
    casPrijezdu: partial.casPrijezdu ?? null,
    zpusobPrijezdu: partial.zpusobPrijezdu ?? null,
    telefonBrana: partial.telefonBrana ?? null,
    spz: partial.spz ?? null,
    spzPujcene: partial.spzPujcene ?? false,
    souhlas: partial.souhlas ?? false,
    zdroj: partial.zdroj ?? 'Booking',
    zdrojText: partial.zdrojText ?? 'Booking',
    historie: partial.historie ?? [],
  } as PrehledRadek;
}

describe('Co doplnit', () => {
  const dnes = '2026-10-30';

  it('jen hosté na 14 dní bez odkazu check-inu nebo telefonu, bez zrušených a předaných', () => {
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
        radek({
          rezervace: '8',
          stav: 'bez_checkinu',
          prijezd: '2026-10-31',
          predano: '2026-10-31T12:00:00.000Z',
          telefonText: null,
        }),
      ],
      dnes,
    );
    expect(list.map((r) => r.rezervace)).toEqual(['1', '2']);
  });

  it('po uložení odkazu check-in zmizí z Vše, telefon zůstane když chybí', () => {
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

  it('filtr Bez check-inu zahrne i hosta s uloženým odkazem; Vše ne', () => {
    const r = radek({
      rezervace: 'x',
      stav: 'bez_checkinu',
      checkinUrl: 'https://x.test/c',
      telefonText: '+420 777 111 222',
      telefonWa: '420777111222',
    });
    expect(hosteCoDoplnitFiltr([r], dnes, 'vse').map((h) => h.rezervace)).toEqual([]);
    expect(hosteCoDoplnitFiltr([r], dnes, 'bez_checkinu').map((h) => h.rezervace)).toEqual(['x']);
  });

  it('počty štítků: předaní a zrušení nikde, průvodce podle kroků', () => {
    const radky = [
      radek({ rezervace: 'c1', stav: 'bez_checkinu', checkinUrl: 'https://x', telefonText: '+420 1', telefonWa: '4201' }),
      radek({
        rezervace: 'p1',
        stav: 'odeslano',
        otevrenoPocet: 0,
        telefonText: '+420 2',
        telefonWa: '4202',
      }),
      radek({
        rezervace: 'p2',
        stav: 'odeslano',
        otevrenoPocet: 2,
        casPrijezdu: '15:00',
        zpusobPrijezdu: 'pesky',
        souhlas: true,
        telefonText: null,
      }),
      radek({ rezervace: 'z1', stav: 'zruseno', telefonText: null }),
      radek({
        rezervace: 'pred',
        stav: 'bez_checkinu',
        predano: '2026-10-30T10:00:00.000Z',
        telefonText: null,
      }),
    ];
    expect(poctyStitkuDoplnit(radky, dnes)).toEqual({
      bez_checkinu: 1,
      bez_pruvodce: 1,
      bez_telefonu: 1,
    });
    expect(chybiPruvodce(radky[1])).toBe(true);
    expect(chybiPruvodce(radky[2])).toBe(false);
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
