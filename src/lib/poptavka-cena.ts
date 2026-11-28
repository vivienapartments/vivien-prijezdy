/**
 * Cena poptávky: výpočet a text pro přehled / potvrzení / Telegram.
 * Odděleno od poptavka.ts kvůli kruhu kalendar-denni ↔ poptavka.
 */
import {
  cenaApartmanuZaPobyt,
  nejlevnejsiVolnyPobyt,
  slevaPctCastka,
  type KalendarDenni,
} from './kalendar-denni';
import { formatKc } from './kalendar-texty';
import { POPTAVKA_SLEVA_PCT, type PoptavkaZaznam } from './poptavka';
import { APT_IDS } from './types';

/** Spočítá cenu pobytu pro uložení do poptávky (i když termín už držíme). */
export function spocitejCenuPoptavky(
  dny: KalendarDenni,
  z: Pick<PoptavkaZaznam, 'prijezd' | 'odjezd' | 'apartmany' | 'libovolnyApartman' | 'blokApt' | 'zdroj'>,
): { cenaKc: number | null; cenaSeSlevouKc: number | null } {
  const sleva =
    z.zdroj === 'vernost' || z.zdroj === 'doporucitel' || z.zdroj === 'obecna';
  let suma: number | null = null;
  const preferovane = z.blokApt
    ? [z.blokApt]
    : z.apartmany.length
      ? z.apartmany
      : [...APT_IDS];
  for (const apt of preferovane) {
    const c = cenaApartmanuZaPobyt(dny, apt, z.prijezd, z.odjezd);
    if (c != null && (suma == null || c < suma)) suma = c;
  }
  if (suma == null) {
    const volny = nejlevnejsiVolnyPobyt(
      dny,
      z.prijezd,
      z.odjezd,
      z.libovolnyApartman || !z.apartmany.length ? undefined : z.apartmany,
    );
    if (volny) suma = volny.suma;
  }
  if (suma == null) {
    for (const apt of APT_IDS) {
      const c = cenaApartmanuZaPobyt(dny, apt, z.prijezd, z.odjezd);
      if (c != null && (suma == null || c < suma)) suma = c;
    }
  }
  if (suma == null) return { cenaKc: null, cenaSeSlevouKc: null };
  return {
    cenaKc: suma,
    cenaSeSlevouKc: sleva ? slevaPctCastka(suma, POPTAVKA_SLEVA_PCT) : null,
  };
}

/** Text ceny pro přehled a Telegram (před i po slevě). */
export function textCenyPoptavky(
  cenaKc: number | null | undefined,
  cenaSeSlevouKc: number | null | undefined,
): string {
  if (cenaKc == null || !(cenaKc > 0)) return '';
  if (cenaSeSlevouKc != null && cenaSeSlevouKc > 0 && cenaSeSlevouKc !== cenaKc) {
    return `${formatKc(cenaKc)}, se slevou ${POPTAVKA_SLEVA_PCT} % ${formatKc(cenaSeSlevouKc)}`;
  }
  return formatKc(cenaKc);
}
