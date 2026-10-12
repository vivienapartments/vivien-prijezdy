import { odkazNaPruvodce } from './posli-pruvodce';
import { dnesVPraze, radekZRezervace, seradRadky, type PrehledRadek } from './prehled';
import type { ProcessStore, RezervaceRecord } from './store';
import { zpravyMenu } from './whatsapp-zprava';

export function sOdkazem(row: PrehledRadek, rec: RezervaceRecord, now = new Date()): PrehledRadek {
  let odkaz: string | null = null;
  try {
    odkaz = odkazNaPruvodce(rec);
  } catch {
    odkaz = null;
  }
  const zpravy = zpravyMenu({
    stav: rec.stav,
    lang: rec.jazyk,
    zdroj: rec.zdroj,
    pruvodce: odkaz,
    otevrenoPocet: rec.otevrenoPocet,
    casPrijezdu: rec.casPrijezdu,
    prijezd: rec.prijezd,
    dnes: dnesVPraze(now),
  });
  return { ...row, odkaz, zpravy, zprava: zpravy[0]?.text || '' };
}

export async function buildPrehledSOdkazy(store: ProcessStore, now = new Date()): Promise<PrehledRadek[]> {
  const entries = await store.listRezervace();
  return seradRadky(
    entries.map(({ record }) => sOdkazem(radekZRezervace(record), record, now)),
    now,
  );
}
