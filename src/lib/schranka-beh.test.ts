import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InboxMail } from './inbox-mail';
import {
  jeCasNaSpam,
  maxUidMailu,
  rozhodniBehSchranky,
  runInboxProcessing,
  type SchrankaNacitac,
} from './process-inbox';
import { FileProcessStore, type SchrankaStav } from './store';

function tmpStore(): FileProcessStore {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schranka-'));
  return new FileProcessStore(path.join(dir, 'store.json'));
}

function mail(uid: number, messageId: string): InboxMail {
  return {
    uid,
    messageId,
    from: 'x@example.com',
    to: 'checkin@example.com',
    subject: 'test',
    date: new Date('2026-10-20T10:00:00.000Z'),
    authenticationResults: null,
    text: 'x',
    html: '',
  };
}

describe('rozhodnutí běhu schránky', () => {
  it('bez stavu nebo při změně uidValidity je plný běh', () => {
    const meta = { uidValidity: 9, uidNext: 100 };
    expect(rozhodniBehSchranky(null, meta)).toBe('plny');
    expect(
      rozhodniBehSchranky(
        { uidValidity: 8, posledniUid: 50, plnyBehKdy: '2026-10-27T06:00:00.000Z', spamKdy: null },
        meta,
        new Date('2026-10-27T06:10:00.000Z'),
      ),
    ).toBe('plny');
  });

  it('plný běh nejvýš jednou za 60 minut', () => {
    const stav: SchrankaStav = {
      uidValidity: 9,
      posledniUid: 50,
      plnyBehKdy: '2026-10-27T06:00:00.000Z',
      spamKdy: null,
    };
    const meta = { uidValidity: 9, uidNext: 51 };
    expect(rozhodniBehSchranky(stav, meta, new Date('2026-10-27T06:30:00.000Z'))).toBe('rychly');
    expect(rozhodniBehSchranky(stav, meta, new Date('2026-10-27T07:00:00.000Z'))).toBe('plny');
  });

  it('spam nejvýš jednou za 15 minut', () => {
    expect(jeCasNaSpam(null)).toBe(true);
    expect(
      jeCasNaSpam(
        { uidValidity: 1, posledniUid: 1, plnyBehKdy: null, spamKdy: '2026-10-27T06:00:00.000Z' },
        new Date('2026-10-27T06:10:00.000Z'),
      ),
    ).toBe(false);
    expect(
      jeCasNaSpam(
        { uidValidity: 1, posledniUid: 1, plnyBehKdy: null, spamKdy: '2026-10-27T06:00:00.000Z' },
        new Date('2026-10-27T06:15:00.000Z'),
      ),
    ).toBe(true);
  });

  it('maxUidMailu bere největší UID', () => {
    expect(maxUidMailu([mail(3, 'a'), mail(7, 'b')], 1)).toBe(7);
    expect(maxUidMailu([], 40)).toBe(40);
  });
});

