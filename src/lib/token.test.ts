import { describe, expect, it } from 'vitest';
import { createToken, pragueLocalToUtc, stayFromPayload, verifyToken } from './token';
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

  it('token s p a o', () => {
    const payload: TokenPayload = { ...base, p: '2099-12-28', o: 3 };
    const token = createToken(payload, SECRET);
    const result = verifyToken(token, SECRET, new Date('2099-01-01T10:00:00Z'));
    expect(result).toEqual({ ok: true, payload });
    expect(stayFromPayload(payload)).toEqual({ noci: 3, osob: 3 });
  });

  it('starý token bez p/o má XXX pobyt', () => {
    const token = createToken(base, SECRET);
    const result = verifyToken(token, SECRET, new Date('2099-01-01T10:00:00Z'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(stayFromPayload(result.payload)).toEqual({ noci: null, osob: null });
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
  });

  it('po odjezdu po 12:00 Prague vyprší', () => {
    const payload: TokenPayload = { ...base, d: '2026-10-08' };
    const token = createToken(payload, SECRET);
    const afterNoon = pragueLocalToUtc(2026, 10, 8, 12, 0, 1);
    expect(verifyToken(token, SECRET, afterNoon)).toEqual({ ok: false, reason: 'expired' });
  });
});
