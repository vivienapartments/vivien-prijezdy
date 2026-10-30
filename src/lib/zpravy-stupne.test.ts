import { describe, expect, it } from 'vitest';
import { GUIDE_LANGS } from './types';
import {
  ODKAZ_UNIVERZALNI,
  ZPRAVA_BRANA_1,
  ZPRAVA_BRANA_2,
  ZPRAVA_BRANA_3,
  ZPRAVA_CHECKIN_1,
  ZPRAVA_CHECKIN_2,
  ZPRAVA_CHECKIN_3,
  ZPRAVA_CHECKIN_NEDOJEZD,
  ZPRAVA_DEN_CAS,
  ZPRAVA_ODJEZD,
  ZPRAVA_PRUVODCE_1,
  ZPRAVA_PRUVODCE_2,
  ZPRAVA_PRUVODCE_3,
} from './zpravy-stupne';
import { zpravaBrany, zpravaCheckinu, zpravaCheckinNedojezdu, zpravaPruvodce3 } from './whatsapp-zprava';

const TABULKY = [
  ZPRAVA_CHECKIN_1,
  ZPRAVA_CHECKIN_2,
  ZPRAVA_CHECKIN_3,
  ZPRAVA_CHECKIN_NEDOJEZD,
  ZPRAVA_PRUVODCE_1,
  ZPRAVA_PRUVODCE_2,
  ZPRAVA_PRUVODCE_3,
  ZPRAVA_DEN_CAS,
  ZPRAVA_BRANA_1,
  ZPRAVA_BRANA_2,
  ZPRAVA_BRANA_3,
  ZPRAVA_ODJEZD,
  ODKAZ_UNIVERZALNI,
];

describe('zprávy stupně', () => {
  it('žádný jazyk nemá prázdný text', () => {
    for (const tab of TABULKY) {
      for (const lang of GUIDE_LANGS) {
        expect(tab[lang]?.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it('ve hotové zprávě nezůstane zástupný symbol', () => {
    for (const lang of GUIDE_LANGS) {
      expect(zpravaCheckinu(lang, 'Booking')).not.toContain('{');
      expect(zpravaCheckinu(lang, 'Booking', 'https://example.com/c')).not.toContain('{');
      expect(zpravaCheckinNedojezdu(lang)).not.toContain('{');
      expect(zpravaBrany(lang, 2)).not.toContain('{');
      expect(zpravaPruvodce3(lang, null)).not.toContain('{');
    }
  });
});
