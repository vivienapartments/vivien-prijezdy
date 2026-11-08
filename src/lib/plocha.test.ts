import { describe, expect, it } from 'vitest';
import { klicPlochy } from './plocha';

describe('plocha', () => {
  it('klíč drží číslo rezervace', () => {
    expect(klicPlochy('42')).toBe('vivien-pv-plocha:42');
    expect(klicPlochy(null)).toBe('vivien-pv-plocha:x');
  });
});
