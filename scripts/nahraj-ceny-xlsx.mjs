/**
 * Nahraje jen ceny z VIVIEN_ceny_2026-11-23_2027-12-31.xlsx do ostrého Upstash.
 * Sloučí s existujícími dny (obsazenost z iCal / starší data nechá).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
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

async function cmd(url, token, ...args) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args.map(String)),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`KV ${json.error || res.status}`);
  return json.result;
}

async function main() {
  loadEnv();
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) throw new Error('Chybí KV_REST_API_URL / TOKEN');

  const soubor = path.join(root, 'VIVIEN_ceny_2026-11-23_2027-12-31.xlsx');
  if (!fs.existsSync(soubor)) throw new Error('Chybí ' + soubor);

  const wb = XLSX.read(fs.readFileSync(soubor));
  const sh = wb.Sheets['Denní ceny'] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: null, raw: true });
  let header = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    if (/datum/i.test(String(rows[i]?.[0] ?? ''))) {
      header = i;
      break;
    }
  }
  if (header < 0) throw new Error('List bez řádku Datum');

  const patch = {};
  for (let i = header + 1; i < rows.length; i++) {
    const r = rows[i];
    const ymd = excelDatumNaYmd(r?.[0]);
    if (!ymd) continue;
    if (!patch[ymd]) patch[ymd] = prazdny();
    for (let a = 0; a < 5; a++) {
      const cell = r[a + 2];
      const cislo = typeof cell === 'number' && cell > 0 ? Math.round(cell) : null;
      patch[ymd][APT[a]].cena = cislo;
    }
  }

  const kDny = 'kalendar-denni';
  const kMeta = 'kalendar-meta';
  let dny = {};
  try {
    const raw = await cmd(url, token, 'GET', kDny);
    if (raw) dny = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    /* prázdné */
  }

  for (const [ymd, den] of Object.entries(patch)) {
    if (!dny[ymd]) dny[ymd] = prazdny();
    for (const id of APT) {
      dny[ymd][id] = {
        ...(dny[ymd][id] || { cena: null, obsazeno: false, bezPrijezdu: false }),
        cena: den[id].cena,
      };
    }
  }

  const v1 = dny['2026-12-10']?.V1?.cena;
  if (v1 !== 1690) throw new Error(`Ověření V1 10.12.2026 selhalo: ${v1}`);

  let meta = {
    cenyNahrano: new Date().toISOString(),
    obsazenostNahrano: null,
    cenyZapnuto: true,
    zdrojCen: 'xlsx',
    posledniRezervace: null,
  };
  try {
    const prev = await cmd(url, token, 'GET', kMeta);
    if (prev) {
      const p = typeof prev === 'string' ? JSON.parse(prev) : prev;
      meta = {
        ...meta,
        obsazenostNahrano: p.obsazenostNahrano || null,
        cenyZapnuto: p.cenyZapnuto !== false,
        posledniRezervace: p.posledniRezervace || null,
      };
    }
  } catch {
    /* */
  }

  await cmd(url, token, 'SET', kDny, JSON.stringify(dny));
  await cmd(url, token, 'SET', kMeta, JSON.stringify(meta));
  console.log(
    JSON.stringify(
      {
        ok: true,
        dnuPatch: Object.keys(patch).length,
        v1_2026_12_10: v1,
        cenyNahrano: meta.cenyNahrano,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
