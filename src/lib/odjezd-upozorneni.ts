import { denPraha, hodinaPraha, posunDen } from './brana';
import { HODINA_DOTAZU_ODJEZDU, HODINA_NEDOPLATKU, HODINA_PRIPOMINKY_ODJEZDU } from './constants';
import {
  chybiDotaz,
  hosteNaDen,
  klicOdjezdu,
  maUpozornitPul,
  nactiOdjezdBeh,
  polozkyZRezervace,
  textPripominky,
  textPulHodiny,
  textSouhrnu,
  textVecer,
} from './odjezd';
import type { ProcessStore } from './store';
import { upozorniMajitele } from './upozorneni';

/** Jednou denně, jen majiteli a Nikol. Hostovi odtud nic neodchází. */
export async function upozorniOdjezdy(
  store: ProcessStore,
  now = new Date(),
  posli: typeof upozorniMajitele = upozorniMajitele,
): Promise<number> {
  const list = (await store.listRezervace()).map((e) => e.record);
  let pocet = 0;
  for (const record of list) {
    if (!maUpozornitPul(record, now)) continue;
    const text = textPulHodiny(record, polozkyZRezervace(record));
    const jak = await posli(store, text, `/prehled#${record.rezervace}`);
    if (jak === 'nic') continue;
    const cerstvy = (await store.getRezervace(record.rezervace)) || record;
    if (!maUpozornitPul(cerstvy, now)) continue;
    const veta = jak === 'push' ? `Upozornění na telefon: ${text}` : `Upozornění e-mailem: ${text}`;
    const klic = klicOdjezdu(cerstvy);
    await store.setRezervace(record.rezervace, {
      ...cerstvy,
      odjezdPushPul: klic,
      historie: [...cerstvy.historie, { cas: now.toISOString(), co: veta }].slice(-40),
    });
    pocet += 1;
  }

  const dnes = denPraha(now);
  const zitra = posunDen(dnes, 1);
  const hodina = hodinaPraha(now);
  const beh = nactiOdjezdBeh(await store.getOdjezdBeh());
  const zitrejsi = hosteNaDen(list, zitra);
  const dnesni = hosteNaDen(list, dnes);

  if (hodina >= HODINA_DOTAZU_ODJEZDU && beh.vecer !== dnes && zitrejsi.length) {
    const text = textVecer(zitrejsi.length);
    const jak = await posli(store, text, '/prehled#odjezdy-zitra');
    if (jak !== 'nic') {
      beh.vecer = dnes;
      pocet += 1;
    }
  }

  const bezDotazu = zitrejsi.filter(chybiDotaz);
  if (hodina >= HODINA_PRIPOMINKY_ODJEZDU && beh.pripominka !== dnes && bezDotazu.length) {
    const text = textPripominky(bezDotazu.length);
    const jak = await posli(store, text, '/prehled#odjezdy-zitra');
    if (jak !== 'nic') {
      beh.pripominka = dnes;
      pocet += 1;
    }
  }

  const dluhy = dnesni
    .map((rec) => ({ rec, polozky: polozkyZRezervace(rec) }))
    .filter((r) => r.polozky.length);
  if (hodina >= HODINA_NEDOPLATKU && beh.rano !== dnes && dluhy.length) {
    const text = textSouhrnu(dluhy);
    const jak = await posli(store, text, '/prehled#odjezdy-dnes');
    if (jak !== 'nic') {
      beh.rano = dnes;
      pocet += 1;
    }
  }

  await store.setOdjezdBeh(beh);
  return pocet;
}
