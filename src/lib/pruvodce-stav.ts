import { kodyProHosta, type KodRadek } from './kody-pruvodce';
import { predanoRezervace } from './predani';
import type { ProcessStore, RezervaceRecord } from './store';
import { verifyToken } from './token';
import type { GuideLang } from './types';

export type StavPruvodce =
  | { ok: false }
  | { ok: true; predano: false; kody: null }
  | { ok: true; predano: true; kody: KodRadek[] };

/**
 * Jen čtení. Otevření se nepočítá a majiteli nic neposílá.
 * Bez předání v odpovědi žádný kód není.
 */
export async function nactiStavPruvodce(
  store: ProcessStore,
  token: string,
  now?: Date,
): Promise<StavPruvodce> {
  let overeni;
  try {
    overeni = verifyToken(token, undefined, now);
  } catch {
    return { ok: false };
  }
  if (!overeni.ok) return { ok: false };

  const { a, l, i, r } = overeni.payload;
  const predano = await predanoRezervace(store, r);
  if (!predano) return { ok: true, predano: false, kody: null };
  const kody = kodyProHosta(true, a, i ?? null, l as GuideLang);
  if (!kody) return { ok: true, predano: false, kody: null };
  return { ok: true, predano: true, kody };
}

/** Ukázka jen na tomto počítači. Na ostrém webu parametr nic neotevře. */
export function jeUkazkaPruvodce(param: string | undefined): boolean {
  return process.env.NODE_ENV !== 'production' && param === '1';
}

/**
 * Bez přihlášení nic, ani když záznam existuje.
 * Ukázka čte jen předané ukázkové řádky, ne ostré úložiště.
 */
export async function rezervaceProMajitele(opts: {
  prihlasen: boolean;
  id: string;
  ukazka: boolean;
  store: ProcessStore;
  ukazkove?: RezervaceRecord[];
}): Promise<RezervaceRecord | null> {
  const id = opts.id.trim();
  if (!id) return null;
  if (opts.ukazka) {
    return (opts.ukazkove ?? []).find((r) => r.rezervace === id) ?? null;
  }
  if (!opts.prihlasen) return null;
  return (await opts.store.getRezervace(id)) ?? null;
}
