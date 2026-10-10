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
NOCI: 2
OSOB: 2
EMAIL: host@example.com
NARODNOST: CZE
OSLOVENI: Vážený pane Nováku
ZDROJ: Booking.com
ACCESS_PIN: 1234
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
    sendGuestEmail.mockResolvedValue({ to: MAJITEL, messageId: '<x>' });
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
    expect((await store.getRezervace('120260530'))?.stav).toBe('odeslano');
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

  it('špatná data uloží rezervaci a neodešle', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'msg-bad@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: BLOCK.replace('EMAIL: host@example.com\n', '').replace('REZERVACE: 120260530', 'REZERVACE: 77'),
      }),
      store,
    );
    expect(item.status).toBe('neodeslano');
    expect(item.reason).toBe('chybi_email');
    expect((await store.getRezervace('77'))?.stav).toBe('neodeslano');
    expect(sendGuestEmail).not.toHaveBeenCalled();
  });

  it('nesedící noci odešle s výhradou', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'msg-noci@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: BLOCK.replace('NOCI: 2', 'NOCI: 1').replace('REZERVACE: 120260530', 'REZERVACE: 88'),
      }),
      store,
    );
    expect(item.status).toBe('sent');
    expect((await store.getRezervace('88'))?.stav).toBe('odeslano_s_vyhradou');
  });

  it('smtp selhání zkusí znovu a po třetím pokusu skončí', async () => {
    sendGuestEmail.mockRejectedValue(new Error('smtp'));
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const one = mail({
      messageId: 'msg-smtp@test',
      from: 'noreply@better-hotel.com',
      authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
      text: BLOCK.replace('REZERVACE: 120260530', 'REZERVACE: 66'),
    });
    expect((await processOneMail(one, store)).status).toBe('error');
    expect(await store.isMessageProcessed('msg-smtp@test')).toBe(false);
    await processOneMail(one, store);
    await processOneMail(one, store);
    expect(await store.isMessageProcessed('msg-smtp@test')).toBe(true);
    expect((await store.getRezervace('66'))?.smtpPokusy).toBe(3);
    expect((await store.getRezervace('66'))?.stav).toBe('neodeslano');
  });

  it('nedoručený dopis označí rezervaci jako vrácenou', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    await processOneMail(
      mail({
        messageId: 'msg-sent@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: BLOCK,
      }),
      store,
    );
    const bounce = await processOneMail(
      mail({
        messageId: 'bounce-1@seznam.cz',
        from: 'Mail Delivery System <mailer-daemon@seznam.cz>',
        subject: 'Undelivered Mail Returned to Sender',
        text: `Content-Type: multipart/report; report-type=delivery-status
Final-Recipient: rfc822; host@example.com
Diagnostic-Code: smtp; 550 5.1.1 User unknown
Original-Message-ID: <x>
`,
      }),
      store,
    );
    expect(bounce.status).toBe('vraceno');
    expect((await store.getRezervace('120260530'))?.stav).toBe('vraceno');
    expect((await store.getRezervace('120260530'))?.duvody[0]?.kod).toBe('nedoruceno');
  });

  it('nepřiřazený bounce nechá rezervace být', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'bounce-2@seznam.cz',
        from: 'postmaster@seznam.cz',
        subject: 'Delivery Status Notification',
        text: 'Diagnostic-Code: smtp; 550 mailbox unavailable',
      }),
      store,
    );
    expect(item.reason).toBe('nedoruceno-neprirazeno');
    expect(await store.listRezervace()).toEqual([]);
  });

  it('chybí PIN → neodeslano a chybi_pin', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'msg-bez-pinu@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: BLOCK.replace('ACCESS_PIN: 1234\n', '').replace('REZERVACE: 120260530', 'REZERVACE: 55'),
      }),
      store,
    );
    expect(item.status).toBe('neodeslano');
    expect(item.reason).toBe('chybi_pin');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    const rec = await store.getRezervace('55');
    expect(rec?.stav).toBe('neodeslano');
    expect(rec?.duvody.some((d) => d.kod === 'chybi_pin')).toBe(true);
  });

  it('starý záznam odesláno se znovu nepošle a nepřepíše', async () => {
    const { processOneMail } = await import('./process-inbox');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vivien-store-'));
    const file = path.join(dir, 'store.json');
    fs.writeFileSync(
      file,
      JSON.stringify({
        messages: {},
        rezervace: {
          '120260530': {
            status: 'odeslano',
            odjezd: '2026-11-18',
            emailHosta: 'host@example.com',
            processedAt: '2026-10-01T00:00:00.000Z',
            messageId: 'stary-mail',
          },
        },
      }),
    );
    const store = new FileProcessStore(file);
    const item = await processOneMail(
      mail({
        messageId: 'msg-znovu@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: BLOCK,
      }),
      store,
    );
    expect(item.status).toBe('duplicate');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      rezervace: Record<string, { status?: string; stav?: string }>;
    };
    expect(raw.rezervace['120260530'].status).toBe('odeslano');
    expect(raw.rezervace['120260530'].stav).toBeUndefined();
  });
});
