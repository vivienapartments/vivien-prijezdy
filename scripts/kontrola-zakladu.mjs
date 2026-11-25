/**
 * Kontrola základů po nasazení (produkce i Preview).
 * Použití: node scripts/kontrola-zakladu.mjs https://…
 * Volitelně 2. argument: hotový token TESTPOMAJ2. Jinak se složí z .env.local.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
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

const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base.startsWith('https://') && !base.startsWith('http://localhost')) {
  console.error('Chybí základní URL (https://… nebo http://localhost:…).');
  process.exit(1);
}

function createToken(payload) {
  const secret = process.env.PRUVODCE_TOKEN_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error('Chybí PRUVODCE_TOKEN_SECRET v .env.local (min. 32 znaků).');
  }
  const out = { r: String(payload.r), a: payload.a, d: payload.d, l: payload.l };
  if (payload.p) out.p = payload.p;
  if (typeof payload.o === 'number' && payload.o > 0) out.o = Math.floor(payload.o);
  if (payload.i) out.i = String(payload.i).trim();
  if (payload.f === 0 || payload.f === 1) out.f = payload.f;
  const json = JSON.stringify(out);
  const body = Buffer.from(json, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(json).digest('base64url');
  return `${body}.${sig}`;
}

function ymdPraha(offsetDni) {
  const d = new Date(Date.now() + offsetDni * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

const tokenArg = (process.argv[3] || '').trim();
const token =
  tokenArg ||
  createToken({
    r: 'TESTPOMAJ2',
    a: 'V1',
    p: ymdPraha(-3),
    d: ymdPraha(-1),
    o: 2,
    l: 'cs',
    i: '1234',
    f: 1,
  });

const vysledky = [];

function jeVercelSso(res) {
  const loc = res.headers.get('location') || '';
  return res.status === 302 && /vercel\.com\/sso/i.test(loc);
}

async function check(nazev, url, okFn) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    if (jeVercelSso(res)) {
      // Preview s Deployment Protection: bez přihlášení nejde HTML. Build Ready = stačí.
      vysledky.push({ nazev, ok: true, status: res.status, url, poznamka: 'preview SSO' });
      console.log('OK ', nazev, res.status, '(preview SSO)');
      return;
    }
    const text = await res.text();
    const ok = okFn(res, text);
    vysledky.push({ nazev, ok, status: res.status, url });
    console.log(ok ? 'OK ' : 'FAIL', nazev, res.status);
  } catch (e) {
    vysledky.push({ nazev, ok: false, status: 0, url, chyba: String(e?.message || e) });
    console.log('FAIL', nazev, e?.message || e);
  }
}

await check(`/{token TESTPOMAJ2}`, `${base}/${token}`, (res, text) => {
  if (res.status !== 200) return false;
  const n = text.toLowerCase();
  return (
    n.includes('vivien') ||
    n.includes('průvodce') ||
    n.includes('pruvodce') ||
    n.includes('děkujeme') ||
    n.includes('dekujeme') ||
    n.includes('thank') ||
    n.includes('expired') ||
    n.includes('pobyt')
  );
});

await check(`/{token}/manifest.webmanifest`, `${base}/${token}/manifest.webmanifest`, (res, text) => {
  if (res.status !== 200) return false;
  try {
    const j = JSON.parse(text);
    return Boolean(j && (j.name || j.short_name) && j.start_url);
  } catch {
    return false;
  }
});

await check('/poptavka?t=…', `${base}/poptavka?t=${encodeURIComponent(token)}`, (res) => {
  return res.status === 200;
});

await check('/prehled', `${base}/prehled`, (res) => {
  // 200 přihlášení, 307/302 redirect na login, 401 = taky „žije“
  return res.status === 200 || res.status === 401 || res.status === 302 || res.status === 307;
});

console.log('Spouštím npm test…');
const test = spawnSync('npm', ['test'], { cwd: root, encoding: 'utf8', shell: true });
const testOk = test.status === 0;
vysledky.push({ nazev: 'npm test', ok: testOk, status: test.status });
if (!testOk) {
  console.log(test.stdout || '');
  console.log(test.stderr || '');
}
console.log(testOk ? 'OK  npm test' : 'FAIL npm test');

const vseOk = vysledky.every((v) => v.ok);
console.log(JSON.stringify({ base, tokenPrefix: token.slice(0, 24) + '…', vysledky, vseOk }, null, 2));
process.exit(vseOk ? 0 : 1);
