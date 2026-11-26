/**
 * Kdy se ptát na jazyk před nabídkou plochy / průvodcem.
 * Známe = neptáme se. Neznáme = nejdřív jazyk, pak plocha.
 */

import { jeBookingZdroj } from './klub-karta-predana';
import { GUIDE_LANGS, type GuideLang } from './types';

export function jazykHostaJeZnamy(opts: {
  jazyk?: string | null;
  zdroj?: string | null;
  email?: string | null;
}): boolean {
  const j = (opts.jazyk || '').trim();
  if (j && GUIDE_LANGS.includes(j as GuideLang)) return true;
  /** Booking/Airbnb: jazyk z check-inu / odkazu bereme jako známý. */
  if (jeBookingZdroj(opts.zdroj, opts.email)) return true;
  return false;
}

export function klicJazykHostaPotvrzen(rezervace: string | null | undefined): string {
  return `vivien-jazyk-ok:${(rezervace || 'x').trim() || 'x'}`;
}
