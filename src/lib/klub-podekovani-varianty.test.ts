import { describe, expect, it } from 'vitest';
import {
  klicPoslednihoDokonceneho,
  parsePodekovaniQuery,
  pocetDokoncenePobyty,
  vyberPodekovaniId,
} from './klub-podekovani-varianty';
import type { KlubPobytRadek } from './klub-ukazka';

function radek(barva: KlubPobytRadek['barva'], nadpis = 'pobyt'): KlubPobytRadek {
  return { nadpis, podnadpis: '', barva, stavText: '' };
}

describe('klub-podekovani-varianty', () => {
  it('počítá jen dokončené', () => {
    expect(
      pocetDokoncenePobyty([
        radek('zapocteno'),
        radek('ceka'),
        radek('probiha'),
        radek('storno'),
      ]),
    ).toBe(2);
  });

  it('1. a 2. pobyt mají pevné id', () => {
    expect(vyberPodekovaniId({ pocetDokoncene: 1, seed: 'a' })).toBe('1');
    expect(vyberPodekovaniId({ pocetDokoncene: 0, seed: 'a' })).toBe('1');
    expect(vyberPodekovaniId({ pocetDokoncene: 2, seed: 'a' })).toBe('2');
  });

  it('3+ je z d1–d5 a seed je stabilní', () => {
    const a = vyberPodekovaniId({ pocetDokoncene: 3, seed: 'host|pobyt-x' });
    const b = vyberPodekovaniId({ pocetDokoncene: 3, seed: 'host|pobyt-x' });
    expect(a).toBe(b);
    expect(['d1', 'd2', 'd3', 'd4', 'd5']).toContain(a);
  });

  it('3+ neopakuje předchozí variantu', () => {
    const seed = 'stejny-seed-pro-test';
    const prvni = vyberPodekovaniId({ pocetDokoncene: 3, seed });
    const druha = vyberPodekovaniId({
      pocetDokoncene: 4,
      seed: seed + '|dalsi',
      predchoziId: prvni,
    });
    // Když by hash náhodou dal stejnou, funkce ji posune.
    const znovuSeStejnymSeedem = vyberPodekovaniId({
      pocetDokoncene: 5,
      seed,
      predchoziId: prvni,
    });
    expect(znovuSeStejnymSeedem).not.toBe(prvni);
    expect(druha).toBeTruthy();
  });

  it('klíč posledního dokončeného', () => {
    expect(
      klicPoslednihoDokonceneho([radek('zapocteno', 'A'), radek('ceka', 'B')]),
    ).toBe('A|');
  });

  it('parse query', () => {
    expect(parsePodekovaniQuery('1')).toBe('1');
    expect(parsePodekovaniQuery('d3')).toBe('d3');
    expect(parsePodekovaniQuery('xxx')).toBeNull();
  });
});
