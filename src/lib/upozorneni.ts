import nodemailer from 'nodemailer';
import type { ProcessStore, PushZarizeni, RezervaceRecord } from './store';

export function popisHosta(rec: Pick<RezervaceRecord, 'apartman' | 'jmeno' | 'rezervace'>): string {
  const casti = (rec.jmeno || '').trim().split(/\s+/).filter(Boolean);
  const prijmeni = casti.length ? casti[casti.length - 1] : rec.rezervace;
  return `${rec.apartman || 'Apartmán'} ${prijmeni}`;
}

async function emailMajiteli(text: string): Promise<boolean> {
  if (process.env.VITEST) return false;
  const majitel = process.env.MAJITEL_EMAIL?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_HESLO?.trim();
  if (!majitel || !user || !pass || pass.startsWith('SEM_NAPIS')) return false;
  const transporter = nodemailer.createTransport({
    host: 'smtp.seznam.cz',
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  await transporter.sendMail({
    from: `VIVIEN Apartments <${user}>`,
    to: majitel,
    subject: text,
    text,
  });
  return true;
}

/** Push na zapnuté telefony. Když žádný nedorazí, stejný text e-mailem majiteli. */
export async function upozorniMajitele(
  store: ProcessStore,
  text: string,
  url: string,
): Promise<'push' | 'email' | 'nic'> {
  try {
    const zarizeni = await store.listPush();
    const publicKey = process.env.VAPID_PUBLIC?.trim();
    const privateKey = process.env.VAPID_PRIVATE?.trim();
    const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:info@vivienapartments.cz';
    let doruceno = false;
    if (publicKey && privateKey && zarizeni.length && !process.env.VITEST) {
      const webpush = await import('web-push');
      webpush.setVapidDetails(subject, publicKey, privateKey);
      const zustane: PushZarizeni[] = [];
      for (const z of zarizeni) {
        try {
          await webpush.sendNotification(
            { endpoint: z.endpoint, keys: { p256dh: z.p256dh, auth: z.auth } },
            JSON.stringify({ title: 'VIVIEN', body: text, url }),
          );
          doruceno = true;
          zustane.push(z);
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) continue;
          zustane.push(z);
        }
      }
      if (zustane.length !== zarizeni.length) await store.savePush(zustane);
    }
    if (doruceno) return 'push';
    const mailed = await emailMajiteli(text);
    return mailed ? 'email' : 'nic';
  } catch {
    return 'nic';
  }
}

export async function poznamenejUpozorneni(store: ProcessStore, id: string, jak: 'push' | 'email' | 'nic'): Promise<void> {
  const rec = await store.getRezervace(id);
  if (!rec) return;
  const veta = jak === 'push' ? 'Upozornění na telefon' : jak === 'email' ? 'Upozornění e-mailem' : 'Upozornění se neodeslalo';
  const cas = new Date().toISOString();
  await store.setRezervace(id, {
    ...rec,
    historie: [...rec.historie, { cas, co: veta }].slice(-40),
  });
}

/** Selhání celého běhu. Po třech za sebou přijde jedno upozornění. Úspěch počítadlo vynuluje. */
export async function poBehZpracovani(store: ProcessStore, ok: boolean): Promise<void> {
  try {
    if (ok) {
      await store.setSelhani(0);
      return;
    }
    const n = (await store.getSelhani()) + 1;
    await store.setSelhani(n);
    if (n === 3) await upozorniMajitele(store, 'Automat příjezdů hlásí chybu', '/prehled');
  } catch {
    /* pojistka nesmí shodit odpověď */
  }
}
