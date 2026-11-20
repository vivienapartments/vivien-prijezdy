/**
 * Po odeslání e-mailu s průvodcem: upozornit majitele, ať pošle WhatsApp (klepnutím).
 * Skutečné API WhatsApp ještě není. Text hostovi = Průvodce · po e-mailu (varianta B).
 */

import { odkazKarty } from './prehled-odkaz';
import { textUpozorneniPoPruvodci } from './pruvodce-wa-stav';
import type { ProcessStore, RezervaceRecord } from './store';
import { upozorniMajitele } from './upozorneni';

export {
  cekaWhatsAppPoPruvodci,
  jeOdeslaniPruvodceEmail,
  textUpozorneniPoPruvodci,
} from './pruvodce-wa-stav';

/** Push + Telegram. Selhání neblokuje odeslání e-mailu. */
export async function upozorniPoOdeslaniPruvodce(
  store: ProcessStore,
  rec: RezervaceRecord,
): Promise<void> {
  if (process.env.VITEST) return;
  try {
    await upozorniMajitele(
      store,
      textUpozorneniPoPruvodci(rec),
      odkazKarty(rec.rezervace, null, { zprava: 'pruvodceEmail' }),
      { telegram: 'automat' },
    );
  } catch (err) {
    console.error(
      'Pruvodce WA upozorneni selhalo',
      err instanceof Error ? err.message : err,
    );
  }
}
