/**
 * Kontext slevy pro stránku poptávky (server → klient).
 */

import { nactiKlientPodleId } from './klient-karta';
import { klubZapnut } from './klub-klic';
import type { PoptavkaZdroj } from './poptavka';
import { jeRelayEmail } from './staly-host';
import type { ProcessStore } from './store';
import { normalizujTelefon } from './telefon';

export type KlubPoptavkaKontext = {
  zapnuto: boolean;
  utrataKc: number;
  kreditKc: number;
  maDokoncenyPobyt: boolean;
  jeFirma: boolean;
  jeDoporucitelBezPobytu: boolean;
  klientId: string | null;
};

export const PRAZDNY_KLUB_POPTAVKA: KlubPoptavkaKontext = {
  zapnuto: false,
  utrataKc: 0,
  kreditKc: 0,
  maDokoncenyPobyt: false,
  jeFirma: false,
  jeDoporucitelBezPobytu: false,
  klientId: null,
};

export async function nactiKlubPoptavkaKontext(
  store: ProcessStore,
  vstup: {
    zdroj: PoptavkaZdroj;
    rezervace?: string | null;
    email?: string | null;
    telefon?: string | null;
  },
): Promise<KlubPoptavkaKontext> {
  if (!klubZapnut()) return { ...PRAZDNY_KLUB_POPTAVKA, zapnuto: false };

  const { klubKlic } = await import('./klub-klic');
  let id: string | null = null;
  const email = (vstup.email || '').trim().toLowerCase();
  const tel = normalizujTelefon(vstup.telefon, null);
  const telefon = tel && !tel.nejisty ? tel.ulozeny : '';

  const zkus = async (key: string) => {
    const raw = await store.getKv(klubKlic(key));
    if (!raw) return;
    try {
      id = (JSON.parse(raw) as { id?: string }).id || null;
    } catch {
      /* ignore */
    }
  };

  if (vstup.rezervace) await zkus(`klient-index:rez:${vstup.rezervace}`);
  if (!id && telefon) await zkus(`klient-index:tel:${telefon}`);
  if (!id && email && !jeRelayEmail(email)) await zkus(`klient-index:email:${email}`);

  const klient = id ? await nactiKlientPodleId(store, id) : null;
  const maDokoncenyPobyt = Boolean(klient && klient.utrataKc > 0);
  return {
    zapnuto: true,
    utrataKc: klient?.utrataKc || 0,
    kreditKc: klient?.kreditKc || 0,
    maDokoncenyPobyt,
    jeFirma: vstup.zdroj === 'firma' || klient?.typ === 'firma',
    jeDoporucitelBezPobytu: Boolean(
      klient?.role.includes('doporucitel') && !maDokoncenyPobyt,
    ),
    klientId: klient?.id || null,
  };
}
