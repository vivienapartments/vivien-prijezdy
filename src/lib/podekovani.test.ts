import { describe, expect, it } from 'vitest';
import {
  hledejProPodekovani,
  hosteProPodekovani,
  jeProPodekovani,
  muzePodekovatKdykoliv,
  odkazSmsPodekovani,
  textPushPodekovani,
  textPodekovani,
  ukazatPodekovani,
  ZPRAVA_PODEKOVANI,
  ZPRAVA_PODEKOVANI_POZDEJI,
} from './podekovani';
import type { RezervaceRecord } from './store';
import { GUIDE_LANGS } from './types';

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

  it('po 14 dnech zmizí', () => {
    const now = new Date('2026-11-20T15:00:00+01:00');
    expect(jeProPodekovani(host({ odjezd: '2026-11-05' }), '2026-11-20', now)).toBe(false);
    expect(jeProPodekovani(host({ odjezd: '2026-11-06' }), '2026-11-20', now)).toBe(true);
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
    const t = textPodekovani('cs', 'https://priklad.cz/abc', '2026-11-19', '2026-11-19');
    expect(t).toContain('Dobrý den');
    expect(t).toContain('\n\nhttps://priklad.cz/abc');
  });

  it('den odjezdu vs další dny', () => {
    const den = textPodekovani('cs', null, '2026-11-19', '2026-11-19');
    const pozdeji = textPodekovani('cs', null, '2026-11-19', '2026-11-20');
    const treti = textPodekovani('cs', null, '2026-11-17', '2026-11-20');
    expect(den).toContain('cesta domů proběhla v pořádku');
    expect(den).toContain('Moc děkujeme za vaši návštěvu');
    expect(den).not.toContain('dojeli');
    expect(den).not.toContain('byli našimi hosty');
    expect(den).not.toContain('5 %');
    expect(pozdeji).toContain('moc děkujeme za vaši návštěvu u nás');
    expect(pozdeji).not.toContain('dojeli');
    expect(pozdeji).not.toContain('byli našimi hosty');
    expect(pozdeji).not.toContain('ještě jednou');
    expect(pozdeji).not.toContain('5 %');
    expect(treti).toBe(pozdeji);
  });

  it('všechny jazyky mají obě verze', () => {
    for (const lang of GUIDE_LANGS) {
      expect(ZPRAVA_PODEKOVANI[lang].length).toBeGreaterThan(20);
      expect(ZPRAVA_PODEKOVANI_POZDEJI[lang].length).toBeGreaterThan(20);
    }
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

  it('ruční hledání najde i staršího hosta', () => {
    const now = new Date('2026-11-20T15:00:00+01:00');
    const stary = host({ rezervace: '9', odjezd: '2026-10-01', jmeno: 'Novák Petr' });
    expect(jeProPodekovani(stary, '2026-11-20', now)).toBe(false);
    expect(muzePodekovatKdykoliv(stary, '2026-11-20', now)).toBe(true);
    expect(hledejProPodekovani([stary], 'novak', '2026-11-20', now).map((r) => r.rezervace)).toEqual([
      '9',
    ]);
    expect(
      hledejProPodekovani([stary], { rezervace: '9' }, '2026-11-20', now).map((r) => r.rezervace),
    ).toEqual(['9']);
  });

  it('ruční hledání podle telefonu', () => {
    const now = new Date('2026-11-20T15:00:00+01:00');
    const stary = host({
      rezervace: '8',
      odjezd: '2026-10-01',
      jmeno: 'Starý',
      telefonText: '+420 777 111 222',
    } as Partial<RezervaceRecord>);
    expect(
      hledejProPodekovani([stary], { telefon: '777111' }, '2026-11-20', now).map((r) => r.rezervace),
    ).toEqual(['8']);
  });
});
