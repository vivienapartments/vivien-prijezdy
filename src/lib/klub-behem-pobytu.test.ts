import { describe, expect, it } from 'vitest';
import { textPosunUrovne, urovenBehemPobytu } from './klub-behem-pobytu';

describe('urovenBehemPobytu', () => {
  it('pobyt překročí hranici → během pobytu je vidět nová sleva', () => {
    // 9 600 + 7 000 = 16 600 → Bronzový 7 %
    const v = urovenBehemPobytu({
      utrataKc: 9600,
      probihajiciKc: 7000,
      praveBydli: true,
    });
    expect(v.oficielni.id).toBe('staly');
    expect(v.oficielni.slevaPct).toBe(6);
    expect(v.posuneUroven).toBe(true);
    expect(v.zobrazena.id).toBe('bronz');
    expect(v.slevaPct).toBe(7);
    expect(v.ocekavanaUtrataKc).toBe(16600);
  });

  it('pobyt hranici nepřekročí → zůstává stará sleva', () => {
    const v = urovenBehemPobytu({
      utrataKc: 9600,
      probihajiciKc: 1450,
      praveBydli: true,
    });
    expect(v.posuneUroven).toBe(false);
    expect(v.zobrazena.id).toBe('staly');
    expect(v.slevaPct).toBe(6);
  });

  it('před příjezdem se nic nepočítá dopředu', () => {
    const v = urovenBehemPobytu({
      utrataKc: 9600,
      probihajiciKc: 7000,
      praveBydli: false,
    });
    expect(v.posuneUroven).toBe(false);
    expect(v.zobrazena.id).toBe('staly');
    expect(v.ocekavanaUtrataKc).toBe(9600);
    expect(v.slevaPct).toBe(6);
  });

  it('po předání odpovídá zapsaná úroveň', () => {
    const v = urovenBehemPobytu({
      utrataKc: 16600,
      probihajiciKc: 0,
      praveBydli: false,
    });
    expect(v.zobrazena.id).toBe('bronz');
    expect(v.slevaPct).toBe(7);
    expect(v.posuneUroven).toBe(false);
  });
});

describe('textPosunUrovne', () => {
  it('host i firma', () => {
    const u = {
      id: 'bronz',
      nazevHost: 'Bronzový host',
      nazevFirma: 'Bronzový partner',
      odKc: 16000,
      slevaPct: 7,
    };
    expect(textPosunUrovne(u, false).legendaOk).toBe('Bronzový ✓');
    expect(textPosunUrovne(u, true).telo).toContain('Bronzový partner');
  });
});
