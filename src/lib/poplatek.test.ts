import { describe, expect, it } from 'vitest';
import { poplatekZData, poplatekZTokenu, ukazatPoplatek } from './poplatek';

describe('městský poplatek podle data vytvoření', () => {
  it('rezervace z 4. 10. box schová', () => {
    expect(poplatekZData('2026-10-04')).toBe('ne');
    expect(poplatekZData('4.10.2026')).toBe('ne');
    expect(ukazatPoplatek('ne')).toBe(false);
  });

  it('rezervace z 5. 10. box ukáže', () => {
    expect(poplatekZData('2026-10-05')).toBe('ano');
    expect(poplatekZData('5. 10. 2026')).toBe('ano');
    expect(ukazatPoplatek('ano')).toBe(true);
  });

  it('chybějící řádek DATE box ukáže', () => {
    expect(poplatekZData(null)).toBe('neznamo');
    expect(poplatekZData('(DATE)')).toBe('neznamo');
    expect(ukazatPoplatek('neznamo')).toBe(true);
  });

  it('starý token bez příznaku box ukáže', () => {
    expect(poplatekZTokenu(undefined)).toBe('neznamo');
    expect(ukazatPoplatek(poplatekZTokenu(undefined))).toBe(true);
  });
});
