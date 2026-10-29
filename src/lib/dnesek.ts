import {
  CHECKOUT,
  ODJEZD_STANDARD,
  PRIJEZD_STANDARD,
  PREVZETI_NEZNAMY_HODINA,
  PREVZETI_PO_HODINACH,
  UKLID_CEKAT_MIN,
  UKLID_MIN,
} from './constants';
import { jeHodina, polozkyZRezervace, textRozpisu, zobrazCas } from './odjezd';
import type { RezervaceRecord } from './store';
import { APT_IDS, type AptId } from './types';
import { casPrevzetiText, casPrevzetiVyprsel, jeVDnesnichOdjezdech } from './zalozky';

/** Starší zápisy mají `pravoslav`. V menu a v textu je to Miluška. */
export type KdoUklidil = 'miluska' | 'nikol' | 'pravoslav';

export function jmenoUklidu(kdo: KdoUklidil): string {
  return kdo === 'nikol' ? 'Nikol' : 'Miluška';
}

/** Jen to, co smí vidět Nikol. Bez PINu, telefonu, e-mailu a hesel. */
export type HostDne = {
  rezervace: string;
  apartman: AptId | null;
  jmeno: string;
  prijezd: string | null;
  odjezd: string | null;
  casPrijezdu: string | null;
  casOdjezdu: string | null;
  stav: string;
  zpusob: 'auto' | 'pesky' | null;
  brana: 'misto' | 'registrovat' | null;
  faze: string;
  dluh: string;
  uklizenoKdy: string | null;
  uklizenoKdo: KdoUklidil | null;
  prevzatoKdy?: string | null;
  predanoKdy?: string | null;
};

export type UklidRadek = {
  rezervace: string;
  apartman: string;
  jmeno: string;
  /** Čas odjezdu, „čas neznámý“ nebo „převzato 9:20“. */
  casOdjezduText: string;
  /** „Nedoplatek 400 Kč (…)“ nebo null. */
  nedoplatek: string | null;
  uvolni: string;
  dalsi: string;
  dalsiJmeno: string | null;
  /** Host, který do apartmánu přijíždí dál. Pro zápis stejných závad. */
  dalsiRezervace: string | null;
  prijezdCas: string | null;
  maPrijezd: boolean;
  prvni: boolean;
  /** Když se nestihne předání, čas ve tvaru H:MM. */
  nestihneSeDo: string | null;
  uklizenoKdy: string | null;
  uklizenoKdo: KdoUklidil | null;
  prevzato: boolean;
};

/** Vstup pro výpočet pořadí úklidu (minuty od půlnoci). */
export type UklidSlot = {
  id: string;
  uvolneni: number;
  /** null = dnes nikdo nepřijede, na konec. */
  predani: number | null;
  uklizeno: boolean;
};

export type OdjezdRadek = {
  rezervace: string;
  apartman: string;
  jmeno: string;
  cas: string;
  casZnamy: boolean;
  dluh: string;
};

export type PrijezdRadek = {
  rezervace: string;
  apartman: string;
  jmeno: string;
  cas: string;
  casZnamy: boolean;
  zpusob: string;
  brana: string;
  faze: string;
  predanoKdy: string | null;
};

export type DluhRadek = {
  rezervace: string;
  apartman: string;
  jmeno: string;
  text: string;
};

export type DnesekPohled = {
  uklid: UklidRadek[];
  odjezdy: OdjezdRadek[];
  prijezdy: PrijezdRadek[];
  nedoplatky: DluhRadek[];
  /** Čísla rezervací, jejichž řádek se nepodařilo složit. */
  chyby: string[];
};

function minuty(cas: string): number {
  const [h, m] = cas.split(':').map(Number);
  return h * 60 + m;
}

function poradiApt(apt: string): number {
  const i = APT_IDS.indexOf(apt as AptId);
  return i < 0 ? 9 : i;
}

function sklon(n: number, jedna: string, dve: string, pet: string): string {
  if (n === 1) return `1 ${jedna}`;
  if (n >= 2 && n <= 4) return `${n} ${dve}`;
  return `${n} ${pet}`;
}

