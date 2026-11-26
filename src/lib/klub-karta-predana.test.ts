import { describe, expect, it } from 'vitest';
import {
  emailProKartu,
  jeBookingZdroj,
  pridejKanalKartaPredana,
  sestavZpravuKarty,
  textKartaPoslana,
} from './klub-karta-predana';

describe('klub-karta-predana (PROMPT 5b)', () => {
  it('relay e-mail nejde vybrat (adresa z Bookingu)', () => {
    const r = emailProKartu({ emailHosta: '12345@guest.booking.com' });
    expect(r.relay).toBe(true);
    expect(r.relayPoznamka).toBe('adresa z Bookingu');
    expect(r.email).toContain('@guest.booking.com');
  });

  it('skutečný e-mail z check-inu jde', () => {
    const r = emailProKartu({ emailHosta: 'anna@example.com' });
    expect(r.relay).toBe(false);
    expect(r.email).toBe('anna@example.com');
  });

  it('Booking zpráva má 5 %, přímá ne', () => {
    const booking = sestavZpravuKarty({
      lang: 'cs',
      krestniJmeno: 'Anno',
      odkaz: 'https://example.com/klub?k=abc',
      booking: true,
    });
    const prima = sestavZpravuKarty({
      lang: 'cs',
      krestniJmeno: 'Anno',
      odkaz: 'https://example.com/klub?k=abc',
      booking: false,
    });
    expect(booking).toContain('5 %');
    expect(prima).not.toContain('5 %');
    expect(booking).toContain('/klub?k=abc');
  });

  it('13 jazyků má text Booking i přímý', () => {
    const langy = [
      'cs',
      'en',
      'de',
      'pl',
      'uk',
      'zh-Hant',
      'es',
      'fr',
      'it',
      'pt',
      'sv',
      'hu',
      'da',
      'fi',
    ] as const;
    for (const lang of langy) {
      const b = sestavZpravuKarty({
        lang,
        krestniJmeno: 'Anna',
        odkaz: 'https://x.test/klub?k=1',
        booking: true,
      });
      const p = sestavZpravuKarty({
        lang,
        krestniJmeno: 'Anna',
        odkaz: 'https://x.test/klub?k=1',
        booking: false,
      });
      expect(b.length).toBeGreaterThan(20);
      expect(p.length).toBeGreaterThan(20);
      expect(b).toContain('https://x.test/klub?k=1');
    }
  });

  it('text Karta poslána · E-mail + WhatsApp 15:42', () => {
    const predana = pridejKanalKartaPredana(
      pridejKanalKartaPredana(null, 'email', '2026-11-26T14:42:00.000Z'),
      'whatsapp',
      '2026-11-26T14:42:00.000Z',
    );
    expect(textKartaPoslana(predana, '15:42')).toBe('Karta poslána · E-mail + WhatsApp 15:42');
  });

  it('jeBookingZdroj pozná Booking i Airbnb', () => {
    expect(jeBookingZdroj('Booking.com', null)).toBe(true);
    expect(jeBookingZdroj('přímá', 'x@guest.airbnb.com')).toBe(true);
    expect(jeBookingZdroj('přímá', 'anna@example.com')).toBe(false);
  });
});
