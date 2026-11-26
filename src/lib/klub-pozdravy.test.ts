import { describe, expect, it } from 'vitest';
import { osloveniProPozdrav, pozdravDalsiOtevreni } from './klub-pozdravy';

describe('klub-pozdravy', () => {
  it('čeština skládá 5. pád', () => {
    expect(osloveniProPozdrav('cs', 'Anna')).toBe('Anno');
    expect(osloveniProPozdrav('cs', 'Jana')).toBe('Jano');
    expect(osloveniProPozdrav('cs', 'Dominik')).toBe('Dominiku');
  });

  it('neznámé jméno vynechá', () => {
    expect(osloveniProPozdrav('cs', 'Xyzabc')).toBeNull();
    expect(
      pozdravDalsiOtevreni('cs', {
        krestniJmeno: 'Xyzabc',
        posledniOdjezdYmd: '2026-11-23',
        pristiPrijezdYmd: null,
      }),
    ).toBe('Děkujeme za váš pobyt.');
  });

  it('Booking během pobytu: Vítejte u nás, Anno.', () => {
    expect(
      pozdravDalsiOtevreni('cs', {
        krestniJmeno: 'Anna',
        posledniOdjezdYmd: null,
        pristiPrijezdYmd: null,
        praveBydli: true,
        bookingKlub: true,
      }),
    ).toBe('Vítejte u nás, Anno.');
  });
});
