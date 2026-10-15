import { VYJEZD_CASTKA } from './priplatek-prijezd';
import { vstupPravidla } from './vstup-texty';

/** Otisk znění. Když se text pravidel změní, otisk se změní. */
export function otisk(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  return hash.toString(16);
}

export function slozitPravidlaCs(): string {
  return vstupPravidla.map((veta) => veta.cs.replaceAll('{{VYJEZD}}', String(VYJEZD_CASTKA))).join('\n');
}

const VERZE_BEZ_VYJEZDU = [
  'Čas příjezdu vyberte tady. Stačí přibližně, změnu hned opravte.',
  'Asi 15 minut před příjezdem nám napište. Na domluvený čas čekáme 10 minut.',
  'Bez času předem se dovnitř sami nedostanete. Až napíšete, že jste na místě, apartmán předáme do hodiny.',
  'Check-in je od 14:00 do 20:00. Později, když to řeknete předem, platíte příplatek podle skutečného příjezdu, na místě.',
  'Kódy dostanete při osobním předání po kontrole dokladů.',
  'Když do 20:00 nedorazíte ani se neozvete, jde o nedojezd.',
].join('\n');

const VERZE_S_VYJEZDEM = [
  'Čas příjezdu vyberte tady. Stačí přibližně, změnu hned opravte.',
  'Asi 15 minut před příjezdem nám napište na +420 604 692 573. Na domluvený čas pak čekáme 10 minut. Když nedorazíte a musíme přijet znovu, účtujeme za to 300 Kč.',
  'Bez času předem se dovnitř sami nedostanete. Až napíšete, že jste na místě, apartmán předáme do hodiny.',
  'Check-in je od 14:00 do 20:00. Později, když to řeknete předem, platíte příplatek podle skutečného příjezdu, na místě.',
  'Kódy dostanete při osobním předání po kontrole dokladů.',
  'Když do 20:00 nedorazíte ani se neozvete, jde o nedojezd.',
].join('\n');

const VERZE_S_PROTIKLADEM = [
  'Čas příjezdu vyberte tady. Stačí přibližně, změnu hned opravte.',
  'Když nám napíšete čtvrt hodiny předem, že budete na místě, čekáme my na vás. Na domluvený čas pak čekáme 10 minut. Když nedorazíte a musíme přijet znovu, účtujeme za to 300 Kč.',
  'Když nám čas předem nedáte, čekáte vy na nás, až hodinu. Až napíšete, že jste na místě, apartmán předáme do hodiny.',
  'Check-in je od 14:00 do 20:00. Později, když to řeknete předem, platíte příplatek podle skutečného příjezdu, na místě.',
  'Kódy dostanete při osobním předání po kontrole dokladů.',
  'Když do 20:00 nedorazíte ani se neozvete, jde o nedojezd.',
].join('\n');

export type UlozenaVerze = { verze: string; cs: string };

/** Půlhodinový příplatek, ještě se slovem kódy. Souhlas z té doby si tohle znění nechá. */
const VERZE_PULHODINA = [
  'Čas příjezdu vyberte tady. Stačí přibližně, změnu hned opravte.',
  'Když nám napíšete čtvrt hodiny předem, že budete na místě, čekáme my na vás. Na domluvený čas pak čekáme 10 minut. Když nedorazíte a musíme přijet znovu, účtujeme za to 300 Kč.',
  'Když nám čas předem nedáte, čekáte vy na nás, až hodinu. Až napíšete, že jste na místě, apartmán předáme do hodiny.',
  'Check-in je od 14:00 do 20:00. Později platíte 100 Kč za každou započatou půlhodinu podle skutečného příjezdu, na místě. Po 23:00 jen po domluvě.',
  'Kódy dostanete při osobním předání po kontrole dokladů.',
  'Když do 20:00 nedorazíte ani se neozvete, jde o nedojezd.',
].join('\n');

/** Starší souhlas ukazuje znění své verze. Starý řádek se nepřepisuje. */
const VERZE_PINY = slozitPravidlaCs();

export const ARCHIV_PRAVIDEL: UlozenaVerze[] = [
  { verze: otisk(VERZE_BEZ_VYJEZDU), cs: VERZE_BEZ_VYJEZDU },
  { verze: otisk(VERZE_S_VYJEZDEM), cs: VERZE_S_VYJEZDEM },
  { verze: otisk(VERZE_S_PROTIKLADEM), cs: VERZE_S_PROTIKLADEM },
  { verze: otisk(VERZE_PULHODINA), cs: VERZE_PULHODINA },
  { verze: otisk(VERZE_PINY), cs: VERZE_PINY },
];

export function verzeAktualni(): string {
  return ARCHIV_PRAVIDEL[ARCHIV_PRAVIDEL.length - 1]?.verze ?? otisk(slozitPravidlaCs());
}

export function zneniVerze(verze: string): string | null {
  return ARCHIV_PRAVIDEL.find((polozka) => polozka.verze === verze)?.cs ?? null;
}
