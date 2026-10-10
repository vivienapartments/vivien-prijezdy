import nodemailer from 'nodemailer';
import { parseBounce, stejneMessageId } from './bounce';
import { duvod, jeBlokujici, jeVyhrada, type Duvod } from './chyby';
import { verifyEmailOrigin } from './email-origin';
import { fetchRecentInboxMails, type InboxMail } from './inbox-mail';
import { posliPruvodce } from './posli-pruvodce';
import {
  createProcessStore,
  prazdnaRezervace,
  type ProcessStore,
  type RezervaceRecord,
  type RezervaceStav,
} from './store';
import { isDepartureExpired } from './token';
import { inspectVivienMail, type MailInspection } from './vivien-data';

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

function testRezim(): boolean {
  return (process.env.TEST_REZIM ?? '1') !== '0';
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

function denMesic(ymd: string | null): string {
  if (!ymd) return 'bez data';
  const [, m, d] = ymd.split('-');
  if (!m || !d) return 'bez data';
  return `${Number(d)}.${Number(m)}.`;
}

function predmetNeodesel(rec: RezervaceRecord): string {
  const apt = rec.apartman || 'bez apartmánu';
  const base = `Průvodce NEODEŠEL – #${rec.rezervace}, ${apt}, ${denMesic(rec.prijezd)}`;
  return testRezim() ? `[TEST] ${base}` : base;
}

async function upozorniJednou(rec: RezervaceRecord): Promise<RezervaceRecord> {
  if (rec.stav !== 'neodeslano' && rec.stav !== 'vraceno') return rec;
  const nove = rec.duvody.filter((d) => jeBlokujici(d.kod) && !rec.upozorneneKody.includes(d.kod));
  if (!nove.length) return rec;
  const text = [...nove.map((d) => d.veta), '', `Přehled: ${baseUrl()}/prehled#${rec.rezervace}`].join('\n');
  await alertMajitel(predmetNeodesel(rec), text);
  return { ...rec, upozorneneKody: [...rec.upozorneneKody, ...nove.map((d) => d.kod)] };
}

function sloucit(
  id: string,
  prev: RezervaceRecord | null,
  data: Partial<RezervaceRecord>,
  cas: string,
  co: string,
): RezervaceRecord {
  const base = prev ?? prazdnaRezervace(id, cas);
  return {
    ...base,
    ...data,
    rezervace: id,
    posledniPokus: cas,
    upozorneneKody: data.upozorneneKody ?? base.upozorneneKody,
    smtpPokusy: data.smtpPokusy ?? base.smtpPokusy,
    historie: [...base.historie, { cas, co }].slice(-40),
  };
}

function udajeZMailu(ins: MailInspection): Partial<RezervaceRecord> {
  return {
    apartman: ins.apartman,
    prijezd: ins.prijezd,
    odjezd: ins.odjezd,
    noci: ins.noci,
    osob: ins.osob,
    jazyk: ins.jazyk,
    jmeno: ins.jmeno,
    krestni: ins.krestni,
    emailHosta: ins.email,
    accessPin: ins.accessPin,
  };
}

function duvodyMailu(ins: MailInspection): Duvod[] {
  return [...ins.duvody];
}

export async function processOneMail(mail: InboxMail, store: ProcessStore): Promise<ProcessItem> {
  const now = new Date().toISOString();

  if (await store.isMessageProcessed(mail.messageId)) {
    return { status: 'already_done' };
  }

  const bounce = parseBounce(mail);
  if (bounce) {
    return zpracujBounce(mail, bounce, store, now);
  }

  const body = bodyForParse(mail);
  const ins = inspectVivienMail(body, mail.subject);
  const origin = verifyEmailOrigin({
    from: mail.from,
    authenticationResults: mail.authenticationResults,
    body,
    bhKlic: process.env.BH_KLIC?.trim() || '',
    majitelPreposilaZ: process.env.MAJITEL_PREPOSILA_Z?.trim() || '',
  });

  if (!origin.ok) {
    if (ins.rezervace) {
      const prev = await store.getRezervace(ins.rezervace);
      const uzOdeslano = prev?.stav === 'odeslano' || prev?.stav === 'odeslano_s_vyhradou';
      if (!uzOdeslano) {
        const duvody = [duvod('nedoveryhodny_odesilatel'), ...duvodyMailu(ins)];
        let rec = sloucit(ins.rezervace, prev, {
          ...udajeZMailu(ins),
          stav: 'neodeslano',
          duvody,
        }, now, 'E-mail odmítnut, odesílatel není důvěryhodný');
        rec = await upozorniJednou(rec);
        await store.setRezervace(ins.rezervace, rec);
      }
    }
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      rezervace: ins.rezervace ?? undefined,
      status: 'rejected',
      reason: origin.reason,
    });
    return { status: 'rejected', reason: origin.reason, rezervace: ins.rezervace ?? undefined };
  }

  if (!ins.rezervace) {
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      status: 'skipped_no_data',
      reason: 'bez čísla rezervace',
    });
    return { status: 'skipped_no_data', reason: 'bez čísla rezervace' };
  }

  const id = ins.rezervace;
  const prev = await store.getRezervace(id);
  if (prev?.stav === 'odeslano' || prev?.stav === 'odeslano_s_vyhradou') {
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      rezervace: id,
      status: 'duplicate',
      reason: 'Rezervace už odeslána',
    });
    return { rezervace: id, status: 'duplicate' };
  }

  const duvody = duvodyMailu(ins);

  if (ins.odjezd && isDepartureExpired(ins.odjezd)) {
    const rec = sloucit(id, prev, { ...udajeZMailu(ins), duvody, stav: prev?.stav ?? 'neodeslano' }, now, 'Odjezd už prošel');
    await store.setRezervace(id, rec);
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      rezervace: id,
      status: 'skipped_no_data',
      reason: 'Odjezd už prošel',
    });
    return { rezervace: id, status: 'skipped_past', reason: 'Odjezd už prošel' };
  }

  const blokujici = duvody.filter((d) => jeBlokujici(d.kod));
  if (blokujici.length) {
    let rec = sloucit(id, prev, { ...udajeZMailu(ins), stav: 'neodeslano', duvody }, now, 'Průvodce neodešel');
    rec = await upozorniJednou(rec);
    await store.setRezervace(id, rec);
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      rezervace: id,
      status: 'skipped_no_data',
      reason: blokujici[0].veta,
    });
    return { rezervace: id, status: 'neodeslano', reason: blokujici[0].kod };
  }

  const koncept = sloucit(id, prev, { ...udajeZMailu(ins), duvody, stav: 'neodeslano' }, now, 'Pokus o odeslání');
  try {
    const sent = await posliPruvodce(koncept, ins.krestni);
    const stav: RezervaceStav = duvody.some((d) => jeVyhrada(d.kod)) ? 'odeslano_s_vyhradou' : 'odeslano';
    const rec = sloucit(
      id,
      prev,
      {
        ...udajeZMailu(ins),
        stav,
        duvody: duvody.filter((d) => jeVyhrada(d.kod)),
        odeslaneMessageId: sent.messageId || prev?.odeslaneMessageId || null,
        smtpPokusy: 0,
      },
      now,
      stav === 'odeslano_s_vyhradou' ? 'Průvodce odeslán s výhradou' : 'Průvodce odeslán',
    );
    await store.setRezervace(id, rec);
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      rezervace: id,
      status: 'sent',
    });
    return { rezervace: id, status: 'sent' };
  } catch {
    const pokusy = (prev?.smtpPokusy ?? 0) + 1;
    const smtp = duvod('smtp_chyba');
    let rec = sloucit(
      id,
      prev,
      {
        ...udajeZMailu(ins),
        stav: 'neodeslano',
        duvody: [...duvody.filter((d) => d.kod !== 'smtp_chyba'), smtp],
        smtpPokusy: pokusy,
      },
      now,
      `Odeslání selhalo, pokus ${pokusy} ze 3`,
    );
    rec = await upozorniJednou(rec);
    await store.setRezervace(id, rec);
    if (pokusy >= 3) {
      await store.markMessage({
        messageId: mail.messageId,
        uid: mail.uid,
        processedAt: now,
        rezervace: id,
        status: 'error',
        reason: smtp.veta,
      });
    }
    return { rezervace: id, status: 'error', reason: 'smtp_chyba' };
  }
}

