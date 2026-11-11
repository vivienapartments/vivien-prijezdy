import { describe, expect, it } from 'vitest';
import { prazdnaRezervace } from './store';
import {
  odmitniZadostPozdni,
  podaniZadostiPozdni,
  potvrdZadostPozdni,
  textSbalenehoRadkuPozdni,
  vyzadujeZadostPozdni,
} from './zadost-pozni-prijezd';

describe('žádost o pozdní příjezd', () => {
  const now = new Date('2026-11-11T10:00:00.000Z');

  it('po 20:00 vyžaduje žádost, do 20:00 ne', () => {
    expect(vyzadujeZadostPozdni('20:00')).toBe(false);
    expect(vyzadujeZadostPozdni('20:30')).toBe(true);
    expect(vyzadujeZadostPozdni('21:00')).toBe(true);
  });

  it('podání uloží ceka a částku', () => {
    const rec = prazdnaRezervace('1', '2026-11-01T00:00:00.000Z');
    const v = podaniZadostiPozdni(rec, '20:30', now);
    expect(v?.bezeZmeny).toBeFalsy();
    expect(v?.patch.zadostPozdniPrijezd).toMatchObject({ cas: '20:30', kc: 100, stav: 'ceka' });
    expect(v?.patch.casPrijezdu).toBe('20:30');
    expect(textSbalenehoRadkuPozdni(v?.patch.zadostPozdniPrijezd)).toBe('Příjezd 20:30 · zatím nepotvrzeno');
  });

  it('změna potvrzeného času drží staré potvrzení', () => {
    const rec = {
      ...prazdnaRezervace('1', '2026-11-01T00:00:00.000Z'),
      casPrijezdu: '20:30',
      zadostPozdniPrijezd: {
        cas: '20:30',
        kc: 100,
        stav: 'potvrzeno' as const,
        kdy: '2026-11-10T10:00:00.000Z',
        zprava: null,
        drziPotvrzeni: null,
      },
    };
    const v = podaniZadostiPozdni(rec, '21:00', now);
    expect(v?.patch.casPrijezdu).toBe('20:30');
    expect(v?.patch.zadostPozdniPrijezd).toMatchObject({
      cas: '21:00',
      kc: 200,
      stav: 'ceka',
      drziPotvrzeni: { cas: '20:30', kc: 100 },
    });
  });

  it('potvrzení a odmítnutí s vlastní zprávou', () => {
    const ceka = {
      ...prazdnaRezervace('1', '2026-11-01T00:00:00.000Z'),
      zadostPozdniPrijezd: {
        cas: '20:45',
        kc: 200,
        stav: 'ceka' as const,
        kdy: '2026-11-10T10:00:00.000Z',
        zprava: null,
        drziPotvrzeni: null,
      },
    };
    const ok = potvrdZadostPozdni(ceka, now);
    expect(ok?.patch.casPrijezdu).toBe('20:45');
    expect(ok?.textHostovi).toBe('Příjezd ve 20:45 platí. Příplatek 200 Kč vyrovnáme při předání.');

    const ne = odmitniZadostPozdni(ceka, 'Zvolte prosím 20:00, nebo nám zavolejte.', now);
    expect(ne?.patch.zadostPozdniPrijezd?.stav).toBe('nelze');
    expect(ne?.textHostovi).toContain('Zvolte prosím 20:00');
    expect(odmitniZadostPozdni(ceka, '   ', now)).toBeNull();
  });
});
