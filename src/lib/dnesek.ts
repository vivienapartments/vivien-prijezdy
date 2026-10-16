import { CHECKOUT, PREVZETI_NEZNAMY_HODINA, PREVZETI_PO_HODINACH } from './constants';
import { jeHodina, polozkyZRezervace, textRozpisu, zobrazCas } from './odjezd';
import type { RezervaceRecord } from './store';
import { APT_IDS, type AptId } from './types';
import { casPrevzetiText, casPrevzetiVyprsel, jeVDnesnichOdjezdech } from './zalozky';

export type KdoUklidil = 'pravoslav' | 'nikol';

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
};

export type UklidRadek = {
  rezervace: string;
  apartman: string;
  uvolni: string;
  dalsi: string;
  prijezdCas: string | null;
  maPrijezd: boolean;
  prvni: boolean;
  uklizenoKdy: string | null;
  uklizenoKdo: KdoUklidil | null;
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
  const jmeno = kdo === 'nikol' ? 'Nikol' : 'Pravoslav';
  return cas ? `Uklizeno ${cas} · ${jmeno}` : `Uklizeno · ${jmeno}`;
}

export function oznacUklid(rec: RezervaceRecord, kdo: KdoUklidil, now = new Date()): RezervaceRecord {
  const co = kdo === 'nikol' ? 'Úklid označila Nikol' : 'Úklid označil Pravoslav';
  return {
    ...rec,
    uklizenoKdy: now.toISOString(),
    uklizenoKdo: kdo,
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
    if (!host.apartman) continue;
    const list = podleApt.get(host.apartman) || [];
    list.push(host);
    podleApt.set(host.apartman, list);
  }

  const uklid: UklidRadek[] = [];
  for (const [apt, odchazeji] of podleApt) {
    const odchod = [...odchazeji].sort((a, b) => {
      const ac = jeHodina(a.casOdjezdu) ? minuty(a.casOdjezdu) : 24 * 60;
      const bc = jeHodina(b.casOdjezdu) ? minuty(b.casOdjezdu) : 24 * 60;
      if (ac !== bc) return ac - bc;
      return a.rezervace.localeCompare(b.rezervace);
    })[0];
    const kandidati = prijezdyHoste.filter((h) => h.apartman === apt && h.rezervace !== odchod.rezervace);
    const zname = seradPodleCasu(
      kandidati.filter((h) => jeHodina(h.casPrijezdu)),
      (h) => h.casPrijezdu,
      (h) => h.apartman || '',
    );
    const dalsi = zname[0] || kandidati[0] || null;
    const prijezdCas = dalsi && jeHodina(dalsi.casPrijezdu) ? dalsi.casPrijezdu : null;
    uklid.push({
      rezervace: odchod.rezervace,
      apartman: apt,
      uvolni: textUvolneni(odchod, dnes, now),
      dalsi: !dalsi
        ? 'dnes nikdo nepřijede'
        : prijezdCas
          ? `další host v ${zobrazCas(prijezdCas)}`
          : 'další host dnes, čas neznámý',
      prijezdCas,
      maPrijezd: Boolean(dalsi),
      prvni: false,
      uklizenoKdy: odchod.uklizenoKdy,
      uklizenoKdo: odchod.uklizenoKdo,
    });
  }

  uklid.sort((a, b) => {
    const skupina = (r: UklidRadek) => (!r.maPrijezd ? 2 : r.prijezdCas ? 0 : 1);
    const sa = skupina(a);
    const sb = skupina(b);
    if (sa !== sb) return sa - sb;
    if (sa === 0 && a.prijezdCas && b.prijezdCas) {
      const d = minuty(a.prijezdCas) - minuty(b.prijezdCas);
      if (d) return d;
    }
    return poradiApt(a.apartman) - poradiApt(b.apartman);
  });
  const prvni = uklid.find((r) => r.maPrijezd);
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

  const prijezdy = seradPodleCasu(prijezdyHoste, (h) => h.casPrijezdu, (h) => h.apartman || '').map(
    (h): PrijezdRadek => ({
      rezervace: h.rezervace,
      apartman: h.apartman || 'Apartmán',
      jmeno: h.jmeno,
      cas: jeHodina(h.casPrijezdu) ? zobrazCas(h.casPrijezdu) : 'čas neznámý',
      casZnamy: jeHodina(h.casPrijezdu),
      zpusob: textZpusobu(h.zpusob),
      brana: textBrany(h.brana),
      faze: h.faze,
    }),
  );

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
  return `${den}:${p.uklid.map((r) => r.apartman).join(',')}`;
}
