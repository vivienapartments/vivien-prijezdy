import {
  aplikujRezervace,
  nactiKalendarDenni,
  nactiKalendarMeta,
  type KalendarDenni,
  type KalendarMeta,
  type RezProKalendar,
  PRAZDNA_META,
} from './kalendar-denni';
import { nactiIcalUloziste, sloucitObsazenostIcal } from './kalendar-ical';
import { KLIC_KALENDAR_DENNI, KLIC_KALENDAR_META, kalendarKlic } from './kalendar-klic';
import { blokujeObsazenost } from './poptavka-vyrizeni';
import type { ProcessStore, RezervaceRecord } from './store';

export async function nactiUlozenyKalendar(store: ProcessStore): Promise<{
  dny: KalendarDenni;
  meta: KalendarMeta;
}> {
  const rawDny = await store.getKv(kalendarKlic(KLIC_KALENDAR_DENNI));
  const rawMeta = await store.getKv(kalendarKlic(KLIC_KALENDAR_META));
  let dny: KalendarDenni = {};
  let meta: KalendarMeta = { ...PRAZDNA_META };
  try {
    if (rawDny) dny = nactiKalendarDenni(JSON.parse(rawDny));
  } catch {
    /* */
  }
  try {
    if (rawMeta) meta = nactiKalendarMeta(JSON.parse(rawMeta));
  } catch {
    /* */
  }
  return { dny, meta };
}

export async function ulozKalendar(
  store: ProcessStore,
  dny: KalendarDenni,
  meta: KalendarMeta,
): Promise<void> {
  await store.setKv(kalendarKlic(KLIC_KALENDAR_DENNI), JSON.stringify(dny));
  await store.setKv(kalendarKlic(KLIC_KALENDAR_META), JSON.stringify(meta));
}

export function rezervaceNaKalendar(rec: RezervaceRecord): RezProKalendar {
  return {
    prijezd: rec.prijezd,
    odjezd: rec.odjezd,
    apartman: rec.apartman,
    stav: rec.stav,
    zkusebni: rec.zkusebni === true,
  };
}

/** Tabulka + rezervace z průvodce + předběžné blokace poptávek. */
export async function sestavKalendarProHosta(store: ProcessStore): Promise<{
  dny: KalendarDenni;
  meta: KalendarMeta;
  bezAptPoDnech: Record<string, number>;
}> {
  const { dny: zaklad, meta } = await nactiUlozenyKalendar(store);
  const ical = await nactiIcalUloziste(store);
  const seZakladem = sloucitObsazenostIcal(zaklad, ical);
  const seznam = await store.listRezervace();
  const rez: RezProKalendar[] = seznam.map((e) => rezervaceNaKalendar(e.record));
  try {
    const poptavky = await store.listPoptavky();
    for (const z of poptavky) {
      if (!blokujeObsazenost(z)) continue;
      rez.push({
        prijezd: z.prijezd,
        odjezd: z.odjezd,
        apartman: z.blokApt,
        stav: 'cekame',
        zkusebni: false,
      });
    }
  } catch {
    /* bez blokací poptávek */
  }
  const { mapa, bezAptPoDnech } = aplikujRezervace(seZakladem, rez);

  let posledni: string | null = meta.posledniRezervace;
  for (const e of seznam) {
    const t = e.record.posledniPokus || '';
    if (t && (!posledni || t > posledni)) posledni = t;
  }
  return {
    dny: mapa,
    meta: { ...meta, posledniRezervace: posledni },
    bezAptPoDnech,
  };
}
