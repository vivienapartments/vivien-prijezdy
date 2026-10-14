import nodemailer from 'nodemailer';
import { druhZeSubjectu, jeInterniPredmet, parsujInterni, puvodInterniOk, vetaChybi, type InterniUdaje } from './bh-interni';
import { parseBounce, stejneMessageId } from './bounce';
import { duvod, jeBlokujici, jeVyhrada, problemEmailu, type Duvod } from './chyby';
import { nightsBetween } from './dates';
import { jazykZPredvolby, normalizujTelefon } from './telefon';
import { jeMailMajitele, verifyEmailOrigin } from './email-origin';
import { fetchRecentInboxMails, type InboxMail } from './inbox-mail';
import { poplatekZData } from './poplatek';
import {
  cisloZeSubjectu,
  jePotvrzeniPredmet,
  jeSpatneJmenoPotvrzeni,
  jeVyzvaCheckinu,
  odkazCheckinuZVyzvy,
  parsujPotvrzeni,
} from './potvrzeni-rezervace';
import { posliPruvodce } from './posli-pruvodce';
import { doplnRezervaci, type DoplnekRezervace } from './rezervace-rucne';
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

const NAZVY_ZMENY: Partial<Record<keyof RezervaceRecord, string>> = {
  jmeno: 'jméno',
  apartman: 'apartmán',
  prijezd: 'příjezd',
  odjezd: 'odjezd',
  noci: 'noci',
  osob: 'osoby',
  emailHosta: 'e-mail',
  narodnost: 'národnost',
  jazyk: 'jazyk',
  accessPin: 'PIN',
  vytvoreno: 'vytvořeno',
  zdroj: 'zdroj',
  telefon: 'telefon',
  poplatek: 'poplatek',
};

const CHRANENE_RUCNI = new Set<keyof RezervaceRecord>([
  'emailHosta',
  'apartman',
  'prijezd',
  'odjezd',
  'noci',
  'osob',
  'jazyk',
  'accessPin',
]);

function maRucniUdaje(prev: RezervaceRecord | null | undefined): boolean {
  return Boolean(
    prev?.historie.some((h) => h.co.startsWith('Údaje opraveny') || h.co.startsWith('Opraveno a odesláno')),
  );
}

/** Check-in zapíše jen pole, která v mailu jsou. Ruční oprava a čas příjezdu zůstanou. */
function udajeZMailu(ins: MailInspection, prev?: RezervaceRecord | null): Partial<RezervaceRecord> {
  const data: Partial<RezervaceRecord> = {};
  const rucni = maRucniUdaje(prev);
  function poloz<K extends keyof RezervaceRecord>(klic: K, hodnota: RezervaceRecord[K] | null | undefined) {
    if (hodnota == null || hodnota === '') return;
    if (rucni && CHRANENE_RUCNI.has(klic)) return;
    data[klic] = hodnota;
  }
  poloz('apartman', ins.apartman);
  poloz('prijezd', ins.prijezd);
  poloz('odjezd', ins.odjezd);
  poloz('noci', ins.noci);
  poloz('osob', ins.osob);
  poloz('jazyk', ins.jazyk);
  poloz('jmeno', ins.jmeno);
  poloz('krestni', ins.krestni);
  poloz('narodnost', ins.narodnost);
  poloz('emailHosta', ins.email);
  poloz('accessPin', ins.accessPin);
  if (ins.vytvoreno) {
    poloz('vytvoreno', ins.vytvoreno);
    poloz('poplatek', poplatekZData(ins.vytvoreno));
  }
  if (ins.telefon) {
    const stare = prev?.telefon;
    if (stare && stare !== ins.telefon && !prev?.telefonRezervace) {
      data.telefonRezervace = stare;
      data.telefonRezervaceWa = prev?.telefonWa ?? null;
      data.telefonRezervacePuvodni = prev?.telefonPuvodni ?? null;
    } else if (prev?.telefonRezervacePuvodni && ins.narodnost && !data.telefonRezervace) {
      const tel = normalizujTelefon(prev.telefonRezervacePuvodni, ins.narodnost);
      if (tel) {
        data.telefonRezervace = tel.ulozeny;
        data.telefonRezervaceWa = tel.wa;
      }
    }
    data.telefon = ins.telefon;
    data.telefonWa = ins.telefonWa;
    data.telefonPuvodni = ins.telefonPuvodni;
  } else if (prev?.telefonRezervacePuvodni && ins.narodnost) {
    const tel = normalizujTelefon(prev.telefonRezervacePuvodni, ins.narodnost);
    if (tel) {
      data.telefonRezervace = tel.ulozeny;
      data.telefonRezervaceWa = tel.wa;
    }
  }
  if (ins.zdroj) poloz('zdroj', ins.zdroj);
  return data;
}

