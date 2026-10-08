export type InboxMail = {
  uid: number;
  messageId: string;
  from: string;
  subject: string;
  date: Date | null;
  authenticationResults: string | null;
  text: string;
  html: string;
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

/** Načte e-maily za posledních `days` dní. Jen čtení (BODY.PEEK), nic nemění. */
export async function fetchRecentInboxMails(opts: {
  user: string;
  pass: string;
  days?: number;
}): Promise<InboxMail[]> {
  const { ImapFlow } = await import('imapflow');
  const { simpleParser } = await import('mailparser');

  const days = opts.days ?? 14;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  const client = new ImapFlow({
    host: 'imap.seznam.cz',
    port: 993,
    secure: true,
    auth: { user: opts.user, pass: opts.pass },
    logger: false,
  });

  const out: InboxMail[] = [];

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    // imapflow při `source` používá BODY.PEEK (neoznačuje přečtené).
    for await (const msg of client.fetch(
      { since },
      {
        uid: true,
        envelope: true,
        source: true,
        headers: ['authentication-results'],
      },
      { uid: true },
    )) {
      if (!msg.source) continue;
      const parsed = await simpleParser(msg.source);
      const messageId =
        normalizeMessageId(parsed.messageId) ||
        normalizeMessageId(msg.envelope?.messageId) ||
        `uid-${msg.uid}`;

      const authenticationResults = extractAuthResults(msg.headers, parsed.headers);

      const from =
        parsed.from?.text ||
        (msg.envelope?.from?.[0]
          ? `${msg.envelope.from[0].name ? `${msg.envelope.from[0].name} ` : ''}<${msg.envelope.from[0].address || ''}>`
          : '');

      out.push({
        uid: msg.uid,
        messageId,
        from,
        subject: parsed.subject || msg.envelope?.subject || '',
        date: asDate(parsed.date) || asDate(msg.envelope?.date),
        authenticationResults,
        text: typeof parsed.text === 'string' ? parsed.text : '',
        html: typeof parsed.html === 'string' ? parsed.html : '',
      });
    }
  } finally {
    lock.release();
    await client.logout().catch(() => undefined);
  }

  return out;
}
