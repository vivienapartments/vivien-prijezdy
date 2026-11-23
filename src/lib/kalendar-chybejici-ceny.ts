import { denPraha } from './brana';
import { APT_IDS } from './types';
import { nactiUlozenyKalendar } from './kalendar-uloziste';
import { kalendarKlic } from './kalendar-klic';
import type { ProcessStore } from './store';
import { posliTelegram } from './telegram';

const KLIC_POSLEDNI = 'kalendar-chybi-cena-upozorneni';

function posunYmd(ymd: string, dnu: number): string {
  const t = Date.parse(`${ymd}T12:00:00Z`) + dnu * 86_400_000;
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Jednou denně majiteli do Telegramu: „Chybí cena: {apartmán} {datum}“.
 * Jen budoucí noci (včetně dneška), kde apartmán není obsazený a cena chybí.
 */
export async function upozorniChybejiciCeny(
  store: ProcessStore,
  now = new Date(),
): Promise<number> {
  const dnes = denPraha(now);
  const klic = kalendarKlic(KLIC_POSLEDNI);
  const minule = await store.getKv(klic);
  if (minule === dnes) return 0;

  const { dny } = await nactiUlozenyKalendar(store);
  const ymds = Object.keys(dny)
    .filter((d) => d >= dnes)
    .sort();
  if (!ymds.length) {
    await store.setKv(klic, dnes);
    return 0;
  }

  const radky: string[] = [];
  const konec = posunYmd(dnes, 400);
  for (const ymd of ymds) {
    if (ymd > konec) break;
    const den = dny[ymd];
    if (!den) continue;
    for (const apt of APT_IDS) {
      const b = den[apt];
      if (!b || b.obsazeno) continue;
      if (typeof b.cena === 'number' && b.cena > 0) continue;
      radky.push(`Chybí cena: ${apt} ${ymd}`);
    }
  }

  if (!radky.length) {
    await store.setKv(klic, dnes);
    return 0;
  }

  const text = radky.slice(0, 40).join('\n');
  const ok = await posliTelegram(text, 'automat', '/prehled');
  if (ok) {
    await store.setKv(klic, dnes);
    return Math.min(radky.length, 40);
  }
  return 0;
}