export function coSeZmenilo(prev: RezervaceRecord | null, data: Partial<RezervaceRecord>): string[] {
  if (!prev) return [];
  const out: string[] = [];
  for (const klic of Object.keys(NAZVY_ZMENY) as (keyof RezervaceRecord)[]) {
    const nove = data[klic];
    if (nove == null || nove === '') continue;
    if (prev[klic] !== nove) out.push(NAZVY_ZMENY[klic]!);
  }
  return out;
}

function vetaDoplneni(zmeny: string[], pokracovani: string): string {
  if (!zmeny.length) return pokracovani;
  return `Doplněno z check-inu: ${zmeny.join(', ')}. ${pokracovani}`;
}

function duvodyMailu(ins: MailInspection): Duvod[] {
  return [...ins.duvody];
}

/** Potvrzení nebo výzva z info@, kterou je ještě potřeba založit nebo opravit. Hostovi se nic neposílá. */
async function potvrzeniBezRadku(mail: InboxMail, store: ProcessStore): Promise<boolean> {
  const odMajitele = jeMailMajitele(mail.from, process.env.MAJITEL_PREPOSILA_Z?.trim() || '');
  if (!odMajitele) return false;
  const id = cisloZeSubjectu(mail.subject);
  if (!id) return false;
  const telo = `${mail.subject}\n${mail.text}\n${mail.html}`;
  const potvrzeni = jePotvrzeniPredmet(mail.subject);
  const vyzva = jeVyzvaCheckinu(mail.subject) && !/VIVIEN-DATA/i.test(telo);
  if (!potvrzeni && !vyzva) return false;
  const rec = await store.getRezervace(id);
  if (!rec) return true;
  if (!potvrzeni) return !rec.checkinUrl && Boolean(odkazCheckinuZVyzvy(mail.html, mail.text));
  if (!rec.apartman || !rec.prijezd || !rec.odjezd || !rec.jmeno) return true;
  return jeSpatneJmenoPotvrzeni(rec.jmeno, mail.subject);
}

/** Už zpracovaný check-in, který má novější údaje než řádek. Průvodce se z toho sám neposílá podruhé. */
async function checkinKDoplneni(mail: InboxMail, store: ProcessStore): Promise<boolean> {
  const telo = `${mail.subject}\n${mail.text}\n${mail.html}`;
  if (!/VIVIEN-DATA/i.test(telo)) return false;
  const body = bodyForParse(mail);
  const ins = inspectVivienMail(body, mail.subject);
  if (!ins.rezervace) return false;
  const origin = verifyEmailOrigin({
    from: mail.from,
    authenticationResults: mail.authenticationResults,
    body,
    bhKlic: process.env.BH_KLIC?.trim() || '',
    majitelPreposilaZ: process.env.MAJITEL_PREPOSILA_Z?.trim() || '',
  });
  if (!origin.ok) return false;
  const prev = await store.getRezervace(ins.rezervace);
  if (!prev || prev.stav === 'zruseno') return false;
  return coSeZmenilo(prev, udajeZMailu(ins, prev)).length > 0;
}

