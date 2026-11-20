import { denPraha, hodinaPraha, posunDen } from './brana';
import {
  HODINA_DOTAZU_ODJEZDU,
  HODINA_DOTAZU_POHODY,
  HODINA_FAKTURY_ODJEZD,
  HODINA_FAKTURY_RANO,
  HODINA_PRIPOMINKY_ODJEZDU,
  HODINA_STARYCH_DLUHU,
} from './constants';
import { fakturaCeka, seznamFakturProTelegram } from './faktura';
import { FAKTURA_MAJITEL } from './faktura-texty';
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
import { odlozitPushCasuOdjezdu } from './odjezd-potvrzeni';
import { najdiVyberyProdlouzeni } from './odjezd-souhlas';
import { hosteProPohodu, textPushPohody } from './pohoda';
import { HODINA_PODEKOVANI, hosteCekajiciPodekovani, textPushPodekovani } from './podekovani';
import {
  HODINA_SHRNUTI_RANO,
  hosteCekajiciShrnuti,
  jeKomplet,
  seznamShrnutiProTelegram,
  textPushShrnutiNove,
  textPushShrnutiRano,
} from './shrnuti';
import type { OdjezdBeh, ProcessStore, RezervaceRecord } from './store';
import { odkazKarty } from './prehled-odkaz';
import { upozorniMajitele, vetaUpozorneni } from './upozorneni';
import { jePondeli, jeVDnesnichOdjezdech, oznacPrevzeti, textStarychDluhu } from './zalozky';

/** Odložené pushy z noci (22:00–7:30), až skončí tichý režim nebo je odjezd do 2 hodin. */
async function dorucOdlozenePushyCasuOdjezdu(
  store: ProcessStore,
  list: RezervaceRecord[],
  now: Date,
  posli: typeof upozorniMajitele,
): Promise<number> {
  let pocet = 0;
  for (const record of list) {
    if (!record.casOdjezduPushCeka || record.stav === 'zruseno' || record.nedojezdKdy) continue;
    if (odlozitPushCasuOdjezdu(record, now)) continue;
    const text = record.casOdjezduPushCeka;
    const jak = await posli(store, text, odkazKarty(record.rezervace, 'odjezd'), {
      telegram: 'cas-odjezdu',
    });
    if (jak === 'nic') continue;
    const cerstvy = (await store.getRezervace(record.rezervace)) || record;
    if (!cerstvy.casOdjezduPushCeka) continue;
    const veta = vetaUpozorneni(jak, text);
    await store.setRezervace(record.rezervace, {
      ...cerstvy,
      casOdjezduPushCeka: null,
      historie: [...cerstvy.historie, { cas: now.toISOString(), co: veta }].slice(-40),
    });
    pocet += 1;
  }
  return pocet;
}

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
  const jak = await posli(store, textPushPohody(hoste.length), '/prehled#pohoda');
  if (jak === 'nic') return { pocet: 0, beh };
  return { pocet: 1, beh: { ...beh, pohoda: dnes } };
}

function klicBehu(beh: OdjezdBeh): string {
  return `${beh.vecer}|${beh.pripominka}|${beh.pohoda}|${beh.podekovani}|${beh.fakturyPoledne}|${beh.fakturyRano}|${beh.shrnutiRano}`;
}

/** Jednou, když host poprvé splní komplet. Hostovi nic. */
async function upozorniNoveKomplet(
  store: ProcessStore,
  list: RezervaceRecord[],
  now: Date,
  posli: typeof upozorniMajitele,
): Promise<number> {
  const dnes = denPraha(now);
  let pocet = 0;
  for (const record of list) {
    if (!jeKomplet(record, dnes) || record.shrnutiUpozorneno) continue;
    const jmeno = (record.jmeno || record.krestni || 'Host').trim();
    const text = textPushShrnutiNove(jmeno, record.apartman);
    const jak = await posli(store, text, '/prehled#vse-pripraveno', { telegram: 'shrnuti' });
    if (jak === 'nic') continue;
    const cerstvy = (await store.getRezervace(record.rezervace)) || record;
    if (cerstvy.shrnutiUpozorneno || !jeKomplet(cerstvy, dnes)) continue;
    const ted = now.toISOString();
    await store.setRezervace(record.rezervace, {
      ...cerstvy,
      shrnutiUpozorneno: ted,
      historie: [...cerstvy.historie, { cas: ted, co: vetaUpozorneni(jak, text) }].slice(-40),
    });
    pocet += 1;
  }
  return pocet;
}

