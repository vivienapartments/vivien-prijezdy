export type InboxMail = {
  uid: number;
  messageId: string;
  from: string;
  /** Příjemce a kopie. Porovnání adres je bez ohledu na velká písmena. */
  to: string;
  subject: string;
  date: Date | null;
  authenticationResults: string | null;
  text: string;
  html: string;
  /**
   * Platný podpis DKIM pro better-hotel.com. Nastaví se jen když Authentication-Results chybí.
   * Seznam tu hlavičku do schránky neukládá.
   */
  dkimBetterHotel?: boolean;
};

export type SchrankaMeta = {
  uidValidity: number;
  uidNext: number;
};

function normalizeMessageId(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw.trim().replace(/^<|>$/g, '');
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractAuthResults(headersBuf: Buffer | undefined, parsedHeader: unknown): string | null {
  if (headersBuf && headersBuf.length) {
    const raw = headersBuf.toString('utf8');
    const m = raw.match(/authentication-results\s*:\s*([^\r\n]+(?:\r?\n[ \t]+[^\r\n]+)*)/i);
    if (m) return m[1].replace(/\r?\n[ \t]+/g, ' ').trim();
  }
  if (parsedHeader && typeof parsedHeader === 'object' && parsedHeader !== null && 'get' in parsedHeader) {
    const getFn = (parsedHeader as { get: (k: string) => unknown }).get;
    const h = getFn.call(parsedHeader, 'authentication-results');
    if (typeof h === 'string') return h;
    if (Array.isArray(h) && h.length) return String(h[0]);
  }
  return null;
}

type FetchQuery = { since: Date } | string;

async function imapClient(user: string, pass: string) {
  const { ImapFlow } = await import('imapflow');
  return new ImapFlow({
    host: 'imap.seznam.cz',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });
}

async function mailZMsg(
  msg: {
    uid: number;
    source?: Buffer;
    headers?: Buffer;
    envelope?: {
      messageId?: string | null;
      subject?: string | null;
      date?: Date | string | null;
      from?: { name?: string | null; address?: string | null }[] | null;
    } | null;
  },
  simpleParser: (typeof import('mailparser'))['simpleParser'],
): Promise<InboxMail | null> {
  if (!msg.source) return null;
  const parsed = await simpleParser(msg.source);
  const messageId =
    normalizeMessageId(parsed.messageId) ||
    normalizeMessageId(msg.envelope?.messageId) ||
    `uid-${msg.uid}`;

  const authenticationResults = extractAuthResults(msg.headers, parsed.headers);
  const subject = parsed.subject || msg.envelope?.subject || '';
  let dkimBetterHotel = false;
  if (subject && !authenticationResults) {
    const { jeInterniPredmet } = await import('./bh-interni');
    if (jeInterniPredmet(subject)) {
      const { overDkimBetterHotel } = await import('./bh-dkim');
      dkimBetterHotel = await overDkimBetterHotel(msg.source);
    }
  }

  const from =
    parsed.from?.text ||
    (msg.envelope?.from?.[0]
      ? `${msg.envelope.from[0].name ? `${msg.envelope.from[0].name} ` : ''}<${msg.envelope.from[0].address || ''}>`
      : '');

  const schranka = (hodnota: { text?: string } | { text?: string }[] | undefined): string => {
    if (!hodnota) return '';
    if (Array.isArray(hodnota)) return hodnota.map((v) => v.text || '').filter(Boolean).join(', ');
    return hodnota.text || '';
  };
  const to = [schranka(parsed.to), schranka(parsed.cc)].filter(Boolean).join(', ');

  return {
    uid: msg.uid,
    messageId,
    from,
    to,
    subject,
    date: asDate(parsed.date) || asDate(msg.envelope?.date),
    authenticationResults,
    text: typeof parsed.text === 'string' ? parsed.text : '',
    html: typeof parsed.html === 'string' ? parsed.html : '',
    dkimBetterHotel,
  };
}

async function fetchMails(opts: {
  user: string;
  pass: string;
  query: FetchQuery;
}): Promise<InboxMail[]> {
  const { simpleParser } = await import('mailparser');
  const client = await imapClient(opts.user, opts.pass);
  const out: InboxMail[] = [];

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    // imapflow při `source` používá BODY.PEEK (neoznačuje přečtené).
    for await (const msg of client.fetch(
      opts.query,
      {
        uid: true,
        envelope: true,
        source: true,
        headers: ['authentication-results'],
      },
      { uid: true },
    )) {
      const mail = await mailZMsg(msg, simpleParser);
      if (mail) out.push(mail);
    }
  } finally {
    lock.release();
    await client.logout().catch(() => undefined);
  }

  return out;
}

/** uidValidity a uidNext. Nic nestahuje. */
export async function nactiMetaSchranky(opts: {
  user: string;
  pass: string;
}): Promise<SchrankaMeta> {
  const client = await imapClient(opts.user, opts.pass);
  await client.connect();
  try {
    const status = await client.status('INBOX', { uidNext: true, uidValidity: true });
    if (!status) throw new Error('IMAP status INBOX selhal');
    const uidValidity = Number(status.uidValidity || 0);
    const uidNext = Number(status.uidNext || 1);
    return {
      uidValidity: Number.isFinite(uidValidity) ? uidValidity : 0,
      uidNext: Number.isFinite(uidNext) && uidNext > 0 ? uidNext : 1,
    };
  } finally {
    await client.logout().catch(() => undefined);
  }
}

/** Načte e-maily za posledních `days` dní. Jen čtení (BODY.PEEK), nic nemění. */
export async function fetchRecentInboxMails(opts: {
  user: string;
  pass: string;
  days?: number;
}): Promise<InboxMail[]> {
  const days = opts.days ?? 14;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  return fetchMails({ user: opts.user, pass: opts.pass, query: { since } });
}

/** Jen UID od `odUid` včetně dál. Jen čtení (BODY.PEEK). */
export async function fetchInboxMailsOdUid(opts: {
  user: string;
  pass: string;
  odUid: number;
}): Promise<InboxMail[]> {
  const od = Math.max(1, Math.floor(opts.odUid));
  return fetchMails({ user: opts.user, pass: opts.pass, query: `${od}:*` });
}