export async function processOneMail(mail: InboxMail, store: ProcessStore): Promise<ProcessItem> {
  const now = new Date().toISOString();

  if (await store.isMessageProcessed(mail.messageId)) {
    const potvrzeni = await potvrzeniBezRadku(mail, store);
    const checkin = !potvrzeni && (await checkinKDoplneni(mail, store));
    if (!potvrzeni && !checkin) return { status: 'already_done' };
  }

  const bounce = parseBounce(mail);
  if (bounce) {
    return zpracujBounce(mail, bounce, store, now);
  }

  if (jeInterniPredmet(mail.subject)) {
    const odMajitele = jeMailMajitele(mail.from, process.env.MAJITEL_PREPOSILA_Z?.trim() || '');
    if (odMajitele && druhZeSubjectu(mail.subject) === 'nova') {
      const u = parsujInterni(mail.subject, mail.html, mail.text);
      return zpracujOdMajitele(mail, store, now, u ? doplnekZInterni(u) : null, u?.chybi || []);
    }
    return zpracujInterni(mail, store, now);
  }

  const odMajitele = jeMailMajitele(mail.from, process.env.MAJITEL_PREPOSILA_Z?.trim() || '');
  if (jePotvrzeniPredmet(mail.subject) && odMajitele) {
    const u = parsujPotvrzeni(mail.subject, mail.html, mail.text);
    return zpracujOdMajitele(mail, store, now, u, u?.chybi || []);
  }

  const telo = `${mail.subject}\n${mail.text}\n${mail.html}`;
  if (jeVyzvaCheckinu(mail.subject) && odMajitele && !/VIVIEN-DATA/i.test(telo)) {
    const id = cisloZeSubjectu(mail.subject);
    const checkinUrl = odkazCheckinuZVyzvy(mail.html, mail.text);
    return zpracujOdMajitele(
      mail,
      store,
      now,
      id ? { rezervace: id, checkinUrl } : null,
      id ? [] : ['rezervace'],
    );
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
          ...udajeZMailu(ins, prev),
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
  if (prev?.stav === 'zruseno') {
    const rec = sloucit(id, prev, {}, now, 'Přišel check-in u zrušené rezervace, průvodce se neposlal');
    await store.setRezervace(id, rec);
    const predmet = testRezim()
      ? `[TEST] U zrušené rezervace #${id} přišel check-in`
      : `U zrušené rezervace #${id} přišel check-in`;
    await alertMajitel(predmet, 'Průvodce se neposlal.');
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      rezervace: id,
      status: 'skipped_no_data',
      reason: 'zruseno',
    });
    return { rezervace: id, status: 'zruseno', reason: 'zruseno' };
  }
  if (prev?.stav === 'odeslano' || prev?.stav === 'odeslano_s_vyhradou') {
    const data = udajeZMailu(ins, prev);
    const zmeny = coSeZmenilo(prev, data);
    if (zmeny.length) {
      const rec = sloucit(id, prev, data, now, `Doplněno z check-inu: ${zmeny.join(', ')}`);
      await store.setRezervace(id, rec);
    }
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      rezervace: id,
      status: 'duplicate',
      reason: 'Rezervace už odeslána',
    });
    return { rezervace: id, status: zmeny.length ? 'doplneno' : 'duplicate' };
  }

  const duvody = duvodyMailu(ins);
  const data = udajeZMailu(ins, prev);
  const zmeny = coSeZmenilo(prev, data);

  if (ins.odjezd && isDepartureExpired(ins.odjezd)) {
    const rec = sloucit(id, prev, { ...data, duvody, stav: prev?.stav ?? 'neodeslano' }, now, vetaDoplneni(zmeny, 'Odjezd už prošel'));
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
    let rec = sloucit(id, prev, { ...data, stav: 'neodeslano', duvody }, now, vetaDoplneni(zmeny, 'Průvodce neodešel'));
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

  const koncept = sloucit(id, prev, { ...data, duvody, stav: 'neodeslano' }, now, vetaDoplneni(zmeny, 'Pokus o odeslání'));
  try {
    const sent = await posliPruvodce(koncept, ins.krestni);
    const stav: RezervaceStav = duvody.some((d) => jeVyhrada(d.kod)) ? 'odeslano_s_vyhradou' : 'odeslano';
    const rec = sloucit(
      id,
      prev,
      {
        ...data,
        stav,
        duvody: duvody.filter((d) => jeVyhrada(d.kod)),
        odeslaneMessageId: sent.messageId || prev?.odeslaneMessageId || null,
        smtpPokusy: 0,
      },
      now,
      vetaDoplneni(zmeny, stav === 'odeslano_s_vyhradou' ? 'Průvodce odeslán s výhradou' : 'Průvodce odeslán'),
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
        ...data,
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

function udajeInterni(u: InterniUdaje, stav: RezervaceStav): Partial<RezervaceRecord> {
  const data: Partial<RezervaceRecord> = { stav };
  if (u.apartman) data.apartman = u.apartman;
  if (u.prijezd) data.prijezd = u.prijezd;
  if (u.odjezd) data.odjezd = u.odjezd;
  if (u.noci) data.noci = u.noci;
  else if (u.prijezd && u.odjezd) {
    const noci = nightsBetween(u.prijezd, u.odjezd);
    if (noci) data.noci = noci;
  }
  if (u.osob) data.osob = u.osob;
  if (u.jmeno) data.jmeno = u.jmeno;
  if (u.krestni) data.krestni = u.krestni;
  if (u.email) data.emailHosta = u.email;
  if (u.telefon) {
    data.telefonRezervace = u.telefon;
    data.telefonRezervaceWa = u.telefonWa;
    data.telefonRezervacePuvodni = u.telefonPuvodni;
  }
  if (stav === 'bez_checkinu') data.jazyk = jazykZPredvolby(u.telefon);
  if (u.zdroj) data.zdroj = u.zdroj;
  if (u.vytvoreno) {
    data.vytvoreno = u.vytvoreno;
    data.poplatek = poplatekZData(u.vytvoreno);
  }
  if (u.checkinUrl) data.checkinUrl = u.checkinUrl;
  const veta = vetaChybi(u.chybi);
  if (veta && stav === 'bez_checkinu') {
    data.duvody = [duvod('neuplne', `Čeká na online check-in. ${veta}`)];
  }
  return data;
}

function historieInterni(u: InterniUdaje, stav: RezervaceStav, odeslano: boolean): string {
  if (u.druh === 'zruseni') return 'Rezervace zrušena';
  if (odeslano) return 'Rezervace se změnila, průvodce má staré údaje';
  if (u.druh === 'zmena') return 'Rezervace se změnila';
  if (stav === 'bez_checkinu') return 'Nová rezervace, čeká na check-in';
  return 'Nová rezervace, údaje doplněny';
}

function doplnekZInterni(u: InterniUdaje): DoplnekRezervace {
  return {
    rezervace: u.rezervace || '',
    jmeno: u.jmeno,
    telefon: u.telefonPuvodni || u.telefon,
    email: u.email,
    apartman: u.apartman,
    prijezd: u.prijezd,
    odjezd: u.odjezd,
    osob: u.osob,
    noci: u.noci,
    zdroj: u.zdroj,
    checkinUrl: u.checkinUrl,
  };
}

async function zpracujOdMajitele(
  mail: InboxMail,
  store: ProcessStore,
  now: string,
  vstup: DoplnekRezervace | null,
  chybi: string[],
): Promise<ProcessItem> {
  if (!vstup?.rezervace) {
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      status: 'skipped_no_data',
      reason: 'bez čísla rezervace',
    });
    return { status: 'skipped_no_data', reason: 'bez čísla rezervace' };
  }
  const email = (vstup.email || '').trim();
  const cisty = email && !problemEmailu(email) ? email : null;
  const chybiVcetne = cisty || !email ? chybi : [...chybi, 'e-mail'];
  const prev = await store.getRezervace(vstup.rezervace);
  const nahradJmeno = Boolean(vstup.jmeno) && jeSpatneJmenoPotvrzeni(prev?.jmeno, mail.subject);
  const vysledek = await doplnRezervaci(
    store,
    { ...vstup, email: cisty },
    {
      stitek: 'info',
      historie: jeVyzvaCheckinu(mail.subject)
        ? prev
          ? 'Doplněn odkaz na check-in'
          : 'Přeposláno z info@'
        : prev
          ? 'Opraveno z potvrzení rezervace'
          : 'Přeposláno z info@',
      chybi: chybiVcetne,
      nahradJmeno,
    },
  );
  if (!vysledek.ok) {
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      rezervace: vstup.rezervace,
      status: 'rejected',
      reason: vysledek.error,
    });
    return { rezervace: vstup.rezervace, status: 'rejected', reason: vysledek.error };
  }
  await store.markMessage({
    messageId: mail.messageId,
    uid: mail.uid,
    processedAt: now,
    rezervace: vstup.rezervace,
    status: 'skipped_no_data',
    reason: 'preposlano',
  });
  return { rezervace: vstup.rezervace, status: 'bez_checkinu' };
}

