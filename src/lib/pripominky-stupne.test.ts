import { describe, expect, it } from 'vitest';
import {
  dalsiCasovaZprava,
  nazevCasoveZpravy,
  pocetCasovychPripoinek,
  pocetCheckinPripoinek,
  popisekStupneCasu,
  stupenCasoveZpravy,
} from './pripominky-stupne';

describe('připomínky stupně', () => {
  it('počítá jen přesné WhatsApp záznamy časových zpráv', () => {
    const historie = [
      { co: 'WhatsApp: Průvodce nerozbalen' },
      { co: 'WhatsApp: Den příjezdu, průvodce nerozbalen' },
      { co: 'WhatsApp: Chybí údaje k bráně' },
      { co: 'E-mail odeslán' },
    ];
    expect(pocetCasovychPripoinek(historie)).toBe(2);
    expect(pocetCasovychPripoinek([])).toBe(0);
  });

  it('neplete Den příjezdu s Průvodce nerozbalen', () => {
    expect(
      pocetCasovychPripoinek([{ co: 'WhatsApp: Den příjezdu, průvodce nerozbalen' }]),
    ).toBe(1);
  });

  it('vybere další stupeň podle počtu', () => {
    expect(dalsiCasovaZprava(0)).toBe('nerozbalen');
    expect(dalsiCasovaZprava(1)).toBe('denNerozbalen');
    expect(dalsiCasovaZprava(2)).toBe('nedojezd');
    expect(dalsiCasovaZprava(9)).toBe('nedojezd');
  });

  it('popisky a stupně sedí', () => {
    expect(stupenCasoveZpravy('nerozbalen')).toBe(1);
    expect(stupenCasoveZpravy('denNerozbalen')).toBe(2);
    expect(stupenCasoveZpravy('nedojezd')).toBe(3);
    expect(popisekStupneCasu('nerozbalen')).toContain('jemná');
    expect(nazevCasoveZpravy('nedojezd')).toBe('Poslední výzva (nedojezd)');
  });

  it('počítá check-in připomínky z WhatsApp i SMS', () => {
    expect(
      pocetCheckinPripoinek([
        { co: 'WhatsApp: Vyplňte check-in' },
        { co: 'SMS: Vyplňte check-in' },
        { co: 'WhatsApp: Průvodce nerozbalen' },
      ]),
    ).toBe(2);
  });
});
