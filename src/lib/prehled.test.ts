import { describe, expect, it } from 'vitest';
import { dotazPredOdeslanimZnovu, nabidnoutOdeslani } from './prehled';

describe('tlačítka v přehledu', () => {
  it('u zrušené rezervace skryje odeslání', () => {
    expect(nabidnoutOdeslani('zruseno')).toBe(false);
    expect(dotazPredOdeslanimZnovu('zruseno')).toBeNull();
  });

  it('u odeslaného průvodce se před opakováním zeptá', () => {
    const dotaz = 'Host už průvodce dostal. Opravdu poslat znovu?';
    expect(nabidnoutOdeslani('odeslano')).toBe(true);
    expect(nabidnoutOdeslani('odeslano_s_vyhradou')).toBe(true);
    expect(dotazPredOdeslanimZnovu('odeslano')).toBe(dotaz);
    expect(dotazPredOdeslanimZnovu('odeslano_s_vyhradou')).toBe(dotaz);
  });

  it('u neodeslané rezervace se neptá a odeslání nabídne', () => {
    expect(nabidnoutOdeslani('neodeslano')).toBe(true);
    expect(nabidnoutOdeslani('vraceno')).toBe(true);
    expect(nabidnoutOdeslani('bez_checkinu')).toBe(true);
    expect(dotazPredOdeslanimZnovu('neodeslano')).toBeNull();
  });
});
