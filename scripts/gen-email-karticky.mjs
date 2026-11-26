/**
 * Předgeneruje PNG klubové kartičky pro e-mail (bez jména).
 * public/email/karticka-{uroven}.png a karticka-{uroven}-partner.png
 * Šířka 600 px (retina render 1200).
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const dir = 'public/email';
fs.mkdirSync(dir, { recursive: true });

const MASK = 'public/klub/va-logo-vtisk-maska.png';
const W = 1200;
const H = 448;
const PAD = 220;

const UROVNE = [
  { id: 'host', barva: '#cbbfa6', tmava: '#2a251d', nazev: 'Host', partner: 'Partner', pct: 5 },
  { id: 'staly', barva: '#d9b88a', tmava: '#2c2516', nazev: 'Věrný host', partner: 'Věrný partner', pct: 6 },
  { id: 'bronz', barva: '#c58a55', tmava: '#2e1f14', nazev: 'Bronzový host', partner: 'Bronzový partner', pct: 7 },
  { id: 'stribrny', barva: '#c9ced4', tmava: '#22262b', nazev: 'Stříbrný host', partner: 'Stříbrný partner', pct: 8 },
  { id: 'zlaty', barva: '#e0b84a', tmava: '#2f2410', nazev: 'Zlatý host', partner: 'Zlatý partner', pct: 9 },
  { id: 'platinovy', barva: '#dfe6ea', tmava: '#1f262b', nazev: 'Platinový host', partner: 'Platinový partner', pct: 10 },
];

function escapeXml(s) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function svgKarticka(u, partner) {
  const nazev = partner ? u.partner : u.nazev;
  const sleva = `sleva na další pobyt ${u.pct} %`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${u.barva}"/>
      <stop offset="50%" stop-color="${u.barva}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${u.tmava}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="56" ry="56" fill="url(#g)"/>
  <g fill="#1c1712" text-anchor="end">
    <text x="1140" y="78" font-family="Arial, Helvetica, sans-serif" font-size="28" letter-spacing="6">VIVIEN KLUB</text>
    <text x="1140" y="168" font-family="Georgia, 'Times New Roman', serif" font-size="78" font-weight="500">${escapeXml(nazev)}</text>
    <text x="1140" y="360" font-family="Arial, Helvetica, sans-serif" font-size="30">${escapeXml(sleva)}</text>
  </g>
</svg>`;
}

async function logoVrstvy() {
  if (!fs.existsSync(MASK)) {
    console.warn('Chybí maska', MASK);
    return [];
  }
  const size = 640;
  const base = await sharp(MASK).resize(size, size).ensureAlpha().png().toBuffer();
  const tmava = await sharp(base).tint({ r: 28, g: 23, b: 18 }).ensureAlpha(0.2).png().toBuffer();
  const svetla = await sharp(base).tint({ r: 255, g: 248, b: 230 }).ensureAlpha(0.32).png().toBuffer();
  const zaklad = await sharp(base).ensureAlpha(0.05).png().toBuffer();
  // Pozice vůči kartě: left -200, top -72 → na padded plátně +PAD
  const L = PAD - 200;
  const T = PAD - 72;
  return [
    { input: tmava, left: L + 5, top: T + 5 },
    { input: svetla, left: L - 3, top: T - 3 },
    { input: zaklad, left: L, top: T },
  ];
}

const vrstvy = await logoVrstvy();

for (const u of UROVNE) {
  for (const partner of [false, true]) {
    const name = partner ? `karticka-${u.id}-partner.png` : `karticka-${u.id}.png`;
    const svgBuf = Buffer.from(svgKarticka(u, partner));
    const card = await sharp(svgBuf).png().toBuffer();
    const padded = await sharp({
      create: {
        width: W + PAD * 2,
        height: H + PAD * 2,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: card, left: PAD, top: PAD }, ...vrstvy])
      .png()
      .toBuffer();
    await sharp(padded)
      .extract({ left: PAD, top: PAD, width: W, height: H })
      .resize(600, 224)
      .png()
      .toFile(path.join(dir, name));
    console.log(name);
  }
}
