import type { InboxMail } from './inbox-mail';

export type BounceInfo = {
  originalMessageId: string | null;
  recipient: string | null;
  diagnostika: string;
};

function bezAdres(raw: string): string {
  return raw
    .replace(/[^\s<>]+@[^\s<>]+/g, '…')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function cleanId(raw: string | null | undefined): string | null {
  const s = (raw || '').replace(/[<>]/g, '').trim();
  return s || null;
}

export function jeBounce(mail: Pick<InboxMail, 'from' | 'text' | 'html' | 'subject'>): boolean {
  const from = mail.from.toLowerCase();
  if (from.includes('mailer-daemon') || from.includes('postmaster')) return true;
  const blob = `${mail.subject}\n${mail.text}\n${mail.html}`.toLowerCase();
  const dsn =
    blob.includes('multipart/report') ||
    blob.includes('message/delivery-status') ||
    blob.includes('delivery status notification');
  return dsn && (blob.includes('final-recipient') || blob.includes('diagnostic-code'));
}

export function parseBounce(mail: Pick<InboxMail, 'from' | 'text' | 'html' | 'subject'>): BounceInfo | null {
  if (!jeBounce(mail)) return null;
  const blob = `${mail.subject}\n${mail.text}\n${mail.html}`;

  const idMatch =
    blob.match(/Original-Message-ID:\s*<?([^>\s]+)>?/i) ||
    blob.match(/\bIn-Reply-To:\s*<?([^>\s]+)>?/i) ||
    blob.match(/\bMessage-ID:\s*<?([^>\s]+)>?/i);
  const recipientMatch = blob.match(/Final-Recipient:\s*rfc822;\s*<?([^\s<>]+)>?/i);
  const diagMatch =
    blob.match(/Diagnostic-Code:\s*[^\n\r]+/i) ||
    blob.match(/\bStatus:\s*[0-9.]+/i) ||
    blob.match(/\b5\d\d\b[^\n\r]*/);

  const diagnostika = bezAdres(diagMatch ? diagMatch[0].replace(/^[^:]+:\s*/i, '') : 'bez důvodu od serveru');
  return {
    originalMessageId: cleanId(idMatch?.[1]),
    recipient: recipientMatch?.[1]?.trim().toLowerCase() || null,
    diagnostika: diagnostika || 'bez důvodu od serveru',
  };
}

export function stejneMessageId(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = cleanId(a)?.toLowerCase() || '';
  const nb = cleanId(b)?.toLowerCase() || '';
  return Boolean(na && na === nb);
}
