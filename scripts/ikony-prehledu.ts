import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const POZADI = { r: 0x1c, g: 0x17, b: 0x12, alpha: 255 };
const LOGO = path.join('assets', 'email', 'logo.png');

async function logoPruhledne() {
  const { data, info } = await sharp(LOGO).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 22 && data[i + 1] < 22 && data[i + 2] < 22) data[i + 3] = 0;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function ikona(logo: Buffer, velikost: number, podil: number) {
  const vnitrni = Math.round(velikost * podil);
  const zmensene = await sharp(logo).resize(vnitrni, vnitrni, { fit: 'contain' }).png().toBuffer();
  return sharp({
    create: { width: velikost, height: velikost, channels: 4, background: POZADI },
  })
    .composite([{ input: zmensene, gravity: 'centre' }])
    .png()
    .toBuffer();
}

async function main() {
  const logo = await logoPruhledne();
  const cil = path.join('public', 'prehled');
  await mkdir(cil, { recursive: true });
  await mkdir(path.join('src', 'app', 'prehled'), { recursive: true });
  const soubory: [string, number, number][] = [
    [path.join(cil, 'icon-192.png'), 192, 0.86],
    [path.join(cil, 'icon-512.png'), 512, 0.86],
    [path.join(cil, 'icon-192-maskable.png'), 192, 0.66],
    [path.join(cil, 'icon-512-maskable.png'), 512, 0.66],
    [path.join('src', 'app', 'prehled', 'apple-icon.png'), 180, 0.78],
    [path.join('src', 'app', 'prehled', 'icon.png'), 64, 0.88],
  ];
  for (const [soubor, velikost, podil] of soubory) {
    await writeFile(soubor, await ikona(logo, velikost, podil));
  }
}

main();
