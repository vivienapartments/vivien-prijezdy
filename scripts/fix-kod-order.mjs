import fs from 'fs';
const p = 'src/lib/i18n.ts';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(
  ".replaceAll('{{KOD_ZAHRADA}}', opts.kodZahrada)\n    .replaceAll('{{KOD_ZAHRADA}} + #', opts.kodZahrada)",
  ".replaceAll('{{KOD_ZAHRADA}} + #', opts.kodZahrada)\n    .replaceAll('{{KOD_ZAHRADA}}', opts.kodZahrada)",
);
fs.writeFileSync(p, s);
console.log('fixed');
