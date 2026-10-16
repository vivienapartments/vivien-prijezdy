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

function druhyZ(rec: RezervaceRecord): Set<DruhDluhu> {
  return new Set((rec.platby || []).map((p) => p.druh));
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

export function zaplatDruhy(
  rec: RezervaceRecord,
  druhy: Array<DruhDluhu | 'vse'>,
  jak: JakPlatby,
  kdo: 'pravoslav' | 'nikol',
  now = new Date(),
): RezervaceRecord {
  const vse = polozkyVsechny(rec);
  const cile = druhy.includes('vse') ? vse : vse.filter((p) => druhy.includes(p.druh));
  const uz = druhyZ(rec);
  if (rec.zaplaceno && (rec.platby || []).length === 0) {
    for (const p of vse) uz.add(p.druh);
  }
  const nove = cile.filter((p) => !uz.has(p.druh));
  if (!nove.length) return rec;
  const kdy = now.toISOString();
  let platby: PlatbaPolozky[] = [
    ...(rec.platby || []),
    ...nove.map((p) => ({ druh: p.druh, kc: p.kc, jak, kdo, kdy })),
  ];
  platby = pokryjStare(rec, platby, kdo);
  const pokryte = new Set(platby.map((p) => p.druh));
  const zbyva = vse.filter((p) => !pokryte.has(p.druh));
  const text = nove.map((p) => `${nazevDluhu(p.druh)} ${p.kc} Kč`).join(', ');
  const veta = `Zaplaceno ${JAK[jak]}, ${text}. Zapsal ${kdoText(kdo)}.`;
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

export function vratPlatbu(rec: RezervaceRecord, druh: DruhDluhu | 'vse', now = new Date()): RezervaceRecord {
  const kdo = rec.poplatekVybral === 'nikol' ? 'nikol' : 'pravoslav';
  let platby = druh === 'vse' ? [] : (rec.platby || []).filter((p) => p.druh !== druh);
  if (druh !== 'vse') platby = pokryjStare(rec, platby, kdo).filter((p) => p.druh !== druh);
  const vse = polozkyVsechny(rec);
  const pokryte = new Set(platby.map((p) => p.druh));
  const zbyva = vse.filter((p) => !pokryte.has(p.druh));
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

export function dluhZmizel(rec: RezervaceRecord): boolean {
  return polozkyZRezervace(rec).length === 0;
}
