import { describe, expect, it } from 'vitest';
import { normalizujTelefon, textTelefonu } from './telefon';

describe('telefon hosta', () => {
  it('české číslo bez předvolby dostane +420', () => {
    const t = normalizujTelefon('777 111 222');
    expect(t).toEqual({ ulozeny: '+420777111222', wa: '420777111222' });
    expect(textTelefonu(t!.ulozeny)).toBe('+420 777 111 222');
  });

  it('německé číslo s plus nechá a dá ho na WhatsApp', () => {
    const t = normalizujTelefon('+49 170 1234567');
    expect(t?.wa).toBe('491701234567');
    expect(textTelefonu(t!.ulozeny)).toBe('+49 1701234567');
  });

  it('00420 se převede na plus', () => {
    expect(normalizujTelefon('00420 777 111 222')?.ulozeny).toBe('+420777111222');
  });

  it('nevyplněné pole z Better Hotelu je prázdné', () => {
    expect(normalizujTelefon('(GUEST_PHONE)')).toBeNull();
    expect(normalizujTelefon('')).toBeNull();
  });

  it('neznámý tvar uloží a tlačítko schová', () => {
    const t = normalizujTelefon('volat večer');
    expect(t).toEqual({ ulozeny: 'volat večer', wa: null });
  });
});
