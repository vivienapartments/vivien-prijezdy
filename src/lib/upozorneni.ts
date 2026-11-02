import nodemailer from 'nodemailer';
import { rolePush, type ProcessStore, type PushZarizeni, type PushRole, type RezervaceRecord } from './store';

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
  /** Krátké popisy selhání (pro Zkusit). */
  chyby?: string[];
  /** Telefony, které Google/FCM odpojil (404/410). */
  odpojeno?: string[];
};

const PUSH_TTL_SEC = 60 * 60;
const PUSH_OPTS = { TTL: PUSH_TTL_SEC, urgency: 'high' as const, headers: { Urgency: 'high' } };

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
  const chyby: string[] = [];
  const odpojeno: string[] = [];
  const publicKey = process.env.VAPID_PUBLIC?.trim();
  const privateKey = process.env.VAPID_PRIVATE?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:info@vivienapartments.cz';

  const cilova: PushZarizeni[] = zarizeni.filter((z) => rolePush(z) === 'majitel');
  const ostatni = zarizeni.filter((z) => rolePush(z) !== 'majitel');

  if (!publicKey || !privateKey) {
    chyby.push('Na serveru chybí klíč VAPID');
  } else if (!cilova.length) {
    /* nic k odeslání */
  } else if (!process.env.VITEST) {
    try {
      const webpush = await import('web-push');
      webpush.setVapidDetails(subject, publicKey, privateKey);
      const zustane: PushZarizeni[] = [...ostatni];
      const smazane: PushZarizeni[] = [];
      for (const z of cilova) {
        const jmeno = z.nazev || 'Telefon';
        try {
          await webpush.sendNotification(
            { endpoint: z.endpoint, keys: { p256dh: z.p256dh, auth: z.auth } },
            JSON.stringify({ title: 'VIVIEN', body: text, url }),
            PUSH_OPTS,
          );
          doruceno += 1;
          dorucenoJmena.push(jmeno);
          zustane.push(z);
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            smazane.push(z);
            odpojeno.push(jmeno);
            continue;
          }
          const kod = typeof status === 'number' ? String(status) : 'chyba';
          chyby.push(`${jmeno} (${kod})`);
          console.error(`Upozorneni: push selhalo ${jmeno} status=${kod}`, err instanceof Error ? err.message : err);
          zustane.push(z);
        }
      }
      if (zustane.length !== zarizeni.length) {
        try {
          await store.savePush(zustane);
        } catch (err) {
          console.error('Upozorneni: savePush selhalo', err instanceof Error ? err.message : err);
        }
        if (!opts?.zkuseni) {
          for (const z of smazane) {
            await emailOdpojeni(z.nazev || 'Telefon');
          }
        }
      }
    } catch (err) {
      chyby.push('web-push');
      console.error('Upozorneni: web-push selhalo', err instanceof Error ? err.message : err);
    }
  }

  const detail = {
    zarizeni: zarizeni.length,
    doruceno,
    dorucenoJmena,
    ...(chyby.length ? { chyby } : {}),
    ...(odpojeno.length ? { odpojeno } : {}),
  };

  if (doruceno > 0) {
    console.log(`Upozorneni: push (${doruceno}/${cilova.length})`);
    return { jak: 'push', ...detail };
  }

  /* Zkušební tlačítko nesmí schovat selhání e-mailem. */
  if (!opts?.zkuseni) {
    try {
      const mailed = await emailMajiteli(text);
      if (mailed) {
        console.log(`Upozorneni: email (zarizeni ${zarizeni.length})`);
        return { jak: 'email', ...detail };
      }
    } catch (err) {
      console.error('Upozorneni: email selhal', err instanceof Error ? err.message : err);
    }
  }

  console.log(`Upozorneni: nic (zarizeni ${zarizeni.length})`);
  return { jak: 'nic', ...detail };
}

