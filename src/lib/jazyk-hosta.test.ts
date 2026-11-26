import { describe, expect, it } from 'vitest';
import { jazykHostaJeZnamy } from './jazyk-hosta';

describe('jazykHostaJeZnamy', () => {
  it('zná jazyk z karty', () => {
    expect(jazykHostaJeZnamy({ jazyk: 'de' })).toBe(true);
  });

  it('Booking bez jazyka v kartě = známý (check-in)', () => {
    expect(jazykHostaJeZnamy({ jazyk: null, zdroj: 'Booking.com' })).toBe(true);
    expect(jazykHostaJeZnamy({ jazyk: null, email: 'x@guest.airbnb.com' })).toBe(true);
  });

  it('přímý / doporučený bez jazyka = neznámý', () => {
    expect(jazykHostaJeZnamy({ jazyk: null, zdroj: 'přímá' })).toBe(false);
    expect(jazykHostaJeZnamy({})).toBe(false);
  });
});
