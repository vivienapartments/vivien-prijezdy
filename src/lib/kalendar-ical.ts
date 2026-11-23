/**
 * Obsazenost z Better Hotel iCal (jen data, žádná jména).
 * URL jen z env ICAL_V1…ICAL_V5 – nikdy nelogovat.
 */
import {
  zajistiDen,
  nociPobytu,
  type KalendarDenni,
} from './kalendar-denni';
import { kalendarKlic } from './kalendar-klic';
import type { ProcessStore } from './store';
import { posliTelegram } from './telegram';
import { APT_IDS, type AptId } from './types';

export const KLIC_KALENDAR_ICAL = 'kalendar-ical';

export type IcalUloziste = {
  nacteno: string | null;
  /** Obsazené noci po apartmánech (YYYY-MM-DD). */
  noci: Partial<Record<AptId, string[]>>;
  /** První neúspěch v řadě (ISO), null po úspěchu. */
  chybaOd: string | null;
  telegramOdeslan: boolean;
};

export const PRAZDNA_ICAL: IcalUloziste = {
  nacteno: null,
  noci: {},
  chybaOd: null,
  telegramOdeslan: false,
};

const APT_ENV: Record<AptId, string> = {
  V1: 'ICAL_V1',
  V2: 'ICAL_V2',
  V3: 'ICAL_V3',
  V4: 'ICAL_V4',
  V5: 'ICAL_V5',
};

function envUrl(apt: AptId): string | null {
  const v = process.env[APT_ENV[apt]]?.trim();
  return v && /^https:\/\//i.test(v) ? v : null;
}

/** Parsuje DTSTART/DTEND z iCal (DATE nebo DATE-TIME) → YYYY-MM-DD. */
export function icalDatumNaYmd(raw: string): string | null {
  const cisty = raw.replace(/^VALUE=DATE:/i, '').replace(/[^0-9T]/g, '');
  if (/^\d{8}$/.test(cisty)) {
    return `${cisty.slice(0, 4)}-${cisty.slice(4, 6)}-${cisty.slice(6, 8)}`;
  }
  if (/^\d{8}T\d{6}/.test(cisty)) {
    return `${cisty.slice(0, 4)}-${cisty.slice(4, 6)}-${cisty.slice(6, 8)}`;
  }
  return null;
}

/**
 * Z iCal textu vytáhne jen intervaly DTSTART–DTEND.
 * SUMMARY/DESCRIPTION se nečtou.
 */
export function parsujIcalObsazeneNoci(ical: string): string[] {
  const noci = new Set<string>();
  const bloky = ical.split(/BEGIN:VEVENT/i).slice(1);
  for (const blok of bloky) {
    const cast = blok.split(/END:VEVENT/i)[0] || '';
    const startM = cast.match(/DTSTART(?:;[^:]*)?:([^\r\n]+)/i);
    const endM = cast.match(/DTEND(?:;[^:]*)?:([^\r\n]+)/i);
    if (!startM || !endM) continue;
    const prijezd = icalDatumNaYmd(startM[1].trim());
    const odjezd = icalDatumNaYmd(endM[1].trim());
    if (!prijezd || !odjezd) continue;
    for (const d of nociPobytu(prijezd, odjezd)) noci.add(d);
  }
  return [...noci].sort();
}

export async function nactiIcalUloziste(store: ProcessStore): Promise<IcalUloziste> {
  const raw = await store.getKv(kalendarKlic(KLIC_KALENDAR_ICAL));
  if (!raw) return { ...PRAZDNA_ICAL, noci: {} };
  try {
    const j = JSON.parse(raw) as IcalUloziste;
    return {
      nacteno: j.nacteno || null,
      noci: j.noci || {},
      chybaOd: j.chybaOd || null,
      telegramOdeslan: Boolean(j.telegramOdeslan),
    };
  } catch {
    return { ...PRAZDNA_ICAL, noci: {} };
  }
}

async function ulozIcalUloziste(store: ProcessStore, data: IcalUloziste): Promise<void> {
  await store.setKv(kalendarKlic(KLIC_KALENDAR_ICAL), JSON.stringify(data));
}

async function stahniJeden(url: string): Promise<string> {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'text/calendar, text/plain, */*' },
  });
  if (!res.ok) throw new Error(`ical-http-${res.status}`);
  return await res.text();
}

export type IcalNacteniVysledek = {
  ok: boolean;
  nacteno: string | null;
  pocetNoci: number;
  chyba?: string;
};