async function zpracujBounce(
  mail: InboxMail,
  bounce: NonNullable<ReturnType<typeof parseBounce>>,
  store: ProcessStore,
  now: string,
): Promise<ProcessItem> {
  const all = await store.listRezervace();
  let found = bounce.originalMessageId
    ? all.find((row) => stejneMessageId(row.record.odeslaneMessageId, bounce.originalMessageId))
    : undefined;
  if (!found && bounce.recipient) {
    const stejne = all
      .filter((row) => (row.record.emailHosta || '').toLowerCase() === bounce.recipient)
      .sort((a, b) => (a.record.posledniPokus < b.record.posledniPokus ? 1 : -1));
    found = stejne[0];
  }

  if (!found) {
    const subject = testRezim()
      ? '[TEST] Průvodce NEODEŠEL – nedoručený e-mail'
      : 'Průvodce NEODEŠEL – nedoručený e-mail';
    await alertMajitel(subject, 'Nedoručený e-mail, nevím ke které rezervaci.');
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      status: 'error',
      reason: 'nedoruceno-neprirazeno',
    });
    return { status: 'error', reason: 'nedoruceno-neprirazeno' };
  }

  const id = found.id;
  let rec = sloucit(
    id,
    found.record,
    {
      stav: 'vraceno',
      duvody: [duvod('nedoruceno', bounce.diagnostika)],
    },
    now,
    'E-mail se vrátil jako nedoručitelný',
  );
  rec = await upozorniJednou(rec);
  await store.setRezervace(id, rec);
  await store.markMessage({
    messageId: mail.messageId,
    uid: mail.uid,
    processedAt: now,
    rezervace: id,
    status: 'error',
    reason: 'nedoruceno',
  });
  return { rezervace: id, status: 'vraceno', reason: 'nedoruceno' };
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
    else if (item.status === 'skipped_no_data' || item.status === 'skipped_past' || item.status === 'neodeslano') {
      summary.skipped += 1;
    } else if (item.status === 'rejected') summary.rejected += 1;
    else if (item.status === 'duplicate') summary.duplicate += 1;
    else if (item.status === 'error' || item.status === 'vraceno') summary.errors += 1;
  }

  return summary;
}
