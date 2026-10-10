import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { FileProcessStore, prazdnaRezervace } from './store';

describe('FileProcessStore', () => {
  it('maže rezervaci 3 dny po odjezdu a zprávu až po 90 dnech', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vivien-store-'));
    const store = new FileProcessStore(path.join(dir, 'store.json'));

    await store.markMessage({
      messageId: 'a@b',
      processedAt: '2020-01-01T00:00:00.000Z',
      status: 'sent',
      rezervace: '99',
    });
    await store.setRezervace('99', {
      ...prazdnaRezervace('99', '2020-01-01T00:00:00.000Z'),
      stav: 'odeslano',
      odjezd: '2020-01-01',
      emailHosta: 'host@example.com',
      jmeno: 'Novák',
      odeslaneMessageId: 'a@b',
    });

    const jeste = await store.purgeExpired(new Date('2020-01-04T11:00:00.000Z'));
    expect(jeste).toBe(0);
    expect((await store.getRezervace('99'))?.jmeno).toBe('Novák');
    expect(await store.isMessageProcessed('a@b')).toBe(true);

    const removed = await store.purgeExpired(new Date('2020-01-04T12:00:01.000Z'));
    expect(removed).toBe(1);
    expect(await store.getRezervace('99')).toBeNull();
    expect(await store.isMessageProcessed('a@b')).toBe(true);
  });

  it('maže zpracovanou zprávu po 90 dnech', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vivien-store-'));
    const store = new FileProcessStore(path.join(dir, 'store.json'));
    await store.markMessage({
      messageId: 'stara',
      processedAt: '2025-01-01T00:00:00.000Z',
      status: 'sent',
    });
    await store.markMessage({
      messageId: 'nova',
      processedAt: '2025-04-01T00:00:00.000Z',
      status: 'sent',
    });

    const removed = await store.purgeExpired(new Date('2025-04-02T00:00:00.000Z'));
    expect(removed).toBe(1);
    expect(await store.isMessageProcessed('stara')).toBe(false);
    expect(await store.isMessageProcessed('nova')).toBe(true);
  });
});
