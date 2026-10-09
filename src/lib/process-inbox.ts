import nodemailer from 'nodemailer';
import { verifyEmailOrigin } from './email-origin';
import { sendGuestEmail } from './email-host';
import { fetchRecentInboxMails, type InboxMail } from './inbox-mail';
import { createProcessStore, type ProcessStore } from './store';
import { createToken, isDepartureExpired } from './token';
import { parseVivienData } from './vivien-data';

export type ProcessItem = {
  rezervace?: string;
  status: string;
  reason?: string;
};

export type ProcessSummary = {
  scanned: number;
  sent: number;
  skipped: number;
  rejected: number;
  duplicate: number;
  errors: number;
  items: ProcessItem[];
};

function baseUrl(): string {
  return (process.env.PRUVODCE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
}

function bodyForParse(mail: InboxMail): string {
  if (mail.html && /VIVIEN-DATA/i.test(mail.html)) return mail.html;
  if (mail.text && /VIVIEN-DATA/i.test(mail.text)) return mail.text;
  return mail.html || mail.text || '';
}

async function alertMajitel(subject: string, text: string): Promise<void> {
  const majitel = process.env.MAJITEL_EMAIL?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_HESLO?.trim();
  if (!majitel || !user || !pass || pass.startsWith('SEM_NAPIS')) return;

  const transporter = nodemailer.createTransport({
    host: 'smtp.seznam.cz',
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `VIVIEN Apartments <${user}>`,
    to: majitel,
    subject,
    text,
  });
}

export async function processOneMail(
  mail: InboxMail,
  store: ProcessStore,
): Promise<ProcessItem> {
  const now = new Date().toISOString();

  if (await store.isMessageProcessed(mail.messageId)) {
    return { status: 'already_done' };
  }

  const bhKlic = process.env.BH_KLIC?.trim() || '';
  const majitelPreposilaZ = process.env.MAJITEL_PREPOSILA_Z?.trim() || '';
  const body = bodyForParse(mail);

  const origin = verifyEmailOrigin({
    from: mail.from,
    authenticationResults: mail.authenticationResults,
    body,
    bhKlic,
    majitelPreposilaZ,
  });

  if (!origin.ok) {
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      status: 'rejected',
      reason: origin.reason,
    });
    return { status: 'rejected', reason: origin.reason };
  }

  const parsed = parseVivienData(body);
  if (!parsed.ok) {
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      status: 'skipped_no_data',
      reason: parsed.reason,
    });
    return { status: 'skipped_no_data', reason: parsed.reason };
  }

  const data = parsed.data;

  if (isDepartureExpired(data.odjezd)) {
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      rezervace: data.rezervace,
      status: 'skipped_no_data',
      reason: 'Odjezd už prošel',
    });
    return { rezervace: data.rezervace, status: 'skipped_past', reason: 'Odjezd už prošel' };
  }

  const existing = await store.getRezervace(data.rezervace);
  if (existing?.status === 'odeslano') {
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      rezervace: data.rezervace,
      status: 'duplicate',
      reason: 'Rezervace už odeslána',
    });
    return { rezervace: data.rezervace, status: 'duplicate' };
  }

  const token = createToken({
    r: data.rezervace,
    a: data.apartman,
    p: data.prijezd,
    d: data.odjezd,
    o: data.osob ?? undefined,
    l: data.jazyk,
    i: data.accessPin ?? undefined,
  });

  try {
    await sendGuestEmail({
      input: {
        lang: data.jazyk,
        apt: data.apartman,
        prijezd: data.prijezd,
        odjezd: data.odjezd,
        noci: data.noci,
        osob: data.osob,
        osloveni: data.osloveni,
        jmeno: data.jmeno,
        guideUrl: `${baseUrl()}/${token}`,
        intendedTo: data.email,
      },
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'odeslani_selhalo';
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      rezervace: data.rezervace,
      status: 'error',
      reason,
    });
    await alertMajitel(
      '[TEST] Průvodce: chyba odeslání',
      `Rezervace ${data.rezervace}\nChyba: ${reason}`,
    );
    return { rezervace: data.rezervace, status: 'error', reason };
  }

  await store.setRezervace(data.rezervace, {
    status: 'odeslano',
    odjezd: data.odjezd,
    emailHosta: data.email,
    processedAt: now,
    messageId: mail.messageId,
  });
  await store.markMessage({
    messageId: mail.messageId,
    uid: mail.uid,
    processedAt: now,
    rezervace: data.rezervace,
    status: 'sent',
  });

  return { rezervace: data.rezervace, status: 'sent' };
}

export async function runInboxProcessing(opts: {
  store?: ProcessStore;
  mails?: InboxMail[];
} = {}): Promise<ProcessSummary> {
  const store = opts.store ?? createProcessStore();
  await store.purgeExpired();

  let mails = opts.mails;
  if (!mails) {
    const user = process.env.IMAP_USER?.trim();
    const pass = process.env.IMAP_HESLO?.trim();
    if (!user || !pass || pass.startsWith('SEM_NAPIS')) {
      throw new Error('IMAP_USER / IMAP_HESLO nejsou vyplněné');
    }
    mails = await fetchRecentInboxMails({ user, pass, days: 14 });
  }

  const summary: ProcessSummary = {
    scanned: mails.length,
    sent: 0,
    skipped: 0,
    rejected: 0,
    duplicate: 0,
    errors: 0,
    items: [],
  };

  for (const mail of mails) {
    const item = await processOneMail(mail, store);
    if (item.status === 'already_done') continue;
    summary.items.push(item);
    if (item.status === 'sent') summary.sent += 1;
    else if (item.status === 'skipped_no_data' || item.status === 'skipped_past') summary.skipped += 1;
    else if (item.status === 'rejected') summary.rejected += 1;
    else if (item.status === 'duplicate') summary.duplicate += 1;
    else if (item.status === 'error') summary.errors += 1;
  }

  if (summary.rejected > 0 || summary.errors > 0) {
    const lines = summary.items
      .filter((i) => i.status === 'rejected' || i.status === 'error')
      .map((i) => `- ${i.rezervace || 'bez rezervace'}: ${i.status}${i.reason ? ` (${i.reason})` : ''}`);
    await alertMajitel(
      '[TEST] Průvodce: souhrn odmítnutí',
      `Automat dokončil běh.\nOdmítnuto: ${summary.rejected}\nChyby: ${summary.errors}\nOdesláno: ${summary.sent}\n\n${lines.join('\n')}`,
    );
  }

  return summary;
}
