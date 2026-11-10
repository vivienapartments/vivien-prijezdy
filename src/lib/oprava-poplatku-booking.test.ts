import { describe, expect, it } from 'vitest';
import {
  maOpravitPoplatekBooking,
  vetaOpravyPoplatkuBooking,
} from './oprava-poplatku-booking';
import { prazdnaRezervace } from './store';
import { zapisMajitele } from './rucni-pole';

function karta(patch: Partial<ReturnType<typeof prazdnaRezervace>>) {
  return {
    ...prazdnaRezervace(patch.rezervace || '120260625', '2026-11-09T00:00:00.000Z'),
    zdroj: 'Booking.com',
    poplatek: 'ano' as const,
    ...patch,
  };
}

describe('oprava městského poplatku Booking', () => {
  it('opraví automatické Booking od Bennett s ano nebo neznamo', () => {
    expect(maOpravitPoplatekBooking(karta({ rezervace: '120260625', poplatek: 'ano' }))).toBe(true);
    expect(maOpravitPoplatekBooking(karta({ rezervace: '120260700', poplatek: 'neznamo' }))).toBe(true);
  });

  it('nechá Galia, Airbnb, ruční volbu, zrušené a už správné', () => {
    expect(maOpravitPoplatekBooking(karta({ rezervace: '120260623', poplatek: 'ano' }))).toBe(false);
    expect(maOpravitPoplatekBooking(karta({ zdroj: 'Airbnb', rezervace: '120260700' }))).toBe(false);
    expect(maOpravitPoplatekBooking(karta({ poplatek: 'ne' }))).toBe(false);
    expect(maOpravitPoplatekBooking(karta({ stav: 'zruseno' }))).toBe(false);
    const rucni = zapisMajitele(karta({}), 'poplatek', { poplatek: 'ano' }, 'Poplatek zvolen: vybírat');
    expect(maOpravitPoplatekBooking(rucni)).toBe(false);
  });

  it('ve větě historie zůstane zmínka o platbě, když už byla zapsaná', () => {
    expect(vetaOpravyPoplatkuBooking(karta({}))).toBe('Poplatek: v ceně (Booking od 120260625)');
    expect(vetaOpravyPoplatkuBooking(karta({ zaplaceno: '2026-11-10T10:00:00.000Z' }))).toContain(
      'Už zapsané platby zůstávají',
    );
  });
});
