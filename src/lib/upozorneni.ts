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

export type VysledekUpozorneni = {
  jak: 'push' | 'email' | 'nic';
  zarizeni: number;
  doruceno: number;
  dorucenoJmena: string[];
};

async function emailOdpojeni(nazev: string): Promise<void> {
  const text = `Upozornění na telefonu ${nazev} se odpojila. Otevřete na něm jednou přehled a klepněte na Zapnout upozornění.`;
  try {
    await emailMajiteli(text);
  } catch (err) {
    console.error('Upozorneni: email odpojení selhal', err instanceof Error ? err.message : err);
  }
}

/** Push na zapnuté telefony. Když žádný nedorazí, stejný text e-mailem majiteli. */
export async function upozorniMajitelePodrobne(
  store: ProcessStore,
  text: string,
  url: string,
  opts?: { zkuseni?: boolean },
): Promise<VysledekUpozorneni> {
  if (!opts?.zkuseni && !process.env.VITEST) {
    try {
      await store.pridejUpozorneni({ cas: new Date().toISOString(), text, url });
    } catch (err) {
      console.error('Upozorneni: seznam selhalo', err instanceof Error ? err.message : err);
    }
  }

  let zarizeni: PushZarizeni[] = [];
  try {
    zarizeni = await store.listPush();
  } catch (err) {
    console.error('Upozorneni: listPush selhalo', err instanceof Error ? err.message : err);
    zarizeni = [];
  }

  let doruceno = 0;
  const dorucenoJmena: string[] = [];
  const publicKey = process.env.VAPID_PUBLIC?.trim();
  const privateKey = process.env.VAPID_PRIVATE?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:info@vivienapartments.cz';

  if (publicKey && privateKey && zarizeni.length && !process.env.VITEST) {
    try {
      const webpush = await import('web-push');
      webpush.setVapidDetails(subject, publicKey, privateKey);
      const zustane: PushZarizeni[] = [];
      const smazane: PushZarizeni[] = [];
      for (const z of zarizeni) {
        try {
          await webpush.sendNotification(
            { endpoint: z.endpoint, keys: { p256dh: z.p256dh, auth: z.auth } },
            JSON.stringify({ title: 'VIVIEN', body: text, url }),
          );
          doruceno += 1;
          dorucenoJmena.push(z.nazev || 'Telefon');
          zustane.push(z);
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            smazane.push(z);
            continue;
          }
          zustane.push(z);
        }
      }
      if (zustane.length !== zarizeni.length) {
        try {
          await store.savePush(zustane);
        } catch (err) {
          console.error('Upozorneni: savePush selhalo', err instanceof Error ? err.message : err);
        }
        for (const z of smazane) {
          await emailOdpojeni(z.nazev || 'Telefon');
        }
      }
    } catch (err) {
      console.error('Upozorneni: web-push selhalo', err instanceof Error ? err.message : err);
    }
  }

  if (doruceno > 0) {
    console.log(`Upozorneni: push (${doruceno}/${zarizeni.length})`);
    return { jak: 'push', zarizeni: zarizeni.length, doruceno, dorucenoJmena };
  }

  try {
    const mailed = await emailMajiteli(text);
    if (mailed) {
      console.log(`Upozorneni: email (zarizeni ${zarizeni.length})`);
      return { jak: 'email', zarizeni: zarizeni.length, doruceno: 0, dorucenoJmena: [] };
    }
  } catch (err) {
    console.error('Upozorneni: email selhal', err instanceof Error ? err.message : err);
  }

  console.log(`Upozorneni: nic (zarizeni ${zarizeni.length})`);
  return { jak: 'nic', zarizeni: zarizeni.length, doruceno: 0, dorucenoJmena: [] };
}

export async function upozorniMajitele(
  store: ProcessStore,
  text: string,
  url: string,
): Promise<'push' | 'email' | 'nic'> {
  const vysledek = await upozorniMajitelePodrobne(store, text, url);
  return vysledek.jak;
}

/** Text pro tlačítko Zkusit upozornění. */
export function textZkuseni(v: VysledekUpozorneni): string {
  if (v.jak === 'push') {
    if (v.dorucenoJmena.length) return `Doručeno: ${v.dorucenoJmena.join(', ')}`;
    const n = v.doruceno;
    if (n === 1) return 'Doručeno na 1 zařízení';
    return `Doručeno na ${n} zařízení`;
  }
  if (v.jak === 'email') return 'Odesláno e-mailem';
  return 'Žádné zařízení, zapněte upozornění';
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
