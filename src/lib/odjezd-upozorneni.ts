import { denPraha, hodinaPraha, posunDen } from './brana';
import { HODINA_DOTAZU_ODJEZDU, HODINA_DOTAZU_POHODY, HODINA_PRIPOMINKY_ODJEZDU, HODINA_STARYCH_DLUHU } from './constants';
import {
  chybiDotaz,
  hosteNaDen,
  klicOdjezdu,
  maUpozornitPul,
  nactiOdjezdBeh,
  polozkyZRezervace,
  soucetDluhu,
  textPripominky,
  textPulHodiny,
  textVecer,
} from './odjezd';
import { hosteProPohodu, textPushPohody } from './pohoda';
import type { OdjezdBeh, ProcessStore, RezervaceRecord } from './store';
import { upozorniMajitele } from './upozorneni';
import { jePondeli, jeVDnesnichOdjezdech, oznacPrevzeti, textStarychDluhu } from './zalozky';

/** Jednou denně od 11:00. Použije už načtený seznam. Hostovi odtud nic neodchází. */
async function upozorniPohodu(
  store: ProcessStore,
  list: RezervaceRecord[],
  now: Date,
  beh: OdjezdBeh,
  posli: typeof upozorniMajitele,
): Promise<{ pocet: number; beh: OdjezdBeh }> {
  if (hodinaPraha(now) < HODINA_DOTAZU_POHODY) return { pocet: 0, beh };
  const dnes = denPraha(now);
  if (beh.pohoda === dnes) return { pocet: 0, beh };
  const hoste = hosteProPohodu(list, dnes);
  if (!hoste.length) {
    return { pocet: 0, beh: { ...beh, pohoda: dnes } };
  }
  const jak = await posli(store, textPushPohody(hoste.length), '/prehled?zalozka=dnes#pohoda');
  if (jak === 'nic') return { pocet: 0, beh };
  return { pocet: 1, beh: { ...beh, pohoda: dnes } };
}

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

  pocet += await oznacAutomatickeOdjezdy(store, list, now);
  pocet += await upozorniStareDluhy(store, list, now, posli);

  const hodina = hodinaPraha(now);
  /** Beh se čte až od 11:00 (pohoda) nebo 18:00 (odjezdy). Dřív šetříme Upstash. */
  if (hodina < HODINA_DOTAZU_POHODY) return pocet;

  let beh = nactiOdjezdBeh(await store.getOdjezdBeh());
  const predBeh = `${beh.vecer}|${beh.pripominka}|${beh.pohoda}`;
  const pohoda = await upozorniPohodu(store, list, now, beh, posli);
  beh = pohoda.beh;
  pocet += pohoda.pocet;

  if (hodina < HODINA_DOTAZU_ODJEZDU) {
    if (`${beh.vecer}|${beh.pripominka}|${beh.pohoda}` !== predBeh) await store.setOdjezdBeh(beh);
    return pocet;
  }

  const dnes = denPraha(now);
  const zitra = posunDen(dnes, 1);
  const zitrejsi = hosteNaDen(list, zitra);

  if (beh.vecer !== dnes && zitrejsi.length) {
    const text = textVecer(zitrejsi);
    const jak = await posli(store, text, '/prehled?zalozka=dnes#odjezdy-zitra');
    if (jak !== 'nic') {
      beh.vecer = dnes;
      pocet += 1;
    }
  }

  const bezDotazu = zitrejsi.filter(chybiDotaz);
  if (hodina >= HODINA_PRIPOMINKY_ODJEZDU && beh.pripominka !== dnes && bezDotazu.length) {
    const text = textPripominky(bezDotazu);
    const jak = await posli(store, text, '/prehled?zalozka=dnes#odjezdy-zitra');
    if (jak !== 'nic') {
      beh.pripominka = dnes;
      pocet += 1;
    }
  }

  if (`${beh.vecer}|${beh.pripominka}|${beh.pohoda}` !== predBeh) await store.setOdjezdBeh(beh);
  return pocet;
}

/** Dnešní odjezd po dvou hodinách, nebo ve 12:00 když čas neznáme. Starší karty se nesahají. */
async function oznacAutomatickeOdjezdy(store: ProcessStore, list: RezervaceRecord[], now: Date): Promise<number> {
  const dnes = denPraha(now);
  let n = 0;
  for (const record of list) {
    if (jeVDnesnichOdjezdech(record, dnes, now) || record.prevzatoKdy || record.odjezd !== dnes || record.stav === 'zruseno') continue;
    const cerstvy = (await store.getRezervace(record.rezervace)) || record;
    if (cerstvy.prevzatoKdy || cerstvy.odjezd !== dnes) continue;
    await store.setRezervace(record.rezervace, oznacPrevzeti(cerstvy, now, true));
    n += 1;
  }
  return n;
}

/** Pondělí v 8:00. Jen hosté, kteří už odjeli a pořád dluží. Když se push neodešle, zkusí to příští běh. */
async function upozorniStareDluhy(
  store: ProcessStore,
  list: RezervaceRecord[],
  now: Date,
  posli: typeof upozorniMajitele,
): Promise<number> {
  if (!jePondeli(now) || hodinaPraha(now) < HODINA_STARYCH_DLUHU) return 0;
  const dnes = denPraha(now);
  const beh = nactiOdjezdBeh(await store.getOdjezdBeh());
  if (beh.pondeli === dnes) return 0;
  const stari = list.filter((r) => r.stav !== 'zruseno' && r.odjezd && r.odjezd < dnes && polozkyZRezervace(r).length > 0);
  const kc = stari.reduce((s, r) => s + soucetDluhu(polozkyZRezervace(r)), 0);
  const text = textStarychDluhu(stari.length, kc);
  if (!text) {
    beh.pondeli = dnes;
    await store.setOdjezdBeh(beh);
    return 0;
  }
  const jak = await posli(store, text, '/prehled?zalozka=dluhy');
  if (jak === 'nic') return 0;
  beh.pondeli = dnes;
  await store.setOdjezdBeh(beh);
  return 1;
}