/** Jednou denně od 9:00 souhrn čekajících shrnutí. */
async function upozorniShrnutiRano(
  store: ProcessStore,
  list: RezervaceRecord[],
  now: Date,
  beh: OdjezdBeh,
  posli: typeof upozorniMajitele,
): Promise<{ pocet: number; beh: OdjezdBeh }> {
  if (hodinaPraha(now) < HODINA_SHRNUTI_RANO) return { pocet: 0, beh };
  const dnes = denPraha(now);
  if (beh.shrnutiRano === dnes) return { pocet: 0, beh };
  const cekaji = hosteCekajiciShrnuti(list, dnes);
  if (!cekaji.length) {
    return { pocet: 0, beh: { ...beh, shrnutiRano: dnes } };
  }
  const text = textPushShrnutiRano(seznamShrnutiProTelegram(cekaji));
  const jak = await posli(store, text, '/prehled#vse-pripraveno', { telegram: 'shrnuti' });
  if (jak === 'nic') return { pocet: 0, beh };
  return { pocet: 1, beh: { ...beh, shrnutiRano: dnes } };
}

/** Jednou denně od 17:00. Hostovi odtud nic neodchází. Ne do Telegramu. */
async function upozorniPodekovani(
  store: ProcessStore,
  list: RezervaceRecord[],
  now: Date,
  beh: OdjezdBeh,
  posli: typeof upozorniMajitele,
): Promise<{ pocet: number; beh: OdjezdBeh }> {
  if (hodinaPraha(now) < HODINA_PODEKOVANI) return { pocet: 0, beh };
  const dnes = denPraha(now);
  if (beh.podekovani === dnes) return { pocet: 0, beh };
  const cekaji = hosteCekajiciPodekovani(list, dnes, now);
  if (!cekaji.length) {
    return { pocet: 0, beh: { ...beh, podekovani: dnes } };
  }
  /** Bez telegram: jen push / e-mail záloha. */
  const jak = await posli(store, textPushPodekovani(cekaji.length), '/prehled#podekovani');
  if (jak === 'nic') return { pocet: 0, beh };
  return { pocet: 1, beh: { ...beh, podekovani: dnes } };
}

/**
 * Faktury. Ve 12:00 push o dnešních odjezdech, od 9:00 připomínka těch, kdo už odjeli.
 * Jednou denně každý. Hostovi odtud nic neodchází.
 */
async function upozorniFaktury(
  store: ProcessStore,
  list: RezervaceRecord[],
  now: Date,
  beh: OdjezdBeh,
  posli: typeof upozorniMajitele,
): Promise<{ pocet: number; beh: OdjezdBeh }> {
  const hodina = hodinaPraha(now);
  const dnes = denPraha(now);
  const cekajici = list.filter((r) => r.stav !== 'zruseno' && r.odjezd && fakturaCeka(r));
  let pocet = 0;
  let dalsi = beh;

  if (hodina >= HODINA_FAKTURY_ODJEZD && dalsi.fakturyPoledne !== dnes) {
    const dnesni = cekajici.filter((r) => r.odjezd === dnes);
    if (!dnesni.length) {
      dalsi = { ...dalsi, fakturyPoledne: dnes };
    } else {
      const text = FAKTURA_MAJITEL.telegram_den_odjezdu.replace('{seznam}', seznamFakturProTelegram(dnesni));
      const jak = await posli(store, text, '/prehled?zalozka=faktury', { telegram: 'faktura' });
      if (jak !== 'nic') {
        dalsi = { ...dalsi, fakturyPoledne: dnes };
        pocet += 1;
      }
    }
  }

  if (hodina >= HODINA_FAKTURY_RANO && dalsi.fakturyRano !== dnes) {
    const stare = cekajici.filter((r) => String(r.odjezd) < dnes);
    if (!stare.length) {
      dalsi = { ...dalsi, fakturyRano: dnes };
    } else {
      const text = FAKTURA_MAJITEL.telegram_pripominka.replace('{seznam}', seznamFakturProTelegram(stare));
      const jak = await posli(store, text, '/prehled?zalozka=faktury', { telegram: 'faktura' });
      if (jak !== 'nic') {
        dalsi = { ...dalsi, fakturyRano: dnes };
        pocet += 1;
      }
    }
  }

  return { pocet, beh: dalsi };
}

