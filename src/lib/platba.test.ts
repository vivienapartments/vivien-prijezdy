import { describe, expect, it } from 'vitest';
import { maUpozornitPlatbu } from './platba';
import { prazdnaRezervace } from './store';

describe('ranní upozornění na platbu', () => {
  const rano = new Date('2026-10-14T05:30:00.000Z');
  const noc = new Date('2026-10-14T04:30:00.000Z');

  function host(patch: Partial<ReturnType<typeof prazdnaRezervace>>) {
    return { ...prazdnaRezervace('1', '2026-10-01T00:00:00.000Z'), odjezd: '2026-10-14', stav: 'odeslano' as const, ...patch };
  }

  it('ráno v den odjezdu, když městský poplatek není vybraný', () => {
    expect(maUpozornitPlatbu(host({ poplatek: 'ano' }), rano)).toBe(true);
  });

  it('před sedmou ne', () => {
    expect(maUpozornitPlatbu(host({ poplatek: 'ano' }), noc)).toBe(false);
  });

  it('když už je vybraný, nebo upozornění dnes odešlo, nebo poplatek neplatí, ne', () => {
    expect(maUpozornitPlatbu(host({ poplatek: 'ano', zaplaceno: '2026-10-14T06:00:00.000Z' }), rano)).toBe(false);
    expect(maUpozornitPlatbu(host({ poplatek: 'ano', platbaUpozorneno: '2026-10-14' }), rano)).toBe(false);
    expect(maUpozornitPlatbu(host({ poplatek: 'ne' }), rano)).toBe(false);
  });

  it('opakovaný výjezd se počítá i když městský poplatek neplatí nebo už je vybraný', () => {
    const jizda = { id: 'a', kdy: '2026-10-14T10:00:00.000Z', castka: 300 };
    expect(maUpozornitPlatbu(host({ poplatek: 'ne', vyjezdy: [jizda] }), rano)).toBe(true);
    expect(maUpozornitPlatbu(host({ poplatek: 'ano', zaplaceno: '2026-10-14T06:00:00.000Z', vyjezdy: [jizda] }), rano)).toBe(true);
    expect(maUpozornitPlatbu(host({ poplatek: 'ne', vyjezdy: [] }), rano)).toBe(false);
  });
  it('jiný den a zrušená rezervace ne', () => {
    expect(maUpozornitPlatbu(host({ odjezd: '2026-10-15' }), rano)).toBe(false);
    expect(maUpozornitPlatbu(host({ stav: 'zruseno' }), rano)).toBe(false);
  });
});
