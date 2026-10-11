import { describe, expect, it } from 'vitest';
import { zkontrolujCheckinOdkaz } from './checkin-odkaz';

describe('odkaz na check-in', () => {
  it('přijme jen https://', () => {
    expect(zkontrolujCheckinOdkaz('https://checkin.example.com/pobyt')).toEqual({
      ok: true,
      url: 'https://checkin.example.com/pobyt',
    });
    expect(zkontrolujCheckinOdkaz('http://checkin.example.com/pobyt').ok).toBe(false);
    expect(zkontrolujCheckinOdkaz('checkin.example.com').ok).toBe(false);
    expect(zkontrolujCheckinOdkaz('  ')).toEqual({ ok: true, url: null });
  });
});
