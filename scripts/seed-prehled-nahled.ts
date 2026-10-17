/**
 * Vymyšlené rezervace jen pro náhled /prehled. Nic nevypisuje.
 */
import path from 'path';
import { duvod } from '../src/lib/chyby';
import { FileProcessStore, prazdnaRezervace, type RezervaceRecord } from '../src/lib/store';

const now = '2026-10-10T07:00:00.000Z';
const file = path.join(process.cwd(), '.data', 'prehled-nahled.json');
const store = new FileProcessStore(file);

function zaznam(id: string, patch: Partial<RezervaceRecord>): RezervaceRecord {
  return {
    ...prazdnaRezervace(id, now),
    historie: [{ cas: now, co: 'Ukázkový záznam' }],
    ...patch,
  };
}

async function main(): Promise<void> {
  const radky: RezervaceRecord[] = [
    zaznam('9001', {
      stav: 'odeslano',
      apartman: 'V1',
      prijezd: '2026-10-10',
      odjezd: '2026-10-12',
      noci: 2,
      osob: 2,
      jazyk: 'cs',
      jmeno: 'Anna Ukázková',
      emailHosta: 'anna.ukazka@example.com',
      odeslaneMessageId: 'nahled-9001@example.test',
    }),
    zaznam('9002', {
      stav: 'odeslano_s_vyhradou',
      apartman: 'V2',
      prijezd: '2026-10-10',
      odjezd: '2026-10-13',
      noci: 3,
      osob: null,
      jazyk: 'de',
      jmeno: 'Petr Ukázkový',
      emailHosta: 'petr.ukazka@example.com',
      duvody: [duvod('chybi_osoby')],
    }),
    zaznam('9003', {
      stav: 'neodeslano',
      apartman: 'V3',
      prijezd: '2026-10-10',
      odjezd: '2026-10-11',
      noci: 1,
      osob: 1,
      jazyk: 'cs',
      jmeno: 'Eva Ukázková',
      emailHosta: null,
      duvody: [duvod('chybi_email')],
    }),
    zaznam('9004', {
      stav: 'vraceno',
      apartman: 'V4',
      prijezd: '2026-10-11',
      odjezd: '2026-10-14',
      noci: 3,
      osob: 2,
      jazyk: 'en',
      jmeno: 'Jan Ukázkový',
      emailHosta: 'jan.ukazka@example.com',
      duvody: [duvod('nedoruceno', '550 mailbox unavailable')],
    }),
    zaznam('9005', {
      stav: 'zruseno',
      apartman: 'V5',
      prijezd: '2026-10-15',
      odjezd: '2026-10-17',
      noci: 2,
      osob: 2,
      jazyk: 'cs',
      jmeno: 'Lucie Ukázková',
      emailHosta: 'lucie.ukazka@example.com',
    }),
    zaznam('9006', {
      stav: 'bez_checkinu',
      apartman: 'V1',
      prijezd: '2026-10-18',
      odjezd: '2026-10-20',
      noci: 2,
      osob: 3,
      jazyk: 'pl',
      jmeno: 'Pavel Ukázkový',
      emailHosta: 'pavel.ukazka@example.com',
    }),
  ];

  for (const rec of radky) {
    await store.setRezervace(rec.rezervace, rec);
  }
  console.log(`nahled-zaznamu:${radky.length}`);
}

main();
