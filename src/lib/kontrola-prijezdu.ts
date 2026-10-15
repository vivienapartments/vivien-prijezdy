import { apartmany } from './guide-data';
import { pobytText, textPoplatku, casPraha } from './prehled';
import { textTelefonu } from './telefon';
import type { AptId } from './types';
import type { RezervaceRecord } from './store';

/** Pevné tři dny z kontroly 15. 10. 2026. Včera, dnes, zítra. */
export const KONTROLA_DNY = ['2026-10-14', '2026-10-15', '2026-10-16'] as const;

export type RadekKontroly = {
  den: string;
  jmeno: string;
  rezervace: string;
  apartman: string;
  termin: string;
  pobyt: string;
  telefon: string;
  druhe: string;
  cas: string;
  casKdo: string;
  predano: string;
  predanoKdo: string;
  checkin: string;
  odkaz: string;
  vznik: string;
  poplatek: string;
  historie: string[];
  zruseno: boolean;
};

function denRok(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return ymd;
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

function aptText(id: AptId | null): string {
  if (!id) return 'není';
  const a = apartmany.find((x) => x.id === id);
  return a ? `${a.nazev.cs} (${id})` : id;
}

function cislo(ulozeny: string | null): string {
  const s = (ulozeny || '').trim();
  if (!s) return 'není';
  return textTelefonu(s);
}

export function kdoZadalCas(rec: RezervaceRecord): string {
  if (!rec.casPrijezdu) return '';
  if (rec.casZadalHost) return 'host';
  if ((rec.rucniZnacky || []).some((z) => z.pole === 'casPrijezdu')) return 'majitel';
  return 'v datech, kdo nezapsán';
}

export function kdoPredal(rec: RezervaceRecord): string {
  if (!rec.predano) return 'ne';
  for (let i = rec.historie.length - 1; i >= 0; i--) {
    const co = rec.historie[i].co;
    if (/vráceno předání/i.test(co)) break;
    if (/host už bydlel/i.test(co)) return 'migrace, host už bydlel';
    if (/^předáno/i.test(co)) return 'majitel';
  }
  if ((rec.rucniZnacky || []).some((z) => z.pole === 'predano')) return 'majitel';
  return 'v datech, historie mlčí';
}

export function checkinVivien(rec: RezervaceRecord): string {
  const prisel = rec.historie.some((h) =>
    /check-inu|check-in uvedl|průvodce odeslán|průvodce neodešel|pokus o odeslání|odjezd už prošel/i.test(h.co),
  );
  const odeslan = rec.stav === 'odeslano' || rec.stav === 'odeslano_s_vyhradou';
  if (odeslan) return 'přišel, zpracován';
  if (rec.stav === 'vraceno') return 'přišel, zpracován, e-mail se vrátil';
  if (prisel && rec.stav === 'neodeslano') return 'přišel, zpracován, průvodce neodešel';
  if (prisel) return 'přišel, zpracován';
  return 'nepřišel';
}

export function vznikText(rec: RezervaceRecord): string {
  if (!rec.vytvoreno) return 'datum není';
  const den = denRok(rec.vytvoreno);
  let checkin = -1;
  let interni = -1;
  rec.historie.forEach((h, i) => {
    if (/check-inu/i.test(h.co) && /vytvořeno/.test(h.co)) checkin = i;
    if (/Nová rezervace|Rezervace se změnila/.test(h.co)) interni = i;
  });
  let odkud = 'zdroj v historii není';
  if (checkin >= 0 && interni >= 0) {
    odkud = checkin > interni ? 'check-in VIVIEN-DATA' : 'vnitřní mail Better Hotelu';
  } else if (checkin >= 0) odkud = 'check-in VIVIEN-DATA';
  else if (interni >= 0) odkud = 'vnitřní mail Better Hotelu';
  else if (rec.stitek === 'rucne') odkud = 'ručně';
  else if (rec.stitek === 'info') odkud = 'přeposláno z info@';
  return `${den}, ${odkud}`;
}

export function radekKontroly(rec: RezervaceRecord): RadekKontroly | null {
  if (!rec.prijezd || !KONTROLA_DNY.includes(rec.prijezd as (typeof KONTROLA_DNY)[number])) return null;
  const prijezd = denRok(rec.prijezd);
  const odjezd = rec.odjezd ? denRok(rec.odjezd) : 'odjezd není';
  const posledni = rec.historie.slice(-3).reverse();
  return {
    den: rec.prijezd,
    jmeno: rec.jmeno?.trim() || 'bez jména',
    rezervace: rec.rezervace,
    apartman: aptText(rec.apartman),
    termin: `${prijezd} – ${odjezd}`,
    pobyt: pobytText(rec.noci, rec.osob) || 'není',
    telefon: cislo(rec.telefon),
    druhe: cislo(rec.telefonRezervace),
    cas: rec.casPrijezdu || 'není',
    casKdo: kdoZadalCas(rec),
    predano: rec.predano ? casPraha(rec.predano) || rec.predano : 'ne',
    predanoKdo: kdoPredal(rec),
    checkin: checkinVivien(rec),
    odkaz: rec.checkinUrl ? 'je' : 'není',
    vznik: vznikText(rec),
    poplatek: textPoplatku(rec.poplatek, rec.noci, rec.osob),
    historie: posledni.map((h) => `${casPraha(h.cas) || h.cas} ${h.co}`.trim()),
    zruseno: rec.stav === 'zruseno',
  };
}

export function radkyKontroly(zaznamy: RezervaceRecord[]): RadekKontroly[] {
  return zaznamy
    .map(radekKontroly)
    .filter((r): r is RadekKontroly => r !== null)
    .sort((a, b) => a.den.localeCompare(b.den) || a.jmeno.localeCompare(b.jmeno, 'cs') || a.rezervace.localeCompare(b.rezervace));
}
