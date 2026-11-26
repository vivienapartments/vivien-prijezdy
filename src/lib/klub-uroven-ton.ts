/**
 * Barvy klubové kartičky a tónu celé karty podle úrovně.
 * Schváleno majitelem 26. 11. 2026 (PROMPT-KARTA-TLACITKA-A-STAVY).
 */

export type KlubTonId = 'host' | 'staly' | 'bronz' | 'stribrny' | 'zlaty' | 'platinovy';

export type KlubTon = {
  id: KlubTonId;
  /** Gradient kartičky: hlavní barva. */
  karticka: string;
  /** Gradient kartičky: tmavý konec. */
  kartickaTmava: string;
  acc: string;
  bg: string;
  mid: string;
  tile: string;
  tb: string;
  tx: string;
  sec: string;
};

/** Pevné barvy (ne podle úrovně). */
export const KLUB_MODRA = '#4580b8';
export const KLUB_SEDA_CEKA = '#a89c86';
export const KLUB_ZLATY_PRUVODCE = '#c9a84c';

export const KLUB_TONY: Record<KlubTonId, KlubTon> = {
  host: {
    id: 'host',
    karticka: '#cbbfa6',
    kartickaTmava: '#2a251d',
    acc: '#cbbfa6',
    bg: '#1d1b17',
    mid: '#3b372f',
    tile: '#2b2822',
    tb: '#7d7462',
    tx: '#efe7d6',
    sec: '#a39a88',
  },
  staly: {
    id: 'staly',
    karticka: '#d9b88a',
    kartickaTmava: '#2c2516',
    acc: '#d9b88a',
    bg: '#1f1a13',
    mid: '#40352a',
    tile: '#30271c',
    tb: '#8c7352',
    tx: '#f2dfc0',
    sec: '#a8977d',
  },
  bronz: {
    id: 'bronz',
    karticka: '#c58a55',
    kartickaTmava: '#2e1f14',
    acc: '#d4955e',
    bg: '#1f1610',
    mid: '#45301f',
    tile: '#35241a',
    tb: '#93603a',
    tx: '#f4cfab',
    sec: '#ad9078',
  },
  stribrny: {
    id: 'stribrny',
    karticka: '#c9ced4',
    kartickaTmava: '#22262b',
    acc: '#cfd5db',
    bg: '#16181b',
    mid: '#32373d',
    tile: '#24292e',
    tb: '#737b84',
    tx: '#e9edf1',
    sec: '#959ca4',
  },
  zlaty: {
    id: 'zlaty',
    karticka: '#e0b84a',
    kartickaTmava: '#2f2410',
    acc: '#e3bc4c',
    bg: '#1d170e',
    mid: '#463717',
    tile: '#332811',
    tb: '#9c7b25',
    tx: '#f8e29a',
    sec: '#ab9a6e',
  },
  platinovy: {
    id: 'platinovy',
    karticka: '#dfe6ea',
    kartickaTmava: '#1f262b',
    acc: '#e3eaee',
    bg: '#13171a',
    mid: '#2e363c',
    tile: '#202a31',
    tb: '#7f8c95',
    tx: '#f0f5f8',
    sec: '#94a0a8',
  },
};

export function tonZUrovneId(urovenId: string | null | undefined): KlubTon {
  const id = (urovenId || 'host') as KlubTonId;
  return KLUB_TONY[id] || KLUB_TONY.host;
}

export function kartickaGradient(ton: KlubTon): string {
  const c = ton.karticka;
  return `linear-gradient(135deg, ${c} 0%, ${c}d9 50%, ${ton.kartickaTmava} 150%)`;
}
