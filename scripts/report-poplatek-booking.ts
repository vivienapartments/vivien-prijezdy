/**
 * Read-only kontrolní report: Booking rezervace od Sarah Bennett (120260625)
 * včetně, kde uložený poplatek ještě říká „ano“ nebo „neznamo“.
 * Nic nezapisuje. Nic nenasazuje.
 *
 * Spuštění: npx tsx scripts/report-poplatek-booking.ts
 */
import { config } from 'dotenv';
import path from 'path';
import {
  POPLATEK_BOOKING_OD_REZ,
  kandidatOpravyPoplatkuBooking,
  poplatekProRezervaci,
} from '../src/lib/poplatek';
import { maRucni } from '../src/lib/rucni-pole';
import { createProcessStore } from '../src/lib/store';

config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  const store = createProcessStore();
  const list = await store.listRezervace();
  const kandidati = list
    .filter((e) => !e.chybaNahrani)
    .map((e) => e.record)
    .filter((r) => kandidatOpravyPoplatkuBooking(r))
    .sort((a, b) => a.rezervace.localeCompare(b.rezervace));

  console.log(`Hranice Booking: ${POPLATEK_BOOKING_OD_REZ} (Sarah Bennett včetně)`);
  console.log(`Prohledáno karet: ${list.length}`);
  console.log(`Kandidáti (Booking ≥ ${POPLATEK_BOOKING_OD_REZ}, poplatek ano/neznamo): ${kandidati.length}`);
  console.log('');

  if (!kandidati.length) {
    console.log('Žádný kandidát. Uložené Booking karty od Bennett už mají „ne“, nebo v úložišti nejsou.');
    return;
  }

  for (const r of kandidati) {
    const navrh = poplatekProRezervaci(r);
    const rucni = maRucni(r, 'poplatek');
    const zaplaceno = r.zaplaceno ? `zaplaceno ${r.zaplaceno}` : 'nezaplaceno';
    console.log(
      [
        `#${r.rezervace}`,
        r.jmeno || 'bez jména',
        r.zdroj || 'bez zdroje',
        `uloženo=${r.poplatek}`,
        `navrh=${navrh}`,
        rucni ? 'RUČNÍ' : 'automat',
        r.vytvoreno || 'bez data',
        r.prijezd || 'bez příjezdu',
        zaplaceno,
        r.stav,
      ].join(' | '),
    );
  }

  console.log('');
  console.log('Poznámka: skript nic nezměnil. Opravu po schválení udělá samostatný krok.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
