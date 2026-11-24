/**
 * Ruční uvolnění nocí pro poptávku.
 * Better Hotel může zůstat zablokovaný (Booking / svět).
 * U nás se noc ukáže jako volná, dokud ji nezaplní skutečná rezervace nebo blokace poptávky.
 */
import { zajistiDen, type KalendarDenni } from './kalendar-denni';
import { kalendarKlic } from './kalendar-klic';
import type { ProcessStore } from './store';
import { APT_IDS, type AptId } from './types';

export const KLIC_KALENDAR_UVOLNENI = 'kalendar-uvolneni';

export type KalendarUvolneni = Partial<Record<AptId, string[]>>;

export function nactiUvolneniRaw(raw: unknown): KalendarUvolneni {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  const out: KalendarUvolneni = {};
  for (const apt of APT_IDS) {
    const arr = o[apt];
    if (!Array.isArray(arr)) continue;
    const dny = [
      ...new Set(
        arr.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)),
      ),
    ].sort();
    if (dny.length) out[apt] = dny;
  }
  return out;
}

export async function nactiKalendarUvolneni(store: ProcessStore): Promise<KalendarUvolneni> {
  const raw = await store.getKv(kalendarKlic(KLIC_KALENDAR_UVOLNENI));
  if (!raw) return {};
  try {
    return nactiUvolneniRaw(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function ulozKalendarUvolneni(store: ProcessStore, data: KalendarUvolneni): Promise<void> {
  await store.setKv(kalendarKlic(KLIC_KALENDAR_UVOLNENI), JSON.stringify(nactiUvolneniRaw(data)));
}

/** Přidá noci k uvolnění (nesmaže ostatní). */
export async function pridejUvolneni(
  store: ProcessStore,
  polozky: { apt: AptId; den: string }[],
): Promise<KalendarUvolneni> {
  const cur = await nactiKalendarUvolneni(store);
  for (const p of polozky) {
    if (!APT_IDS.includes(p.apt)) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.den)) continue;
    const set = new Set(cur[p.apt] || []);
    set.add(p.den);
    cur[p.apt] = [...set].sort();
  }
  await ulozKalendarUvolneni(store, cur);
  return cur;
}

/** Po iCal: tyto noci označ volné. Rezervace / blokace poptávky se aplikují až potom. */
export function aplikujUvolneni(dny: KalendarDenni, uvolneni: KalendarUvolneni): KalendarDenni {
  const out: KalendarDenni = { ...dny };
  for (const apt of APT_IDS) {
    for (const den of uvolneni[apt] || []) {
      const d = zajistiDen(out, den);
      d[apt] = { ...d[apt], obsazeno: false };
    }
  }
  return out;
}