async function zpracujInterni(mail: InboxMail, store: ProcessStore, now: string): Promise<ProcessItem> {
  if (
    !puvodInterniOk({
      from: mail.from,
      authenticationResults: mail.authenticationResults,
      dkimBetterHotel: mail.dkimBetterHotel,
    })
  ) {
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      status: 'rejected',
      reason: 'Interní e-mail bez DKIM pro better-hotel.com',
    });
    return { status: 'rejected', reason: 'bez DKIM' };
  }

  const u = parsujInterni(mail.subject, mail.html, mail.text);
  if (!u?.rezervace) {
    await store.markMessage({
      messageId: mail.messageId,
      uid: mail.uid,
      processedAt: now,
      status: 'skipped_no_data',
      reason: 'bez čísla rezervace',
    });
    return { status: 'skipped_no_data', reason: 'bez čísla rezervace' };
  }

  const id = u.rezervace;
  const prev = await store.getRezervace(id);
  const odeslano = prev?.stav === 'odeslano' || prev?.stav === 'odeslano_s_vyhradou';
  let stav: RezervaceStav = 'bez_checkinu';
  if (u.druh === 'zruseni') stav = 'zruseno';
  else if (prev?.stav === 'zruseno') stav = 'zruseno';
  else if (
    prev &&
    (prev.stav === 'odeslano' || prev.stav === 'odeslano_s_vyhradou' || prev.stav === 'neodeslano' || prev.stav === 'vraceno')
  ) {
    stav = prev.stav;
  }

  const rec = sloucit(id, prev, udajeInterni(u, stav), now, historieInterni(u, stav, odeslano));
  await store.setRezervace(id, rec);

  const zmeniloSe =
    !!prev &&
    ((u.apartman && u.apartman !== prev.apartman) ||
      (u.prijezd && u.prijezd !== prev.prijezd) ||
      (u.odjezd && u.odjezd !== prev.odjezd));

  if (odeslano && zmeniloSe && u.druh !== 'zruseni') {
    const predmet = testRezim()
      ? `[TEST] Rezervace #${id} se změnila, průvodce má staré údaje`
      : `Rezervace #${id} se změnila, průvodce má staré údaje`;
    await alertMajitel(
      predmet,
      `U rezervace #${id} se změnilo datum nebo apartmán. Průvodce už odešel a odkaz v e-mailu má staré údaje. V přehledu jsou nové.`,
    );
  }

  if (u.druh === 'zruseni' && odeslano) {
    const predmet = testRezim() ? `[TEST] Rezervace #${id} je zrušená` : `Rezervace #${id} je zrušená`;
    await alertMajitel(predmet, 'Průvodce už hostovi odešel. Rezervace je zrušená.');
  }

  await store.markMessage({
    messageId: mail.messageId,
    uid: mail.uid,
    processedAt: now,
    rezervace: id,
    status: 'skipped_no_data',
    reason: stav,
  });
  return { rezervace: id, status: stav };
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

