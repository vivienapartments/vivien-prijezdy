import { posunDen } from './brana';
import type { PrehledRadek } from './prehled';
import {
  pocetCasovychPripoinek,
  pocetCheckinPripoinek,
  vyzvaNaRade,
} from './pripominky-stupne';
import { chybejiciKroky } from './vstup-pruvodce';

const DNY = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

/** Telefon a první výzvy: Domů hledí 14 dní dopředu. */
export const DOPLNIT_OKNO_DNY = 14;
/** Check-in znovu (po 1. výzvě) až 2 dny před příjezdem. */
export const DOPLNIT_CHECKIN_ZNOVU_DNY = 2;
/** Průvodce znovu (po 1. výzvě) až 2 dny před příjezdem. */
export const DOPLNIT_PRUVODCE_ZNOVU_DNY = 2;

export type FiltrDoplnit = 'vse' | 'bez_checkinu' | 'bez_pruvodce' | 'bez_telefonu';

export type PoctyStitkuDoplnit = {
  bez_checkinu: number;
  bez_pruvodce: number;
  bez_telefonu: number;
  /** Aspoň jeden host má výzvu teď na řadě. */
  checkinNaRade: boolean;
  pruvodceNaRade: boolean;
};

/** Příjezd jako „Pá 6. 11.“ */
export function formatPrijezdDoplnit(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  const den = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DNY[den]} ${d}.\u00A0${m}.`;
}

export function chybiTelefon(row: Pick<PrehledRadek, 'telefonText' | 'telefonWa'>): boolean {
  return !row.telefonText && !row.telefonWa;
}

/**
 * Ještě čekáme na online check-in.
 * Přímý host s „Bez check-inu“ (checkinNeniPotreba) se nepočítá.
 */
export function cekaNaCheckin(
  row: Pick<PrehledRadek, 'stav' | 'checkinNeniPotreba'>,
): boolean {
  return row.stav === 'bez_checkinu' && row.checkinNeniPotreba !== true;
}

/** Chybí odkaz na check-in (ne hotový check-in u hosta). */
export function chybiCheckin(
  row: Pick<PrehledRadek, 'stav' | 'checkinUrl' | 'checkinNeniPotreba'>,
): boolean {
  if (!cekaNaCheckin(row)) return false;
  return !(row.checkinUrl || '').trim();
}

/** Základ: dnes až +14 dní, bez zrušených, nedojezdů a předaných. */
export function vOkneDoplnit(
  row: Pick<PrehledRadek, 'stav' | 'prijezd' | 'predano' | 'nedojezdKdy'>,
  dnes: string,
): boolean {
  if (row.stav === 'zruseno' || row.predano || row.nedojezdKdy) return false;
  if (!row.prijezd) return false;
  const max = posunDen(dnes, DOPLNIT_OKNO_DNY);
  return row.prijezd >= dnes && row.prijezd <= max;
}

function prijezdDoDnu(prijezd: string, dnes: string, maxDni: number): boolean {
  return prijezd >= dnes && prijezd <= posunDen(dnes, maxDni);
}

/**
 * Check-in svítí v „Co doplnit“.
 * 1. výzva hned (i u vzdálené rezervace). Po odeslání klid, znovu až 2 dny před příjezdem.
 */
export function svitiCheckinDoplnit(
  row: Pick<
    PrehledRadek,
    'stav' | 'prijezd' | 'predano' | 'nedojezdKdy' | 'checkinNeniPotreba' | 'historie'
  >,
  dnes: string,
): boolean {
  if (row.stav === 'zruseno' || row.predano || row.nedojezdKdy) return false;
  if (!cekaNaCheckin(row) || !row.prijezd || row.prijezd < dnes) return false;
  const uzVyzva = pocetCheckinPripoinek(row.historie || []) > 0;
  if (!uzVyzva) return true;
  return prijezdDoDnu(row.prijezd, dnes, DOPLNIT_CHECKIN_ZNOVU_DNY);
}

/**
 * Průvodce svítí v „Co doplnit“.
 * 1. výzva po check-inu. Po odeslání klid, znovu až 2 dny před příjezdem.
 */
export function svitiPruvodceDoplnit(
  row: Pick<
    PrehledRadek,
    | 'stav'
    | 'prijezd'
    | 'predano'
    | 'nedojezdKdy'
    | 'otevrenoPocet'
    | 'casPrijezdu'
    | 'zpusobPrijezdu'
    | 'telefonBrana'
    | 'spz'
    | 'spzPujcene'
    | 'souhlas'
    | 'checkinNeniPotreba'
    | 'historie'
  >,
  dnes: string,
): boolean {
  if (!vOkneDoplnit(row, dnes) || !chybiPruvodce(row) || !row.prijezd) return false;
  const uzVyzva = pocetCasovychPripoinek(row.historie || []) > 0;
  if (!uzVyzva) return true;
  return prijezdDoDnu(row.prijezd, dnes, DOPLNIT_PRUVODCE_ZNOVU_DNY);
}

/** Check-in hotový, ale chybí otevření / čas / způsob / pravidla. */
export function chybiPruvodce(
  row: Pick<
    PrehledRadek,
    | 'stav'
    | 'predano'
    | 'nedojezdKdy'
    | 'otevrenoPocet'
    | 'casPrijezdu'
    | 'zpusobPrijezdu'
    | 'telefonBrana'
    | 'spz'
    | 'spzPujcene'
    | 'souhlas'
    | 'checkinNeniPotreba'
  >,
): boolean {
  if (row.stav === 'zruseno' || row.predano || row.nedojezdKdy) return false;
  /** Ještě čeká online check-in: nejdřív check-in, ne průvodce. */
  if (cekaNaCheckin(row)) return false;
  if ((row.otevrenoPocet ?? 0) === 0) return true;
  return (
    chybejiciKroky({
      cas: row.casPrijezdu,
      zpusob: row.zpusobPrijezdu,
      telefonBrana: row.telefonBrana,
      spz: row.spz,
      spzPujcene: Boolean(row.spzPujcene),
      souhlas: Boolean(row.souhlas),
    }).length > 0
  );
}

function seradDoplnit(a: PrehledRadek, b: PrehledRadek): number {
  const d = (a.prijezd || '').localeCompare(b.prijezd || '');
  if (d) return d;
  return (a.apartman || '').localeCompare(b.apartman || '', 'cs');
}

/** Filtr „Vše“: chybí odkaz na check-in (když svítí) nebo telefon. */
export function hosteCoDoplnit(radky: PrehledRadek[], dnes: string): PrehledRadek[] {
  return hosteCoDoplnitFiltr(radky, dnes, 'vse');
}

export function hosteCoDoplnitFiltr(
  radky: PrehledRadek[],
  dnes: string,
  filtr: FiltrDoplnit,
): PrehledRadek[] {
  return radky
    .filter((r) => {
      if (filtr === 'bez_checkinu') return svitiCheckinDoplnit(r, dnes);
      if (filtr === 'bez_pruvodce') return svitiPruvodceDoplnit(r, dnes);
      if (filtr === 'bez_telefonu') return vOkneDoplnit(r, dnes) && chybiTelefon(r);
      /** Vše: telefon v okně 14 dní, check-in i u vzdálené 1. výzvy. */
      return (chybiCheckin(r) && svitiCheckinDoplnit(r, dnes)) || (vOkneDoplnit(r, dnes) && chybiTelefon(r));
    })
    .sort(seradDoplnit);
}

export function poctyStitkuDoplnit(
  radky: PrehledRadek[],
  dnes: string,
  now = new Date(),
): PoctyStitkuDoplnit {
  const bezCheckinu = radky.filter((r) => svitiCheckinDoplnit(r, dnes));
  const bezPruvodce = radky.filter((r) => svitiPruvodceDoplnit(r, dnes));
  const oknoTel = radky.filter((r) => vOkneDoplnit(r, dnes));
  return {
    bez_checkinu: bezCheckinu.length,
    bez_pruvodce: bezPruvodce.length,
    bez_telefonu: oknoTel.filter((r) => chybiTelefon(r)).length,
    checkinNaRade: bezCheckinu.some((r) =>
      vyzvaNaRade('checkin', { historie: r.historie, prijezd: r.prijezd, dnes, now }),
    ),
    pruvodceNaRade: bezPruvodce.some((r) =>
      vyzvaNaRade('pruvodce', { historie: r.historie, prijezd: r.prijezd, dnes, now }),
    ),
  };
}

export function zkratOdkaz(url: string, max = 42): string {
  const t = url.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
