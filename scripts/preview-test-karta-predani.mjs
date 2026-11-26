/**
 * Preview: založí test:rez:TESTKARTY (Pravoslav Tomek) + kartu klubu (10 000 Kč)
 * a vypíše odkazy na přehled, kartu a fiktivní průvodce.
 *
 * Spuštění:
 *   node scripts/preview-test-karta-predani.mjs https://vivien-prijezdy-git-doporuceni-pravoslav.vercel.app
 *
 * Jen test: klíče. Ostrá se nemění.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(klic in process.env)) process.env[klic] = val;
  }
}

nactiEnv(path.join(root, '.env.local'));

const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base.startsWith('https://')) {
  console.error('Chybí Preview URL (https://…).');
  process.exit(1);
}

const secret = process.env.PRUVODCE_TOKEN_SECRET?.trim();
const kvUrl = process.env.KV_REST_API_URL?.trim();
const kvToken = process.env.KV_REST_API_TOKEN?.trim();
if (!secret || secret.length < 32 || !kvUrl || !kvToken) {
  console.error('Chybí PRUVODCE_TOKEN_SECRET / KV v .env.local');
  process.exit(1);
}

function ymdPraha(offsetDni = 0) {
  const d = new Date(Date.now() + offsetDni * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function createToken(payload) {
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

async function cmd(...args) {
  const res = await fetch(kvUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args.map(String)),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`KV ${json.error || res.status}`);
  return json.result;
}

const id = 'TESTKARTY';
const klientId = 'k-zkouska-pravoslav';
const tajnyKlic = 'zkouska-pravoslav-karta';
const prijezd = ymdPraha(0);
const odjezd = ymdPraha(2);
const ted = new Date().toISOString();

const rec = {
  rezervace: id,
  apartman: 'V1',
  prijezd,
  odjezd,
  noci: 2,
  osob: 2,
  jazyk: 'cs',
  jmeno: 'Pravoslav Tomek',
  krestni: 'Pravoslav',
  prijmeni: 'Tomek',
  narodnost: 'CZE',
  emailHosta: 'info@vivienapartments.cz',
  accessPin: '1234',
  vytvoreno: prijezd,
  poplatek: 'ano',
  stav: 'odeslano',
  duvody: [],
  posledniPokus: ted,
  odeslaneMessageId: null,
  historie: [{ cas: ted, co: 'Zkouška Předat apartmán · karta + průvodce' }],
  upozorneneKody: [],
  smtpPokusy: 0,
  otevrenoPoprve: ted,
  otevrenoNaposled: ted,
  otevrenoPocet: 1,
  telefon: '+420777702272',
  telefonWa: '420777702272',
  telefonPuvodni: '777 702 272',
  zdroj: 'přímá',
  zdrojCeka: false,
  zkusebni: true,
  casPrijezdu: '15:00',
  casZadalHost: true,
  checkinUrl: null,
  stitek: 'rucne',
  predano: null,
  naMiste: null,
  cenaPobytu: 4500,
  saldoKc: 0,
  zaplaceno: ted,
  platby: [],
  prevzatoKdy: null,
  kartaPredana: null,
  zpusobPrijezdu: 'auto',
  telefonBrana: '+420777702272',
  spz: '1C27022',
  branaRegistrovano: ted,
  souhlasPravidel: { kdy: ted, jazyk: 'cs', verze: '1' },
};

const karta = {
  id: klientId,
  kod: 'PRAV1',
  tajnyKlic,
  datumZalozeni: ted,
  typ: 'host',
  role: ['host'],
  stav: 'aktivni',
  jmeno: 'Pravoslav',
  prijmeni: 'Tomek',
  email: 'info@vivienapartments.cz',
  telefon: '+420777702272',
  jazyk: 'cs',
  rezervace: [id],
  firma: null,
  utrataKc: 10000,
  utrataRucne: [
    {
      id: 'u-zkouska-1',
      castka: 10000,
      kdy: ted,
      poznamka: 'zkouška karty předání (minulé pobyty)',
    },
  ],
  urovenId: 'staly',
  kredit: [],
  kreditKc: 0,
  dopKodPuvod: null,
  poznamka: 'Zkouška Předat apartmán 26. 11. 2026',
  zalozil: 'preview-test-karta-predani',
  slevaBehem: [],
  slevaKontrola: null,
  podekovaniVidel: null,
};

await cmd('SET', `test:rez:${id}`, JSON.stringify(rec));
await cmd('SET', `test:klient:${klientId}`, JSON.stringify(karta));
await cmd('SET', `test:klient-klic:${tajnyKlic}`, JSON.stringify({ id: klientId }));
await cmd('SET', `test:klient-index:rez:${id}`, JSON.stringify({ id: klientId }));
await cmd('SET', `test:klient-index:tel:420777702272`, JSON.stringify({ id: klientId }));
await cmd('SET', `test:klient-index:email:info@vivienapartments.cz`, JSON.stringify({ id: klientId }));
await cmd('SET', `test:klient-kod:PRAV1`, JSON.stringify({ id: klientId }));

const seznamRaw = await cmd('GET', 'test:klient-seznam');
let seznam = [];
try {
  seznam = seznamRaw ? JSON.parse(seznamRaw) : [];
} catch {
  seznam = [];
}
if (!Array.isArray(seznam)) seznam = [];
if (!seznam.includes(klientId)) seznam.unshift(klientId);
await cmd('SET', 'test:klient-seznam', JSON.stringify(seznam.slice(0, 5000)));

const token = createToken({
  r: id,
  a: 'V1',
  p: prijezd,
  d: odjezd,
  o: 2,
  l: 'cs',
  i: '1234',
  f: 1,
});

const odkazKarty = `${base}/klub?k=${encodeURIComponent(tajnyKlic)}`;
const odkazPruvodce = `${base}/${token}`;
const odkazPrehled = `${base}/prehled`;

console.log('');
console.log('Uloženo test:rez:TESTKARTY + test:klient (10 000 Kč).');
console.log('');
console.log('1. Přehled (přihlášení):');
console.log('   ' + odkazPrehled);
console.log('   Host: Pravoslav Tomek · Předat apartmán → WhatsApp');
console.log('');
console.log('2. Karta (útrata 10 000):');
console.log('   ' + odkazKarty);
console.log('');
console.log('3. Fiktivní průvodce (PINy až po Předat):');
console.log('   ' + odkazPruvodce);
console.log('');
console.log('WhatsApp/SMS při zkoušce: +420 777 702 272');
console.log('E-mail při zkoušce: info@vivienapartments.cz');
console.log('');