function casPrahaKratky(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(t));
  const hod = parts.find((p) => p.type === 'hour')?.value || '';
  const min = parts.find((p) => p.type === 'minute')?.value || '';
  if (!hod || !min) return '';
  return zobrazCas(`${hod}:${min}`);
}

export function textUklizeno(kdy: string, kdo: KdoUklidil): string {
  const cas = casPrahaKratky(kdy);
  const jmeno = jmenoUklidu(kdo);
  return cas ? `Uklizeno ${cas} · ${jmeno}` : `Uklizeno · ${jmeno}`;
}

export function oznacUklid(rec: RezervaceRecord, kdo: KdoUklidil, now = new Date()): RezervaceRecord {
  const ulozit: KdoUklidil = kdo === 'pravoslav' ? 'miluska' : kdo;
  const co = ulozit === 'nikol' ? 'Úklid označila Nikol' : 'Úklid označila Miluška';
  return {
    ...rec,
    uklizenoKdy: now.toISOString(),
    uklizenoKdo: ulozit,
    historie: [...rec.historie, { cas: now.toISOString(), co }].slice(-40),
  };
}

export function vratUklid(rec: RezervaceRecord, now = new Date()): RezervaceRecord {
  return {
    ...rec,
    uklizenoKdy: null,
    uklizenoKdo: null,
    historie: [...rec.historie, { cas: now.toISOString(), co: 'Úklid vrácen' }].slice(-40),
  };
}

/** Z rezervace vezme jen pole pro přehled dne. PIN a telefon sem nepatří. */
export function hostZRezervace(rec: RezervaceRecord): HostDne {
  return {
    rezervace: rec.rezervace,
    apartman: rec.apartman,
    jmeno: (rec.jmeno || '').trim() || 'Host',
    prijezd: rec.prijezd,
    odjezd: rec.odjezd,
    casPrijezdu: rec.casPrijezdu,
    casOdjezdu: rec.casOdjezdu,
    stav: rec.stav,
    zpusob: rec.zpusobPrijezdu,
    brana: rec.zpusobPrijezdu === 'auto' ? (rec.branaRegistrovano ? 'misto' : 'registrovat') : null,
    faze: '',
    dluh: textRozpisu(polozkyZRezervace(rec)),
    uklizenoKdy: rec.uklizenoKdy,
    uklizenoKdo: rec.uklizenoKdo,
    prevzatoKdy: rec.prevzatoKdy,
    predanoKdy: rec.predano,
  };
}

function textUvolneni(h: HostDne, dnes: string, now?: Date): string {
  if (h.prevzatoKdy) {
    const cas = casPrevzetiText(h.prevzatoKdy);
    return cas ? `uvolněno ${zobrazCas(cas)}` : 'uvolněno';
  }
  if (now && casPrevzetiVyprsel(h.casOdjezdu, dnes, now)) {
    if (jeHodina(h.casOdjezdu)) {
      const [hod, min] = h.casOdjezdu.split(':').map(Number);
      const celkem = hod * 60 + min + PREVZETI_PO_HODINACH * 60;
      const hh = String(Math.floor(celkem / 60) % 24).padStart(2, '0');
      const mm = String(celkem % 60).padStart(2, '0');
      return `uvolněno ${zobrazCas(`${hh}:${mm}`)}`;
    }
    return `uvolněno ${PREVZETI_NEZNAMY_HODINA}:00`;
  }
  return jeHodina(h.casOdjezdu) ? `uvolní v ${zobrazCas(h.casOdjezdu)}` : `odjezd do ${CHECKOUT}`;
}

function textZpusobu(zpusob: HostDne['zpusob']): string {
  if (zpusob === 'auto') return 'autem';
  if (zpusob === 'pesky') return 'pěšky';
  return '';
}

function textBrany(brana: HostDne['brana']): string {
  if (brana === 'misto') return 'má místo';
  if (brana === 'registrovat') return 'zaregistrovat';
  return '';
}

function seradPodleCasu<T>(list: T[], cas: (t: T) => string | null, apt: (t: T) => string): T[] {
  return [...list].sort((a, b) => {
    const ac = jeHodina(cas(a)) ? minuty(cas(a) as string) : 24 * 60;
    const bc = jeHodina(cas(b)) ? minuty(cas(b) as string) : 24 * 60;
    if (ac !== bc) return ac - bc;
    return poradiApt(apt(a)) - poradiApt(apt(b));
  });
}