export type VypisRadku = {
  rezervace: string;
  druh: 'potvrzeni' | 'vyzva' | 'checkin';
  odInfo: boolean;
  stavMailu: string;
  duvod: string;
  stavRadku: string;
  apartman: string;
  jmeno: 'ano' | 'chybi' | 'spatne';
  odjezd: 'ano' | 'ne';
  odkaz: 'ano' | 'ne';
  jazyk: string;
  doplneno: 'ano' | 'ne';
  cil?: 'formular' | 'jiny' | 'ne';
  kam?: 'hotel' | 'mail' | 'jina';
};

function rodinaAdresy(adresa: string): 'hotel' | 'mail' | 'jina' {
  const host = new URL(adresa).hostname.toLowerCase();
  if (host.endsWith('better-hotel.com')) return 'hotel';
  if (host.includes('mailjet') || host.includes('mailgun') || host.includes('list-manage')) return 'mail';
  return 'jina';
}

async function cilOdkazu(url: string): Promise<{ cil: 'formular' | 'jiny' | 'ne'; kam: 'hotel' | 'mail' | 'jina' }> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0' },
    });
    const kam = rodinaAdresy(res.url || url);
    if (!res.ok) return { cil: 'ne', kam };
    const typ = (res.headers.get('content-type') || '').toLowerCase();
    if (typ.startsWith('image/') || typ.includes('pdf')) return { cil: 'jiny', kam };
    const cesta = `${new URL(res.url).hostname} ${new URL(res.url).pathname}`.toLowerCase();
    const telo = (await res.text()).slice(0, 40000).toLowerCase();
    if (/check-?in|onlinecheck|formul[aá]ř|formular/.test(`${cesta}\n${telo}`)) return { cil: 'formular', kam };
    return { cil: 'jiny', kam };
  } catch {
    return { cil: 'ne', kam: 'jina' };
  }
}

