import { generateKeyPairSync } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { FileProcessStore } from './store';

const ZPRAVA = [
  'From: info@mg2.better-hotel.com',
  'To: schranka@example.com',
  'Subject: test',
  'Date: Thu, 09 Oct 2026 11:00:00 +0000',
  'Message-ID: <dkim-test@example.com>',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=utf-8',
  '',
  'Ahoj',
].join('\r\n');

async function podepis(text: string, expires: Date) {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const soukromy = privateKey.export({ type: 'pkcs1', format: 'pem' });
  const verejny = publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString()
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s+/g, '');
  const { dkimSign } = await import('mailauth');
  const podpis = await dkimSign(Buffer.from(text), {
    signTime: new Date('2026-10-09T11:00:00Z'),
    expires,
    signatureData: [
      {
        signingDomain: 'mg2.better-hotel.com',
        selector: 'test',
        privateKey: soukromy,
      },
    ],
  });
  const resolver = async () => [[`v=DKIM1; k=rsa; p=${verejny}`]];
  return { raw: Buffer.from(`${podpis.signatures}${text}`), resolver };
}

describe('prošlý podpis DKIM', () => {
  it(
    'platný prošlý podpis od better-hotel.com založí záznam',
    async () => {
      const { overDkimBetterHotel } = await import('./bh-dkim');
      const { processOneMail } = await import('./process-inbox');
      const { raw, resolver } = await podepis(ZPRAVA, new Date('2026-10-09T13:00:00Z'));
      const plati = await overDkimBetterHotel(raw, resolver);
      expect(plati).toBe(true);

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vivien-store-'));
      const store = new FileProcessStore(path.join(dir, 'store.json'));
      const item = await processOneMail(
        {
          uid: 1,
          messageId: 'prosly-podpis@test',
          from: 'Better Hotel <info@better-hotel.com>',
          subject: 'Vivien Apartmens Character and Atmosphere | Nová rezervace - #100000099',
          date: new Date(),
          authenticationResults: null,
          dkimBetterHotel: plati,
          text: ['Číslo', '100000099', 'Příjezd', '20.11.2026', 'Odjezd', '22.11.2026'].join('\n'),
          html: '',
        },
        store,
      );
      expect(item.status).toBe('bez_checkinu');
      expect((await store.getRezervace('100000099'))?.stav).toBe('bez_checkinu');
    },
    20_000,
  );

  it('poškozený podpis záznam nezaloží', async () => {
    const { overDkimBetterHotel } = await import('./bh-dkim');
    const { raw, resolver } = await podepis(ZPRAVA, new Date('2026-10-09T13:00:00Z'));
    const rozbity = Buffer.from(raw.toString('utf8').replace('Ahoj', 'Ahoj!'));
    expect(await overDkimBetterHotel(rozbity, resolver)).toBe(false);
  });
});
