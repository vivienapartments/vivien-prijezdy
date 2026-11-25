/**
 * Pomocníci párování doporučitele ↔ rezervace (dávka 5).
 */

import { nactiDoporuceni, seznamDoporuceniIds } from './doporuceni';
import { doporuceniKlic } from './doporuceni-klic';
import type { ProcessStore, RezervaceRecord } from './store';
import { normalizujTelefon } from './telefon';

export async function listKodyDoporucitelu(store: ProcessStore): Promise<string[]> {
  const raw = await store.getKv(doporuceniKlic('dop-seznam'));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Najde kód doporučitele pro rezervaci (přes doporuceni:* nebo kontakt). */
export async function najdiKodDoporuciteleProRezervaci(
  store: ProcessStore,
  rec: RezervaceRecord,
): Promise<string | null> {
  const ids = await seznamDoporuceniIds(store);
  const telRec =
    normalizujTelefon(rec.telefon, rec.narodnost)?.ulozeny ||
    normalizujTelefon(rec.telefonRezervace, rec.narodnost)?.ulozeny ||
    '';
  const emailRec = (rec.emailHosta || '').trim().toLowerCase();

  for (const id of ids) {
    const d = await nactiDoporuceni(store, id);
    if (!d || d.stav === 'zamitnuto') continue;
    if (d.rezervace === rec.rezervace) return d.kod;
    const telDop = normalizujTelefon(d.telefon, null)?.ulozeny || '';
    if (telRec && telDop && telRec === telDop) return d.kod;
    const emailDop = (d.email || '').trim().toLowerCase();
    if (emailRec && emailDop && emailRec === emailDop) return d.kod;
  }
  return null;
}
