import { describe, expect, it } from 'vitest';
import { langFromNarodnost, parseVivienData } from './vivien-data';

const SAMPLE = `
(RES_URL)

VIVIEN-DATA v1
REZERVACE: 120260530
APARTMAN: Pohodlí v tlumených tónech
PRIJEZD: 6.10.2026
ODJEZD: 7.10.2026
NOCI: 1
OSOB: 2
EMAIL: host@example.com
NARODNOST: CZE
OSLOVENI: Vážený pane Nováku
ZDROJ: Booking.com
KONEC
`;

describe('parseVivienData', () => {
  it('parsuje vzor #120260530', () => {
    const r = parseVivienData(SAMPLE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.rezervace).toBe('120260530');
    expect(r.data.apartman).toBe('V5');
    expect(r.data.prijezd).toBe('2026-10-06');
    expect(r.data.odjezd).toBe('2026-10-07');
    expect(r.data.noci).toBe(1);
    expect(r.data.osob).toBe(2);
    expect(r.data.email).toBe('host@example.com');
    expect(r.data.jazyk).toBe('cs');
  });

  it('parsuje HTML verzi', () => {
    const html = `<html><body><p>VIVIEN-DATA v1</p>
<p>REZERVACE: 99</p>
<p>APARTMAN: Jemná harmonie</p>
<p>PRIJEZD: 1.11.2026</p>
<p>ODJEZD: 3.11.2026</p>
<p>EMAIL: <a href="mailto:a@b.cz">a@b.cz</a></p>
<p>NARODNOST: DEU</p>
<p>KONEC</p></body></html>`;
    const r = parseVivienData(html);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.apartman).toBe('V1');
    expect(r.data.jazyk).toBe('de');
    expect(r.data.noci).toBe(2);
  });

  it('hlásí chybějící pole', () => {
    const r = parseVivienData(`VIVIEN-DATA v1\nREZERVACE: 1\nKONEC`);
    expect(r.ok).toBe(false);
  });

  it('mapuje národnost', () => {
    expect(langFromNarodnost('pol')).toBe('pl');
    expect(langFromNarodnost('')).toBe('en');
    expect(langFromNarodnost('XXX')).toBe('en');
  });
});
