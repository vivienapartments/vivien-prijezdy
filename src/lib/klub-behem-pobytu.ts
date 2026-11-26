/**
 * Úroveň během probíhajícího pobytu (očekávaná útrata).
 * Oficiální zápis až po předání. Schváleno 26. 11. 2026.
 */

import {
  urovenZUtraty,
  type KlubPravidla,
  type KlubUroven,
  VYCHOZI_KLUB_PRAVIDLA,
} from './klub-pravidla';

export type BehemPobytuVstup = {
  /** Započtená útrata (po předání). */
  utrataKc: number;
  /** Cena probíhajícího pobytu. 0 = není / nepočítat. */
  probihajiciKc: number;
  /** Právě bydlí (dnes ≥ příjezd, ještě nepředáno). */
  praveBydli: boolean;
  /** Firma → názvy partner. */
  jeFirma?: boolean;
};

export type BehemPobytuVysledek = {
  oficielni: KlubUroven;
  ocekavanaUtrataKc: number;
  zobrazena: KlubUroven;
  /** true = probíhající pobyt posune do vyšší úrovně. */
  posuneUroven: boolean;
  slevaPct: number;
};

/**
 * Před příjezdem se nic nepočítá dopředu.
 * Během pobytu: očekávaná = útrata + cena probíhajícího.
 * Po předání (praveBydli=false): jen oficiální útrata.
 */
export function urovenBehemPobytu(
  vstup: BehemPobytuVstup,
  pravidla: KlubPravidla = VYCHOZI_KLUB_PRAVIDLA,
): BehemPobytuVysledek {
  const utrata = Math.max(0, Math.round(vstup.utrataKc || 0));
  const probihajici =
    vstup.praveBydli && vstup.probihajiciKc > 0
      ? Math.max(0, Math.round(vstup.probihajiciKc))
      : 0;
  const oficielni = urovenZUtraty(utrata, pravidla);
  const ocekavanaUtrataKc = utrata + probihajici;
  const zobrazena = urovenZUtraty(ocekavanaUtrataKc, pravidla);
  const posuneUroven = Boolean(probihajici > 0 && zobrazena.odKc > oficielni.odKc);
  return {
    oficielni,
    ocekavanaUtrataKc,
    zobrazena,
    posuneUroven,
    slevaPct: zobrazena.slevaPct,
  };
}

export function textPosunUrovne(
  uroven: KlubUroven,
  jeFirma: boolean,
): { nadpis: string; telo: string; legendaOk: string } {
  const nazev = jeFirma ? uroven.nazevFirma : uroven.nazevHost;
  const kratce = nazev.replace(/\s+(host|partner)$/i, '').trim() || nazev;
  return {
    nadpis: nazev,
    telo: `Tímto pobytem jste ${nazev}. ${uroven.slevaPct} % platí už pro rezervaci, kterou uděláte teď.`,
    legendaOk: `${kratce} ✓`,
  };
}
