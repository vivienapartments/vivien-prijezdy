import { describe, expect, it } from 'vitest';
import { greetingLine } from './email-host';
import { cleanGuestFirstName, parseVivienData } from './vivien-data';

describe('greetingLine', () => {
  it('s křestním jménem z GUEST_NAME', () => {
    expect(greetingLine('cs', 'Marie')).toBe('Dobrý den Marie,');
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

  it('odmítne nevyplněný merge field', () => {
    expect(cleanGuestFirstName('(GUEST_NAME)')).toBeNull();
    expect(cleanGuestFirstName('GUEST_NAME')).toBeNull();
  });
});
