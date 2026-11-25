import fs from 'fs';
import path from 'path';
import { nahledImportuBhCsv } from '../src/lib/klub-import-bh-csv';
import { VYCHOZI_KLUB_PRAVIDLA } from '../src/lib/klub-pravidla';

const csvPath = path.join(process.cwd(), '.data/import/BH_export_prime_2026-11-25.csv');
const outPath = path.join(process.cwd(), 'src/lib/klub-import-bh-prime-seed.ts');
const text = fs.readFileSync(csvPath, 'utf8');
const nahled = nahledImportuBhCsv(text, [], VYCHOZI_KLUB_PRAVIDLA);
const body = `/** Auto: náhled importu BH přímé 2026-11-25. Bez zápisu. CSV necommituj. */
import type { ImportBhNahled } from './klub-import-bh-csv';

export const KLUB_IMPORT_BH_PRIME_SEED: ImportBhNahled = ${JSON.stringify(
  nahled,
  null,
  2,
)} as ImportBhNahled;
`;
fs.writeFileSync(outPath, body);
console.log(
  'seed ok',
  nahled.souhrn.length,
  'souhrn,',
  nahled.kontrola.length,
  'kontrola,',
  nahled.cekajici.length,
  'čekající',
);
