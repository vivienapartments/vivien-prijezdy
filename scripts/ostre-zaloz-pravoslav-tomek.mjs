/**
 * Ostrá: založí zkušebního hosta Pravoslav Tomek (Booking, 2× 2 500 Kč, odjezd 27. 11. 2026).
 * E-mail: pravostom@gmail.com · telefon +420 777 702 272.
 * Ukáže se v přehledu u poděkování. Mimo statistiky (zkusebni).
 *
 *   node scripts/ostre-zaloz-pravoslav-tomek.mjs
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

const base = (process.argv[2] || 'https://vivien-prijezdy-six.vercel.app').replace(/\/$/, '');
const secret = process.env.PRUVODCE_TOKEN_SECRET?.trim();
const kvUrl = process.env.KV_REST_API_URL?.trim();
const kvToken = process.env.KV_REST_API_TOKEN?.trim();
if (!secret || secret.length < 32 || !kvUrl || !kvToken) {
  console.error('Chybí PRUVODCE_TOKEN_SECRET / KV v .env.local');
  process.exit(1);
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

const idStary = 'ZKTOMEK1';
const id = 'ZKTOMEK27';
const klientId = 'k-zk-pravoslav-tomek';
const tajnyKlic = 'zk-pravoslav-tomek';
const ted = new Date().toISOString();

function rezZaznam(opts) {
  return {
    rezervace: opts.id,
    apartman: opts.apt,
    prijezd: opts.prijezd,
    odjezd: opts.odjezd,
    noci: 2,
    osob: 2,
    jazyk: 'cs',
    jmeno: 'Pravoslav Tomek',
    krestni: 'Pravoslav',
    prijmeni: 'Tomek',
    narodnost: 'CZE',
    emailHosta: 'pravostom@gmail.com',
    accessPin: '1234',
    vytvoreno: opts.prijezd,
    poplatek: 'ano',
    stav: 'odeslano',
    duvody: [],
    posledniPokus: ted,
    odeslaneMessageId: null,
    historie: [
      {
        cas: ted,
        co: opts.historie,
      },
    ],
    upozorneneKody: [],
    smtpPokusy: 0,
    otevrenoPoprve: ted,
    otevrenoNaposled: ted,
    otevrenoPocet: 1,
    telefon: '+420777702272',
    telefonWa: '420777702272',
    telefonPuvodni: '777 702 272',
    zdroj: 'Booking.com',
    zdrojCeka: false,
    zkusebni: true,
    predano: ted,
    podekovaniKdy: opts.podekovaniKdy,
    podekovaniKanal: opts.podekovaniKanal,
    kartaPredana: { kdy: ted, kanaly: ['email'] },
    cenaPobytu: 2500,
    saldoKc: 0,
  };
}

const stary = rezZaznam({
  id: idStary,
  apt: 'V2',
  prijezd: '2026-10-01',
  odjezd: '2026-10-03',
  historie: 'Zkouška Pravoslav Tomek · 1. Booking pobyt (hotovo)',
  podekovaniKdy: '2026-10-03T14:00:00.000Z',
  podekovaniKanal: 'email',
});

const aktualni = rezZaznam({
  id,
  apt: 'V1',
  prijezd: '2026-11-25',
  odjezd: '2026-11-27',
  historie: 'Zkouška Pravoslav Tomek · 2. Booking pobyt, čeká poděkování',
  podekovaniKdy: null,
  podekovaniKanal: null,
});

const karta = {
  id: klientId,
  kod: 'PRAVTOMEK',
  tajnyKlic,
  datumZalozeni: ted,
  typ: 'host',
  role: ['host'],
  stav: 'aktivni',
  jmeno: 'Pravoslav',
  prijmeni: 'Tomek',
  email: 'pravostom@gmail.com',
  telefon: '+420777702272',
  jazyk: 'cs',
  rezervace: [idStary, id],
  firma: null,
  utrataKc: 0,
  utrataRucne: [],
  urovenId: 'host',
  kredit: [],
  kreditKc: 0,
  dopKodPuvod: null,
  poznamka: 'Zkouška Booking → napřímo · 2× 2 500 Kč (nepočítá se)',
  zalozil: 'ostre-zaloz-pravoslav-tomek',
  slevaBehem: [],
  slevaKontrola: null,
  podekovaniVidel: null,
  podekovaniVarianta: null,
  podekovaniVariantaPobyt: null,
  podekovaniVariantaPred: null,
};

await cmd('SET', `rez:${idStary}`, JSON.stringify(stary));
await cmd('SET', `rez:${id}`, JSON.stringify(aktualni));
await cmd('SET', `klient:${klientId}`, JSON.stringify(karta));
await cmd('SET', `klient-klic:${tajnyKlic}`, JSON.stringify({ id: klientId }));
await cmd('SET', `klient-index:rez:${idStary}`, JSON.stringify({ id: klientId }));
await cmd('SET', `klient-index:rez:${id}`, JSON.stringify({ id: klientId }));
await cmd('SET', `klient-index:tel:420777702272`, JSON.stringify({ id: klientId }));
await cmd('SET', `klient-index:email:pravostom@gmail.com`, JSON.stringify({ id: klientId }));
await cmd('SET', `klient-kod:PRAVTOMEK`, JSON.stringify({ id: klientId }));

const seznamRaw = await cmd('GET', 'klient-seznam');
let seznam = [];
try {
  seznam = seznamRaw ? JSON.parse(seznamRaw) : [];
} catch {
  seznam = [];
}
if (!Array.isArray(seznam)) seznam = [];
if (!seznam.includes(klientId)) seznam.unshift(klientId);
await cmd('SET', 'klient-seznam', JSON.stringify(seznam.slice(0, 5000)));

const token = createToken({
  r: id,
  a: 'V1',
  p: '2026-11-25',
  d: '2026-11-27',
  o: 2,
  l: 'cs',
  i: '1234',
  f: 1,
});

console.log(
  JSON.stringify(
    {
      ok: true,
      rezervace: id,
      rezervaceStara: idStary,
      prehled: `${base}/prehled#podekovani`,
      karta: `${base}/klub?k=${encodeURIComponent(tajnyKlic)}`,
      email: 'pravostom@gmail.com',
      telefon: '+420 777 702 272',
      pruvodcePoOdjezdu: `${base}/${token}`,
    },
    null,
    2,
  ),
);
