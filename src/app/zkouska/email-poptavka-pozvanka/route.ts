import { NextResponse } from 'next/server';
import {
  htmlPozvankaPoptavkyFinal,
  odkazObecnePoptavky,
  type PozvankaFinalVerze,
} from '@/lib/poptavka-pozvanka';

/**
 * Náhled finální pozvánky.
 * ?final=1|2|3  (stříbrná sleva + patička)
 */
export function GET(req: Request) {
  const u = new URL(req.url);
  const raw = Number(u.searchParams.get('final') || u.searchParams.get('klub') || '3');
  const final = ([1, 2, 3].includes(raw) ? raw : 3) as PozvankaFinalVerze;
  const html = htmlPozvankaPoptavkyFinal(odkazObecnePoptavky(), final);

  const popisky: Record<PozvankaFinalVerze, string> = {
    1: '1 · stříbrný pruh slevy · Zavolejte + číslo',
    2: '2 · stříbrný text slevy · velké číslo',
    3: '3 · velké 5 % stříbrně · Napište nebo zavolejte',
  };

  const odkazy = ([1, 2, 3] as PozvankaFinalVerze[])
    .map(
      (n) =>
        `<a href="?final=${n}" style="color:#1a1510;margin:0 6px;${n === final ? 'text-decoration:underline;font-weight:900;' : ''}">${n}</a>`,
    )
    .join('');

  const banner = `<div style="position:sticky;top:0;z-index:9;background:#c9a84c;color:#1a1510;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-align:center;padding:10px 12px;line-height:1.45;">
    NÁHLED · finále: ${popisky[final]}<br>
    verze ${odkazy}
    · <a href="/zkouska/email-poptavka-potvrzeni?v=4" style="color:#1a1510;">potvrzení</a>
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
