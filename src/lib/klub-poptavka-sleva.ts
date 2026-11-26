/**
 * Sleva v poptávce (dávka 4): max(délka, osobní) z klub:pravidla + karty.
 * Při KLUB_ZAPNUTO=0 zůstává dnešní 5 % na věrné / doporučené cestě.
 */

import { nactiKlientPodleId, nactiKlubPravidla, type KlientKarta } from './klient-karta';
import { klubZapnut } from './klub-klic';
import {
  slevaDelkaPct,
  slevaOsobniPct,
  vyslednaSlevaPct,
  type KlubPravidla,
} from './klub-pravidla';
import { POPTAVKA_SLEVA_PCT, type PoptavkaZdroj } from './poptavka';
import { jeRelayEmail } from './staly-host';
import type { ProcessStore } from './store';
import { normalizujTelefon } from './telefon';

export type SlevaDuvod =
  | 'delka'
  | 'staly'
  | 'doporuceny'
  | 'firma'
  | 'doporucitel'
  | 'cesta'
  | null;

export type SlevaPoptavkyVysledek = {
  pct: number;
  duvod: SlevaDuvod;
  /** Krátký důvod pod větou o slevě (cs). */
  duvodText: string;
  kreditKc: number;
  klientId: string | null;
};

const DUVOD_TEXT: Record<Exclude<SlevaDuvod, null>, string> = {
  delka: 'za délku pobytu',
  staly: 'jako věrný host',
  doporuceny: 'jako doporučený host',
  firma: 'pro firmu',
  doporucitel: 'jako doporučitel na první pobyt',
  cesta: 'na této cestě',
};

export function textSlevyPobytu(pct: number, duvod: SlevaDuvod): string {
  if (pct <= 0) return '';
  const zaklad = `Na tento pobyt máte slevu ${pct} %`;
  if (!duvod || duvod === 'cesta') return `${zaklad}.`;
  return `${zaklad} (${DUVOD_TEXT[duvod]}).`;
}

/** Dnešní chování bez klubu. */
export function slevaPoptavkyBezKlubu(zdroj: PoptavkaZdroj): SlevaPoptavkyVysledek {
  if (zdroj === 'vernost' || zdroj === 'doporucitel') {
    return {
      pct: POPTAVKA_SLEVA_PCT,
      duvod: 'cesta',
      duvodText: DUVOD_TEXT.cesta,
      kreditKc: 0,
      klientId: null,
    };
  }
  if (zdroj === 'firma') {
    return {
      pct: POPTAVKA_SLEVA_PCT,
      duvod: 'firma',
      duvodText: DUVOD_TEXT.firma,
      kreditKc: 0,
      klientId: null,
    };
  }
  return { pct: 0, duvod: null, duvodText: '', kreditKc: 0, klientId: null };
}

function urciDuvod(
  noci: number,
  osobni: number,
  delka: number,
  vstup: {
    jeFirma?: boolean;
    jeDoporucenyPrvniPobyt?: boolean;
    jeDoporucitelBezPobytu?: boolean;
    maDokoncenyPobyt?: boolean;
  },
): SlevaDuvod {
  if (delka <= 0 && osobni <= 0) return null;
  if (delka >= osobni && delka > 0) return 'delka';
  if (vstup.jeFirma) return 'firma';
  if (vstup.jeDoporucenyPrvniPobyt) return 'doporuceny';
  if (vstup.jeDoporucitelBezPobytu && !vstup.maDokoncenyPobyt) return 'doporucitel';
  if (vstup.maDokoncenyPobyt) return 'staly';
  return osobni > 0 ? 'staly' : null;
}

async function najdiKlient(
  store: ProcessStore,
  opts: { rezervace?: string | null; email?: string | null; telefon?: string | null },
): Promise<KlientKarta | null> {
  const { klubKlic } = await import('./klub-klic');
  const email = (opts.email || '').trim().toLowerCase();
  const tel = normalizujTelefon(opts.telefon, null);
  const telefon = tel && !tel.nejisty ? tel.ulozeny : '';

  if (opts.rezervace) {
    const raw = await store.getKv(klubKlic(`klient-index:rez:${opts.rezervace}`));
    if (raw) {
      try {
        const o = JSON.parse(raw) as { id?: string };
        if (o.id) {
          const k = await nactiKlientPodleId(store, o.id);
          if (k) return k;
        }
      } catch {
        /* ignore */
      }
    }
  }
  for (const [druh, hodnota] of [
    ['tel', telefon],
    ['email', email && !jeRelayEmail(email) ? email : ''],
  ] as const) {
    if (!hodnota) continue;
    const raw = await store.getKv(klubKlic(`klient-index:${druh}:${hodnota}`));
    if (!raw) continue;
    try {
      const o = JSON.parse(raw) as { id?: string };
      if (o.id) {
        const k = await nactiKlientPodleId(store, o.id);
        if (k) return k;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

export async function slevaPoptavkyProHosta(
  store: ProcessStore,
  vstup: {
    zdroj: PoptavkaZdroj;
    noci: number;
    prijezd?: string | null;
    rezervace?: string | null;
    email?: string | null;
    telefon?: string | null;
    /** Už má doporučení (cesta ?od=) a ještě nemá vlastní pobyt. */
    jeDoporucenyPrvniPobyt?: boolean;
  },
  pravidlaIn?: KlubPravidla,
): Promise<SlevaPoptavkyVysledek> {
  if (!klubZapnut()) return slevaPoptavkyBezKlubu(vstup.zdroj);

  const pravidla = pravidlaIn || (await nactiKlubPravidla(store));
  const klient = await najdiKlient(store, vstup);
  const maDokoncenyPobyt = Boolean(klient && klient.utrataKc > 0);
  const jeFirma = vstup.zdroj === 'firma' || klient?.typ === 'firma';
  const jeDoporucenyPrvniPobyt =
    Boolean(vstup.jeDoporucenyPrvniPobyt) ||
    (vstup.zdroj === 'doporucitel' && !maDokoncenyPobyt);
  const jeDoporucitelBezPobytu = Boolean(
    klient?.role.includes('doporucitel') && !maDokoncenyPobyt && vstup.zdroj === 'vernost',
  );

  const osobniVstup = {
    jeFirma,
    jeDoporucenyPrvniPobyt,
    jeDoporucitelBezPobytu,
    maDokoncenyPobyt,
    utrataKc: klient?.utrataKc || 0,
  };
  const pct = vyslednaSlevaPct(
    { ...osobniVstup, noci: vstup.noci, prijezd: vstup.prijezd },
    pravidla,
  );
  const delka = slevaDelkaPct(vstup.noci, pravidla);
  const osobni = slevaOsobniPct(osobniVstup, pravidla);
  const duvod = urciDuvod(vstup.noci, osobni, delka, osobniVstup);

  return {
    pct,
    duvod: pct > 0 ? duvod : null,
    duvodText: pct > 0 && duvod ? DUVOD_TEXT[duvod] : '',
    kreditKc: klient?.kreditKc || 0,
    klientId: klient?.id || null,
  };
}

/** Odečet kreditu po slevě (ne záporně). */
export function cenaPoKreditu(cenaPoSleve: number, kreditKc: number, pouzit: boolean): number {
  if (!pouzit || kreditKc <= 0) return Math.max(0, Math.round(cenaPoSleve));
  return Math.max(0, Math.round(cenaPoSleve) - Math.round(kreditKc));
}