describe('runInboxProcessing šetří schránku', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
  });

  function nactiStub(opts: {
    meta?: { uidValidity: number; uidNext: number };
    plny?: InboxMail[];
    odUid?: InboxMail[];
  }): SchrankaNacitac & { volani: { plny: number; odUid: number; meta: number } } {
    const volani = { plny: 0, odUid: 0, meta: 0 };
    return {
      volani,
      meta: async () => {
        volani.meta += 1;
        return opts.meta ?? { uidValidity: 1, uidNext: 11 };
      },
      plny: async () => {
        volani.plny += 1;
        return opts.plny ?? [];
      },
      odUid: async () => {
        volani.odUid += 1;
        return opts.odUid ?? [];
      },
    };
  }

  it('druhý běh bez nového mailu nic nestáhne', async () => {
    process.env.IMAP_USER = 'u';
    process.env.IMAP_HESLO = 'heslo';
    const store = tmpStore();
    const ted = new Date('2026-10-27T08:00:00.000Z');
    const nacti = nactiStub({
      meta: { uidValidity: 5, uidNext: 21 },
      plny: [mail(20, 'stary@test')],
    });

    await runInboxProcessing({ store, ted, nacti, spam: async () => undefined });
    expect(nacti.volani.plny).toBe(1);
    expect((await store.getSchrankaStav())?.posledniUid).toBe(20);

    const nacti2 = nactiStub({ meta: { uidValidity: 5, uidNext: 21 } });
    await runInboxProcessing({
      store,
      ted: new Date('2026-10-27T08:10:00.000Z'),
      nacti: nacti2,
      spam: async () => undefined,
    });
    expect(nacti2.volani.plny).toBe(0);
    expect(nacti2.volani.odUid).toBe(0);
    expect((await store.getSchrankaStav())?.posledniUid).toBe(20);
  });

  it('nový mail se stáhne jen on a posune posledniUid', async () => {
    process.env.IMAP_USER = 'u';
    process.env.IMAP_HESLO = 'heslo';
    const store = tmpStore();
    await store.setSchrankaStav({
      uidValidity: 5,
      posledniUid: 20,
      plnyBehKdy: '2026-10-27T08:00:00.000Z',
      spamKdy: '2026-10-27T08:00:00.000Z',
    });
    const nacti = nactiStub({
      meta: { uidValidity: 5, uidNext: 22 },
      odUid: [mail(21, 'novy@test')],
    });
    await runInboxProcessing({
      store,
      ted: new Date('2026-10-27T08:10:00.000Z'),
      nacti,
      spam: async () => undefined,
    });
    expect(nacti.volani.plny).toBe(0);
    expect(nacti.volani.odUid).toBe(1);
    expect((await store.getSchrankaStav())?.posledniUid).toBe(21);
  });

  it('chyba při zpracování neposune posledniUid', async () => {
    process.env.IMAP_USER = 'u';
    process.env.IMAP_HESLO = 'heslo';
    const store = tmpStore();
    await store.setSchrankaStav({
      uidValidity: 5,
      posledniUid: 20,
      plnyBehKdy: '2026-10-27T08:00:00.000Z',
      spamKdy: '2026-10-27T08:00:00.000Z',
    });
    const puvodni = store.isMessageProcessed.bind(store);
    store.isMessageProcessed = async (id: string) => {
      if (id === 'boom@test') throw new Error('rozbity mail');
      return puvodni(id);
    };
    const nacti = nactiStub({
      meta: { uidValidity: 5, uidNext: 22 },
      odUid: [mail(21, 'boom@test')],
    });
    const summary = await runInboxProcessing({
      store,
      ted: new Date('2026-10-27T08:10:00.000Z'),
      nacti,
      spam: async () => undefined,
    });
    expect(summary.errors).toBe(1);
    expect((await store.getSchrankaStav())?.posledniUid).toBe(20);
  });

  it('spam se nevolá dřív než za 15 minut', async () => {
    process.env.IMAP_USER = 'u';
    process.env.IMAP_HESLO = 'heslo';
    const store = tmpStore();
    await store.setSchrankaStav({
      uidValidity: 5,
      posledniUid: 20,
      plnyBehKdy: '2026-10-27T08:00:00.000Z',
      spamKdy: '2026-10-27T08:00:00.000Z',
    });
    let spam = 0;
    const nacti = nactiStub({ meta: { uidValidity: 5, uidNext: 21 } });
    await runInboxProcessing({
      store,
      ted: new Date('2026-10-27T08:10:00.000Z'),
      nacti,
      spam: async () => {
        spam += 1;
      },
    });
    // opts.spam je v testu vždy „ano“ jen když je předané — živý režim bere interval.
    // Tady bez opts.mails a s vlastním spam callbackem musí interval platit.
    expect(spam).toBe(0);
    await runInboxProcessing({
      store,
      ted: new Date('2026-10-27T08:15:00.000Z'),
      nacti: nactiStub({ meta: { uidValidity: 5, uidNext: 21 } }),
      spam: async () => {
        spam += 1;
      },
    });
    expect(spam).toBe(1);
  });
});
