import fs from 'fs';

const j = JSON.parse(fs.readFileSync('FAKTURA-texty.json', 'utf8'));
const langs = Object.keys(j.host);
const keys = Object.keys(j.host.cs);

function tabFrom(obj) {
  const lines = langs.map((lang) => `  '${lang}': ${JSON.stringify(obj[lang])},`);
  return `{\n${lines.join('\n')}\n}`;
}

let out = `import type { GuideLang } from './types';\n\ntype T = Record<GuideLang, string>;\n\n`;
for (const k of keys) {
  const name = `FAKTURA_${k.toUpperCase()}`;
  const map = {};
  for (const lang of langs) map[lang] = j.host[lang][k];
  out += `export const ${name}: T = ${tabFrom(map)};\n\n`;
}
out += `export const FAKTURA_MAJITEL = ${JSON.stringify(j.majitel_cs, null, 2)} as const;\n\n`;
out += `export const FAKTURA_ZPRAVA_HOSTOVI: T = ${tabFrom(j.zprava_hostovi)};\n\n`;
out += `export const FAKTURA_ZPRAVA_BEZ_PRUVODCE: T = ${tabFrom(j.zprava_hostovi_bez_pruvodce)};\n\n`;
out += `export const FAKTURA_SLOVA = ${JSON.stringify(j.slova_faktura, null, 2)} as const;\n`;
fs.writeFileSync('src/lib/faktura-texty.ts', out);
console.log('ok', keys.length, langs.length);
