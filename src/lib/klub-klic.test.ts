import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  jeZkusebniProstredi,
  smiZapisovatRezervaci,
} from './klub-klic';

describe('klub-klic ochrana ostrých rezervací', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('na Preview nepíše ostré ID, TEST ano', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('NODE_ENV', 'production');
    expect(jeZkusebniProstredi()).toBe(true);
    expect(smiZapisovatRezervaci('120260626')).toBe(false);
    expect(smiZapisovatRezervaci('TESTKARTY')).toBe(true);
  });

  it('lokálně nepíše ostré ID', () => {
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('NODE_ENV', 'development');
    expect(smiZapisovatRezervaci('120260626')).toBe(false);
    expect(smiZapisovatRezervaci('TESTKARTY')).toBe(true);
  });

  it('na ostré píše běžné rezervace', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'production');
    expect(jeZkusebniProstredi()).toBe(false);
    expect(smiZapisovatRezervaci('120260626')).toBe(true);
    expect(smiZapisovatRezervaci('TESTKARTY')).toBe(true);
  });
});
