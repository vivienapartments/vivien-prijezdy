/**
 * Pravidla VIVIEN Klubu: úrovně, slevy, odměny, výplaty.
 * Měnitelná v přehledu (`klub:pravidla`).
 */

export type KlubUroven = {
  id: string;
  nazevHost: string;
  nazevFirma: string;
  odKc: number;
  slevaPct: number;
};

export type KlubPravidla = {
  urovne: KlubUroven[];
  /** 1–6 nocí: 0 %, 7–13: 10 %, 14+: 15 % (hranice a %). */
  slevaDelka: { odNoci: number; pct: number }[];
  slevaDoporucenyPct: number;
  slevaFirmaPct: number;
  /** Výchozí: až po prvním dokončeném (předaném) pobytu. */
  slevaUrovneOd: 'prvni-poptavka' | 'po-prvnim-odjezdu';
  odmenaPrvniPct: number;
  odmenaDalsiPct: number;
  odmenaDalsiMesicu: number;
  kreditPlatnostMesicu: number;
  vyplataMesice: number[];
  /** YYYY-MM-DD termíny bez slevy (délka i osobní). */
  specialniTerminy: string[];
  /** Kódy firem z oslovování (F01, F03, KUBOUSEK…) – rezervované. */
  rezervovaneKody: string[];
};

export const VYCHOZI_KLUB_PRAVIDLA: KlubPravidla = {
  urovne: [
    { id: 'host', nazevHost: 'Host', nazevFirma: 'Partner', odKc: 0, slevaPct: 5 },
    { id: 'staly', nazevHost: 'Stálý host', nazevFirma: 'Stálý partner', odKc: 8000, slevaPct: 6 },
    { id: 'bronz', nazevHost: 'Bronzový host', nazevFirma: 'Bronzový partner', odKc: 16000, slevaPct: 7 },
    { id: 'stribrny', nazevHost: 'Stříbrný host', nazevFirma: 'Stříbrný partner', odKc: 25000, slevaPct: 8 },
    { id: 'zlaty', nazevHost: 'Zlatý host', nazevFirma: 'Zlatý partner', odKc: 40000, slevaPct: 9 },
    { id: 'platinovy', nazevHost: 'Platinový host', nazevFirma: 'Platinový partner', odKc: 60000, slevaPct: 10 },
  ],
  slevaDelka: [
    { odNoci: 7, pct: 10 },
    { odNoci: 14, pct: 15 },
  ],
  slevaDoporucenyPct: 5,
  slevaFirmaPct: 5,
  slevaUrovneOd: 'po-prvnim-odjezdu',
  odmenaPrvniPct: 5,
  odmenaDalsiPct: 2,
  odmenaDalsiMesicu: 12,
  kreditPlatnostMesicu: 24,
  vyplataMesice: [1, 7],
  specialniTerminy: [],
  rezervovaneKody: ['F01', 'F03', 'KUBOUSEK'],
};

export function slevaDelkaPct(noci: number, pravidla: KlubPravidla = VYCHOZI_KLUB_PRAVIDLA): number {
  if (!Number.isFinite(noci) || noci < 1) return 0;
  let best = 0;
  for (const r of pravidla.slevaDelka) {
    if (noci >= r.odNoci && r.pct > best) best = r.pct;
  }
  return best;
}

export function urovenZUtraty(
  utrataKc: number,
  pravidla: KlubPravidla = VYCHOZI_KLUB_PRAVIDLA,
): KlubUroven {
  const serazene = [...pravidla.urovne].sort((a, b) => a.odKc - b.odKc);
  let aktualni = serazene[0];
  for (const u of serazene) {
    if (utrataKc >= u.odKc) aktualni = u;
  }
  return aktualni;
}

export type OsobniSlevaVstup = {
  /** firma objednatel */
  jeFirma?: boolean;
  /** doporučený kamarád na 1. pobytu */
  jeDoporucenyPrvniPobyt?: boolean;
  /** doporučitel bez vlastního dokončeného pobytu → 5 % na první vlastní */
  jeDoporucitelBezPobytu?: boolean;
  /** má už aspoň jeden dokončený (předaný) přímý pobyt */
  maDokoncenyPobyt?: boolean;
  utrataKc?: number;
};

export function slevaOsobniPct(
  vstup: OsobniSlevaVstup,
  pravidla: KlubPravidla = VYCHOZI_KLUB_PRAVIDLA,
): number {
  if (vstup.jeFirma) return pravidla.slevaFirmaPct;
  if (vstup.jeDoporucenyPrvniPobyt) return pravidla.slevaDoporucenyPct;
  if (vstup.jeDoporucitelBezPobytu && !vstup.maDokoncenyPobyt) {
    return pravidla.slevaDoporucenyPct;
  }
  const muzeUroven =
    pravidla.slevaUrovneOd === 'prvni-poptavka' || Boolean(vstup.maDokoncenyPobyt);
  if (!muzeUroven) return 0;
  return urovenZUtraty(vstup.utrataKc || 0, pravidla).slevaPct;
}

export type VyslednaSlevaVstup = OsobniSlevaVstup & {
  noci: number;
  /** příjezd YYYY-MM-DD – když je ve specialniTerminy, sleva 0 */
  prijezd?: string | null;
};

export function vyslednaSlevaPct(
  vstup: VyslednaSlevaVstup,
  pravidla: KlubPravidla = VYCHOZI_KLUB_PRAVIDLA,
): number {
  const den = (vstup.prijezd || '').trim();
  if (den && pravidla.specialniTerminy.includes(den)) return 0;
  const delka = slevaDelkaPct(vstup.noci, pravidla);
  const osobni = slevaOsobniPct(vstup, pravidla);
  return Math.max(delka, osobni);
}

export function sloucitPravidla(raw: Partial<KlubPravidla> | null | undefined): KlubPravidla {
  if (!raw) return { ...VYCHOZI_KLUB_PRAVIDLA, urovne: [...VYCHOZI_KLUB_PRAVIDLA.urovne] };
  return {
    ...VYCHOZI_KLUB_PRAVIDLA,
    ...raw,
    urovne: Array.isArray(raw.urovne) && raw.urovne.length ? raw.urovne : [...VYCHOZI_KLUB_PRAVIDLA.urovne],
    slevaDelka:
      Array.isArray(raw.slevaDelka) && raw.slevaDelka.length
        ? raw.slevaDelka
        : [...VYCHOZI_KLUB_PRAVIDLA.slevaDelka],
    specialniTerminy: Array.isArray(raw.specialniTerminy)
      ? raw.specialniTerminy
      : [...VYCHOZI_KLUB_PRAVIDLA.specialniTerminy],
    rezervovaneKody: Array.isArray(raw.rezervovaneKody)
      ? raw.rezervovaneKody
      : [...VYCHOZI_KLUB_PRAVIDLA.rezervovaneKody],
    vyplataMesice: Array.isArray(raw.vyplataMesice)
      ? raw.vyplataMesice
      : [...VYCHOZI_KLUB_PRAVIDLA.vyplataMesice],
  };
}
