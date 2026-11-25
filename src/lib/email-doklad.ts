import nodemailer from 'nodemailer';

export async function posliEmailDokladu(opts: {
  to: string;
  subject: string;
  text: string;
  htmlDokladu: string;
  filename: string;
  rezervace?: string | null;
}): Promise<void> {
  if (process.env.VITEST) throw new Error('V testu se e-mail neposílá.');
  const majitel = process.env.MAJITEL_EMAIL?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_HESLO?.trim();
  if (!majitel) throw new Error('MAJITEL_EMAIL chybí');
  if (!user || !pass || pass.startsWith('SEM_NAPIS')) throw new Error('SMTP není vyplněné');
  const testMode = (process.env.TEST_REZIM ?? '1') !== '0';
  const { overOdchoziHostovi } = await import('./odchozi-host');
  const over = await overOdchoziHostovi({
    kanal: 'email',
    druh: 'provozni',
    emailCil: opts.to,
    text: opts.text,
    html: opts.text,
    rezervace: opts.rezervace,
  });
  if (!over.ok) throw new Error(over.duvod || 'Zpráva zablokována (relay).');
  const text = over.text || opts.text;
  const transporter = nodemailer.createTransport({
    host: 'smtp.seznam.cz',
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  const introHtml = text
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 12px;font:16px/1.45 Georgia,serif;color:#1c1714">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
  await transporter.sendMail({
    from: `VIVIEN Apartments <${user}>`,
    to: testMode ? majitel : opts.to,
    bcc: testMode ? undefined : majitel,
    subject: testMode ? `[TEST] ${opts.subject}` : opts.subject,
    text,
    html: `<div>${introHtml}</div>`,
    attachments: [
      {
        filename: opts.filename,
        content: Buffer.from(opts.htmlDokladu, 'utf8'),
        contentType: 'text/html; charset=utf-8',
      },
    ],
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
