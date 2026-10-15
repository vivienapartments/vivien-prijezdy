import { hlavickaMaAdresu, jeMailMajitele } from './email-origin';
import type { InboxMail } from './inbox-mail';
import { cisloZVyzvy, jeVyzvaCheckinu, odkazCheckinuZVyzvy } from './potvrzeni-rezervace';
import { maRucni } from './rucni-pole';
import type { ProcessStore, RezervaceRecord } from './store';

export const HISTORIE_ODKAZU = 'Odkaz na check-in doplněn ze schránky';

export type RadekOdkazu = {
  rezervace: string;
  host: string;
  nalezen: 'ano' | 'ne';
  naKarte: 'ano' | 'ne' | 'není';
  stane: string;
};

function jeVyzvaProSchranku(mail: InboxMail, majitel: string): boolean {
  if (!jeVyzvaCheckinu(mail.subject)) return false;
  const telo = `${mail.subject}\n${mail.text}\n${mail.html}`;
  if (/VIVIEN-DATA/i.test(telo)) return false;
  const odInfo = jeMailMajitele(mail.from, majitel) || hlavickaMaAdresu(mail.to || '', majitel);
  const from = mail.from.toLowerCase();
  const auth = (mail.authenticationResults || '').toLowerCase();
  const odHotel =
    (from.includes('better-hotel.com') || from.includes('betterhotel')) &&
    (mail.dkimBetterHotel === true || /dkim=pass[^;]*header\.d=better-hotel\.com/.test(auth));
  return odInfo || odHotel;
}

/** Číslo rezervace a nalezený odkaz. Když výzva odkaz nemá, hodnota je null. */
export function odkazyZVyzvy(mails: InboxMail[], majitel: string): Map<string, string | null> {
  const mapa = new Map<string, string | null>();
  for (const mail of mails) {
    if (!jeVyzvaProSchranku(mail, majitel)) continue;
    const id = cisloZVyzvy(mail.subject, mail.html, mail.text);
    if (!id) continue;
    const url = odkazCheckinuZVyzvy(mail.html, mail.text);
    if (url) mapa.set(id, url);
    else if (!mapa.has(id)) mapa.set(id, null);
  }
  return mapa;
}

function hostZ(rec: RezervaceRecord | undefined): string {
  return rec?.jmeno?.replace(/\s+/g, ' ').trim() || 'bez jména';
}

export function planOdkazu(mails: InboxMail[], radky: RezervaceRecord[], majitel: string): RadekOdkazu[] {
  const mapa = odkazyZVyzvy(mails, majitel);
  const podleId = new Map(radky.map((r) => [r.rezervace, r]));
  const out: RadekOdkazu[] = [];
  for (const [id, url] of mapa) {
    const rec = podleId.get(id);
    let stane = 'odkaz v mailu není';
    if (url && !rec) stane = 'řádek není, nezaloží se';
    else if (url && rec && maRucni(rec, 'checkinUrl')) stane = 'ruční odkaz zůstane';
    else if (url && rec?.checkinUrl) stane = 'na kartě už je, zůstane';
    else if (url && rec) stane = 'doplní se';
    out.push({
      rezervace: id,
      host: hostZ(rec),
      nalezen: url ? 'ano' : 'ne',
      naKarte: !rec ? 'není' : rec.checkinUrl ? 'ano' : 'ne',
      stane,
    });
  }
  out.sort((a, b) => a.rezervace.localeCompare(b.rezervace, 'cs'));
  return out;
}

/** Zapíše odkaz jen na kartu, kde žádný není. Ruční odkaz nechá. Nikomu neposílá. */
export async function doplnOdkazyZeSchranky(
  store: ProcessStore,
  mails: InboxMail[],
  majitel: string,
): Promise<{ radky: RadekOdkazu[]; doplneno: { rezervace: string; host: string }[] }> {
  const mapa = odkazyZVyzvy(mails, majitel);
  const seznam = (await store.listRezervace()).map((r) => r.record);
  const plan = planOdkazu(mails, seznam, majitel);
  const doplneno: { rezervace: string; host: string }[] = [];
  const now = new Date().toISOString();
  for (const radek of plan) {
    if (radek.stane !== 'doplní se') continue;
    const url = mapa.get(radek.rezervace);
    if (!url) continue;
    const rec = await store.getRezervace(radek.rezervace);
    if (!rec || rec.checkinUrl || maRucni(rec, 'checkinUrl')) continue;
    await store.setRezervace(rec.rezervace, {
      ...rec,
      checkinUrl: url,
      historie: [...rec.historie, { cas: now, co: HISTORIE_ODKAZU }].slice(-40),
    });
    radek.stane = 'doplněno';
    radek.naKarte = 'ano';
    doplneno.push({ rezervace: rec.rezervace, host: hostZ(rec) });
  }
  return { radky: plan, doplneno };
}
