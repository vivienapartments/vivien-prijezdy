import { NextResponse } from 'next/server';
import {
  htmlZpravaPoptavkyHostovi,
  nadpisNejdePoptavky,
  nadpisPotvrzeniPoptavky,
  predmetPotvrzeniPoptavky,
  textNejdeProEmail,
  textPotvrzeniProEmail,
  type PoptavkaEmailVerze,
} from '@/lib/poptavka-potvrzeni-email';

/**
 * Náhled učesaného e-mailu po potvrzení poptávky.
 * ?v=1|2|3|4  ·  ?typ=potvrzeni|nejde  ·  ?text=1|2|3
 */
export function GET(req: Request) {
  const u = new URL(req.url);
  const vRaw = Number(u.searchParams.get('v') || '1');
  const verze = ([1, 2, 3, 4].includes(vRaw) ? vRaw : 1) as PoptavkaEmailVerze;
  const typ = (u.searchParams.get('typ') || 'potvrzeni').toLowerCase();
  const nejde = typ === 'nejde';
  const predmet = nejde
    ? 'VIVIEN Apartments, termín'
    : predmetPotvrzeniPoptavky(false);
  const nadpis = nejde ? nadpisNejdePoptavky() : nadpisPotvrzeniPoptavky();
  const text = nejde
    ? textNejdeProEmail('Martine', '')
    : textPotvrzeniProEmail('Martine');

  const html = htmlZpravaPoptavkyHostovi({
    predmet,
    nadpis,
    text,
    jmeno: 'Martine',
    termin: '12.–14. 12. 2026 · 2 noci',
    apartman: 'Jemná harmonie',
    cena: nejde ? '' : '4 750 Kč → se slevou 5 % 4 513 Kč',
    verze,
  });

  const popisky: Record<PoptavkaEmailVerze, string> = {
    1: '1 · čistě (fotka, nadpis, box, text)',
    2: '2 · jemný řádek VIVIEN pod fotkou',
    3: '3 · pozdrav jako nadpis',
    4: '4 · box vedle sebe + telefon',
  };

  const odkazyVerzi = ([1, 2, 3, 4] as PoptavkaEmailVerze[])
    .map(
      (n) =>
        `<a href="?v=${n}&typ=${nejde ? 'nejde' : 'potvrzeni'}" style="color:#1a1510;margin:0 6px;${n === verze ? 'text-decoration:underline;font-weight:900;' : ''}">${n}</a>`,
    )
    .join('');

  const banner = `<div style="position:sticky;top:0;z-index:9;background:#c9a84c;color:#1a1510;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-align:center;padding:10px 12px;line-height:1.45;">
    NÁHLED · ${popisky[verze]} · schválený text<br>
    verze ${odkazyVerzi}
    · <a href="?v=${verze}&typ=potvrzeni" style="color:#1a1510;">potvrzení</a>
    · <a href="?v=${verze}&typ=nejde" style="color:#1a1510;">nejde</a>
    · <a href="/zkouska/email-poptavka-ctyri" style="color:#1a1510;">výběr 4 verzí</a>
  </div>`;

  const withBanner = html.replace(
    '<body style="margin:0;padding:0;background:#0d0b0a;">',
    `<body style="margin:0;padding:0;background:#0d0b0a;">${banner}`,
  );

  return new NextResponse(withBanner, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
