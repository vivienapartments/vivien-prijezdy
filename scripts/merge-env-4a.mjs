import fs from 'fs';
import crypto from 'crypto';

const path = '.env.local';
const existing = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const lines = existing.split(/\r?\n/);
const map = new Map();
for (const line of lines) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  map.set(line.slice(0, i), line.slice(i + 1));
}

function setIfEmpty(key, value) {
  const cur = map.get(key);
  if (cur === undefined || cur === '' || cur === 'DOPLNIT') map.set(key, value);
}

setIfEmpty('TEST_REZIM', '1');
setIfEmpty('PRUVODCE_BASE_URL', 'http://127.0.0.1:3000');
setIfEmpty('MAJITEL_EMAIL', 'info@vivienapartments.cz');
setIfEmpty('MAJITEL_PREPOSILA_Z', 'info@vivienapartments.cz');
setIfEmpty('SMTP_USER', 'info@vivienapartments.cz');
setIfEmpty('SMTP_HESLO', 'SEM_NAPIS_HESLO_PRO_APLIKACI_INFO');
setIfEmpty('IMAP_USER', '');
setIfEmpty('IMAP_HESLO', 'SEM_NAPIS_HESLO_PRO_APLIKACI_NOVE_SCHRANKY');
if (!map.get('BH_KLIC') || map.get('BH_KLIC') === '') {
  map.set('BH_KLIC', crypto.randomBytes(18).toString('base64url'));
}
if (!map.get('CRON_SECRET') || map.get('CRON_SECRET') === '') {
  map.set('CRON_SECRET', crypto.randomBytes(24).toString('hex'));
}

const order = [
  'PRUVODCE_TOKEN_SECRET',
  'PRUVODCE_BASE_URL',
  'TEST_REZIM',
  'MAJITEL_EMAIL',
  'MAJITEL_PREPOSILA_Z',
  'SMTP_USER',
  'SMTP_HESLO',
  'IMAP_USER',
  'IMAP_HESLO',
  'BH_KLIC',
  'CRON_SECRET',
  'KOD_ZAHRADA_V1',
  'KOD_ZAHRADA_V2',
  'KOD_ZAHRADA_V3',
  'KOD_ZAHRADA_V4',
  'KOD_ZAHRADA_V5',
  'WIFI_HESLO_V1',
  'WIFI_HESLO_V2',
  'WIFI_HESLO_V3',
  'WIFI_HESLO_V4',
  'WIFI_HESLO_V5',
  'WIFI_HESLO_ZAHRADA',
  'BRANA_TELEFON',
];

const out = ['# Lokální tajemství – necommitovat'];
for (const key of order) {
  if (map.has(key)) out.push(`${key}=${map.get(key)}`);
}
for (const [k, v] of map) {
  if (!order.includes(k)) out.push(`${k}=${v}`);
}
fs.writeFileSync(path, out.join('\n') + '\n');
console.log('env merged (hodnoty nevypisuji)');
console.log('SMTP_HESLO placeholder?', String(map.get('SMTP_HESLO') || '').startsWith('SEM_NAPIS'));
