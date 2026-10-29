/** Stupně připomínek u chybějícího času v průvodci (1 jemná → 2 autoritativní → 3 nedojezd). */

export type CasovaZpravaId = 'nerozbalen' | 'denNerozbalen' | 'nedojezd';

const NAZEV_CAS: Record<CasovaZpravaId, string> = {
  nerozbalen: 'Průvodce nerozbalen',
  denNerozbalen: 'Den příjezdu, průvodce nerozbalen',
  nedojezd: 'Poslední výzva (nedojezd)',
};

const CHECKIN_NAZEV = 'Vyplňte check-in';

/** Kolikrát už šla časová připomínka (WhatsApp zapsaný v historii). */
export function pocetCasovychPripoinek(historie: { co: string }[]): number {
  const platne = new Set(Object.values(NAZEV_CAS).map((n) => `WhatsApp: ${n}`));
  return historie.filter((h) => platne.has(h.co)).length;
}

/** Další zpráva podle počtu už odeslaných časových připomínek. */
export function dalsiCasovaZprava(pocetUzPoslanych: number): CasovaZpravaId {
  if (pocetUzPoslanych <= 0) return 'nerozbalen';
  if (pocetUzPoslanych === 1) return 'denNerozbalen';
  return 'nedojezd';
}

export function stupenCasoveZpravy(id: CasovaZpravaId): 1 | 2 | 3 {
  if (id === 'nerozbalen') return 1;
  if (id === 'denNerozbalen') return 2;
  return 3;
}

export function popisekStupneCasu(id: CasovaZpravaId): string {
  if (id === 'nerozbalen') return '1. stupeň · jemná';
  if (id === 'denNerozbalen') return '2. stupeň · autoritativní';
  return '3. stupeň · nedojezd';
}

export function nazevCasoveZpravy(id: CasovaZpravaId): string {
  return NAZEV_CAS[id];
}

export function pocetCheckinPripoinek(historie: { co: string }[]): number {
  return historie.filter((h) => h.co === `WhatsApp: ${CHECKIN_NAZEV}` || h.co === `SMS: ${CHECKIN_NAZEV}`).length;
}
