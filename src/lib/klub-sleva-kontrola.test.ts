import { describe, expect, it } from 'vitest';
import {
  aktivujSlevaKontroluPoNepredani,
  jeSlevaKontrolaAktivni,
  pridejSlevuBehemPobytu,
} from './klub-sleva-kontrola';

describe('klub-sleva-kontrola', () => {
  it('aktivuje upozornění po nepředání, když mezitím vznikla vyšší sleva', () => {
    let cast = { slevaBehem: [] as ReturnType<typeof pridejSlevuBehemPobytu> };
    cast = {
      slevaBehem: pridejSlevuBehemPobytu(cast, {
        rezervaceId: 'R-NOVA',
        slevaPctUdelena: 7,
        oficielniSlevaPct: 6,
        kdy: '2026-11-24T10:00:00.000Z',
        zdrojPobytId: 'R-BYDLI',
      }),
    };
    const stav = aktivujSlevaKontroluPoNepredani(cast, {
      zdrojPobytId: 'R-BYDLI',
      oficielniSlevaPct: 6,
    });
    expect(stav?.aktivni).toBe(true);
    expect(stav?.duvod).toBe('zkontrolovat slevu');
    expect(stav?.slevaPctUdelena).toBe(7);
    expect(jeSlevaKontrolaAktivni({ slevaKontrola: stav })).toBe(true);
  });

  it('neaktivuje, když udělená sleva není vyšší než oficiální', () => {
    const cast = {
      slevaBehem: pridejSlevuBehemPobytu(
        {},
        {
          rezervaceId: 'R1',
          slevaPctUdelena: 6,
          oficielniSlevaPct: 6,
          kdy: '2026-11-24T10:00:00.000Z',
        },
      ),
    };
    const stav = aktivujSlevaKontroluPoNepredani(cast, { oficielniSlevaPct: 6 });
    expect(stav).toBeNull();
  });
});