/** Jen čtení. Nic nezakládá a nikomu neposílá. */
export async function vypisPotvrzeni(store?: ProcessStore, overeni = false): Promise<VypisRadku[]> {
  const s = store ?? createProcessStore();
  const user = process.env.IMAP_USER?.trim();
  const pass = process.env.IMAP_HESLO?.trim();
  if (!user || !pass) return [];
  const mails = await fetchRecentInboxMails({ user, pass, days: 2 });
  const odInfoZ = process.env.MAJITEL_PREPOSILA_Z?.trim() || '';
  const out: VypisRadku[] = [];
  const cache = new Map<string, { cil: 'formular' | 'jiny' | 'ne'; kam: 'hotel' | 'mail' | 'jina' }>();
  for (const mail of mails) {
    const telo = `${mail.subject}\n${mail.text}\n${mail.html}`;
    let druh: VypisRadku['druh'] | null = null;
    if (/VIVIEN-DATA/i.test(telo)) druh = 'checkin';
    else if (jePotvrzeniPredmet(mail.subject)) druh = 'potvrzeni';
    else if (jeVyzvaCheckinu(mail.subject)) druh = 'vyzva';
    if (!druh) continue;
    const id = cisloZeSubjectu(mail.subject) || (telo.match(/REZERVACE:\s*(\d{4,})/i) || [])[1] || '';
    const msg = mail.messageId ? await s.getMessage(mail.messageId) : null;
    const rec = id ? await s.getRezervace(id) : null;
    let vysledek: { cil: 'formular' | 'jiny' | 'ne'; kam: 'hotel' | 'mail' | 'jina' } | null = null;
    if (overeni && rec?.checkinUrl) {
      vysledek = cache.get(rec.checkinUrl) || (await cilOdkazu(rec.checkinUrl));
      cache.set(rec.checkinUrl, vysledek);
    }
    out.push({
      rezervace: id || '-',
      druh,
      odInfo: jeMailMajitele(mail.from, odInfoZ),
      stavMailu: msg?.status || 'nezpracovano',
      duvod: msg?.reason || '',
      stavRadku: rec?.stav || 'chybi',
      apartman: rec?.apartman || 'chybi',
      jmeno: !rec?.jmeno ? 'chybi' : jeSpatneJmenoPotvrzeni(rec.jmeno, mail.subject) ? 'spatne' : 'ano',
      odjezd: rec?.odjezd ? 'ano' : 'ne',
      odkaz: rec?.checkinUrl ? 'ano' : 'ne',
      jazyk: rec?.jazyk || 'chybi',
      doplneno: rec?.historie.some((h) => h.co.startsWith('Doplněno z check-inu')) ? 'ano' : 'ne',
      ...(vysledek ? { cil: vysledek.cil, kam: vysledek.kam } : {}),
    });
  }
  return out;
}

function kodNarodnosti(raw: string | null | undefined): string {
  if (!raw?.trim()) return 'chybi';
  const code = raw
    .trim()
    .toUpperCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '');
  if (!code || code.length > 24) return 'nezname';
  return code;
}

function maMadarskyTelefon(ulozeny: string | null | undefined): boolean {
  let c = (ulozeny || '').replace(/\D/g, '');
  if (c.startsWith('00')) c = c.slice(2);
  return c.startsWith('36') || /^06\d{8,9}$/.test(c);
}

const MADARSKA = new Set(['HUN', 'HU', 'HUNGARY', 'MAGYAR', 'MAGYARORSZAG']);

function jeMadarskySignal(jazyk: string | null | undefined, narodnost: string, predvolba: '36' | 'jina'): boolean {
  return jazyk === 'hu' || MADARSKA.has(narodnost) || predvolba === '36';
}

