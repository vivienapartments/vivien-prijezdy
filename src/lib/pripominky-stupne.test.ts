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
  textVyzvy,
  textVyzvyHosta,
  vyzvaNaRade,
  ukazatCheckinNedojezd,
  uzOdeslanPruvodce3,
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

  it('vybere další stupeň podle počtu (1→2→3→Poslední výzva)', () => {
    expect(dalsiCasovaZprava(0)).toBe('nerozbalen');
    expect(dalsiCasovaZprava(1)).toBe('denNerozbalen');
    expect(dalsiCasovaZprava(2)).toBe('pruvodce3');
    expect(dalsiCasovaZprava(3)).toBe('nedojezd');
  });

  it('v den příjezdu je aspoň 3. stupeň i bez předchozích zpráv', () => {
    expect(dalsiCasovaZprava(0, true, [])).toBe('pruvodce3');
    expect(dalsiCasovaZprava(1, true, [])).toBe('pruvodce3');
    expect(
      dalsiCasovaZprava(1, true, [{ co: 'WhatsApp: Průvodce, důrazný' }]),
    ).toBe('nedojezd');
  });

  it('popisky a stupně sedí', () => {
    expect(stupenCasoveZpravy('nerozbalen')).toBe(1);
    expect(stupenCasoveZpravy('pruvodce3')).toBe(3);
    expect(popisekStupneCasu('pruvodce3')).toContain('důrazný');
    expect(nazevCasoveZpravy('nedojezd')).toBe('Poslední výzva (nedojezd)');
    expect(uzOdeslanPruvodce3([{ co: 'WhatsApp: Průvodce, důrazný' }])).toBe(true);
  });

  it('počítá check-in připomínky z WhatsApp i SMS', () => {
    expect(
      pocetCheckinPripoinek([
        { co: 'WhatsApp: Vyplňte check-in' },
        { co: 'SMS: Vyplňte check-in' },
      ]),
    ).toBe(2);
  });

  it('check-in stupeň: den před / den příjezdu aspoň 3', () => {
    expect(stupenCheckinu(0, false)).toBe(1);
    expect(stupenCheckinu(1, false)).toBe(2);
    expect(stupenCheckinu(0, true)).toBe(3);
  });

  it('Poslední výzva · check-in po 3. stupni odeslaném den předem (i když celkový počet je 2)', () => {
    const historie = [
      { co: 'WhatsApp: Vyplňte check-in', cas: '2026-10-08T10:00:00.000Z' },
      { co: 'WhatsApp: Vyplňte check-in', cas: '2026-10-14T09:00:00.000Z' },
    ];
    expect(
      ukazatCheckinNedojezd({
        stav: 'bez_checkinu',
        prijezd: '2026-10-15',
        dnes: '2026-10-14',
        historie,
      }),
    ).toBe(true);
    expect(
      ukazatCheckinNedojezd({
        stav: 'bez_checkinu',
        prijezd: '2026-10-15',
        dnes: '2026-10-15',
        historie,
      }),
    ).toBe(true);
    expect(
      ukazatCheckinNedojezd({
        stav: 'bez_checkinu',
        prijezd: '2026-10-15',
        dnes: '2026-10-14',
        historie: [{ co: 'WhatsApp: Vyplňte check-in', cas: '2026-10-08T10:00:00.000Z' }],
      }),
    ).toBe(false);
    expect(pocetCheckinPripoinek(historie)).toBe(2);
  });

  it('brána: stupeň podle počtu, v den příjezdu aspoň 3', () => {
    expect(pocetBranaPripoinek([{ co: 'WhatsApp: Chybí údaje k bráně' }])).toBe(1);
    expect(stupenBrany(0, true)).toBe(3);
  });

  it('textVyzvy: 0 / počet s datem / Poslední výzva', () => {
    expect(textVyzvy('checkin', []).plny).toBe('zatím bez výzvy');
    expect(textVyzvy('checkin', []).kratky).toBe('bez výzvy');
    expect(
      textVyzvy('checkin', [
        { co: 'WhatsApp: Vyplňte check-in', cas: '2026-10-30T10:00:00.000Z' },
        { co: 'SMS: Vyplňte check-in', cas: '2026-10-31T09:00:00.000Z' },
      ]).plny,
    ).toMatch(/^2\. výzva · 31\. 10\.$/);
    expect(
      textVyzvy('checkin', [{ co: 'WhatsApp: Poslední výzva · check-in', cas: '2026-10-31T12:00:00.000Z' }])
        .plny,
    ).toBe('Poslední výzva');
    expect(
      textVyzvy('pruvodce', [{ co: 'WhatsApp: Poslední výzva (nedojezd)', cas: '2026-10-31T12:00:00.000Z' }])
        .kratky,
    ).toBe('Poslední výzva');
  });

  it('vyzvaNaRade: 3 h klid, 25 h červená, den před bez dnešní, po Poslední klid', () => {
    const ted = new Date('2026-10-30T15:00:00.000Z');
    const pred3h = [{ co: 'WhatsApp: Vyplňte check-in', cas: '2026-10-30T12:00:00.000Z' }];
    const pred25h = [{ co: 'WhatsApp: Vyplňte check-in', cas: '2026-10-29T14:00:00.000Z' }];
    expect(
      vyzvaNaRade('checkin', {
        historie: pred3h,
        prijezd: '2026-11-05',
        dnes: '2026-10-30',
        now: ted,
      }),
    ).toBe(false);
    expect(
      vyzvaNaRade('checkin', {
        historie: pred25h,
        prijezd: '2026-11-05',
        dnes: '2026-10-30',
        now: ted,
      }),
    ).toBe(true);
    expect(
      vyzvaNaRade('checkin', {
        historie: [],
        prijezd: '2026-11-05',
        dnes: '2026-10-30',
        now: ted,
      }),
    ).toBe(true);
    expect(
      vyzvaNaRade('checkin', {
        historie: [{ co: 'WhatsApp: Vyplňte check-in', cas: '2026-10-29T18:00:00.000Z' }],
        prijezd: '2026-10-30',
        dnes: '2026-10-30',
        now: ted,
      }),
    ).toBe(true);
    expect(
      vyzvaNaRade('checkin', {
        historie: [{ co: 'WhatsApp: Poslední výzva · check-in', cas: '2026-10-29T10:00:00.000Z' }],
        prijezd: '2026-10-30',
        dnes: '2026-10-30',
        now: ted,
      }),
    ).toBe(false);
    const host = textVyzvyHosta('checkin', {
      historie: pred3h,
      prijezd: '2026-11-05',
      dnes: '2026-10-30',
      now: ted,
    });
    expect(host.naRade).toBe(false);
    expect(host.plny).toMatch(/další/);
  });
});
