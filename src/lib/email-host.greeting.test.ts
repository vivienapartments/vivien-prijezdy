import { describe, expect, it } from 'vitest';
import { buildGuestEmail, greetingLine } from './email-host';
import { cleanGuestFirstName, parseVivienData } from './vivien-data';

describe('greetingLine', () => {
  it('čech v 5. pádu, slovenština v 1. pádu, cizí jméno bez oslovení', () => {
    expect(greetingLine('cs', 'Petr', 'CZE')).toBe('Dobrý den, Petře,');
    expect(greetingLine('cs', 'Jana', 'CZE')).toBe('Dobrý den, Jano,');
    expect(greetingLine('cs', 'Marie', 'CZE')).toBe('Dobrý den, Marie,');
    expect(greetingLine('cs', 'Tomáš', 'CZE')).toBe('Dobrý den, Tomáši,');
    expect(greetingLine('cs', 'Jiří', 'CZE')).toBe('Dobrý den, Jiří,');
    expect(greetingLine('cs', 'Eva', 'CZE')).toBe('Dobrý den, Evo,');
    expect(greetingLine('cs', 'Anna', 'CZE')).toBe('Dobrý den, Anno,');
    expect(greetingLine('cs', 'Lucie', 'CZE')).toBe('Dobrý den, Lucie,');
    expect(greetingLine('cs', 'Kateřina', 'CZE')).toBe('Dobrý den, Kateřino,');
    expect(greetingLine('cs', 'Martin', 'CZE')).toBe('Dobrý den, Martine,');
    expect(greetingLine('cs', 'Lukáš', 'CZE')).toBe('Dobrý den, Lukáši,');
    expect(greetingLine('cs', 'Jan', 'CZE')).toBe('Dobrý den, Jane,');
    expect(greetingLine('cs', 'John', 'CZE')).toBe('Dobrý den,');
    expect(greetingLine('cs', 'Sophie', 'CZE')).toBe('Dobrý den,');
    expect(greetingLine('cs', 'Hans', 'CZE')).toBe('Dobrý den,');
    expect(greetingLine('cs', 'Anna-Marie', 'CZE')).toBe('Dobrý den,');
    expect(greetingLine('cs', 'Peter', 'SVK')).toBe('Dobrý den, Peter,');
    expect(greetingLine('cs', 'Zuzana', 'SVK')).toBe('Dobrý den, Zuzana,');
    expect(greetingLine('cs', 'Marie', null)).toBe('Dobrý den,');
    expect(greetingLine('de', 'Hans')).toBe('Guten Tag Hans,');
  });

  it('bez jména neutrální pozdrav', () => {
    expect(greetingLine('cs', null)).toBe('Dobrý den,');
    expect(greetingLine('de', '')).toBe('Guten Tag,');
  });
});

describe('GUEST_NAME z BH šablony', () => {
  it('parsuje GUEST_NAME', () => {
    const r = parseVivienData(`VIVIEN-DATA v1
REZERVACE: 1
APARTMAN: Jemná harmonie
PRIJEZD: 1.11.2026
ODJEZD: 3.11.2026
EMAIL: a@b.cz
NARODNOST: DEU
OSLOVENI: Sehr geehrter Herr Doppler
GUEST_NAME: Hans
ACCESS_PIN: 1234
KONEC`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.jmeno).toBe('Hans');
    expect(greetingLine(r.data.jazyk, r.data.jmeno)).toBe('Guten Tag Hans,');
  });

  it('čas příjezdu je nad zlatým tlačítkem', () => {
    const { html, text } = buildGuestEmail({
      lang: 'cs',
      apt: 'V1',
      prijezd: '2026-11-01',
      odjezd: '2026-11-03',
      noci: 2,
      osob: 2,
      osloveni: null,
      jmeno: 'Marie',
      guideUrl: 'http://127.0.0.1:3000/x',
      intendedTo: 'host@example.com',
    });
    const veta = html.indexOf('Nejdůležitější: napište nám, v kolik dorazíte');
    const tlacitko = html.indexOf('background:#c9a84c;border-radius:28px');
    expect(veta).toBeGreaterThan(-1);
    expect(tlacitko).toBeGreaterThan(veta);
    expect(text).toContain('Nejdůležitější: napište nám, v kolik dorazíte');
  });

  it('odmítne nevyplněný merge field', () => {
    expect(cleanGuestFirstName('(GUEST_NAME)')).toBeNull();
    expect(cleanGuestFirstName('GUEST_NAME')).toBeNull();
  });
});
