import { odkazNaPruvodce } from './posli-pruvodce';
import { radekZRezervace, seradRadky, type PrehledRadek } from './prehled';
import type { ProcessStore, RezervaceRecord } from './store';
import { zpravaHostovi } from './whatsapp-zprava';

export function sOdkazem(row: PrehledRadek, rec: RezervaceRecord): PrehledRadek {
  let odkaz: string | null = null;
  try {
    odkaz = odkazNaPruvodce(rec);
  } catch {
    odkaz = null;
  }
  return { ...row, odkaz, zprava: zpravaHostovi(rec.jazyk, odkaz) };
}

export async function buildPrehledSOdkazy(store: ProcessStore, now = new Date()): Promise<PrehledRadek[]> {
  const entries = await store.listRezervace();
  return seradRadky(
    entries.map(({ record }) => sOdkazem(radekZRezervace(record), record)),
    now,
  );
}
