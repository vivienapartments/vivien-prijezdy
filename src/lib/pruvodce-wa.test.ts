import { describe, expect, it } from 'vitest';
import { odkazKarty } from './prehled-odkaz';
import {
  cekaWhatsAppPoPruvodci,
  jeOdeslaniPruvodceEmail,
  textUpozorneniPoPruvodci,
} from './pruvodce-wa-stav';

describe('pruvodce-wa', () => {
  it('pozná odeslání e-mailu', () => {
    expect(jeOdeslaniPruvodceEmail('Průvodce odeslán')).toBe(true);
    expect(jeOdeslaniPruvodceEmail('Průvodce odeslán s výhradou')).toBe(true);
    expect(jeOdeslaniPruvodceEmail('Odesláno znovu v jazyce English')).toBe(true);
    expect(jeOdeslaniPruvodceEmail('Opraveno a odesláno')).toBe(true);
    expect(jeOdeslaniPruvodceEmail('WhatsApp: Průvodce · 1. stupeň')).toBe(false);
  });

  it('čeká WhatsApp jen dokud po e-mailu neodešel', () => {
    expect(cekaWhatsAppPoPruvodci([])).toBe(false);
    expect(
      cekaWhatsAppPoPruvodci([{ co: 'Průvodce odeslán' }]),
    ).toBe(true);
    expect(
      cekaWhatsAppPoPruvodci([
        { co: 'Průvodce odeslán' },
        { co: 'WhatsApp: Průvodce · 1. stupeň' },
      ]),
    ).toBe(false);
    expect(
      cekaWhatsAppPoPruvodci([
        { co: 'Průvodce odeslán' },
        { co: 'WhatsApp: Průvodce · 1. stupeň' },
        { co: 'Odesláno znovu v jazyce Deutsch' },
      ]),
    ).toBe(true);
  });

  it('text upozornění a odkaz na kartu se zprávou', () => {
    expect(
      textUpozorneniPoPruvodci({
        apartman: 'V3',
        jmeno: 'Petr Novák',
        rezervace: '99',
        telefonWa: '420604111222',
      }),
    ).toBe('V3 Novák: průvodce odešel e-mailem. Pošlete WhatsApp.');
    expect(
      textUpozorneniPoPruvodci({
        apartman: 'V3',
        jmeno: 'Petr Novák',
        rezervace: '99',
        telefonWa: null,
      }),
    ).toBe('V3 Novák: průvodce odešel e-mailem. Chybí telefon na WhatsApp.');
    expect(odkazKarty('99', null, { zprava: 'pruvodceEmail' })).toBe(
      '/prehled#99?zprava=pruvodceEmail',
    );
  });
});
