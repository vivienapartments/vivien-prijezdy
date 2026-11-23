import { describe, expect, it } from 'vitest';
import { icalDatumNaYmd, parsujIcalObsazeneNoci } from './kalendar-ical';

describe('kalendar-ical', () => {
  it('parsuje DATE a DATE-TIME', () => {
    expect(icalDatumNaYmd('20261125')).toBe('2026-11-25');
    expect(icalDatumNaYmd('VALUE=DATE:20261126')).toBe('2026-11-26');
    expect(icalDatumNaYmd('20261127T140000Z')).toBe('2026-11-27');
  });

  it('nocí bez dne odjezdu', () => {
    const ical = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:20261125',
      'DTEND;VALUE=DATE:20261126',
      'SUMMARY:Host Name Secret',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'DTSTART:20261201T150000Z',
      'DTEND:20261203T100000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    expect(parsujIcalObsazeneNoci(ical)).toEqual(['2026-11-25', '2026-12-01', '2026-12-02']);
  });
});
