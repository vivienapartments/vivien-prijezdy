/**
 * Fáze 4a: bez IMAP.
 * 1) Vygeneruje ukázky HTML do nahled-emailu/
 * 2) Pošle [TEST] e-mail majiteli (vyžaduje SMTP v .env.local)
 */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { buildGuestEmail, sendGuestEmail } from '../src/lib/email-host';
import { loadSecrets } from '../src/lib/secrets';
import { createToken } from '../src/lib/token';
import { parseVivienData } from '../src/lib/vivien-data';
import type { AptId, GuideLang } from '../src/lib/types';

config({ path: path.join(process.cwd(), '.env.local') });

const FIXTURE = `
VIVIEN-DATA v1
REZERVACE: 120260530
APARTMAN: Pohodlí v tlumených tónech
PRIJEZD: 6.10.2026
ODJEZD: 7.10.2026
NOCI: 1
OSOB: 2
EMAIL: host@example.com
NARODNOST: CZE
OSLOVENI: Vážený pane Nováku
ZDROJ: Booking.com
KLIC: FIXTURE
KONEC
`;

const PREVIEWS: { apt: AptId; lang: GuideLang; name: string }[] = [
  { apt: 'V1', lang: 'cs', name: 'Jemná harmonie' },
  { apt: 'V1', lang: 'de', name: 'Jemná harmonie' },
  { apt: 'V1', lang: 'zh-Hant', name: 'Jemná harmonie' },
  { apt: 'V3', lang: 'cs', name: 'Večerní elegance' },
  { apt: 'V3', lang: 'de', name: 'Večerní elegance' },
  { apt: 'V3', lang: 'zh-Hant', name: 'Večerní elegance' },
];

function baseUrl(): string {
  return (process.env.PRUVODCE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
}

async function main() {
  const outDir = path.join(process.cwd(), 'nahled-emailu');
  fs.mkdirSync(outDir, { recursive: true });
  const secrets = loadSecrets();

  for (const p of PREVIEWS) {
    const token = createToken({
      r: 'PREVIEW',
      a: p.apt,
      p: '2026-11-01',
      d: '2026-11-03',
      o: 2,
      l: p.lang,
    });
    const built = buildGuestEmail({
      lang: p.lang,
      apt: p.apt,
      prijezd: '2026-11-01',
      odjezd: '2026-11-03',
      noci: 2,
      osob: 2,
      osloveni: p.lang === 'cs' ? 'Vážený pane Nováku' : null,
      guideUrl: `${baseUrl()}/${token}`,
      intendedTo: 'host@example.com',
      secrets,
    });
    const file = path.join(outDir, `${p.apt}-${p.lang}.html`);
    fs.writeFileSync(file, built.html, 'utf8');
    console.log('ukazka', path.relative(process.cwd(), file));
  }

  const parsed = parseVivienData(FIXTURE);
  if (!parsed.ok) {
    console.error('fixture parse failed', parsed.reason);
    process.exit(1);
  }

  const token = createToken({
    r: parsed.data.rezervace,
    a: parsed.data.apartman,
    p: parsed.data.prijezd,
    d: parsed.data.odjezd,
    o: parsed.data.osob ?? undefined,
    l: parsed.data.jazyk,
  });

  const majitel = process.env.MAJITEL_EMAIL?.trim();
  const smtpPass = process.env.SMTP_HESLO?.trim() || '';
  if (!majitel || !smtpPass || smtpPass.startsWith('SEM_NAPIS')) {
    console.log('');
    console.log('HTML ukázky hotové. Odeslání [TEST] mailu přeskočeno.');
    console.log('Doplň v .env.local SMTP_HESLO a MAJITEL_EMAIL, pak spusť znovu:');
    console.log('  npm run email:test-fixture');
    return;
  }

  const result = await sendGuestEmail({
    input: {
      lang: parsed.data.jazyk,
      apt: parsed.data.apartman,
      prijezd: parsed.data.prijezd,
      odjezd: parsed.data.odjezd,
      noci: parsed.data.noci,
      osob: parsed.data.osob,
      osloveni: parsed.data.osloveni,
      guideUrl: `${baseUrl()}/${token}`,
      intendedTo: parsed.data.email,
      secrets,
    },
  });
  console.log('odeslano [TEST] na majitele, rezervace', parsed.data.rezervace, 'to=', result.to);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : 'chyba');
  process.exit(1);
});
