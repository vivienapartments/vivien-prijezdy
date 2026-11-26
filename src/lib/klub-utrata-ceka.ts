/**
 * Útrata čekající na kartu (import BH): podle jména a čísel rezervací.
 * Přiřadí se, až host příště přijede / check-in a jméno sedí.
 */

import { randomBytes } from 'crypto';
import { nactiKlientPodleId, ulozKlientKartu, type KlientKarta } from './klient-karta';
import { klubKlic, klubZapnut } from './klub-klic';
import type { ProcessStore } from './store';
import type { ImportBhNahled, UtrataCekaPolozka } from './klub-import-bh-csv';
import { pridejUtratuRucne, sparujNeboVytvorKlienta } from './klub-utrata';

const KEY = 'klub:utrata-ceka';

function normalJmeno(j: string): string {
  return (j || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function nactiSeznam(store: ProcessStore): Promise<UtrataCekaPolozka[]> {
  const raw = await store.getKv(klubKlic(KEY));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as UtrataCekaPolozka[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function ulozSeznam(store: ProcessStore, list: UtrataCekaPolozka[]): Promise<void> {
  await store.setKv(klubKlic(KEY), JSON.stringify(list.slice(0, 2000)));
}

export async function seznamUtratCeka(store: ProcessStore): Promise<UtrataCekaPolozka[]> {
  return nactiSeznam(store);
}

export async function pridejUtratyCeka(
  store: ProcessStore,
  polozky: Omit<UtrataCekaPolozka, 'id' | 'kdy'>[],
): Promise<number> {
  if (!klubZapnut()) return 0;
  const list = await nactiSeznam(store);
  const ted = new Date().toISOString();
  let n = 0;
  for (const p of polozky) {
    const exist = list.find((x) => x.jmenoNormal === p.jmenoNormal);
    if (exist) {
      exist.castka += p.castka;
      exist.rezervace = [...new Set([...exist.rezervace, ...p.rezervace])];
      exist.zdroj = p.zdroj;
    } else {
      list.push({
        id: `uc${randomBytes(4).toString('hex')}`,
        jmenoNormal: p.jmenoNormal,
        jmenoZobrazeni: p.jmenoZobrazeni,
        castka: p.castka,
        rezervace: [...p.rezervace],
        kdy: ted,
        zdroj: p.zdroj,
      });
    }
    n += 1;
  }
  await ulozSeznam(store, list);
  return n;
}

/** Po založení / nalezení karty: připiš čekající útratu se stejným jménem. */
export async function pripojUtratuCekaKeKarte(
  store: ProcessStore,
  karta: KlientKarta,
): Promise<{ pripojeno: number; castka: number }> {
  if (!klubZapnut()) return { pripojeno: 0, castka: 0 };
  const list = await nactiSeznam(store);
  const nj = normalJmeno(`${karta.jmeno} ${karta.prijmeni}`);
  const njFirma = normalJmeno(karta.firma?.nazev || '');
  const shody = list.filter(
    (x) => x.jmenoNormal === nj || (njFirma && x.jmenoNormal === njFirma),
  );
  if (!shody.length) return { pripojeno: 0, castka: 0 };

  let castka = 0;
  for (const s of shody) {
    await pridejUtratuRucne(store, karta.id, s.castka, `import-ceka ${s.rezervace.join(',')}`);
    for (const rez of s.rezervace) {
      if (!karta.rezervace.includes(rez)) karta.rezervace.push(rez);
    }
    castka += s.castka;
  }
  karta.rezervace = karta.rezervace.slice(-40);
  await ulozKlientKartu(store, karta);

  const zbyva = list.filter((x) => !shody.some((s) => s.id === x.id));
  await ulozSeznam(store, zbyva);
  return { pripojeno: shody.length, castka };
}

/** Majitel: Spojit čekající útratu s konkrétní kartou. */
export async function spojUtratuCeka(
  store: ProcessStore,
  cekaId: string,
  klientId: string,
): Promise<{ ok: boolean; castka: number }> {
  if (!klubZapnut()) return { ok: false, castka: 0 };
  const list = await nactiSeznam(store);
  const pol = list.find((x) => x.id === cekaId);
  if (!pol) return { ok: false, castka: 0 };
  const k = await nactiKlientPodleId(store, klientId);
  if (!k) return { ok: false, castka: 0 };
  await pridejUtratuRucne(store, k.id, pol.castka, `spojit ${pol.rezervace.join(',')}`);
  for (const rez of pol.rezervace) {
    if (!k.rezervace.includes(rez)) k.rezervace.push(rez);
  }
  await ulozKlientKartu(store, k);
  await ulozSeznam(
    store,
    list.filter((x) => x.id !== cekaId),
  );
  return { ok: true, castka: pol.castka };
}

export async function potvrdImportBhCsv(
  store: ProcessStore,
  nahled: ImportBhNahled,
): Promise<{ zapsano: number; ceka: number; firmy: number }> {
  if (!klubZapnut()) return { zapsano: 0, ceka: 0, firmy: 0 };
  let zapsano = 0;
  let ceka = 0;
  let firmy = 0;

  for (const s of nahled.souhrn) {
    if (s.akce === 'kontrola') continue;
    if (s.akce === 'cekajici') {
      await pridejUtratyCeka(store, [
        {
          jmenoNormal: normalJmeno(s.host),
          jmenoZobrazeni: s.host,
          castka: s.utrata,
          rezervace: s.rezervace,
          zdroj: 'import-bh-csv',
        },
      ]);
      ceka += 1;
      continue;
    }

    let klientId = s.klientId;
    const jeFirma = s.akce === 'firma';
    if (!klientId) {
      const novy = await sparujNeboVytvorKlienta(store, {
        jmeno: s.host,
        email: null,
        telefon: null,
      });
      if (!novy) {
        const { randomBytes } = await import('crypto');
        const { ulozKlientKartu, normalizujKlientKod } = await import('./klient-karta');
        const casti = s.host.trim().split(/\s+/);
        const nova: KlientKarta = {
          id: `k${Date.now().toString(36)}${randomBytes(3).toString('hex')}`,
          kod: normalizujKlientKod(jeFirma ? s.host.slice(0, 10) : casti[0] || 'HOST'),
          tajnyKlic: randomBytes(18).toString('base64url'),
          datumZalozeni: new Date().toISOString(),
          typ: jeFirma ? 'firma' : 'host',
          role: jeFirma ? ['firma'] : ['host'],
          stav: 'aktivni',
          jmeno: jeFirma ? s.host : casti[0] || '',
          prijmeni: jeFirma ? '' : casti.slice(1).join(' '),
          email: '',
          telefon: '',
          jazyk: 'cs',
          rezervace: [...s.rezervace],
          firma: jeFirma
            ? { ico: '', dic: '', nazev: s.host, sidlo: '', platceDph: false }
            : null,
          utrataKc: 0,
          utrataRucne: [],
          urovenId: 'host',
          kredit: [],
          kreditKc: 0,
          dopKodPuvod: null,
          poznamka: 'import-bh-csv',
          zalozil: 'import-bh-csv',
          slevaBehem: [],
          slevaKontrola: null,
          podekovaniVidel: null,
          podekovaniVarianta: null,
          podekovaniVariantaPobyt: null,
          podekovaniVariantaPred: null,
        };
        await ulozKlientKartu(store, nova);
        klientId = nova.id;
        if (jeFirma) firmy += 1;
      } else {
        klientId = novy.id;
      }
    }

    if (!klientId) continue;
    const poznamka = `import-bh-csv rez:${s.rezervace.join(',')}`;
    const k = await pridejUtratuRucne(store, klientId, s.utrata, poznamka);
    if (k) {
      zapsano += 1;
      await pripojUtratuCekaKeKarte(store, k);
    }
  }

  return { zapsano, ceka, firmy };
}
