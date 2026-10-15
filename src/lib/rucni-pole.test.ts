import { describe, expect, it } from 'vitest';
import { coVratitZHistorie, prevzitNavrh, vetaNavrhu, vynechRucni, zapisMajitele } from './rucni-pole';
import { prazdnaRezervace } from './store';

describe('ruční údaj majitele', () => {
  it('check-in ani rezervace nepřepíšou uložený telefon a ukážou návrh', () => {
    const rec = zapisMajitele(
      {
        ...prazdnaRezervace('1', '2026-10-14T08:00:00.000Z'),
        telefon: '+420777000111',
        telefonRezervace: '+420777000222',
      },
      ['telefon', 'telefonRezervace'],
      {},
      'Telefon uložen',
    );
    const poCheckinu = vynechRucni(rec, { telefon: '+420777999888', telefonWa: '420777999888' }, 'check-in');
    expect(poCheckinu.telefon).toBeUndefined();
    expect(poCheckinu.navrhy?.[0]?.od).toBe('check-in');
    expect(vetaNavrhu(poCheckinu.navrhy![0]!)).toContain('Check-in uvádí jiné číslo');

    const seNavrhem = { ...rec, navrhy: poCheckinu.navrhy! };
    const poRezervaci = vynechRucni(seNavrhem, { telefonRezervace: '+420777555666' }, 'rezervace');
    expect(poRezervaci.telefonRezervace).toBeUndefined();
    expect(poRezervaci.navrhy?.some((n) => n.pole === 'telefon')).toBe(true);
    expect(poRezervaci.navrhy?.some((n) => n.pole === 'telefonRezervace')).toBe(true);

    const prevzato = prevzitNavrh(seNavrhem, 'telefon');
    expect(prevzato?.telefon).toBe('+420777999888');
    expect(prevzato?.navrhy.some((n) => n.pole === 'telefon')).toBe(false);
    expect(prevzato?.rucniZnacky.some((z) => z.pole === 'telefon')).toBe(true);
  });

  it('z historie bez ručního telefonu není co vracet', () => {
    const rec = prazdnaRezervace('1', '2026-10-14T08:00:00.000Z');
    rec.historie = [{ cas: '2026-10-14T09:00:00.000Z', co: 'Doplněno z check-inu: telefon' }];
    expect(coVratitZHistorie(rec)).toEqual([]);
  });
});
