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
    expect(
      textZkuseni({
        jak: 'push',
        zarizeni: 2,
        doruceno: 1,
        dorucenoJmena: ['Nikol'],
        chyby: ['Pravoslav (403)'],
      }),
    ).toBe('Doručeno: Nikol. Nešlo: Pravoslav (403)');
    expect(textZkuseni({ jak: 'email', zarizeni: 1, doruceno: 0, dorucenoJmena: [], chyby: ['Pravoslav (403)'] })).toBe(
      'Odesláno e-mailem. Push nešel: Pravoslav (403). Na telefonu klepněte Resetovat upozornění.',
    );
    expect(textZkuseni({ jak: 'nic', zarizeni: 0, doruceno: 0, dorucenoJmena: [] })).toBe(
      'Žádné zařízení, zapněte upozornění',
    );
    expect(
      textZkuseni({ jak: 'nic', zarizeni: 1, doruceno: 0, dorucenoJmena: [], odpojeno: ['Pravoslav'] }),
    ).toBe('Google odpojil: Pravoslav. Klepněte Resetovat upozornění.');
    expect(
      textZkuseni({ jak: 'nic', zarizeni: 1, doruceno: 0, dorucenoJmena: [], chyby: ['Pravoslav (403)'] }),
    ).toBe('Push nešel: Pravoslav (403). Klepněte Resetovat upozornění.');
  });
});
