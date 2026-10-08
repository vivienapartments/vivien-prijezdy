import fs from 'fs';
const g = fs.readFileSync('src/components/Guide.tsx', 'utf8');
const i = fs.readFileSync('src/lib/i18n.ts', 'utf8');
console.log({
  hubCs: g.includes('hubCs'),
  kodFn: g.includes('kodZahradyProApt'),
  oldKod: g.includes('secrets.KOD_ZAHRADA'),
  hub: g.includes('TX.hub.'),
  ui: g.includes('TX.ui.'),
  orderOk:
    i.indexOf("{{KOD_ZAHRADA}} + #") >= 0 &&
    i.indexOf("{{KOD_ZAHRADA}} + #") < i.indexOf("'{{KOD_ZAHRADA}}'"),
});
