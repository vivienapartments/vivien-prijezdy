import { HOUSE_KEY_TAG, apartmentPinOrDoplnit, codesOrder, gardenCodeForApt } from './access-codes';
import { t } from './i18n';
import * as TX from './texts';
import type { AptId, GuideLang } from './types';

export type KodRadek = {
  kind: 'dum' | 'apt' | 'zahrada';
  label: string;
  value: string;
};

/** Apartmán se na klávesnici potvrzuje mřížkou. Když kód chybí, mřížka se nepřidá. */
function kodApartmanu(accessPin: string | null): string {
  const pin = apartmentPinOrDoplnit(accessPin);
  if (pin === 'DOPLNIT' || pin.endsWith('#')) return pin;
  return `${pin}#`;
}

/** Řádky boxu Vaše kódy. Dům je samotné číslo, klíček kreslí stránka. Apartmán má na konci #. */
export function kodoveRadky(apt: AptId, accessPin: string | null, lang: GuideLang): KodRadek[] {
  return codesOrder(apt).map((kind) => {
    const label =
      kind === 'dum' ? TX.kodDumLabel : kind === 'apt' ? TX.kodAptLabel : TX.kodZahradaLabel;
    const value =
      kind === 'dum'
        ? HOUSE_KEY_TAG
        : kind === 'apt'
          ? kodApartmanu(accessPin)
          : gardenCodeForApt(apt, accessPin);
    return { kind, label: t(label, lang), value };
  });
}

/** Bez předání vrací null. Do stránky se pak žádný kód nedostane. */
export function kodyProHosta(
  predano: boolean,
  apt: AptId,
  accessPin: string | null,
  lang: GuideLang,
): KodRadek[] | null {
  if (!predano) return null;
  return kodoveRadky(apt, accessPin, lang);
}
