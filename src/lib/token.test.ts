import { describe, expect, it } from 'vitest';
import { createToken, pragueLocalToUtc, verifyToken } from './token';
import type { TokenPayload } from './types';

const SECRET = 'test-secret-at-least-32-bytes-long!!';

const base: TokenPayload = {
  r: 'R-1001',
  a: 'V1',
  d: '2099-12-31',
  l: 'cs',
};

describe('token', () => {
  it('platný token projde', () => {
    const token = createToken(base, SECRET);
    const result = verifyToken(token, SECRET, new Date('2099-01-01T10:00:00Z'));
    expect(result).toEqual({ ok: true, payload: base });
  });

  it('změněné datum v těle neprojde', () => {
    const token = createToken(base, SECRET);
    const [body] = token.split('.');
    const json = Buffer.from(body, 'base64url').toString('utf8');
    const tampered = JSON.parse(json) as TokenPayload;
    tampered.d = '2099-01-01';
    const fakeBody = Buffer.from(JSON.stringify(tampered), 'utf8').toString('base64url');
    const [, sig] = token.split('.');
    const result = verifyToken(`${fakeBody}.${sig}`, SECRET);
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  it('změněný podpis neprojde', () => {
    const token = createToken(base, SECRET);
    const [body] = token.split('.');
    const result = verifyToken(`${body}.aaaa`, SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid');
  });

  it('po odjezdu po 12:00 Prague vyprší', () => {
    const payload: TokenPayload = { ...base, d: '2026-10-08' };
    const token = createToken(payload, SECRET);
    const afterNoon = pragueLocalToUtc(2026, 10, 8, 12, 0, 1);
    const result = verifyToken(token, SECRET, afterNoon);
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('před polednem v den odjezdu ještě platí', () => {
    const payload: TokenPayload = { ...base, d: '2026-10-08' };
    const token = createToken(payload, SECRET);
    const beforeNoon = pragueLocalToUtc(2026, 10, 8, 11, 59, 0);
    const result = verifyToken(token, SECRET, beforeNoon);
    expect(result).toEqual({ ok: true, payload });
  });
});
