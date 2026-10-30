import { createHmac } from 'crypto';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  PREHLED_COOKIE,
  UKLID_COOKIE,
  resetLoginPokusy,
  signSession,
  uklidHesloSedi,
  verifySession,
  hesloSedí,
} from './admin-auth';

describe('uklid auth', () => {
  beforeEach(() => {
    resetLoginPokusy();
    process.env.UKLID_HESLO = 'uklid-test-heslo';
    process.env.ADMIN_HESLO = 'admin-test-heslo';
    process.env.PRUVODCE_TOKEN_SECRET = 'x'.repeat(32);
  });

  it('ověří heslo úklidu odděleně od přehledu', () => {
    expect(uklidHesloSedi('uklid-test-heslo')).toBe(true);
    expect(uklidHesloSedi('admin-test-heslo')).toBe(false);
    expect(hesloSedí('admin-test-heslo')).toBe(true);
    expect(hesloSedí('uklid-test-heslo')).toBe(false);
  });

  it('cookie úklidu neprojde jako majitel, cookie majitele projde do úklidu', () => {
    expect(UKLID_COOKIE).toBe('vivien_uklid');
    expect(PREHLED_COOKIE).toBe('vivien_prehled');
    const uklid = signSession('uklid');
    const majitel = signSession('majitel');
    expect(verifySession(uklid, 'uklid')).toBe(true);
    expect(verifySession(uklid, 'majitel')).toBe(false);
    expect(verifySession(majitel, 'majitel')).toBe(true);
    expect(verifySession(majitel, 'uklid')).toBe(false);
  });

  it('stará cookie majitele bez role dál funguje, stará úklid ne', () => {
    const key = process.env.PRUVODCE_TOKEN_SECRET!;
    const exp = String(Date.now() + 60_000);
    const stara = `${exp}.${createHmac('sha256', key).update(exp).digest('base64url')}`;
    expect(verifySession(stara, 'majitel')).toBe(true);
    expect(verifySession(stara, 'uklid')).toBe(false);
  });
});
