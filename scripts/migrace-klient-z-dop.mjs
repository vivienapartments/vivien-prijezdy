/**
 * Migrace dop:* → klient:* (kopie). Před spuštěním zálohuje dotčené klíče do souboru mimo git.
 *
 * Použití (jen Preview / lokálně):
 *   node scripts/migrace-klient-z-dop.mjs
 *
 * Vyžaduje UPSTASH_* v .env.local. Na Preview běží zápis pod test: přes klubKlic
 * jen když VERCEL_ENV=preview; lokálně bez toho jde do ostrých klíčů klient:* — opatrně.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function nactiEnv(soubor) {
  if (!fs.existsSync(soubor)) return;
  for (const radek of fs.readFileSync(soubor, 'utf8').split(/\r?\n/)) {
    const t = radek.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const klic = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(klic in process.env)) process.env[klic] = val;
  }
}

nactiEnv(path.join(root, '.env.local'));

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
if (!url || !token) {
  console.error('Chybí UPSTASH / KV v .env.local');
  process.exit(1);
}

async function redis(command) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const json = await res.json();
  return json.result;
}

async function scan(match) {
  const keys = [];
  let cursor = '0';
  do {
    const r = await redis(['SCAN', cursor, 'MATCH', match, 'COUNT', 200]);
    cursor = String(r[0]);
    keys.push(...(r[1] || []));
  } while (cursor !== '0');
  return keys;
}

const zalohyDir = path.join(root, '.data', 'zalohy-klub');
fs.mkdirSync(zalohyDir, { recursive: true });
const razitko = new Date().toISOString().replace(/[:.]/g, '-');
const zalohaSoubor = path.join(zalohyDir, `dop-${razitko}.json`);

console.log('Záloha dop* klíčů…');
const dopKeys = [
  ...(await scan('dop:*')),
  ...(await scan('dop-klic:*')),
  ...(await scan('dop-seznam')),
  ...(await scan('dop-pravidla')),
  ...(await scan('test:dop:*')),
  ...(await scan('test:dop-klic:*')),
  ...(await scan('test:dop-seznam')),
];
const unique = [...new Set(dopKeys)];
const zaloha = {};
for (const k of unique) {
  const v = await redis(['GET', k]);
  if (v != null) zaloha[k] = v;
}
fs.writeFileSync(zalohaSoubor, JSON.stringify({ kdy: new Date().toISOString(), klicu: Object.keys(zaloha).length }, null, 2));
fs.writeFileSync(zalohaSoubor.replace(/\.json$/, '-data.json'), JSON.stringify(zaloha));
console.log(`Záloha: ${zalohaSoubor} (${Object.keys(zaloha).length} klíčů, bez výpisu osobních údajů do konzole)`);
console.log('Migraci spusťte v přehledu /prehled/klienti (tlačítko), ať běží stejný kód jako aplikace.');
console.log('Nebo: POST /api/prehled/klienti { akce: "migrace-dop" } po přihlášení.');
