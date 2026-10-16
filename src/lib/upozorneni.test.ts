import { describe, expect, it } from 'vitest';
import { textZkuseni } from './upozorneni';

describe('zkusit upozornění', () => {
  it('vrací srozumitelný výsledek', () => {
    expect(textZkuseni({ jak: 'push', zarizeni: 2, doruceno: 2 })).toBe('Doručeno na 2 zařízení');
    expect(textZkuseni({ jak: 'push', zarizeni: 1, doruceno: 1 })).toBe('Doručeno na 1 zařízení');
    expect(textZkuseni({ jak: 'email', zarizeni: 0, doruceno: 0 })).toBe('Odesláno e-mailem');
    expect(textZkuseni({ jak: 'nic', zarizeni: 0, doruceno: 0 })).toBe('Žádné zařízení, zapněte upozornění');
  });
});
