/**
 * Osobní poděkování podle počtu dokončených pobytů.
 * 1. návštěva / 2. návštěva / 3+ pět variant (stabilní ke pobytu).
 */

import { t } from './i18n';
import type { KlubPobytRadek } from './klub-ukazka';
import type { GuideLang, LText } from './types';

export type PodekovaniVariantaId = '1' | '2' | 'd1' | 'd2' | 'd3' | 'd4' | 'd5';

const DALSÍ: PodekovaniVariantaId[] = ['d1', 'd2', 'd3', 'd4', 'd5'];

/** CS + EN; ostatní jazyky zatím EN (přirozený EN, ne strojový). */
function csEn(cs: string, en: string): LText {
  return {
    cs,
    en,
    de: en,
    pl: en,
    uk: en,
    'zh-Hant': en,
    sv: en,
    es: en,
    hu: en,
    da: en,
    fi: en,
    fr: en,
    it: en,
    pt: en,
  };
}

export const podekovaniNadpis: Record<PodekovaniVariantaId, LText> = {
  '1': csEn('Děkujeme za návštěvu.', 'Thank you for your visit.'),
  '2': csEn('Děkujeme, že jste se k nám vrátili.', 'Thank you for coming back to us.'),
  d1: csEn('Zase někdy na viděnou.', 'See you again sometime.'),
  d2: csEn('Děkujeme za další návštěvu.', 'Thank you for another visit.'),
  d3: csEn('Těšíme se zase příště.', 'We look forward to seeing you again.'),
  d4: csEn('Ať se vám daří.', 'All the best.'),
  d5: csEn('U nás jste vždy vítáni.', 'You are always welcome here.'),
};

export const podekovaniDopis: Record<PodekovaniVariantaId, LText> = {
  '1': csEn(
    'Byli jsme rádi, že jsme vás mohli poznat a přivítat u nás. Doufáme, že vám pobyt udělal radost a že se někdy znovu uvidíme.',
    'We were glad to meet you and welcome you. We hope you enjoyed your stay and that we will see each other again someday.',
  ),
  '2': csEn(
    'Moc nás těší, že jste si pro svůj pobyt znovu vybrali VIVIEN. Doufáme, že jste se u nás i tentokrát cítili dobře. Budeme se těšit na další setkání.',
    'We are really glad you chose VIVIEN again. We hope you felt at home this time too. We look forward to seeing you again.',
  ),
  d1: csEn(
    'Bylo příjemné vás u nás opět přivítat. Přejeme šťastnou cestu a budeme se těšit příště.',
    'It was a pleasure to welcome you again. Safe travels, and we look forward to next time.',
  ),
  d2: csEn(
    'Doufáme, že vám u nás bylo i tentokrát příjemně. Ať se vám daří a brzy zase na viděnou.',
    'We hope you had a pleasant stay again. All the best, and see you soon.',
  ),
  d3: csEn(
    'Jsme rádi, že se k nám vracíte. Přejeme vám hezké dny a budeme se těšit na další setkání.',
    'We are glad you keep coming back. We wish you pleasant days and look forward to the next meeting.',
  ),
  d4: csEn(
    'Doufáme, že jste si u nás opět dobře odpočinuli. Budeme rádi, když se naše cesty zase brzy potkají.',
    'We hope you rested well with us again. We would be glad if our paths cross again soon.',
  ),
  d5: csEn(
    'Doufáme, že jste se u nás i tentokrát cítili dobře. Děkujeme za vaši přízeň a těšíme se zase někdy na viděnou.',
    'We hope you felt at home again. Thank you for your loyalty, and see you again sometime.',
  ),
};

/** Dokončené pobyty: započtené (ne čeká, ne storno). */
export function pocetDokoncenePobyty(pobyty: KlubPobytRadek[] | null | undefined): number {
  if (!pobyty?.length) return 0;
  return pobyty.filter((p) => p.barva === 'zapocteno' || p.barva === 'probiha').length;
}

/** Klíč posledního dokončeného pobytu (pro stabilní uložení varianty). */
export function klicPoslednihoDokonceneho(pobyty: KlubPobytRadek[] | null | undefined): string {
  if (!pobyty?.length) return '';
  const hotove = pobyty.filter((p) => p.barva === 'zapocteno' || p.barva === 'probiha');
  const radek = hotove[0] || pobyty[0];
  return `${radek?.nadpis || ''}|${radek?.podnadpis || ''}`;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Výběr id varianty.
 * 1 → první, 2 → druhá, 3+ → d1–d5 (seed), ne stejná jako předchozí.
 */
export function vyberPodekovaniId(opts: {
  pocetDokoncene: number;
  seed: string;
  predchoziId?: PodekovaniVariantaId | null;
}): PodekovaniVariantaId {
  const n = Math.max(0, Math.floor(opts.pocetDokoncene || 0));
  if (n <= 1) return '1';
  if (n === 2) return '2';
  let idx = hashSeed(opts.seed || 'x') % DALSÍ.length;
  const pred = opts.predchoziId;
  if (pred && DALSÍ[idx] === pred) {
    idx = (idx + 1) % DALSÍ.length;
  }
  return DALSÍ[idx];
}

/** Query `?podekovani=1|2|d1…d5` pro náhled. */
export function parsePodekovaniQuery(raw: string | null | undefined): PodekovaniVariantaId | null {
  const v = (raw || '').trim().toLowerCase();
  if (v === '1' || v === 'prvni' || v === 'first') return '1';
  if (v === '2' || v === 'druha' || v === 'second') return '2';
  if (v === 'd1' || v === '3' || v === 'v1') return 'd1';
  if (v === 'd2' || v === '4' || v === 'v2') return 'd2';
  if (v === 'd3' || v === '5' || v === 'v3') return 'd3';
  if (v === 'd4' || v === '6' || v === 'v4') return 'd4';
  if (v === 'd5' || v === '7' || v === 'v5') return 'd5';
  return null;
}

export function textyPodekovaniVarianty(
  id: PodekovaniVariantaId,
  lang: GuideLang,
): { nadpis: string; dopis: string } {
  return {
    nadpis: t(podekovaniNadpis[id], lang),
    dopis: t(podekovaniDopis[id], lang),
  };
}
