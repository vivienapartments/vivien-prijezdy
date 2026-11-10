import { kandidatOpravyPoplatkuBooking, POPLATEK_BOOKING_OD_REZ } from './poplatek';
import { maRucni } from './rucni-pole';
import type { ProcessStore, RezervaceRecord } from './store';

const MIGRACE_ID = 'migrace-poplatek-booking-625';

/** Automatická karta Booking od Bennett, kterou máme přepsat na „ne“. Ruční volbu necháme. */
export function maOpravitPoplatekBooking(rec: RezervaceRecord): boolean {
  if (maRucni(rec, 'poplatek')) return false;
  return kandidatOpravyPoplatkuBooking(rec);
}

export function vetaOpravyPoplatkuBooking(rec: RezervaceRecord): string {
  const zaklad = `Poplatek: v ceně (Booking od ${POPLATEK_BOOKING_OD_REZ})`;
  if (rec.zaplaceno) return `${zaklad}. Už zapsané platby zůstávají.`;
  return zaklad;
}

/** Přepíše kandidáty na „ne“. Nic jiného nemění. Vrací čísla rezervací. */
export async function opravPoplatkyBooking(
  store: ProcessStore,
  nowIso = new Date().toISOString(),
): Promise<{ opraveno: number; rezervace: string[] }> {
  const vse = await store.listRezervace();
  const rezervace: string[] = [];
  for (const { id, record, chybaNahrani } of vse) {
    if (chybaNahrani || !record) continue;
    if (!maOpravitPoplatekBooking(record)) continue;
    await store.setRezervace(id, {
      ...record,
      poplatek: 'ne',
      historie: [...record.historie, { cas: nowIso, co: vetaOpravyPoplatkuBooking(record) }].slice(-40),
    });
    rezervace.push(record.rezervace || id);
  }
  return { opraveno: rezervace.length, rezervace };
}

/**
 * Jednou po nasazení. Druhé volání už nic nezapíše a vrátí null.
 * Spouští se z přehledu nebo z cronu /api/zpracuj.
 */
export async function migracePoplatkuBookingJednou(
  store: ProcessStore,
  nowIso = new Date().toISOString(),
): Promise<number | null> {
  if (await store.isMessageProcessed(MIGRACE_ID)) return null;
  const { opraveno } = await opravPoplatkyBooking(store, nowIso);
  await store.markMessage({
    messageId: MIGRACE_ID,
    processedAt: nowIso,
    status: 'skipped_no_data',
    reason: `opraveno:${opraveno}`,
  });
  return opraveno;
}
