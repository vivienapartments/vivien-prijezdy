import { describe, expect, it } from 'vitest';
import {
  dalsiCasovaZprava,
  nazevCasoveZpravy,
  pocetBranaPripoinek,
  pocetCasovychPripoinek,
  pocetCheckinPripoinek,
  popisekStupneCasu,
  stupenBrany,
  stupenCasoveZpravy,
  stupenCheckinu,
  ukazatCheckinNedojezd,
} from './pripominky-stupne';

describe('připomínky stupně', () => {
  it('počítá WhatsApp i SMS záznamy časových zpráv včetně starých názvů', () => {
    const historie = [
      { co: 'WhatsApp: Průvodce nerozbalen' },
      { co: 'SMS: Den příjezdu, průvodce nerozbalen' },
      { co: 'WhatsApp: Neotevřel průvodce' },
      { co: 'WhatsApp: Chybí údaje k bráně' },
      { co: 'E-mail odeslán' },
    ];
    expect(pocetCasovychPripoinek(historie)).toBe(3);
    expect(pocetCasovychPripoinek([])).toBe(0);
  });

  it('neplete Den příjezdu s Průvodce nerozbalen', () => {
    expect(
      pocetCasovychPripoinek([{ co: 'WhatsApp: Den příjezdu, průvodce nerozbalen' }]),
    ).toBe(1);
  });

  it('vybere další stupeň podle počtu (1→2→3→Poslední výzva)', () => {
    expect(dalsiCasovaZprava(0)).toBe('nerozbalen');
    expect(dalsiCasovaZprava(1)).toBe('denNerozbalen');
    expect(dalsiCasovaZprava(2)).toBe('pruvodce3');
    expect(dalsiCasovaZprava(3)).toBe('nedojezd');
    expect(dalsiCasovaZprava(9)).toBe('nedojezd');
  });

  it('popisky a stupně sedí', () => {
    expect(stupenCasoveZpravy('nerozbalen')).toBe(1);
    expect(stupenCasoveZpravy('denNerozbalen')).toBe(2);
    expect(stupenCasoveZpravy('pruvodce3')).toBe(3);
    expect(stupenCasoveZpravy('nedojezd')).toBe(4);
    expect(popisekStupneCasu('nerozbalen')).toContain('normální');
    expect(popisekStupneCasu('pruvodce3')).toContain('důrazný');
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

  it('check-in stupeň: den před / den příjezdu aspoň 3', () => {
    expect(stupenCheckinu(0, false)).toBe(1);
    expect(stupenCheckinu(1, false)).toBe(2);
    expect(stupenCheckinu(2, false)).toBe(3);
    expect(stupenCheckinu(0, true)).toBe(3);
    expect(stupenCheckinu(1, true)).toBe(3);
  });

  it('Poslední výzva check-in až po 3. stupni v den před / den příjezdu', () => {
    const tri = [
      { co: 'WhatsApp: Vyplňte check-in' },
      { co: 'SMS: Vyplňte check-in' },
      { co: 'WhatsApp: Vyplňte check-in' },
    ];
    expect(
      ukazatCheckinNedojezd({
        stav: 'bez_checkinu',
        prijezd: '2026-10-15',
        dnes: '2026-10-15',
        historie: tri,
      }),
    ).toBe(true);
    expect(
      ukazatCheckinNedojezd({
        stav: 'bez_checkinu',
        prijezd: '2026-10-15',
        dnes: '2026-10-14',
        historie: tri,
      }),
    ).toBe(true);
    expect(
      ukazatCheckinNedojezd({
        stav: 'bez_checkinu',
        prijezd: '2026-10-15',
        dnes: '2026-10-12',
        historie: tri,
      }),
    ).toBe(false);
    expect(
      ukazatCheckinNedojezd({
        stav: 'bez_checkinu',
        prijezd: '2026-10-15',
        dnes: '2026-10-15',
        historie: [{ co: 'WhatsApp: Vyplňte check-in' }],
      }),
    ).toBe(false);
    expect(
      ukazatCheckinNedojezd({
        stav: 'odeslano',
        prijezd: '2026-10-15',
        dnes: '2026-10-15',
        historie: tri,
      }),
    ).toBe(false);
  });

  it('brána: stupeň podle počtu, v den příjezdu aspoň 3', () => {
    expect(pocetBranaPripoinek([{ co: 'WhatsApp: Chybí údaje k bráně' }, { co: 'SMS: Chybí údaje k bráně' }])).toBe(2);
    expect(stupenBrany(0, false)).toBe(1);
    expect(stupenBrany(1, false)).toBe(2);
    expect(stupenBrany(2, false)).toBe(3);
    expect(stupenBrany(0, true)).toBe(3);
  });
});
