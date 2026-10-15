import { describe, expect, it } from 'vitest';
import { cistaChyba } from './cista-chyba';
import { FileProcessStore } from './store';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('poslední běh schránky', () => {
  it('z chyby sundá heslo a adresu', () => {
    expect(cistaChyba('AUTH heslo=tajne-heslo pro checkinvivien@seznam.cz')).toBe('AUTH heslo pro schránka');
  });

  it('zapíše běh a znovu ho přečte', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vivien-beh-'));
    const store = new FileProcessStore(path.join(dir, 'store.json'));
    await store.setBeh({ cas: '2026-10-15T08:44:00.000Z', schranka: 'ano', mailu: 12, chyba: '' });
    const beh = await store.getBeh();
    expect(beh?.schranka).toBe('ano');
    expect(beh?.mailu).toBe(12);
    expect(beh?.chyba).toBe('');
  });
});
