import { ImapFlow } from 'imapflow';
import { duvod } from './chyby';
import { predmetyPruvodce } from './email-host';
import { dnesVPraze } from './prehled';
import {
  duvodVytazeni,
  predmetProVypis,
  VETA_SPAM,
  VETA_SPAM_CHYBA,
  type DuvodSpamu,
  type HostOkno,
  type SpamZprava,
} from './spam-host';
import type { ProcessStore, RezervaceRecord } from './store';

/** Až po souhlasu majitele. Do té doby se spam jen prohlíží. */
export const PRESOUVAT_ZE_SPAMU = false;

const SCHRANKA = 'info@vivienapartments.cz';
const SLOZKA_SPAM = 'spam';

export type SpamNahled = {
  duvod: DuvodSpamu;
  predmet: string;
  rezervace: 'ano' | 'ne';
};

export type SpamVysledek = {
  nalezeno: number;
  presunuto: number;
  chyby: number;
  nahled: SpamNahled[];
};

function hostiZRadku(radky: RezervaceRecord[]): HostOkno[] {
  return radky.map((r) => ({
    rezervace: r.rezervace,
    email: r.emailHosta,
    prijezd: r.prijezd,
    odjezd: r.odjezd,
  }));
}

async function poznamenej(store: ProcessStore, id: string, veta: string, jakoDuvod: boolean): Promise<void> {
  const prev = await store.getRezervace(id);
  if (!prev || prev.stav === 'zruseno') return;
  const cas = new Date().toISOString();
  const duvody =
    jakoDuvod && !prev.duvody.some((d) => d.veta === veta)
      ? [...prev.duvody, duvod('neuplne', veta)]
      : prev.duvody;
  await store.setRezervace(id, {
    ...prev,
    duvody,
    posledniPokus: cas,
    historie: [...prev.historie, { cas, co: veta }].slice(-40),
  });
}

export async function rozhodniSpam(
  zpravy: SpamZprava[],
  store: ProcessStore,
  akce: { presunout: (zprava: SpamZprava) => Promise<void> },
  opts: { presouvat: boolean; ted?: Date },
): Promise<SpamVysledek> {
  const ted = opts.ted ?? new Date();
  const dnes = dnesVPraze(ted);
  const predmety = predmetyPruvodce();
  const hosti = hostiZRadku((await store.listRezervace()).map((e) => e.record));
  const vysledek: SpamVysledek = { nalezeno: 0, presunuto: 0, chyby: 0, nahled: [] };

  for (const zprava of zpravy) {
    const klic = zprava.messageId || `spam-uid-${zprava.uid}`;
    let rozhodnuti: ReturnType<typeof duvodVytazeni> = null;
    try {
      if (await store.isMessageProcessed(klic)) continue;
      rozhodnuti = duvodVytazeni(zprava, hosti, predmety, ted, dnes);
      if (!rozhodnuti) continue;
      vysledek.nalezeno += 1;
      vysledek.nahled.push({
        duvod: rozhodnuti.duvod,
        predmet: predmetProVypis(zprava.subject, predmety),
        rezervace: rozhodnuti.rezervace.length ? 'ano' : 'ne',
      });
      if (!opts.presouvat) continue;
      await akce.presunout(zprava);
      for (const id of rozhodnuti.rezervace) {
        await poznamenej(store, id, VETA_SPAM, false);
        try {
          const rec = await store.getRezervace(id);
          if (!rec) continue;
          const { popisHosta, poznamenejUpozorneni, upozorniMajitele } = await import('./upozorneni');
          const jak = await upozorniMajitele(store, `${popisHosta(rec)}: e-mail byl ve spamu`, `/prehled#${id}`);
          await poznamenejUpozorneni(store, id, jak);
        } catch {
          /* upozornění nesmí shodit přesun */
        }
      }
      await store.markMessage({
        messageId: klic,
        uid: zprava.uid,
        processedAt: new Date().toISOString(),
        rezervace: rozhodnuti.rezervace[0],
        status: 'spam_vytazen',
      });
      vysledek.presunuto += 1;
    } catch {
      vysledek.chyby += 1;
      for (const id of rozhodnuti?.rezervace || []) {
        try {
          await poznamenej(store, id, VETA_SPAM_CHYBA, true);
        } catch {
          /* zápis chyby nesmí shodit další e-maily */
        }
      }
    }
  }

  return vysledek;
}

export async function nactiSpam(user: string, pass: string, ted = new Date()): Promise<SpamZprava[]> {
  const since = new Date(ted.getTime() - 7 * 24 * 60 * 60 * 1000);
  const client = new ImapFlow({
    host: 'imap.seznam.cz',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });
  const out: SpamZprava[] = [];
  await client.connect();
  const lock = await client.getMailboxLock(SLOZKA_SPAM);
  try {
    for await (const msg of client.fetch({ since }, { uid: true, envelope: true }, { uid: true })) {
      const fromAddr = msg.envelope?.from?.[0]?.address || '';
      const fromName = msg.envelope?.from?.[0]?.name || '';
      const from = fromAddr ? `${fromName} <${fromAddr}>`.trim() : fromName;
      const messageId = (msg.envelope?.messageId || '').trim().replace(/^<|>$/g, '');
      out.push({
        uid: msg.uid,
        messageId,
        from,
        subject: msg.envelope?.subject || '',
        date: msg.envelope?.date ? new Date(msg.envelope.date) : null,
      });
    }
  } finally {
    lock.release();
    await client.logout().catch(() => undefined);
  }
  return out;
}

async function presunDoDorucene(client: ImapFlow, uid: number): Promise<void> {
  const cislo = String(uid);
  await client.messageFlagsAdd(cislo, ['\\Flagged'], { uid: true });
  await client.messageFlagsRemove(cislo, ['\\Seen'], { uid: true });
  await client.messageMove(cislo, 'INBOX', { uid: true });
}

export async function vytahniHostyZeSpamu(
  store: ProcessStore,
  opts?: { presouvat?: boolean; ted?: Date },
): Promise<SpamVysledek> {
  const user = process.env.SMTP_USER?.trim() || '';
  const pass = process.env.SMTP_HESLO?.trim() || '';
  if (!user || !pass || pass.startsWith('SEM_NAPIS')) {
    throw new Error('SMTP_USER / SMTP_HESLO nejsou vyplněné');
  }
  if (user.toLowerCase() !== SCHRANKA) {
    throw new Error('SMTP_USER není schránka info');
  }
  const presouvat = opts?.presouvat ?? PRESOUVAT_ZE_SPAMU;
  const ted = opts?.ted ?? new Date();
  const zpravy = await nactiSpam(user, pass, ted);
  if (!presouvat) {
    return rozhodniSpam(zpravy, store, { presunout: async () => undefined }, { presouvat: false, ted });
  }

  const client = new ImapFlow({
    host: 'imap.seznam.cz',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });
  await client.connect();
  const lock = await client.getMailboxLock(SLOZKA_SPAM);
  try {
    return await rozhodniSpam(
      zpravy,
      store,
      { presunout: (zprava) => presunDoDorucene(client, zprava.uid) },
      { presouvat: true, ted },
    );
  } finally {
    lock.release();
    await client.logout().catch(() => undefined);
  }
}
