import type { PoptavkaZaznam } from './poptavka';
import {
  jeZkouskaPoptavky,
  nactiPoptavkaStav,
  poOdeslaniPripominky,
  rozhodniPripominku,
  resetNocniPokudRano,
  textNeozvalSe,
} from './poptavka-vyrizeni';
import type { ProcessStore } from './store';
import { upozorniMajitele } from './upozorneni';

/** Cron (~2 min): připomínky poptávek + vypršení lhůty. */
export async function zpracujPoptavkyPripominky(
  store: ProcessStore,
  now = new Date(),
): Promise<number> {
  const seznam = await store.listPoptavky();
  let zmeny = 0;
  const dalsi: PoptavkaZaznam[] = [];

  for (let z of seznam) {
    z = resetNocniPokudRano(z, now);
    const stav = nactiPoptavkaStav(z.stav);

    if (stav === 'ceka_na_hosta' && z.lhutaDo && Date.parse(z.lhutaDo) <= now.getTime()) {
      const apt = z.blokApt;
      z = {
        ...z,
        stav: 'neozval_se',
        blokApt: null,
        lhutaDo: null,
        pripominkaPosledni: null,
        pripominkaNocniPocet: 0,
      };
      zmeny += 1;
      if (!jeZkouskaPoptavky(z)) {
        await upozorniMajitele(
          store,
          textNeozvalSe({ ...z, blokApt: apt }),
          `/prehled?poptavka=${encodeURIComponent(z.id)}`,
          { telegram: 'zadost' },
        );
      }
      dalsi.push(z);
      continue;
    }

    const r = rozhodniPripominku(z, now);
    if (r.poslat) {
      await upozorniMajitele(store, r.text, `/prehled?poptavka=${encodeURIComponent(z.id)}`, {
        telegram: 'zadost',
      });
      z = poOdeslaniPripominky(z, now);
      zmeny += 1;
    }
    dalsi.push(z);
  }

  if (zmeny) await store.ulozPoptavky(dalsi);
  return zmeny;
}
