import { odkazNaPruvodce } from './posli-pruvodce';
import { dnesVPraze, radkyBezPadu, radekZRezervace, type PrehledRadek } from './prehled';
import type { ProcessStore, RezervaceRecord } from './store';
import { chybejiciKroky } from './vstup-pruvodce';
import { polozkyZRezervace } from './odjezd';
import { zpravyMenu } from './whatsapp-zprava';

export function sOdkazem(row: PrehledRadek, rec: RezervaceRecord, now = new Date()): PrehledRadek {
  let odkaz: string | null = null;
  try {
    odkaz = odkazNaPruvodce(rec);
  } catch {
    odkaz = null;
  }
  const kroky = chybejiciKroky({
    cas: rec.casPrijezdu,
    zpusob: rec.zpusobPrijezdu,
    telefonBrana: rec.telefonBrana,
    spz: rec.spz,
    spzPujcene: Boolean(rec.spzPujcene),
    souhlas: Boolean(rec.souhlasPravidel),
  });
  const zpravy = zpravyMenu({
    stav: rec.stav,
    lang: rec.jazyk,
    zdroj: rec.zdroj,
    pruvodce: odkaz,
    checkinUrl: rec.checkinUrl,
    otevrenoPocet: rec.otevrenoPocet,
    casPrijezdu: rec.casPrijezdu,
    prijezd: rec.prijezd,
    dnes: dnesVPraze(now),
    chybi: kroky,
    branaChybi: rec.zpusobPrijezdu === 'auto' && (!rec.telefonBrana || (!rec.spz && !rec.spzPujcene)),
    zpusob: rec.zpusobPrijezdu,
    souhlas: Boolean(rec.souhlasPravidel),
    naMiste: Boolean(rec.naMiste),
    predano: rec.predano || '',
    odjezd: rec.odjezd,
    casOdjezdu: rec.casOdjezdu,
    dluh: polozkyZRezervace(rec),
  });
  return { ...row, odkaz, zpravy, zprava: zpravy.find((z) => z.vychozi)?.text || '' };
}

export async function buildPrehledSOdkazy(store: ProcessStore, now = new Date()): Promise<PrehledRadek[]> {
  const entries = await store.listRezervace();
  return radkyBezPadu(entries, now, (record) => sOdkazem(radekZRezervace(record), record, now));
}
