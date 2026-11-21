import fs from 'fs';

const md = fs.readFileSync('PROMPT-PRIJEZDY-77.md', 'utf8');
const start = md.indexOf('## JSON\n```json\n');
const alt = md.indexOf('## JSON\r\n```json\r\n');
const at = start >= 0 ? start + '## JSON\n```json\n'.length : alt + '## JSON\r\n```json\r\n'.length;
if (at < 20) {
  console.error('JSON start not found');
  process.exit(1);
}
const end = md.indexOf('```', at);
const data = JSON.parse(md.slice(at, end));
const keys = Object.keys(data.cs);
const typeFields = keys.map((k) => `  ${k}: string;`).join('\n');
const out = `import type { GuideLang } from './types';

export type DoporuceniTexty = {
${typeFields}
};

const MAPA: Record<GuideLang, DoporuceniTexty> = ${JSON.stringify(data, null, 2)} as Record<
  GuideLang,
  DoporuceniTexty
>;

export function doporuceniTexty(lang: GuideLang): DoporuceniTexty {
  return MAPA[lang] || MAPA.en;
}

export const DOPORUCENI_TEXT_KEYS = ${JSON.stringify(keys)} as const;
`;
fs.writeFileSync('src/lib/doporuceni-texty.ts', out);
console.log('ok', Object.keys(data).length, 'langs', keys.length, 'keys');
