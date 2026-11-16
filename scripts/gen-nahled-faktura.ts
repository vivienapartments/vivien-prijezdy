import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { htmlDokladuSQr, sestavDokladZRezervace } from '../src/lib/faktura-doklad';
import { prazdnaRezervace } from '../src/lib/store';

async function main() {
  const rec = {
    ...prazdnaRezervace('120260042', '2026-11-16T10:00:00.000Z'),
    jmeno: 'Norbert Racz',
    apartman: 'V2' as const,
    prijezd: '2026-11-20',
    odjezd: '2026-11-23',
    noci: 3,
    osob: 1,
    jazyk: 'cs' as const,
    mena: 'CZK' as const,
    cenaPobytu: 4569.85,
    poplatek: 'ano' as const,
    faktura: {
      typ: 'zahranici' as const,
      nazev: 'NR biz s.r.o.',
      adresa: 'Lehotskeho 1, Bratislava 811 06',
      zeme: 'Slovakia',
      ico: '50749153',
      email: 'firma@example.com',
      zadal: 'host' as const,
      kdy: '2026-11-16T12:00:00.000Z',
    },
  };

  const poOdjezdu = sestavDokladZRezervace(
    { ...rec, prijezd: '2026-11-07', odjezd: '2026-11-10' },
    {
      typ: 'faktura',
      lang: 'cs',
      apartmanNazev: 'Jemna harmonie',
      logoUrl: '/pruvodce/va-logo-faktura.png',
    },
  );
  const zaloha = sestavDokladZRezervace(rec, {
    typ: 'zalohova',
    lang: 'cs',
    vystaveno: '2026-11-16',
    splatnost: '2026-11-20',
    apartmanNazev: 'Jemna harmonie',
    logoUrl: '/pruvodce/va-logo-faktura.png',
  });

  const htmlPo = await htmlDokladuSQr(poOdjezdu);
  const htmlZa = await htmlDokladuSQr(zaloha);
  writeFileSync(join(process.cwd(), 'public', 'nahled-faktura-doklad.html'), htmlPo);
  writeFileSync(join(process.cwd(), 'public', 'nahled-faktura-zaloha.html'), htmlZa);
  console.log(
    JSON.stringify({
      poOdjezdu: {
        size: htmlPo.length,
        uhrazeno: htmlPo.includes('Doklad je uhrazený'),
        promo: htmlPo.includes('QR na rezervaci'),
      },
      zaloha: {
        size: htmlZa.length,
        title: htmlZa.includes('Zálohová faktura'),
        qrPlatba: htmlZa.includes('QR platba'),
        kUhrade: htmlZa.includes('Celkem k úhradě'),
        bezPromo: !htmlZa.includes('QR na rezervaci'),
      },
    }),
  );
}

void main();
