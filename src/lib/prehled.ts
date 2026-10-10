import apartmanyJson from '@/data/apartmany.json';
import type { MessageRecord, ProcessStore, RezervaceRecord } from './store';
import type { AptId } from './types';

export type PrehledStav =
  | 'odeslano'
  | 'zruseno'
  | 'chyba'
  | 'odmitnuto'
  | 'preskoceno'
  | 'duplicita';

export type PrehledRow = {
  id: string;
  rezervace: string;
  prijezd: string | null;
  odjezd: string | null;
  apartman: AptId | null;
  apartmanNazev: string;
  jmeno: string;
  email: string;
  stav: PrehledStav;
  stavLabel: string;
  maInfo: boolean;
  reason: string | null;
  processedAt: string;
};

type AptRow = { id: AptId; nazev: { cs: string; en: string } };
const apartmany = (apartmanyJson as { apartmany: AptRow[] }).apartmany;

const STAV_LABEL: Record<PrehledStav, string> = {
  odeslano: 'Má info',
  zruseno: 'Zrušeno',
  chyba: 'Chyba',
  odmitnuto: 'Odmítnuto',
  preskoceno: 'Přeskočeno',
  duplicita: 'Duplicita',
};

function aptNazev(id: AptId | null | undefined): string {
  if (!id) return '—';
  const a = apartmany.find((x) => x.id === id);
  if (!a) return id;
  return `${a.nazev.cs} (${id})`;
}

function messageStav(status: MessageRecord['status']): PrehledStav {
  if (status === 'sent') return 'odeslano';
  if (status === 'rejected') return 'odmitnuto';
  if (status === 'duplicate') return 'duplicita';
  if (status === 'error') return 'chyba';
  return 'preskoceno';
}

function fromRezervace(id: string, rec: RezervaceRecord): PrehledRow {
  const stav: PrehledStav = rec.status === 'zruseno' ? 'zruseno' : 'odeslano';
  return {
    id: `rez:${id}`,
    rezervace: id,
    prijezd: rec.prijezd || null,
    odjezd: rec.odjezd || null,
    apartman: rec.apartman || null,
    apartmanNazev: aptNazev(rec.apartman),
    jmeno: rec.jmeno?.trim() || '—',
    email: rec.emailHosta || '—',
    stav,
    stavLabel: STAV_LABEL[stav],
    maInfo: stav === 'odeslano',
    reason: null,
    processedAt: rec.processedAt,
  };
}

function fromMessage(rec: MessageRecord): PrehledRow | null {
  if (!rec.rezervace) return null;
  if (rec.status === 'sent' || rec.status === 'duplicate') return null;
  const stav = messageStav(rec.status);
  return {
    id: `msg:${rec.messageId}`,
    rezervace: rec.rezervace,
    prijezd: null,
    odjezd: null,
    apartman: null,
    apartmanNazev: '—',
    jmeno: '—',
    email: '—',
    stav,
    stavLabel: STAV_LABEL[stav],
    maInfo: false,
    reason: rec.reason || null,
    processedAt: rec.processedAt,
  };
}

/** Sloučí rezervace (má/zrušeno) + neúspěšné zprávy (nemá). */
export async function buildPrehledRows(store: ProcessStore): Promise<PrehledRow[]> {
  const [rezEntries, msgEntries] = await Promise.all([
    store.listRezervace(),
    store.listMessages(),
  ]);

  const byRez = new Map<string, PrehledRow>();

  for (const { id, record } of rezEntries) {
    byRez.set(id, fromRezervace(id, record));
  }

  for (const { record } of msgEntries) {
    const row = fromMessage(record);
    if (!row) continue;
    const existing = byRez.get(row.rezervace);
    // Když už je odesláno, neúspěšné starší zprávy nepřepisují.
    if (existing?.maInfo) continue;
    if (!existing || existing.processedAt < row.processedAt) {
      byRez.set(row.rezervace, row);
    }
  }

  return Array.from(byRez.values()).sort((a, b) => {
    const da = a.prijezd || a.processedAt;
    const db = b.prijezd || b.processedAt;
    return da < db ? 1 : da > db ? -1 : 0;
  });
}

/** Zobrazitelné jméno z GUEST_NAME nebo OSLOVENI. */
export function displayJmeno(guestName: string | null, osloveni: string | null): string | undefined {
  const g = guestName?.trim();
  if (g) return g;
  const o = osloveni?.trim();
  if (!o) return undefined;
  const cleaned = o
    .replace(/^Vážen[ýá]\s+/i, '')
    .replace(/^(pane|paní|pani)\s+/i, '')
    .replace(/[,.]+$/, '')
    .trim();
  return cleaned || undefined;
}