export async function upozorniMajitele(
  store: ProcessStore,
  text: string,
  url: string,
): Promise<'push' | 'email' | 'nic'> {
  const vysledek = await upozorniMajitelePodrobne(store, text, url);
  return vysledek.jak;
}

/** Push jen na zařízení s rolí úklid. Bez e-mailu majiteli. */
export async function upozorniUklid(
  store: ProcessStore,
  text: string,
  url: string,
): Promise<'push' | 'nic'> {
  let zarizeni: PushZarizeni[] = [];
  try {
    zarizeni = await store.listPush();
  } catch (err) {
    console.error('Upozorneni uklid: listPush selhalo', err instanceof Error ? err.message : err);
    return 'nic';
  }
  const cilova = zarizeni.filter((z) => rolePush(z) === 'uklid');
  if (!cilova.length) return 'nic';

  const publicKey = process.env.VAPID_PUBLIC?.trim();
  const privateKey = process.env.VAPID_PRIVATE?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:info@vivienapartments.cz';
  if (!publicKey || !privateKey || process.env.VITEST) {
    if (process.env.VITEST) return 'push';
    return 'nic';
  }

  let doruceno = 0;
  try {
    const webpush = await import('web-push');
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const zustane: PushZarizeni[] = zarizeni.filter((z) => rolePush(z) !== 'uklid');
    for (const z of cilova) {
      try {
        await webpush.sendNotification(
          { endpoint: z.endpoint, keys: { p256dh: z.p256dh, auth: z.auth } },
          JSON.stringify({ title: 'VIVIEN Úklid', body: text, url }),
          PUSH_OPTS,
        );
        doruceno += 1;
        zustane.push(z);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) continue;
        zustane.push(z);
      }
    }
    if (zustane.length !== zarizeni.length) {
      try {
        await store.savePush(zustane);
      } catch (err) {
        console.error('Upozorneni uklid: savePush selhalo', err instanceof Error ? err.message : err);
      }
    }
  } catch (err) {
    console.error('Upozorneni uklid: web-push selhalo', err instanceof Error ? err.message : err);
  }
  return doruceno > 0 ? 'push' : 'nic';
}

/** Export pro testy: která zařízení dostanou které upozornění. */
export function zarizeniProRoli(list: PushZarizeni[], role: PushRole): PushZarizeni[] {
  return list.filter((z) => rolePush(z) === role);
}

/** Text pro tlačítko Zkusit upozornění. */
export function textZkuseni(v: VysledekUpozorneni): string {
  if (v.jak === 'push') {
    let zaklad = v.dorucenoJmena.length
      ? `Doručeno: ${v.dorucenoJmena.join(', ')}`
      : v.doruceno === 1
        ? 'Doručeno na 1 zařízení'
        : `Doručeno na ${v.doruceno} zařízení`;
    if (v.chyby?.length) zaklad += `. Nešlo: ${v.chyby.join(', ')}`;
    if (v.odpojeno?.length) zaklad += `. Google odpojil: ${v.odpojeno.join(', ')}`;
    return zaklad;
  }
  if (v.jak === 'email') {
    const duvod = v.chyby?.length
      ? ` Push nešel: ${v.chyby.join(', ')}.`
      : v.odpojeno?.length
        ? ` Google odpojil: ${v.odpojeno.join(', ')}.`
        : '';
    return `Odesláno e-mailem.${duvod} Na telefonu klepněte Resetovat upozornění.`;
  }
  if (v.odpojeno?.length) {
    return `Google odpojil: ${v.odpojeno.join(', ')}. Klepněte Resetovat upozornění.`;
  }
  if (v.chyby?.length) {
    return `Push nešel: ${v.chyby.join(', ')}. Klepněte Resetovat upozornění.`;
  }
  if (v.zarizeni === 0) return 'Žádné zařízení, zapněte upozornění';
  return 'Push nedorazil. Klepněte Resetovat upozornění.';
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
