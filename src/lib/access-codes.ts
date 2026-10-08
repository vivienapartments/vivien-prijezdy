import type { AptId } from './types';

/** Stálý identifikátor klíčku ke vchodu do domu. */
export const HOUSE_KEY_TAG = '9000';

/** Zahrada: V1 / V4 / V5. */
export const GARDEN_CODE_STREET = '9000#';

export type CodeKind = 'dum' | 'apt' | 'zahrada';

/** Pořadí kódů podle cesty hosta. */
export function codesOrder(apt: AptId): CodeKind[] {
  if (apt === 'V2' || apt === 'V3') return ['dum', 'zahrada', 'apt'];
  return ['dum', 'apt', 'zahrada'];
}

/**
 * Kód zahrady.
 * V1 / V4 / V5: 9000#
 * V2 / V3: stejný jako ACCESS_PIN apartmánu
 */
export function gardenCodeForApt(apt: AptId, accessPin: string | null | undefined): string {
  if (apt === 'V2' || apt === 'V3') {
    const pin = (accessPin || '').trim();
    return pin || 'DOPLNIT';
  }
  return GARDEN_CODE_STREET;
}

export function apartmentPinOrDoplnit(accessPin: string | null | undefined): string {
  const pin = (accessPin || '').trim();
  return pin || 'DOPLNIT';
}
