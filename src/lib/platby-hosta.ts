import { nazevDluhu, polozkyVsechny, polozkyZRezervace, type DruhDluhu } from './odjezd';
import { zapisMajitele } from './rucni-pole';
import type { JakPlatby, PlatbaPolozky, RezervaceRecord } from './store';

const JAK: Record<JakPlatby, string> = {
  hotove: 'hotově',
  karta: 'kartou',
  prevod: 'převodem',
  cena: 'v ceně rezervace',
};

function kdoText(kdo: 'pravoslav' | 'nikol'): string {
  return kdo === 'nikol' ? 'Nikol' : 'Pravoslav';
}

/** Když staré zaplaceno krylo vše, ostatní položky zůstanou v seznamu plateb. */
function pokryjStare(rec: RezervaceRecord, platby: PlatbaPolozky[], kdo: 'pravoslav' | 'nikol'): PlatbaPolozky[] {
  if (!rec.zaplaceno || (rec.platby || []).length > 0) return platby;
  const pokryte = new Set(platby.map((p) => p.druh));
  const dalsi = [...platby];
  const jak = platby[0]?.jak || 'hotove';
  for (const p of polozkyVsechny(rec)) {
    if (pokryte.has(p.druh)) continue;
    dalsi.push({ druh: p.druh, kc: p.kc, jak, kdo, kdy: rec.zaplaceno });
    pokryte.add(p.druh);
  }
  return dalsi;
}

function poZaplaceni(
  rec: RezervaceRecord,
  platby: PlatbaPolozky[],
  veta: string,
  kdo: 'pravoslav' | 'nikol',
  kdy: string,
): RezervaceRecord {
  const pracovni = { ...rec, platby };
  const zbyva = polozkyZRezervace(pracovni);
  return zapisMajitele(
    rec,
    'zaplaceno',
    {
      platby,
      zaplaceno: zbyva.length === 0 ? rec.zaplaceno || kdy : rec.zaplaceno,
      poplatekVybral: zbyva.length === 0 ? (kdo === 'pravoslav' ? 'ja' : 'nikol') : rec.poplatekVybral,
    },
    veta,
  );
}

/** Zaplatí zbytek vybraných druhů (nebo vše). Už částečně zaplacené druhy doplatí. */
export function zaplatDruhy(
  rec: RezervaceRecord,
  druhy: Array<DruhDluhu | 'vse'>,
  jak: JakPlatby,
  kdo: 'pravoslav' | 'nikol',
  now = new Date(),
): RezervaceRecord {
  const nezap = polozkyZRezervace(rec);
  const cile = druhy.includes('vse') ? nezap : nezap.filter((p) => druhy.includes(p.druh));
  if (!cile.length) return rec;
  const kdy = now.toISOString();
  let platby: PlatbaPolozky[] = [
    ...(rec.platby || []),
    ...cile.map((p) => ({ druh: p.druh, kc: p.kc, jak, kdo, kdy })),
  ];
  platby = pokryjStare(rec, platby, kdo);
  const text = cile.map((p) => `${nazevDluhu(p.druh, 'cs', p.popis)} ${p.kc} Kč`).join(', ');
  const veta = `Zaplaceno ${JAK[jak]}, ${text}. Zapsal ${kdoText(kdo)}.`;
  return poZaplaceni(rec, platby, veta, kdo, kdy);
}

/**
 * Host už zaplatil částku (faktura, převod…). Rozloží se na nezaplacené položky
 * od začátku (poplatek, příjezd, …). Zbytek položky zůstane dluhem.
 */
export function zaplatCastku(
  rec: RezervaceRecord,
  kc: number,
  jak: JakPlatby,
  kdo: 'pravoslav' | 'nikol',
  poznamka?: string | null,
  now = new Date(),
): RezervaceRecord {
  let zbyva = Math.round(kc);
  if (!Number.isFinite(zbyva) || zbyva < 1) return rec;
  const nezap = polozkyZRezervace(rec);
  if (!nezap.length) return rec;
  const kdy = now.toISOString();
  const nove: PlatbaPolozky[] = [];
  for (const p of nezap) {
    if (zbyva <= 0) break;
    const cast = Math.min(p.kc, zbyva);
    nove.push({ druh: p.druh, kc: cast, jak, kdo, kdy });
    zbyva -= cast;
  }
  if (!nove.length) return rec;
  let platby: PlatbaPolozky[] = [...(rec.platby || []), ...nove];
  platby = pokryjStare(rec, platby, kdo);
  const text = nove.map((p) => `${nazevDluhu(p.druh, 'cs')} ${p.kc} Kč`).join(', ');
  const note = poznamka?.trim() ? ` (${poznamka.trim().slice(0, 200)})` : '';
  const veta = `Host už zaplatil ${Math.round(kc)} Kč ${JAK[jak]}${note}: ${text}. Zapsal ${kdoText(kdo)}.`;
  return poZaplaceni(rec, platby, veta, kdo, kdy);
}

