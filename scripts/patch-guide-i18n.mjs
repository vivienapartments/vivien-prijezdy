import fs from 'fs';

const p = 'src/components/Guide.tsx';
let s = fs.readFileSync(p, 'utf8');

s = s.replace(
  `import type { GuideSecrets } from '@/lib/secrets';`,
  `import type { GuideSecrets } from '@/lib/secrets';\nimport { kodZahradyProApt } from '@/lib/secrets';`,
);

s = s.replace(
  `kodZahrada: secrets.KOD_ZAHRADA,`,
  `kodZahrada: kodZahradyProApt(secrets, apt),`,
);

s = s.replace(
  `<p className="pv-kicker">{TX.hubCs.kicker}</p>
          <h2 className="pv-hub__title">{TX.hubCs.title}</h2>
          <p className="pv-hub__lead">{TX.hubCs.lead}</p>`,
  `<p className="pv-kicker">{tt(TX.hub.kicker)}</p>
          <h2 className="pv-hub__title">{tt(TX.hub.title)}</h2>
          <p className="pv-hub__lead">{tt(TX.hub.lead)}</p>`,
);

s = s.replace(
  `<span className="pv-hub__choice-kicker">{TX.hubCs.autoKicker}</span>
              <span className="pv-hub__choice-title">{TX.hubCs.autoTitle}</span>
              <span className="pv-hub__choice-text">{TX.hubCs.autoText}</span>`,
  `<span className="pv-hub__choice-kicker">{tt(TX.hub.autoKicker)}</span>
              <span className="pv-hub__choice-title">{tt(TX.hub.autoTitle)}</span>
              <span className="pv-hub__choice-text">{tt(TX.hub.autoText)}</span>`,
);

s = s.replace(
  `<span className="pv-hub__choice-kicker">{TX.hubCs.walkKicker}</span>
              <span className="pv-hub__choice-title">{TX.hubCs.walkTitle}</span>
              <span className="pv-hub__choice-text">{TX.hubCs.walkText}</span>`,
  `<span className="pv-hub__choice-kicker">{tt(TX.hub.walkKicker)}</span>
              <span className="pv-hub__choice-title">{tt(TX.hub.walkTitle)}</span>
              <span className="pv-hub__choice-text">{tt(TX.hub.walkText)}</span>`,
);

s = s.replace(`{TX.hubCs.reset}`, `{tt(TX.hub.reset)}`);

s = s.replace(
  `<p className="pv-kicker">{si + 1}. Parkování</p>`,
  `<p className="pv-kicker">{si + 1}. {tt(TX.SECTION_NAV['zadost-o-parkovani'])}</p>`,
);

s = s.replaceAll(
  `<span className="pv-navcta__label">Trasa na parkování</span>`,
  `<span className="pv-navcta__label">{tt(TX.ui.routeParking)}</span>`,
);
s = s.replaceAll(
  `<span className="pv-navcta__label">Trasa k domu</span>`,
  `<span className="pv-navcta__label">{tt(TX.ui.routeHouse)}</span>`,
);
s = s.replaceAll(
  `<span className="pv-navcta__hint">Otevřít navigaci v Mapy.cz</span>`,
  `<span className="pv-navcta__hint">{tt(TX.ui.openMapy)}</span>`,
);
s = s.replaceAll(`Nebo Google Maps`, `{tt(TX.ui.orGoogle)}`);

s = s.replace(
  `<p className="pv-kicker">Dům</p>`,
  `<p className="pv-kicker">{tt(TX.ui.house)}</p>`,
);
s = s.replace(
  `<p className="pv-kicker">Poznámka</p>`,
  `<p className="pv-kicker">{tt(TX.ui.note)}</p>`,
);
s = s.replace(
  `<p className="pv-kicker">Vstup</p>`,
  `<p className="pv-kicker">{tt(TX.ui.entry)}</p>`,
);

s = s.replaceAll(
  `<p className="pv-kicker">Krok {stepLabel(i)}</p>`,
  `<p className="pv-kicker">{tt(TX.ui.step)} {stepLabel(i)}</p>`,
);

s = s.replace(
  `{PARKING_DISTANCE.meters} m · {PARKING_DISTANCE.minutes} min pěšky ·
                            Mapy.cz`,
  `{tt(TX.ui.walkHint)
                              .replace('{{M}}', String(PARKING_DISTANCE.meters))
                              .replace('{{MIN}}', String(PARKING_DISTANCE.minutes))}`,
);

s = s.replace(
  `alt="QR kód WiFi apartmán"`,
  `alt={tt(TX.ui.qrApt)}`,
);
s = s.replace(
  `alt="QR kód WiFi zahrada"`,
  `alt={tt(TX.ui.qrGarden)}`,
);
s = s.replace(
  `QR kód se zobrazí, až bude doplněné heslo WiFi pro tento
                                    apartmán.`,
  `{tt(TX.ui.qrMissApt)}`,
);
s = s.replace(
  `QR kód se zobrazí, až bude doplněné heslo WiFi na zahradě.`,
  `{tt(TX.ui.qrMissGarden)}`,
);
s = s.replace(
  `<h2 className="pv-flow__title">Co u nás platí, jednoduše a napřímo</h2>`,
  `<h2 className="pv-flow__title">{tt(TX.ui.rulesHeading)}</h2>`,
);

s = s.replaceAll(`secrets.KOD_ZAHRADA`, `kodZahradyProApt(secrets, apt)`);

fs.writeFileSync(p, s);
console.log('guide patched');
