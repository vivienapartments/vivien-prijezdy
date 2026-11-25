import { describe, expect, it } from 'vitest';
import {
  slevaDelkaPct,
  urovenZUtraty,
  vyslednaSlevaPct,
  VYCHOZI_KLUB_PRAVIDLA,
} from './klub-pravidla';

describe('klub sleva a úroveň', () => {
  it('úroveň ze útraty', () => {
    expect(urovenZUtraty(0).id).toBe('host');
    expect(urovenZUtraty(7999).slevaPct).toBe(5);
    expect(urovenZUtraty(8000).id).toBe('staly');
    expect(urovenZUtraty(25000).id).toBe('stribrny');
    expect(urovenZUtraty(25000).slevaPct).toBe(8);
    expect(urovenZUtraty(60000).id).toBe('platinovy');
  });

  it('sleva za délku', () => {
    expect(slevaDelkaPct(3)).toBe(0);
    expect(slevaDelkaPct(6)).toBe(0);
    expect(slevaDelkaPct(7)).toBe(10);
    expect(slevaDelkaPct(8)).toBe(10);
    expect(slevaDelkaPct(13)).toBe(10);
    expect(slevaDelkaPct(14)).toBe(15);
  });

  it('výsledná sleva = max(délka, osobní)', () => {
    expect(vyslednaSlevaPct({ noci: 3 })).toBe(0);
    expect(vyslednaSlevaPct({ noci: 8 })).toBe(10);
    expect(
      vyslednaSlevaPct({
        noci: 3,
        maDokoncenyPobyt: true,
        utrataKc: 25000,
      }),
    ).toBe(8);
    expect(
      vyslednaSlevaPct({
        noci: 8,
        maDokoncenyPobyt: true,
        utrataKc: 25000,
      }),
    ).toBe(10);
    expect(vyslednaSlevaPct({ noci: 3, jeFirma: true })).toBe(5);
    expect(vyslednaSlevaPct({ noci: 14, jeFirma: true })).toBe(15);
    expect(vyslednaSlevaPct({ noci: 3, jeDoporucenyPrvniPobyt: true })).toBe(5);
  });

  it('speciální termín = 0 %', () => {
    const p = {
      ...VYCHOZI_KLUB_PRAVIDLA,
      specialniTerminy: ['2026-12-24'],
    };
    expect(
      vyslednaSlevaPct(
        { noci: 8, jeFirma: true, prijezd: '2026-12-24' },
        p,
      ),
    ).toBe(0);
  });

  it('sleva úrovně až po prvním odjezdu (výchozí)', () => {
    expect(
      vyslednaSlevaPct({
        noci: 3,
        maDokoncenyPobyt: false,
        utrataKc: 60000,
      }),
    ).toBe(0);
  });
});