/** Jednou denně, jen majiteli a Nikol. Hostovi odtud nic neodchází. */
export async function upozorniOdjezdy(
  store: ProcessStore,
  now = new Date(),
  posli: typeof upozorniMajitele = upozorniMajitele,
): Promise<number> {
  const list = (await store.listRezervace()).map((e) => e.record);
  let pocet = await dorucOdlozenePushyCasuOdjezdu(store, list, now, posli);

  for (const upoz of najdiVyberyProdlouzeni(list, now)) {
    const jak = await posli(store, upoz.text, odkazKarty(upoz.kdo.rezervace), {
      telegram: 'cas-odjezdu',
    });
    if (jak === 'nic') continue;
    const cerstvy = (await store.getRezervace(upoz.kdo.rezervace)) || upoz.kdo;
    if (cerstvy.prodlouzeniVyberPush === upoz.klic) continue;
    const veta = vetaUpozorneni(jak, upoz.text);
    await store.setRezervace(upoz.kdo.rezervace, {
      ...cerstvy,
      prodlouzeniVyberPush: upoz.klic,
      historie: [...cerstvy.historie, { cas: now.toISOString(), co: veta }].slice(-40),
    });
    pocet += 1;
  }

  for (const record of list) {
    if (!maUpozornitPul(record, now)) continue;
    const text = textPulHodiny(record, polozkyZRezervace(record));
    const jak = await posli(store, text, odkazKarty(record.rezervace), { telegram: 'cas-odjezdu' });
    if (jak === 'nic') continue;
    const cerstvy = (await store.getRezervace(record.rezervace)) || record;
    if (!maUpozornitPul(cerstvy, now)) continue;
    const veta = vetaUpozorneni(jak, text);
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
  pocet += await upozorniNoveKomplet(store, list, now, posli);

  const hodina = hodinaPraha(now);
  /** Beh se čte až od 9:00 (faktury / shrnutí), 11:00 (pohoda) nebo 18:00 (odjezdy). Dřív šetříme Upstash. */
  if (hodina < HODINA_FAKTURY_RANO) return pocet;

  let beh = nactiOdjezdBeh(await store.getOdjezdBeh());
  const predBeh = klicBehu(beh);
  const shrnutiRano = await upozorniShrnutiRano(store, list, now, beh, posli);
  beh = shrnutiRano.beh;
  pocet += shrnutiRano.pocet;
  const faktury = await upozorniFaktury(store, list, now, beh, posli);
  beh = faktury.beh;
  pocet += faktury.pocet;
  const pohoda = await upozorniPohodu(store, list, now, beh, posli);
  beh = pohoda.beh;
  pocet += pohoda.pocet;
  const podekovani = await upozorniPodekovani(store, list, now, beh, posli);
  beh = podekovani.beh;
  pocet += podekovani.pocet;

  if (hodina < HODINA_DOTAZU_ODJEZDU) {
    if (klicBehu(beh) !== predBeh) await store.setOdjezdBeh(beh);
    return pocet;
  }

  const dnes = denPraha(now);
  const zitra = posunDen(dnes, 1);
  const zitrejsi = hosteNaDen(list, zitra);
  /** Jen kdo ještě nemá čas odjezdu ani odeslaný dotaz. */
  const bezDotazu = zitrejsi.filter(chybiDotaz);

  if (beh.vecer !== dnes) {
    if (!bezDotazu.length) {
      beh.vecer = dnes;
    } else {
      const text = textVecer(bezDotazu);
      const url =
        bezDotazu.length === 1
          ? `/prehled#${bezDotazu[0].rezervace}`
          : '/prehled#odjezdy-zitra';
      const jak = await posli(store, text, url, { telegram: 'cas-odjezdu' });
      if (jak !== 'nic') {
        beh.vecer = dnes;
        pocet += 1;
      }
    }
  }

  if (hodina >= HODINA_PRIPOMINKY_ODJEZDU && beh.pripominka !== dnes) {
    if (!bezDotazu.length) {
      beh.pripominka = dnes;
    } else {
      const text = textPripominky(bezDotazu);
      const url =
        bezDotazu.length === 1
          ? `/prehled#${bezDotazu[0].rezervace}`
          : '/prehled#odjezdy-zitra';
      const jak = await posli(store, text, url, { telegram: 'cas-odjezdu' });
      if (jak !== 'nic') {
        beh.pripominka = dnes;
        pocet += 1;
      }
    }
  }

  if (klicBehu(beh) !== predBeh) await store.setOdjezdBeh(beh);
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
  const jak = await posli(store, text, '/prehled?zalozka=dluhy', { telegram: 'nedoplatek' });
  if (jak === 'nic') return 0;
  beh.pondeli = dnes;
  await store.setOdjezdBeh(beh);
  return 1;
}
