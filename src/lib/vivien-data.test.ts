import { describe, expect, it } from 'vitest';
import { inspectVivienMail, jmenoProPrehled, langFromNarodnost, parseVivienData } from './vivien-data';

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
ACCESS_PIN: 1234
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
<p>ACCESS_PIN: 5678</p>
<p>KONEC</p></body></html>`;
    const r = parseVivienData(html);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.apartman).toBe('V1');
    expect(r.data.jazyk).toBe('de');
    expect(r.data.noci).toBe(2);
  });

  it('parsuje HTML entity v názvu apartmánu', () => {
    const html = `VIVIEN-DATA v1
REZERVACE: 55
APARTMAN: Pohodl&#237; v tlumen&#253;ch t&#243;nech
PRIJEZD: 1.12.2026
ODJEZD: 3.12.2026
EMAIL: host@example.com
NARODNOST: CZE
ACCESS_PIN: 9012
KONEC`;
    const r = parseVivienData(html);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.apartman).toBe('V5');
  });

  it('bez PINu se data nepustí dál', () => {
    const bez = SAMPLE.replace('ACCESS_PIN: 1234\n', '');
    const r = parseVivienData(bez);
    expect(r.ok).toBe(false);
  });

  it('jméno do tabulky je z GUEST_NAME, jinak příjmení z oslovení', () => {
    expect(jmenoProPrehled('Marie', 'Vážená paní Nováková')).toBe('Marie');
    expect(jmenoProPrehled('', 'Vážený pane Nováku')).toBe('Nováku');
    expect(jmenoProPrehled('(GUEST_NAME)', 'Vážený pane Nováku')).toBe('Nováku');
  });

  it('překlep e-mailu je chyba, číslo rezervace zůstane', () => {
    const r = inspectVivienMail(
      `VIVIEN-DATA v1
REZERVACE: 42
APARTMAN: Jemná harmonie
PRIJEZD: 1.11.2026
ODJEZD: 3.11.2026
EMAIL: host@gmial.com
OSOB: 2
KONEC`,
    );
    expect(r.rezervace).toBe('42');
    expect(r.duvody.some((d) => d.kod === 'spatny_email')).toBe(true);
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

  it('mapuje Taiwan / Čínu / HK na zh-Hant i z variant BH', () => {
    expect(langFromNarodnost('TWN')).toBe('zh-Hant');
    expect(langFromNarodnost('TW')).toBe('zh-Hant');
    expect(langFromNarodnost('Taiwan')).toBe('zh-Hant');
    expect(langFromNarodnost('Taiwan, Province of China')).toBe('zh-Hant');
    expect(langFromNarodnost('HKG')).toBe('zh-Hant');
    expect(langFromNarodnost('Hong Kong')).toBe('zh-Hant');
    expect(langFromNarodnost('CHN')).toBe('zh-Hant');
    expect(langFromNarodnost('China')).toBe('zh-Hant');
  });
});
