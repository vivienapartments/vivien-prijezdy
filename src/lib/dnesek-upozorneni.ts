import { denPraha, jePoCase } from './brana';
import { HODINA_RANIHO_DNE, MINUTA_RANIHO_DNE } from './constants';
import { hostZRezervace, klicUklidu, sestavDnesek, textRano, textZmenyPoradi } from './dnesek';
import { nactiOdjezdBeh } from './odjezd';
import type { ProcessStore } from './store';
import { upozorniMajitele } from './upozorneni';

const STRANKA = '/prehled?zalozka=dnes';

function poradiDnes(klic: string | null, den: string): string | null {
  const predpona = `${den}:`;
  if (!klic || !klic.startsWith(predpona)) return null;
  return klic.slice(predpona.length);
}

/** Jednou ráno majiteli a Nikol. Hostovi odtud nic neodchází. */
export async function upozorniDnes(
  store: ProcessStore,
  now = new Date(),
  posli: typeof upozorniMajitele = upozorniMajitele,
): Promise<number> {
  if (!jePoCase(now, HODINA_RANIHO_DNE, MINUTA_RANIHO_DNE)) return 0;
  const list = (await store.listRezervace()).map((e) => e.record);
  const dnes = denPraha(now);
  const pohled = sestavDnesek(list.map(hostZRezervace), dnes, now);
  const beh = nactiOdjezdBeh(await store.getOdjezdBeh());
  const klic = klicUklidu(dnes, pohled);
  const maDen = pohled.odjezdy.length > 0 || pohled.prijezdy.length > 0;
  let pocet = 0;
  let zmena = false;

  if (jePoCase(now, HODINA_RANIHO_DNE, MINUTA_RANIHO_DNE) && beh.rano !== dnes && maDen) {
    const jak = await posli(store, textRano(pohled), STRANKA);
    if (jak !== 'nic') {
      beh.rano = dnes;
      beh.uklid = klic;
      zmena = true;
      pocet += 1;
    }
  } else if (beh.rano === dnes && poradiDnes(beh.uklid, dnes) !== pohled.uklid.map((r) => r.apartman).join(',')) {
    const veta = poradiDnes(beh.uklid, dnes) === null ? null : textZmenyPoradi(pohled);
    if (veta) {
      const jak = await posli(store, veta, STRANKA);
      if (jak !== 'nic') {
        beh.uklid = klic;
        zmena = true;
        pocet += 1;
      }
    } else {
      beh.uklid = klic;
      zmena = true;
    }
  }

  if (zmena) await store.setOdjezdBeh(beh);
  return pocet;
}
