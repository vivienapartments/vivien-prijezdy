import fs from 'fs';
const p = 'src/components/Guide.tsx';
let s = fs.readFileSync(p, 'utf8');

// Normalize leftover hubCs usages
s = s.replaceAll('TX.hubCs.', 'TX.hub.');
s = s.replaceAll('{TX.hub.kicker}', '{tt(TX.hub.kicker)}');
s = s.replaceAll('{TX.hub.title}', '{tt(TX.hub.title)}');
s = s.replaceAll('{TX.hub.lead}', '{tt(TX.hub.lead)}');
s = s.replaceAll('{TX.hub.autoKicker}', '{tt(TX.hub.autoKicker)}');
s = s.replaceAll('{TX.hub.autoTitle}', '{tt(TX.hub.autoTitle)}');
s = s.replaceAll('{TX.hub.autoText}', '{tt(TX.hub.autoText)}');
s = s.replaceAll('{TX.hub.walkKicker}', '{tt(TX.hub.walkKicker)}');
s = s.replaceAll('{TX.hub.walkTitle}', '{tt(TX.hub.walkTitle)}');
s = s.replaceAll('{TX.hub.walkText}', '{tt(TX.hub.walkText)}');
s = s.replaceAll('{TX.hub.reset}', '{tt(TX.hub.reset)}');

// Avoid double tt(tt(...))
s = s.replaceAll('{tt(tt(TX.hub.', '{tt(TX.hub.');

// Fix i18n order
const ip = 'src/lib/i18n.ts';
let i = fs.readFileSync(ip, 'utf8');
i = i.replace(
  ".replaceAll('{{KOD_ZAHRADA}}', opts.kodZahrada)\r\n    .replaceAll('{{KOD_ZAHRADA}} + #', opts.kodZahrada)",
  ".replaceAll('{{KOD_ZAHRADA}} + #', opts.kodZahrada)\r\n    .replaceAll('{{KOD_ZAHRADA}}', opts.kodZahrada)",
);
i = i.replace(
  ".replaceAll('{{KOD_ZAHRADA}}', opts.kodZahrada)\n    .replaceAll('{{KOD_ZAHRADA}} + #', opts.kodZahrada)",
  ".replaceAll('{{KOD_ZAHRADA}} + #', opts.kodZahrada)\n    .replaceAll('{{KOD_ZAHRADA}}', opts.kodZahrada)",
);

fs.writeFileSync(p, s);
fs.writeFileSync(ip, i);
console.log({
  hubCs: s.includes('hubCs'),
  doubleTt: s.includes('tt(tt('),
  sample: s.includes('{tt(TX.hub.kicker)}'),
});
