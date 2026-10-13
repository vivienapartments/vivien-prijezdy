import type { ProcessStore, RezervaceRecord } from './store';

const MIGRACE_ID = 'migrace-predani-16';

/**
 * Host, který přijel před dneškem a ještě neodjel, už bydlel.
 * Dnešní a pozdější příjezd zůstane nepředaný. Zrušená rezervace taky.
 */
export function maDostatPredani(rec: RezervaceRecord, dnes: string): boolean {
  if (rec.predano) return false;
  if (rec.stav === 'zruseno') return false;
  if (!rec.prijezd || !/^\d{4}-\d{2}-\d{2}$/.test(rec.prijezd)) return false;
  if (rec.prijezd >= dnes) return false;
  if (rec.odjezd && /^\d{4}-\d{2}-\d{2}$/.test(rec.odjezd) && rec.odjezd < dnes) return false;
  return true;
}

/** Kolik záznamů by se označilo. Nic nezapisuje. */
export function spocitejPredani(zaznamy: RezervaceRecord[], dnes: string): number {
  return zaznamy.filter((rec) => maDostatPredani(rec, dnes)).length;
}

export async function oznacUbystovane(store: ProcessStore, dnes: string, nowIso: string): Promise<number> {
  const vse = await store.listRezervace();
  let n = 0;
  for (const { id, record } of vse) {
    if (!maDostatPredani(record, dnes)) continue;
    await store.setRezervace(id, {
      ...record,
      predano: nowIso,
      historie: [...record.historie, { cas: nowIso, co: 'Předáno, host už bydlel' }].slice(-40),
    });
    n += 1;
  }
  return n;
}

/** Jednou po nasazení. Druhé volání už nic nezapíše a vrátí null. */
export async function migracePredaniJednou(
  store: ProcessStore,
  dnes: string,
  nowIso: string,
): Promise<number | null> {
  if (await store.isMessageProcessed(MIGRACE_ID)) return null;
  const n = await oznacUbystovane(store, dnes, nowIso);
  await store.markMessage({
    messageId: MIGRACE_ID,
    processedAt: nowIso,
    status: 'skipped_no_data',
    reason: `oznaceno:${n}`,
  });
  return n;
}

/** Když úložiště nejde přečíst, bereme to jako nepředáno. Kódy se neukážou. */
export async function predanoRezervace(store: ProcessStore, id: string): Promise<boolean> {
  try {
    const rec = await store.getRezervace(id);
    return Boolean(rec?.predano);
  } catch {
    return false;
  }
}
