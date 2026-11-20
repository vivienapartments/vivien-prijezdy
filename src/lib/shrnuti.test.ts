import { describe, expect, it } from 'vitest';
import {
  cekaShrnuti,
  hosteCekajiciShrnuti,
  hosteHotoveShrnuti,
  jeKomplet,
  otiskShrnuti,
  stitekShrnutiKanalu,
  textShrnutiZaklad,
  zmenaPoShrnuti,
} from './shrnuti';
import { prazdnaRezervace } from './store';

function host(partial: Record<string, unknown> = {}) {
  const base = prazdnaRezervace('1', '2026-11-20T10:00:00.000Z');
  return {
    ...base,
    stav: 'odeslano' as const,
    prijezd: '2026-11-22',
    odjezd: '2026-11-24',
    apartman: 'V3' as const,
    casPrijezdu: '16:30',
    zpusobPrijezdu: 'pesky' as const,
    souhlasPravidel: { kdy: '2026-11-20T10:00:00.000Z', jazyk: 'cs' as const, verze: '1' },
    ...partial,
  };
}

describe('shrnuti', () => {
  const dnes = '2026-11-20';

  it('komplet pěšky', () => {
    expect(jeKomplet(host(), dnes)).toBe(true);
  });

  it('ne bez času HH:MM', () => {
    expect(jeKomplet(host({ casPrijezdu: 'po20' }), dnes)).toBe(false);
  });

  it('ne při čekající žádosti', () => {
    expect(
      jeKomplet(
        host({
          zadostPrijezd: {
            cas: '12:00',
            kc: 300,
            stav: 'ceka',
            kdy: 'x',
            od: 'pruvodce',
            hned: true,
            upozorneno: false,
          },
        }),
        dnes,
      ),
    ).toBe(false);
  });

  it('auto potřebuje telefon a bránu, ne SPZ', () => {
    expect(
      jeKomplet(
        host({
          zpusobPrijezdu: 'auto',
          telefonBrana: '+420604111222',
          branaRegistrovano: null,
          spz: null,
        }),
        dnes,
      ),
    ).toBe(false);
    expect(
      jeKomplet(
        host({
          zpusobPrijezdu: 'auto',
          telefonBrana: '+420604111222',
          branaRegistrovano: '2026-11-20T11:00:00.000Z',
          spz: null,
        }),
        dnes,
      ),
    ).toBe(true);
  });

  it('ne po předání / minulý příjezd / zrušeno', () => {
    expect(jeKomplet(host({ predano: '2026-11-20T12:00:00.000Z' }), dnes)).toBe(false);
    expect(jeKomplet(host({ prijezd: '2026-11-19' }), dnes)).toBe(false);
    expect(jeKomplet(host({ stav: 'zruseno' }), dnes)).toBe(false);
    expect(jeKomplet(host({ nedojezdKdy: 'x' }), dnes)).toBe(false);
  });

  it('čeká a změna po odeslání', () => {
    const h = host({
      zpusobPrijezdu: 'auto',
      telefonBrana: '+420604111222',
      branaRegistrovano: '2026-11-20T11:00:00.000Z',
    });
    expect(cekaShrnuti(h, dnes)).toBe(true);
    const odeslano = {
      ...h,
      shrnutiKdy: '2026-11-20T12:00:00.000Z',
      shrnutiOtisk: otiskShrnuti(h),
    };
    expect(cekaShrnuti(odeslano, dnes)).toBe(false);
    const zmena = { ...odeslano, casPrijezdu: '17:00' };
    expect(zmenaPoShrnuti(zmena, dnes)).toBe(true);
    expect(cekaShrnuti(zmena, dnes)).toBe(true);
  });

  it('neposílat je hotové a štítek', () => {
    const h = host();
    const neposilat = {
      ...h,
      shrnutiKdy: '2026-11-20T12:00:00.000Z',
      shrnutiKanal: 'neposilat' as const,
      shrnutiOtisk: otiskShrnuti(h),
    };
    expect(cekaShrnuti(neposilat, dnes)).toBe(false);
    expect(stitekShrnutiKanalu('neposilat')).toBe('neposláno');
    expect(hosteCekajiciShrnuti([h, neposilat], dnes)).toEqual([h]);
    expect(hosteHotoveShrnuti([h, neposilat], dnes)).toEqual([neposilat]);
  });

  it('text auto a pěšky', () => {
    const auto = textShrnutiZaklad(
      host({
        zpusobPrijezdu: 'auto',
        telefonBrana: '+420604111222',
        apartman: 'V3',
        jazyk: 'cs',
      }),
      'cs',
    );
    expect(auto).toContain('16:30');
    expect(auto).toContain('26');
    expect(auto).toMatch(/604/);
    const pesky = textShrnutiZaklad(host({ jazyk: 'cs' }), 'cs');
    expect(pesky).toContain('16:30');
    expect(pesky).not.toContain('brána');
  });
});
