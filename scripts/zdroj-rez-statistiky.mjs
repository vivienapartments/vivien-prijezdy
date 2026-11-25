/**
 * Ostrá data: kolik rez:* má jaký zdroj (bez osobních údajů).
 *   node scripts/zdroj-rez-statistiky.mjs
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
    keys.push(...r[1]);
  } while (cursor !== '0');
  return keys;
}

function normalizujZdroj(raw) {
  const s = String(raw || '').trim();
  if (!s) return '(prázdný)';
  const n = s.toLowerCase();
  if (n.includes('airbnb')) return 'Airbnb';
  if (n.includes('booking')) return 'Booking';
  if (n.includes('prim') || n.includes('přím') || n.includes('direct') || n === 'web') return 'přímá';
  return s.slice(0, 40);
}

const keys = await scan('rez:*');
const pocty = new Map();
let nacteno = 0;
let chyb = 0;
for (const k of keys) {
  if (k.startsWith('test:')) continue;
  const raw = await redis(['GET', k]);
  if (!raw) continue;
  try {
    const rec = JSON.parse(raw);
    if (rec.zkusebni) continue;
    const z = normalizujZdroj(rec.zdroj);
    pocty.set(z, (pocty.get(z) || 0) + 1);
    nacteno += 1;
  } catch {
    chyb += 1;
  }
}

const serazene = [...pocty.entries()].sort((a, b) => b[1] - a[1]);
console.log(JSON.stringify({ nacteno, chyb, zdroje: Object.fromEntries(serazene) }, null, 2));
