import { describe, expect, it } from 'vitest';
import { greetingLine, nameFromOsloveni } from './email-host';

describe('nameFromOsloveni', () => {
  it('odstraní pane/paní i když BH splete rod', () => {
    expect(nameFromOsloveni('Vážený pane Turay')).toBe('Turay');
    expect(nameFromOsloveni('Vážená paní Ješutová')).toBe('Ješutová');
  });

  it('odstraní Herr/Frau', () => {
    expect(nameFromOsloveni('Sehr geehrter Herr Doppler')).toBe('Doppler');
    expect(nameFromOsloveni('Sehr geehrte Frau Müller')).toBe('Müller');
    expect(nameFromOsloveni('Herr Lauße')).toBe('Lauße');
  });
});

describe('greetingLine', () => {
  it('CS/DE jen jméno bez titulu', () => {
    expect(greetingLine('cs', 'Vážený pane Turay')).toBe('Dobrý den Turay,');
    expect(greetingLine('de', 'Sehr geehrter Herr Doppler')).toBe('Guten Tag Doppler,');
    expect(greetingLine('de', null)).toBe('Guten Tag,');
  });
});
