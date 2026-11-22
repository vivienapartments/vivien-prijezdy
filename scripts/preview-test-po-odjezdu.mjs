/**
 * Preview: založí test:rez:TESTPOMAJ (odjeto), pošle majiteli poděkování s odkazem na Preview.
 * Argument: https://….vercel.app
 * Žádný Telegram. Jen MAJITEL_EMAIL.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

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
  console.error('Chybí Preview URL.');
  process.exit(1);
}

const majitel = process.env.MAJITEL_EMAIL?.trim();
const user = process.env.SMTP_USER?.trim();
const pass = process.env.SMTP_HESLO?.trim();
const secret = process.env.PRUVODCE_TOKEN_SECRET?.trim();
const kvUrl = process.env.KV_REST_API_URL?.trim();
const kvToken = process.env.KV_REST_API_TOKEN?.trim();
if (!majitel || !user || !pass || !secret || secret.length < 32 || !kvUrl || !kvToken) {
  console.error('Chybí MAJITEL_EMAIL / SMTP / PRUVODCE_TOKEN_SECRET / KV v .env.local');
  process.exit(1);
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

const id = 'TESTPOMAJ';
const prijezd = ymdPraha(-3);
const odjezd = ymdPraha(-1);
const ted = new Date().toISOString();
const jmeno = 'Pravoslav Tomek';

const rec = {
  rezervace: id,
  apartman: 'V1',
  prijezd,
  odjezd,
  noci: 2,
  osob: 2,
  jazyk: 'cs',
  jmeno,
  krestni: 'Pravoslav',
  narodnost: 'CZE',
  emailHosta: majitel,
  accessPin: '1234',
  vytvoreno: prijezd,
  poplatek: 'ano',
  stav: 'odeslano',
  duvody: [],
  posledniPokus: ted,
  odeslaneMessageId: null,
  historie: [{ cas: ted, co: 'Zkušební karta Preview (odjeto)' }],
  upozorneneKody: [],
  smtpPokusy: 0,
  otevrenoPoprve: null,
  otevrenoNaposled: null,
  otevrenoPocet: 0,
  telefon: null,
  telefonWa: null,
  telefonPuvodni: null,
  zdroj: 'přímá',
  predano: ted,
  podekovaniKdy: null,
  podekovaniKanal: null,
};

await cmd('SET', `test:rez:${id}`, JSON.stringify(rec));
console.log('Uloženo test:rez:' + id, prijezd, '→', odjezd);

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
const odkaz = `${base}/${token}`;
console.log('Odkaz po odjezdu:', odkaz);

const text =
  'Dobrý den, doufáme, že cesta domů proběhla v pořádku. Moc děkujeme za vaši návštěvu. V průvodci na vás čeká krátký vzkaz od nás, malý dárek na příští pobyt a také dárek pro vaše blízké.\n\n' +
  odkaz;

const transporter = nodemailer.createTransport({
  host: 'smtp.seznam.cz',
  port: 465,
  secure: true,
  auth: { user, pass },
});

await transporter.sendMail({
  from: `VIVIEN Apartments <${user}>`,
  to: majitel,
  subject: 'VIVIEN · Než odkaz na průvodce skončí',
  text,
  html: `<div style="font-family:Georgia,serif;font-size:17px;line-height:1.45;color:#1c1714;max-width:560px">
    <p>Dobrý den, doufáme, že cesta domů proběhla v pořádku. Moc děkujeme za vaši návštěvu. V průvodci na vás čeká krátký vzkaz od nás, malý dárek na příští pobyt a také dárek pro vaše blízké.</p>
    <p style="text-align:center;margin:28px 0"><a href="${odkaz}" style="display:inline-block;padding:12px 22px;background:#c9a84c;color:#1a1510;text-decoration:none;border-radius:28px;font-weight:600">Otevřít průvodce</a></p>
    <p style="font-size:13px;color:#666">Zkouška Preview větev doporuceni. Karta test:rez:${id}. Ostrá se nemění.</p>
  </div>`,
});

console.log('E-mail odeslán na', majitel);
console.log(
  JSON.stringify(
    {
      poOdjezdu: odkaz,
      vernost: `${base}/poptavka?zkouska=1`,
      doporuceni: `${base}/poptavka?od=zkouska`,
      obecna: `${base}/poptavka`,
      firma: `${base}/poptavka?f=raccoon`,
      nahledPoOdjezdu: `${base}/nahled-po-odjezdu`,
    },
    null,
    2,
  ),
);
