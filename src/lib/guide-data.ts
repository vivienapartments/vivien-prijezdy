import apartmanyJson from '@/data/apartmany.json';
import pruvodceJson from '@/data/pruvodce.json';
import { AUTO_SECTION_ORDER, PARKING_ONLY_SECTIONS } from './constants';
import type { AptId, AptRecord, Prijezd, Sekce } from './types';
import { SECTION_NAV } from './texts';
import { t } from './i18n';
import type { GuideLang } from './types';

export const apartmany = (apartmanyJson as { apartmany: AptRecord[] }).apartmany;
export const sekceAll = (pruvodceJson as { sekce: Sekce[] }).sekce;

function visibleItem(item: { apartmany?: string[]; stav?: string }, apt: AptId): boolean {
  if (item.stav === 'chybi_podklad') return false;
  const apts = item.apartmany;
  if (!apts?.length) return true;
  return apts.includes(apt);
}

export function aptRecord(apt: AptId): AptRecord {
  return apartmany.find((a) => a.id === apt) ?? apartmany[0];
}

export function visibleSekce(apt: AptId, prijezd: Prijezd | null): Sekce[] {
  if (!prijezd) return [];
  const list = sekceAll.filter(
    (s) => visibleItem(s, apt) && !(prijezd === 'pesky' && PARKING_ONLY_SECTIONS.has(s.id)),
  );
  if (prijezd !== 'auto') return list;
  return [...list].sort((a, b) => {
    const ai = AUTO_SECTION_ORDER.indexOf(a.id);
    const bi = AUTO_SECTION_ORDER.indexOf(b.id);
    const av = ai === -1 ? 100 + list.findIndex((x) => x.id === a.id) : ai;
    const bv = bi === -1 ? 100 + list.findIndex((x) => x.id === b.id) : bi;
    return av - bv;
  });
}

export function visibleKroky(s: Sekce, apt: AptId) {
  return (s.kroky ?? []).filter((k) => visibleItem(k, apt));
}

export function sectionNavLabel(s: Sekce, lang: GuideLang): string {
  return SECTION_NAV[s.id] ?? t(s.nadpis, lang) ?? s.id;
}

export function stepLabel(index: number): string {
  const n = index + 1;
  return n < 10 ? `0${n}` : String(n);
}
