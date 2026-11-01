import { describe, expect, it } from 'vitest';
import { polozkyZRezervace } from './odjezd';
import { zaplatCastku, zaplatDruhy } from './platby-hosta';
import { prazdnaRezervace } from './store';

describe('platby-hosta', () => {
  it('částečná platba poplatku nechá zbytek', () => {
    let rec = {
      ...prazdnaRezervace('1', '2026-11-01T10:00:00.000Z'),
      poplatek: 'ano' as const,
      noci: 6,
      osob: 1,
      stav: 'odeslano' as const,
    };
    expect(polozkyZRezervace(rec)).toEqual([{ druh: 'poplatek', kc: 300 }]);

    rec = zaplatCastku(rec, 250, 'prevod', 'pravoslav', 'faktura');
    expect(rec.platby).toEqual([
      expect.objectContaining({ druh: 'poplatek', kc: 250, jak: 'prevod' }),
    ]);
    expect(polozkyZRezervace(rec)).toEqual([{ druh: 'poplatek', kc: 50 }]);

    rec = zaplatDruhy(rec, ['poplatek'], 'hotove', 'pravoslav');
    expect(polozkyZRezervace(rec)).toEqual([]);
    expect(rec.platby?.reduce((s, p) => s + p.kc, 0)).toBe(300);
  });
});
