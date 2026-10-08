import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InboxMail } from './inbox-mail';
import { FileProcessStore } from './store';

const BH_KLIC = 'test-bh-key-24chars!!ok';
const MAJITEL = 'info@vivienapartments.cz';

const sendGuestEmail = vi.fn().mockResolvedValue({ to: MAJITEL, messageId: '<x>' });

vi.mock('./email-host', () => ({
  sendGuestEmail: (...args: unknown[]) => sendGuestEmail(...args),
}));

function tmpStore(): FileProcessStore {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vivien-store-'));
  return new FileProcessStore(path.join(dir, 'store.json'));
}

function mail(partial: Partial<InboxMail> & Pick<InboxMail, 'messageId' | 'from' | 'text'>): InboxMail {
  return {
    uid: 1,
    subject: 'check-in',
    date: new Date(),
    authenticationResults: null,
    html: '',
    ...partial,
  };
}

const BLOCK = `
VIVIEN-DATA v1
REZERVACE: 120260530
APARTMAN: Pohodlí v tlumených tónech
PRIJEZD: 16.11.2026
ODJEZD: 18.11.2026
NOCI: 1
OSOB: 2
EMAIL: host@example.com
NARODNOST: CZE
OSLOVENI: Vážený pane Nováku
ZDROJ: Booking.com
KLIC: ${BH_KLIC}
KONEC
`;

describe('processOneMail', () => {
  beforeEach(() => {
    sendGuestEmail.mockClear();
    vi.stubEnv('BH_KLIC', BH_KLIC);
    vi.stubEnv('MAJITEL_PREPOSILA_Z', MAJITEL);
    vi.stubEnv('PRUVODCE_TOKEN_SECRET', 'x'.repeat(40));
    vi.stubEnv('PRUVODCE_BASE_URL', 'http://127.0.0.1:3000');
    vi.stubEnv('TEST_REZIM', '1');
    vi.stubEnv('MAJITEL_EMAIL', MAJITEL);
    vi.stubEnv('SMTP_USER', '');
    vi.stubEnv('SMTP_HESLO', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('odešle a uloží rezervaci', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'msg-1@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: BLOCK,
      }),
      store,
    );

    expect(item.status).toBe('sent');
    expect(item.rezervace).toBe('120260530');
    expect(sendGuestEmail).toHaveBeenCalledOnce();
    expect(await store.isMessageProcessed('msg-1@test')).toBe(true);
    expect((await store.getRezervace('120260530'))?.status).toBe('odeslano');
  });

  it('druhé zpracování stejného Message-ID nic neudělá', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    await store.markMessage({
      messageId: 'msg-2@test',
      processedAt: new Date().toISOString(),
      status: 'sent',
      rezervace: '1',
    });

    const item = await processOneMail(
      mail({
        messageId: 'msg-2@test',
        from: 'noreply@better-hotel.com',
        text: BLOCK,
      }),
      store,
    );
    expect(item.status).toBe('already_done');
    expect(sendGuestEmail).not.toHaveBeenCalled();
  });

  it('odmítne neznámého odesílatele', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'msg-3@test',
        from: 'utocnik@example.com',
        text: BLOCK,
      }),
      store,
    );
    expect(item.status).toBe('rejected');
    expect(await store.isMessageProcessed('msg-3@test')).toBe(true);
    expect(sendGuestEmail).not.toHaveBeenCalled();
  });

  it('přeposlání majitelem (cesta 2) projde bez KLIC', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const blockNoKlic = BLOCK.replace(`KLIC: ${BH_KLIC}\n`, '');
    const item = await processOneMail(
      mail({
        messageId: 'msg-4@test',
        from: `VIVIEN <${MAJITEL}>`,
        authenticationResults: 'spf=pass smtp.mailfrom=vivienapartments.cz',
        text: `Fwd:\n> ${blockNoKlic.split('\n').join('\n> ')}`,
      }),
      store,
    );
    expect(item.status).toBe('sent');
    expect(sendGuestEmail).toHaveBeenCalledOnce();
  });
});
