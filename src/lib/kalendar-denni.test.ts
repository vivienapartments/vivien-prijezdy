import { describe, expect, it } from 'vitest';
import {
  aplikujRezervace,
  aptyVolneVeTerminu,
  denPlno,
  nejblizsiVolneTerminy,
  nociPobytu,
  slevaPctCastka,
  terminPresPlnyDen,
  type DenKalendare,
  type KalendarDenni,
} from './kalendar-denni';
import { APT_IDS } from './types';

function den(obs: Partial<Record<string, boolean>> = {}): DenKalendare {
  const d = {} as DenKalendare;
  for (const id of APT_IDS) {
    d[id] = { cena: 1500, obsazeno: Boolean(obs[id]), bezPrijezdu: false };
  }
  return d;
}

describe('kalendar-denni', () => {
  it('noci bez dne odjezdu', () => {
    expect(nociPobytu('2026-12-24', '2026-12-26')).toEqual(['2026-12-24', '2026-12-25']);
  });

  it('sleva 5 % zaokrouhlí na celé Kč', () => {
    expect(slevaPctCastka(3540)).toBe(3363);
  });

  it('plno při 5 obsazených', () => {
    expect(denPlno(den({ V1: true, V2: true, V3: true, V4: true, V5: true }))).toBe(true);
    expect(denPlno(den({ V1: true }), 4)).toBe(true);
  });

  it('rezervace zavře noci, storno ne', () => {
    const mapa: KalendarDenni = { '2026-12-01': den() };
    const { mapa: out } = aplikujRezervace(mapa, [
      { prijezd: '2026-12-01', odjezd: '2026-12-03', apartman: 'V2', stav: 'odeslano' },
      { prijezd: '2026-12-01', odjezd: '2026-12-03', apartman: 'V3', stav: 'zruseno' },
    ]);
    expect(out['2026-12-01'].V2.obsazeno).toBe(true);
    expect(out['2026-12-02'].V2.obsazeno).toBe(true);
    expect(out['2026-12-01'].V3.obsazeno).toBe(false);
  });

  it('termín přes plný den', () => {
    const mapa: KalendarDenni = {
      '2026-11-22': den({ V1: true, V2: true, V3: true, V4: true, V5: true }),
      '2026-11-23': den(),
    };
    expect(terminPresPlnyDen(mapa, '2026-11-22', '2026-11-24')).toBe(true);
    expect(terminPresPlnyDen(mapa, '2026-11-23', '2026-11-24')).toBe(false);
  });

  it('volné apartmány a nejbližší termíny', () => {
    const mapa: KalendarDenni = {
      '2026-11-25': den({ V1: true }),
      '2026-11-26': den({ V1: true }),
      '2026-11-27': den(),
      '2026-11-28': den(),
    };
    expect(aptyVolneVeTerminu(mapa, '2026-11-25', '2026-11-26')).not.toContain('V1');
    expect(aptyVolneVeTerminu(mapa, '2026-11-25', '2026-11-26')).toContain('V2');
    const nab = nejblizsiVolneTerminy(mapa, '2026-11-25', '2026-11-26', 'V1', 2);
    expect(nab[0]).toEqual({ prijezd: '2026-11-24', odjezd: '2026-11-25' });
    expect(nab[1]).toEqual({ prijezd: '2026-11-27', odjezd: '2026-11-28' });
  });
});
