import { posunDen } from './brana';
import type { PrehledRadek } from './prehled';

const DNY = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

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

export function chybiCheckin(row: Pick<PrehledRadek, 'stav'>): boolean {
  return row.stav === 'bez_checkinu';
}

/** Nezrušení s příjezdem dnes až +14 dní, kterým chybí check-in nebo telefon. */
export function hosteCoDoplnit(radky: PrehledRadek[], dnes: string): PrehledRadek[] {
  const max = posunDen(dnes, 14);
  return radky
    .filter((r) => r.stav !== 'zruseno' && r.prijezd && r.prijezd >= dnes && r.prijezd <= max)
    .filter((r) => chybiCheckin(r) || chybiTelefon(r))
    .sort((a, b) => {
      const d = (a.prijezd || '').localeCompare(b.prijezd || '');
      if (d) return d;
      return (a.apartman || '').localeCompare(b.apartman || '', 'cs');
    });
}

export function zkratOdkaz(url: string, max = 42): string {
  const t = url.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