export function vratPlatbu(rec: RezervaceRecord, druh: DruhDluhu | 'vse', now = new Date()): RezervaceRecord {
  const kdo = rec.poplatekVybral === 'nikol' ? 'nikol' : 'pravoslav';
  let platby = druh === 'vse' ? [] : (rec.platby || []).filter((p) => p.druh !== druh);
  if (druh !== 'vse') platby = pokryjStare(rec, platby, kdo).filter((p) => p.druh !== druh);
  /** Bez starého zaplaceno: po vrácení poslední položky by jinak dluh zmizel. */
  const zbyva = polozkyZRezervace({ ...rec, platby, zaplaceno: null });
  const nazev = druh === 'vse' ? 'celá platba' : nazevDluhu(druh);
  const veta = `Vrácena platba, ${nazev}.`;
  return zapisMajitele(
    rec,
    ['zaplaceno', 'poplatekVybral'],
    {
      platby,
      zaplaceno: zbyva.length === 0 ? rec.zaplaceno || now.toISOString() : null,
      poplatekVybral: zbyva.length === 0 ? rec.poplatekVybral : null,
    },
    veta,
  );
}

/**
 * Upraví už zapsanou částku u druhu (např. 250 místo 300).
 * 0 = jako vrácení. Vic než dluh druhu se ořízne.
 */
export function upravitPlatbuDruhu(
  rec: RezervaceRecord,
  druh: DruhDluhu,
  kc: number,
  now = new Date(),
): RezervaceRecord {
  const polozka = polozkyVsechny(rec).find((p) => p.druh === druh);
  if (!polozka) return rec;
  const surovy = Math.round(kc);
  if (!Number.isFinite(surovy) || surovy < 0) return rec;
  const cil = Math.min(surovy, polozka.kc);
  const stare = (rec.platby || []).filter((p) => p.druh === druh);
  const bylo = stare.reduce((s, p) => s + p.kc, 0);
  if (bylo === cil && (cil > 0 || stare.length === 0)) return rec;
  const jak = stare[0]?.jak || 'prevod';
  const kdo = stare[0]?.kdo || 'pravoslav';
  const platby = (rec.platby || []).filter((p) => p.druh !== druh);
  if (cil > 0) {
    platby.push({ druh, kc: cil, jak, kdo, kdy: now.toISOString() });
  }
  const nazev = nazevDluhu(druh);
  const veta =
    cil === 0 ? `Vrácena platba, ${nazev}.` : `Upravena platba ${nazev} ${bylo} Kč → ${cil} Kč.`;
  return poZaplaceni(rec, platby, veta, kdo, now.toISOString());
}

export function dluhZmizel(rec: RezervaceRecord): boolean {
  return polozkyZRezervace(rec).length === 0;
}

/**
 * Staré zaplaceno bez seznamu platí jen pro položky, které na kartě jsou teď.
 * Nová položka, která přibude potom, zůstane nezaplacená.
 */
export function prevedZaplaceno(rec: RezervaceRecord): RezervaceRecord | null {
  if (!rec.zaplaceno || (rec.platby || []).length > 0) return null;
  const vse = polozkyVsechny(rec);
  if (!vse.length) return null;
  const kdo = rec.poplatekVybral === 'nikol' ? 'nikol' : 'pravoslav';
  const kdy = rec.zaplaceno;
  return zapisMajitele(
    rec,
    'zaplaceno',
    {
      platby: vse.map((p) => ({ druh: p.druh, kc: p.kc, jak: 'hotove' as const, kdo, kdy })),
    },
    'Dřívější zaplaceno platí pro položky, které v tu chvíli byly.',
  );
}