/** Stáhne všech 5 iCal a uloží jen obsazená data. */
export async function obnovIcalObsazenost(store: ProcessStore): Promise<IcalNacteniVysledek> {
  const pred = await nactiIcalUloziste(store);
  const noci: Partial<Record<AptId, string[]>> = {};
  try {
    for (const apt of APT_IDS) {
      const url = envUrl(apt);
      if (!url) throw new Error(`chybi-env-${apt}`);
      const text = await stahniJeden(url);
      noci[apt] = parsujIcalObsazeneNoci(text);
    }
    const ted = new Date().toISOString();
    let pocet = 0;
    for (const apt of APT_IDS) pocet += noci[apt]?.length || 0;
    await ulozIcalUloziste(store, {
      nacteno: ted,
      noci,
      chybaOd: null,
      telegramOdeslan: false,
    });
    return { ok: true, nacteno: ted, pocetNoci: pocet };
  } catch (err) {
    const chybaOd = pred.chybaOd || new Date().toISOString();
    const ted = Date.now();
    const od = Date.parse(chybaOd);
    const hodina = Number.isFinite(od) && ted - od >= 60 * 60 * 1000;
    let telegramOdeslan = pred.telegramOdeslan;
    if (hodina && !telegramOdeslan) {
      try {
        await posliTelegram(
          'iCal z Better Hotelu nejde načíst – obsazenost se neaktualizuje.',
          'automat',
        );
        telegramOdeslan = true;
      } catch {
        /* */
      }
    }
    await ulozIcalUloziste(store, {
      nacteno: pred.nacteno,
      noci: pred.noci,
      chybaOd,
      telegramOdeslan,
    });
    return {
      ok: false,
      nacteno: pred.nacteno,
      pocetNoci: Object.values(pred.noci).reduce((s, a) => s + (a?.length || 0), 0),
      chyba: err instanceof Error ? err.message.replace(/https?:\S+/gi, '[url]') : 'ical',
    };
  }
}

/** Obnoví jen když je poslední úspěch starší než 10 min (nebo nikdy). */
export async function obnovIcalKdyzStary(store: ProcessStore): Promise<void> {
  const pred = await nactiIcalUloziste(store);
  if (pred.nacteno) {
    const t = Date.parse(pred.nacteno);
    if (Number.isFinite(t) && Date.now() - t < 10 * 60 * 1000) return;
  }
  await obnovIcalObsazenost(store);
}

/** Počet obsazených nocí v příštích 90 dnech (od dneška UTC). */
export function pocetIcalNoci90(data: IcalUloziste, dnesYmd: string): number {
  const konec = new Date(`${dnesYmd}T12:00:00Z`);
  konec.setUTCDate(konec.getUTCDate() + 90);
  const konecYmd = `${konec.getUTCFullYear()}-${String(konec.getUTCMonth() + 1).padStart(2, '0')}-${String(konec.getUTCDate()).padStart(2, '0')}`;
  let n = 0;
  for (const apt of APT_IDS) {
    for (const d of data.noci[apt] || []) {
      if (d >= dnesYmd && d < konecYmd) n += 1;
    }
  }
  return n;
}

/**
 * Složí obsazenost: iCal (když je) NEBO xlsx záloha (jen kde iCal nemá noc) NEBO rez.
 * Ceny z `zaklad` zůstávají.
 */
export function sloucitObsazenostIcal(
  zaklad: KalendarDenni,
  ical: IcalUloziste,
): KalendarDenni {
  const out: KalendarDenni = {};
  for (const [ymd, den] of Object.entries(zaklad)) {
    out[ymd] = { ...den };
    for (const apt of APT_IDS) {
      out[ymd][apt] = { ...den[apt] };
    }
  }

  const icalMaData = Boolean(ical.nacteno);
  const icalNoci = new Set<string>();
  if (icalMaData) {
    for (const apt of APT_IDS) {
      for (const d of ical.noci[apt] || []) icalNoci.add(`${apt}:${d}`);
    }
    // Kde iCal běží: nejdřív vyčisti obsazeno z xlsx, pak nastav z iCal.
    for (const ymd of Object.keys(out)) {
      for (const apt of APT_IDS) {
        out[ymd][apt] = { ...out[ymd][apt], obsazeno: false };
      }
    }
    for (const apt of APT_IDS) {
      for (const d of ical.noci[apt] || []) {
        const den = zajistiDen(out, d);
        // zachovej cenu z zakladu, pokud existuje
        const cena = zaklad[d]?.[apt]?.cena ?? den[apt].cena;
        den[apt] = { ...den[apt], cena, obsazeno: true };
      }
    }
    // Záloha xlsx jen pro dny/apty, které iCal vůbec neuvádí jako event noc
    // (xlsx obsazeno zůstane jen když apt:den není v iCal množině – ale iCal
    // „volno“ je absence eventů. Záloha = když iCal není načtený.)
    void icalNoci;
  }
  // Bez iCal: nech xlsx obsazeno v `out` (zkopírováno výše).
  return out;
}