/** Jen signál maďarské hostky. Bez jména, e-mailu a telefonu. */
export async function vypisMadarsko(store?: ProcessStore): Promise<{
  zaznamy: { rezervace: string; jazyk: string; narodnost: string; predvolba: '36' | 'jina'; stav: string; apartman: string }[];
  maily: {
    rezervace: string;
    jazykMailu: string;
    jazykRadku: string;
    narodnost: string;
    predvolba: '36' | 'jina';
    stavMailu: string;
    doplniloBy: 'ano' | 'ne';
  }[];
  prohledano: number;
}> {
  const s = store ?? createProcessStore();
  const zaznamy: {
    rezervace: string;
    jazyk: string;
    narodnost: string;
    predvolba: '36' | 'jina';
    stav: string;
    apartman: string;
  }[] = [];
  for (const { record } of await s.listRezervace()) {
    const narodnost = kodNarodnosti(record.narodnost);
    const predvolba = maMadarskyTelefon(record.telefon) || maMadarskyTelefon(record.telefonRezervace) || maMadarskyTelefon(record.telefonPuvodni) || maMadarskyTelefon(record.telefonRezervacePuvodni) ? '36' : 'jina';
    if (!jeMadarskySignal(record.jazyk, narodnost, predvolba)) continue;
    zaznamy.push({
      rezervace: record.rezervace,
      jazyk: record.jazyk || 'chybi',
      narodnost: MADARSKA.has(narodnost) ? narodnost : narodnost === 'chybi' ? 'chybi' : 'jina',
      predvolba,
      stav: record.stav,
      apartman: record.apartman || 'chybi',
    });
  }

  const maily: {
    rezervace: string;
    jazykMailu: string;
    jazykRadku: string;
    narodnost: string;
    predvolba: '36' | 'jina';
    stavMailu: string;
    doplniloBy: 'ano' | 'ne';
  }[] = [];
  let prohledano = 0;
  const user = process.env.IMAP_USER?.trim();
  const pass = process.env.IMAP_HESLO?.trim();
  if (user && pass) {
    const fetched = await fetchRecentInboxMails({ user, pass, days: 14 });
    for (const mail of fetched) {
      const telo = `${mail.subject}\n${mail.text}\n${mail.html}`;
      if (!/VIVIEN-DATA/i.test(telo)) continue;
      prohledano += 1;
      const ins = inspectVivienMail(bodyForParse(mail), mail.subject);
      const narodnost = kodNarodnosti(ins.narodnost);
      const surovyTelefon = telo.match(/GUEST_PHONE:\s*([^\n\r<]{1,40})/i)?.[1] || ins.telefon;
      const predvolba = maMadarskyTelefon(surovyTelefon) ? '36' : 'jina';
      const textem = /magyar|hungary|\bHUN\b/i.test(telo);
      if ((!jeMadarskySignal(ins.jazyk, narodnost, predvolba) && !textem) || !ins.rezervace) continue;
      const rec = await s.getRezervace(ins.rezervace);
      const msg = mail.messageId ? await s.getMessage(mail.messageId) : null;
      maily.push({
        rezervace: ins.rezervace,
        jazykMailu: ins.jazyk || 'chybi',
        jazykRadku: rec?.jazyk || 'chybi',
        narodnost: MADARSKA.has(narodnost) ? narodnost : narodnost === 'chybi' ? 'chybi' : 'jina',
        predvolba,
        stavMailu: msg?.status || 'nezpracovano',
        doplniloBy: rec && coSeZmenilo(rec, udajeZMailu(ins, rec)).length ? 'ano' : 'ne',
      });
    }
  }
  return { zaznamy, maily, prohledano };
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
    let item: ProcessItem;
    try {
      item = await processOneMail(mail, store);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'chyba';
      const id = cisloZeSubjectu(mail.subject) || undefined;
      summary.errors += 1;
      summary.items.push({ status: 'error', reason, rezervace: id });
      try {
        const now = new Date().toISOString();
        if (id) {
          const prev = await store.getRezervace(id);
          if (prev) {
            const veta = 'E-mail se nepodařilo zpracovat.';
            const duvody = prev.duvody.some((d) => d.veta === veta)
              ? prev.duvody
              : [...prev.duvody, duvod('neuplne', veta)];
            await store.setRezervace(id, sloucit(id, prev, { duvody }, now, veta));
          }
        }
        if (mail.messageId) {
          await store.markMessage({
            messageId: mail.messageId,
            uid: mail.uid,
            processedAt: now,
            rezervace: id,
            status: 'error',
            reason: reason.slice(0, 180),
          });
        }
      } catch {
        /* chyba zápisu nesmí shodit další maily */
      }
      continue;
    }
    if (item.status === 'already_done') continue;
    summary.items.push(item);
    if (item.status === 'sent') summary.sent += 1;
    else if (
      item.status === 'skipped_no_data' ||
      item.status === 'skipped_past' ||
      item.status === 'neodeslano' ||
      item.status === 'bez_checkinu' ||
      item.status === 'zruseno' ||
      item.status === 'zmena'
    ) {
      summary.skipped += 1;
    } else if (item.status === 'rejected') summary.rejected += 1;
    else if (item.status === 'duplicate') summary.duplicate += 1;
    else if (item.status === 'error' || item.status === 'vraceno') summary.errors += 1;
  }

  return summary;
}
