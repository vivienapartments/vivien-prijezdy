import { describe, expect, it } from 'vitest';
import {
  jeZneuzitiDoporuceni,
  kreditVyprsiYmd,
  kredityBlizkoVyprseni,
  pctOdmenyProPobyt,
  pridejMesice,
} from './klub-odmena';
import { VYCHOZI_KLUB_PRAVIDLA } from './klub-pravidla';

describe('klub odměna doporučiteli', () => {
  it('5 % první, 2 % další do 12 měsíců', () => {
    expect(pctOdmenyProPobyt(true, null, '2026-12-01', VYCHOZI_KLUB_PRAVIDLA)).toBe(5);
    expect(
      pctOdmenyProPobyt(false, '2026-01-15', '2026-06-01', VYCHOZI_KLUB_PRAVIDLA),
    ).toBe(2);
    expect(
      pctOdmenyProPobyt(false, '2026-01-15', '2027-03-01', VYCHOZI_KLUB_PRAVIDLA),
    ).toBe(0);
  });

  it('zneužití stejný e-mail / telefon / jméno', () => {
    expect(
      jeZneuzitiDoporuceni(
        { jmeno: 'Jan Novák', email: 'jan@egd.cz', telefon: '+420604111222' },
        { jmeno: 'Petr Svoboda', email: 'jan@egd.cz', telefon: '+420604333444' },
      ),
    ).toBe(true);
    expect(
      jeZneuzitiDoporuceni(
        { jmeno: 'Jan Novák', email: 'jan@egd.cz', telefon: '+420604111222' },
        { jmeno: 'Petr Svoboda', email: 'petr@seznam.cz', telefon: '+420604999888' },
      ),
    ).toBe(false);
  });

  it('platnost kreditu 24 měsíců a upozornění měsíc před', () => {
    expect(pridejMesice('2026-01-15', 24)).toBe('2028-01-15');
    expect(kreditVyprsiYmd('2026-01-15T10:00:00.000Z', 24)).toBe('2028-01-15');
    const blizko = kredityBlizkoVyprseni(
      [
        {
          id: 'a',
          castka: 200,
          vznik: '2024-01-01T00:00:00.000Z',
          platnostDo: '2026-12-10',
          zdroj: 'x',
          pouzito: 0,
        },
      ],
      '2026-11-25',
    );
    expect(blizko).toHaveLength(1);
    expect(blizko[0].zbyvaKc).toBe(200);
  });
});
