import { describe, expect, it } from 'vitest';
import {
  hosteProPodekovani,
  jeProPodekovani,
  odkazSmsPodekovani,
  textPushPodekovani,
  textPodekovani,
  ukazatPodekovani,
} from './podekovani';
import type { RezervaceRecord } from './store';

function host(partial: Partial<RezervaceRecord>): RezervaceRecord {
  return {
    rezervace: '1',
    apartman: 'V1',
    prijezd: '2026-11-17',
    odjezd: '2026-11-19',
    stav: 'odeslano',
    predano: '2026-11-17T14:00:00.000Z',
    nedojezdKdy: null,
    podekovaniKdy: null,
    podekovaniKanal: null,
    jmeno: 'Novák',
    ...partial,
  } as RezervaceRecord;
}

describe('podekovani', () => {
  it('dnes před polednem ještě ne', () => {
    const r = host({ odjezd: '2026-11-19' });
    const pred = new Date('2026-11-19T10:00:00+01:00');
    expect(jeProPodekovani(r, '2026-11-19', pred)).toBe(false);
  });

  it('dnes po poledni ano', () => {
    const r = host({ odjezd: '2026-11-19' });
    const po = new Date('2026-11-19T12:01:00+01:00');
    expect(jeProPodekovani(r, '2026-11-19', po)).toBe(true);
  });

  it('vyřadí zrušené, nepředané a nedojezd', () => {
    const dnes = '2026-11-20';
    const now = new Date('2026-11-20T15:00:00+01:00');
    expect(jeProPodekovani(host({ stav: 'zruseno' }), dnes, now)).toBe(false);
    expect(jeProPodekovani(host({ predano: null }), dnes, now)).toBe(false);
    expect(jeProPodekovani(host({ nedojezdKdy: 'x' }), dnes, now)).toBe(false);
  });

  it('po 3 dnech zmizí', () => {
    const r = host({ odjezd: '2026-11-16' });
    const now = new Date('2026-11-20T15:00:00+01:00');
    expect(jeProPodekovani(r, '2026-11-20', now)).toBe(false);
  });

  it('řadí nejstarší odjezd nahoře', () => {
    const now = new Date('2026-11-20T15:00:00+01:00');
    const list = [
      host({ rezervace: '2', odjezd: '2026-11-19', jmeno: 'B' }),
      host({ rezervace: '1', odjezd: '2026-11-18', jmeno: 'A' }),
    ];
    expect(hosteProPodekovani(list, '2026-11-20', now).map((r) => r.rezervace)).toEqual(['1', '2']);
  });

  it('skloňuje push', () => {
    expect(textPushPodekovani(1)).toBe('Pošlete 1 hostu poděkování.');
    expect(textPushPodekovani(3)).toBe('Pošlete 3 hostům poděkování.');
    expect(textPushPodekovani(5)).toBe('Pošlete 5 hostům poděkování.');
  });

  it('SMS odkaz iPhone a Android', () => {
    const android = odkazSmsPodekovani('+420604692573', 'Ahoj', false);
    const ios = odkazSmsPodekovani('+420604692573', 'Ahoj', true);
    expect(android.startsWith('sms:+420604692573?body=')).toBe(true);
    expect(ios.startsWith('sms:+420604692573&body=')).toBe(true);
  });

  it('připojí odkaz pod text', () => {
    const t = textPodekovani('cs', 'https://priklad.cz/abc');
    expect(t).toContain('Dobrý den');
    expect(t).toContain('\n\nhttps://priklad.cz/abc');
  });

  it('menu po odjezdu i když už odesláno', () => {
    expect(
      ukazatPodekovani({
        predano: 'x',
        odjezd: '2026-11-19',
        dnes: '2026-11-20',
        now: new Date('2026-11-20T15:00:00+01:00'),
      }),
    ).toBe(true);
  });
});
