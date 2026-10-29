import { describe, expect, it } from 'vitest';
import { textZkuseni } from './upozorneni';

describe('zkusit upozornění', () => {
  it('vrací srozumitelný výsledek', () => {
    expect(textZkuseni({ jak: 'push', zarizeni: 2, doruceno: 2, dorucenoJmena: [] })).toBe(
      'Doručeno na 2 zařízení',
    );
    expect(textZkuseni({ jak: 'push', zarizeni: 1, doruceno: 1, dorucenoJmena: [] })).toBe(
      'Doručeno na 1 zařízení',
    );
    expect(
      textZkuseni({
        jak: 'push',
        zarizeni: 2,
        doruceno: 2,
        dorucenoJmena: ['Pravoslav', 'Nikol'],
      }),
    ).toBe('Doručeno: Pravoslav, Nikol');
    expect(textZkuseni({ jak: 'email', zarizeni: 0, doruceno: 0, dorucenoJmena: [] })).toBe(
      'Odesláno e-mailem',
    );
    expect(textZkuseni({ jak: 'nic', zarizeni: 0, doruceno: 0, dorucenoJmena: [] })).toBe(
      'Žádné zařízení, zapněte upozornění',
    );
  });
});
