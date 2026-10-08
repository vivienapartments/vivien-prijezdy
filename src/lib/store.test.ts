import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { FileProcessStore } from './store';

describe('FileProcessStore', () => {
  it('uloží message a rezervaci, purge po odjezdu', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vivien-store-'));
    const store = new FileProcessStore(path.join(dir, 'store.json'));

    await store.markMessage({
      messageId: 'a@b',
      processedAt: '2026-01-01T00:00:00.000Z',
      status: 'sent',
      rezervace: '99',
    });
    await store.setRezervace('99', {
      status: 'odeslano',
      odjezd: '2020-01-01',
      emailHosta: 'host@example.com',
      processedAt: '2020-01-01T00:00:00.000Z',
      messageId: 'a@b',
    });

    expect(await store.isMessageProcessed('a@b')).toBe(true);
    expect((await store.getRezervace('99'))?.status).toBe('odeslano');

    const removed = await store.purgeExpired(new Date('2026-01-01T00:00:00.000Z'));
    expect(removed).toBe(1);
    expect(await store.getRezervace('99')).toBeNull();
    expect(await store.isMessageProcessed('a@b')).toBe(true);
  });
});
