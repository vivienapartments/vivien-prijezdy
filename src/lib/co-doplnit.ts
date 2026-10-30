import { posunDen } from './brana';
import type { PrehledRadek } from './prehled';
import { chybejiciKroky } from './vstup-pruvodce';

const DNY = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

export type FiltrDoplnit = 'vse' | 'bez_checkinu' | 'bez_pruvodce' | 'bez_telefonu';

export type PoctyStitkuDoplnit = {
  bez_checkinu: number;
  bez_pruvodce: number;
  bez_telefonu: number;
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

/** Chybí odkaz na check-in (ne hotový check-in u hosta). */
export function chybiCheckin(row: Pick<PrehledRadek, 'stav' | 'checkinUrl'>): boolean {
  if (row.stav !== 'bez_checkinu') return false;
  return !(row.checkinUrl || '').trim();
}

/** Okno Domů: dnes až +14 dní, nezrušení, nepředaní. */
export function vOkneDoplnit(
  row: Pick<PrehledRadek, 'stav' | 'prijezd' | 'predano'>,
  dnes: string,
): boolean {
  if (row.stav === 'zruseno' || row.predano) return false;
  if (!row.prijezd) return false;
  const max = posunDen(dnes, 14);
  return row.prijezd >= dnes && row.prijezd <= max;
}

/** Check-in hotový, ale chybí otevření / čas / způsob / pravidla. */
export function chybiPruvodce(
  row: Pick<
    PrehledRadek,
    | 'stav'
    | 'predano'
    | 'otevrenoPocet'
    | 'casPrijezdu'
    | 'zpusobPrijezdu'
    | 'telefonBrana'
    | 'spz'
    | 'spzPujcene'
    | 'souhlas'
  >,
): boolean {
  if (row.stav === 'zruseno' || row.stav === 'bez_checkinu' || row.predano) return false;
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

/** Filtr „Vše“: chybí odkaz na check-in nebo telefon. */
export function hosteCoDoplnit(radky: PrehledRadek[], dnes: string): PrehledRadek[] {
  return hosteCoDoplnitFiltr(radky, dnes, 'vse');
}

export function hosteCoDoplnitFiltr(
  radky: PrehledRadek[],
  dnes: string,
  filtr: FiltrDoplnit,
): PrehledRadek[] {
  return radky
    .filter((r) => vOkneDoplnit(r, dnes))
    .filter((r) => {
      if (filtr === 'vse') return chybiCheckin(r) || chybiTelefon(r);
      if (filtr === 'bez_checkinu') return r.stav === 'bez_checkinu';
      if (filtr === 'bez_pruvodce') return chybiPruvodce(r);
      return chybiTelefon(r);
    })
    .sort(seradDoplnit);
}

export function poctyStitkuDoplnit(radky: PrehledRadek[], dnes: string): PoctyStitkuDoplnit {
  const okno = radky.filter((r) => vOkneDoplnit(r, dnes));
  return {
    bez_checkinu: okno.filter((r) => r.stav === 'bez_checkinu').length,
    bez_pruvodce: okno.filter((r) => chybiPruvodce(r)).length,
    bez_telefonu: okno.filter((r) => chybiTelefon(r)).length,
  };
}

export function zkratOdkaz(url: string, max = 42): string {
  const t = url.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