function minutyZIsoPraha(iso: string): number | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(t));
  const hod = Number(parts.find((p) => p.type === 'hour')?.value);
  const min = Number(parts.find((p) => p.type === 'minute')?.value);
  if (!Number.isFinite(hod) || !Number.isFinite(min)) return null;
  return hod * 60 + min;
}

function casZMinut(m: number): string {
  const hh = String(Math.floor(m / 60) % 24).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Uvolnění: převzetí, jinak čas odjezdu, jinak 10:00. */
export function uvolneniMinut(h: HostDne): number {
  if (h.prevzatoKdy) {
    const m = minutyZIsoPraha(h.prevzatoKdy);
    if (m != null) return m;
  }
  if (jeHodina(h.casOdjezdu)) return minuty(h.casOdjezdu);
  return ODJEZD_STANDARD;
}

/** Předání: čas dalšího hosta, jinak 14:00; bez dalšího hosta = null. */
export function predaniMinut(dalsi: HostDne | null): number | null {
  if (!dalsi) return null;
  if (jeHodina(dalsi.casPrijezdu)) return minuty(dalsi.casPrijezdu);
  return PRIJEZD_STANDARD;
}

function greedyUklid(leftIn: UklidSlot[]): string[] {
  const left = [...leftIn];
  const order: string[] = [];
  if (!left.length) return order;
  let t = Math.min(...left.map((s) => s.uvolneni));
  while (left.length) {
    let candidates = left.filter((s) => s.uvolneni <= t + UKLID_CEKAT_MIN);
    if (!candidates.length) {
      t = Math.min(...left.map((s) => s.uvolneni));
      continue;
    }
    candidates = [...candidates].sort((a, b) => {
      const pa = a.predani ?? 99_999;
      const pb = b.predani ?? 99_999;
      if (pa !== pb) return pa - pb;
      return poradiApt(a.id) - poradiApt(b.id);
    });
    const pick = candidates[0];
    const start = Math.max(t, pick.uvolneni);
    t = start + UKLID_MIN;
    order.push(pick.id);
    const ix = left.findIndex((s) => s.id === pick.id);
    if (ix >= 0) left.splice(ix, 1);
  }
  return order;
}

function nestihneVPoradi(order: string[], byId: Map<string, UklidSlot>): Map<string, number> {
  const nestihne = new Map<string, number>();
  let t = Number.NEGATIVE_INFINITY;
  for (const id of order) {
    const s = byId.get(id);
    if (!s) continue;
    const start = t === Number.NEGATIVE_INFINITY ? s.uvolneni : Math.max(t, s.uvolneni);
    const finish = start + UKLID_MIN;
    if (s.predani != null && finish > s.predani) nestihne.set(id, s.predani);
    t = finish;
  }
  return nestihne;
}

function permutace<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 1) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutace(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

/**
 * Pořadí úklidu: nejdřív uvolnění, v okně 15 min vyber nejdřívější předání.
 * Když se nestihne, zkus všechna pořadí (max 5). Už uklizené na konci.
 */
export function seradUklidPoradi(sloty: UklidSlot[]): { id: string; nestihneSeDo: number | null }[] {
  const hotove = sloty.filter((s) => s.uklizeno).sort((a, b) => poradiApt(a.id) - poradiApt(b.id));
  const cekaji = sloty.filter((s) => !s.uklizeno);
  if (!cekaji.length) {
    return hotove.map((s) => ({ id: s.id, nestihneSeDo: null }));
  }
  const byId = new Map(cekaji.map((s) => [s.id, s]));
  let order = greedyUklid(cekaji);
  let nestihne = nestihneVPoradi(order, byId);
  if (nestihne.size && cekaji.length <= 5) {
    for (const perm of permutace(cekaji.map((s) => s.id))) {
      const n = nestihneVPoradi(perm, byId);
      if (!n.size) {
        order = perm;
        nestihne = n;
        break;
      }
    }
  }
  return [
    ...order.map((id) => ({ id, nestihneSeDo: nestihne.get(id) ?? null })),
    ...hotove.map((s) => ({ id: s.id, nestihneSeDo: null })),
  ];
}

export function sestavDnesek(hoste: HostDne[], dnes: string, now?: Date): DnesekPohled {
  const chyby: string[] = [];
  const zivi: HostDne[] = [];
  for (const h of hoste) {
    try {
      if (!h || h.stav === 'zruseno') continue;
      void h.odjezd;
      void h.prijezd;
      void h.apartman;
      zivi.push(h);
    } catch {
      let id = '?';
      try {
        id = h?.rezervace || '?';
      } catch {
        id = '?';
      }
      chyby.push(id);
    }
  }
  const vsichniOdjezdy = zivi.filter((h) => h.odjezd === dnes);
  const odjezdyHoste = now
    ? vsichniOdjezdy.filter((h) =>
        jeVDnesnichOdjezdech(
          { odjezd: h.odjezd, casOdjezdu: h.casOdjezdu, prevzatoKdy: h.prevzatoKdy || null, stav: h.stav },
          dnes,
          now,
        ),
      )
    : vsichniOdjezdy;
  const prijezdyHoste = zivi.filter((h) => h.prijezd === dnes);

  const podleApt = new Map<string, HostDne[]>();
  for (const host of vsichniOdjezdy) {
    const apt = host.apartman || `?${host.rezervace}`;
    const list = podleApt.get(apt) || [];
    list.push(host);
    podleApt.set(apt, list);
  }

  const surove: UklidRadek[] = [];
  const sloty: UklidSlot[] = [];
  for (const [apt, odchazeji] of podleApt) {
    const odchod = [...odchazeji].sort((a, b) => {
      const ac = jeHodina(a.casOdjezdu) ? minuty(a.casOdjezdu) : 24 * 60;
      const bc = jeHodina(b.casOdjezdu) ? minuty(b.casOdjezdu) : 24 * 60;
      if (ac !== bc) return ac - bc;
      return a.rezervace.localeCompare(b.rezervace);
    })[0];
    const aptId = odchod.apartman || apt;
    const kandidati = prijezdyHoste.filter(
      (h) => (h.apartman || '') === (odchod.apartman || '') && h.rezervace !== odchod.rezervace,
    );
    const zname = seradPodleCasu(
      kandidati.filter((h) => jeHodina(h.casPrijezdu)),
      (h) => h.casPrijezdu,
      (h) => h.apartman || '',
    );
    const dalsi = zname[0] || kandidati[0] || null;
    const prijezdCas = dalsi && jeHodina(dalsi.casPrijezdu) ? dalsi.casPrijezdu : null;
    const prevzato = Boolean(odchod.prevzatoKdy);
    let casOdjezduText = 'čas neznámý';
    if (prevzato && odchod.prevzatoKdy) {
      const cas = casPrevzetiText(odchod.prevzatoKdy);
      casOdjezduText = cas ? `převzato ${zobrazCas(cas)}` : 'převzato';
    } else if (jeHodina(odchod.casOdjezdu)) {
      casOdjezduText = zobrazCas(odchod.casOdjezdu);
    }
    surove.push({
      rezervace: odchod.rezervace,
      apartman: aptId,
      jmeno: odchod.jmeno,
      casOdjezduText,
      nedoplatek: odchod.dluh ? `Nedoplatek ${odchod.dluh}` : null,
      uvolni: textUvolneni(odchod, dnes, now),
      dalsi: !dalsi
        ? 'dnes nikdo nepřijede'
        : prijezdCas
          ? `další host v ${zobrazCas(prijezdCas)}`
          : 'další host dnes, čas neznámý',
      dalsiJmeno: dalsi?.jmeno || null,
      dalsiRezervace: dalsi?.rezervace || null,
      prijezdCas,
      maPrijezd: Boolean(dalsi),
      prvni: false,
      nestihneSeDo: null,
      uklizenoKdy: odchod.uklizenoKdy,
      uklizenoKdo: odchod.uklizenoKdo,
      prevzato,
    });
    sloty.push({
      id: aptId,
      uvolneni: uvolneniMinut(odchod),
      predani: predaniMinut(dalsi),
      uklizeno: Boolean(odchod.uklizenoKdy),
    });
  }

  const poradi = seradUklidPoradi(sloty);
  const podleKlic = new Map(surove.map((r) => [r.apartman, r]));
  const uklid: UklidRadek[] = [];
  for (const p of poradi) {
    const r = podleKlic.get(p.id);
    if (!r) continue;
    uklid.push({
      ...r,
      nestihneSeDo: p.nestihneSeDo != null ? zobrazCas(casZMinut(p.nestihneSeDo)) : null,
    });
  }
  const prvni = uklid.find((r) => !r.uklizenoKdy);
  if (prvni) prvni.prvni = true;

  const odjezdy = seradPodleCasu(odjezdyHoste, (h) => h.casOdjezdu, (h) => h.apartman || '').map(
    (h): OdjezdRadek => ({
      rezervace: h.rezervace,
      apartman: h.apartman || 'Apartmán',
      jmeno: h.jmeno,
      cas: jeHodina(h.casOdjezdu) ? zobrazCas(h.casOdjezdu) : 'čas neznámý',
      casZnamy: jeHodina(h.casOdjezdu),
      dluh: h.dluh,
    }),
  );

  const prijezdyMap = seradPodleCasu(prijezdyHoste, (h) => h.casPrijezdu, (h) => h.apartman || '').map(
    (h): PrijezdRadek => ({
      rezervace: h.rezervace,
      apartman: h.apartman || 'Apartmán',
      jmeno: h.jmeno,
      cas: jeHodina(h.casPrijezdu) ? zobrazCas(h.casPrijezdu) : 'čas neznámý',
      casZnamy: jeHodina(h.casPrijezdu),
      zpusob: textZpusobu(h.zpusob),
      brana: textBrany(h.brana),
      faze: h.faze,
      predanoKdy: h.predanoKdy || null,
    }),
  );
  const prijezdy = [
    ...prijezdyMap.filter((r) => !r.predanoKdy),
    ...prijezdyMap.filter((r) => r.predanoKdy),
  ];

  return {
    uklid,
    odjezdy,
    prijezdy,
    nedoplatky: odjezdy
      .filter((r) => r.dluh)
      .map((r) => ({ rezervace: r.rezervace, apartman: r.apartman, jmeno: r.jmeno, text: r.dluh })),
    chyby,
  };
}

export function textRano(p: DnesekPohled): string {
  const casti: string[] = [];
  if (p.odjezdy.length) casti.push(sklon(p.odjezdy.length, 'odjezd', 'odjezdy', 'odjezdů'));
  if (p.prijezdy.length) casti.push(sklon(p.prijezdy.length, 'příjezd', 'příjezdy', 'příjezdů'));
  if (p.nedoplatky.length) casti.push(sklon(p.nedoplatky.length, 'nedoplatek', 'nedoplatky', 'nedoplatků'));
  let text = `Dnes: ${casti.join(', ')}.`;
  const i = p.uklid.findIndex((r) => r.prvni);
  const prvni = i >= 0 ? p.uklid[i] : undefined;
  if (prvni) {
    const zavorka = jeHodina(prvni.prijezdCas) ? `host v ${zobrazCas(prvni.prijezdCas)}` : 'čas neznámý';
    const dalsi = p.uklid[i + 1];
    text += ` Uklidit první ${prvni.apartman} (${zavorka})${dalsi ? `, pak ${dalsi.apartman}` : ''}.`;
  }
  return text;
}

export function textZmenyPoradi(p: DnesekPohled): string | null {
  const prvni = p.uklid.find((r) => r.prvni);
  if (!prvni || prvni.uklizenoKdy) return null;
  const zavorka = jeHodina(prvni.prijezdCas) ? `host v ${zobrazCas(prvni.prijezdCas)}` : 'čas neznámý';
  return `Pořadí úklidu se změnilo: ${prvni.apartman} první (${zavorka}).`;
}

export function klicUklidu(den: string, p: DnesekPohled): string {
  return `${den}:${p.uklid.filter((r) => !r.uklizenoKdy).map((r) => r.apartman).join(',')}`;
}
