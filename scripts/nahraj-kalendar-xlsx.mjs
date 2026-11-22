/**
 * Nahraje oba xlsx z rootu do Upstash (kalendar-denni / meta).
 * Preview: VERCEL_ENV=preview node scripts/nahraj-kalendar-xlsx.mjs
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
}

function excelDatumNaYmd(v) {
  if (typeof v === 'number') {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return null;
}

const APT = ['V1', 'V2', 'V3', 'V4', 'V5'];

function prazdny() {
  const d = {};
  for (const id of APT) d[id] = { cena: null, obsazeno: false, bezPrijezdu: false };
  return d;
}

function parsujList(sheet, onCell) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  let header = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    if (/datum/i.test(String(rows[i]?.[0] ?? ''))) {
      header = i;
      break;
    }
  }
  if (header < 0) return;
  for (let i = header + 1; i < rows.length; i++) {
    const r = rows[i];
    const ymd = excelDatumNaYmd(r?.[0]);
    if (!ymd) continue;
    for (let a = 0; a < 5; a++) onCell(ymd, APT[a], r[a + 2]);
  }
}

async function kv(url, token, ...args) {
  const res = await fetch(`${url.replace(/\/$/, '')}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`KV ${res.status}`);
  return (await res.json()).result;
}

async function main() {
  loadEnv();
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Chybí KV_REST_API_URL / TOKEN');

  const prefix = process.env.VERCEL_ENV === 'preview' ? 'test:' : '';
  const kDny = `${prefix}kalendar-denni`;
  const kMeta = `${prefix}kalendar-meta`;

  const dny = {};
  const zajisti = (ymd) => {
    if (!dny[ymd]) dny[ymd] = prazdny();
    return dny[ymd];
  };

  const cenyBuf = fs.readFileSync('VIVIEN_ceny_do_31-03-2027.xlsx');
  const cenyWb = XLSX.read(cenyBuf);
  const cenySh = cenyWb.Sheets['Denní ceny'] || cenyWb.Sheets[cenyWb.SheetNames[0]];
  parsujList(cenySh, (ymd, apt, cell) => {
    const den = zajisti(ymd);
    const cislo = typeof cell === 'number' && cell > 0 ? Math.round(cell) : null;
    den[apt].cena = cislo;
  });

  const obsBuf = fs.readFileSync('VIVIEN_obsazenost_2026-11-22.xlsx');
  const obsWb = XLSX.read(obsBuf);
  for (const name of obsWb.SheetNames) {
    parsujList(obsWb.Sheets[name], (ymd, apt, cell) => {
      const raw = String(cell ?? '').toUpperCase();
      const den = zajisti(ymd);
      if (raw.includes('OBSAZ') || raw.includes('NEDOSTUP')) {
        den[apt].obsazeno = true;
        den[apt].bezPrijezdu = false;
      } else if (raw.includes('OMEZEN')) {
        den[apt].obsazeno = false;
        den[apt].bezPrijezdu = true;
      }
    });
  }

  const ted = new Date().toISOString();
  let meta = {
    cenyNahrano: ted,
    obsazenostNahrano: ted,
    cenyZapnuto: true,
    zdrojCen: 'xlsx',
    posledniRezervace: null,
  };
  try {
    const prev = await kv(url, token, 'GET', kMeta);
    if (prev) {
      const p = typeof prev === 'string' ? JSON.parse(prev) : prev;
      meta = { ...meta, cenyZapnuto: p.cenyZapnuto !== false };
    }
  } catch {
    /* */
  }

  async function cmd(...args) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args.map(String)),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(`KV ${res.status} ${json.error || ''}`);
    return json.result;
  }

  await cmd('SET', kDny, JSON.stringify(dny));
  await cmd('SET', kMeta, JSON.stringify(meta));
  console.log('OK', kDny, 'dnů', Object.keys(dny).length, 'meta', kMeta);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
