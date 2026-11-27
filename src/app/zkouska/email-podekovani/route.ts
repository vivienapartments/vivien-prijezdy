import { NextResponse } from 'next/server';
import { htmlPodekovaniEmail } from '@/lib/podekovani-email';

/**
 * Náhled e-mailu poděkování.
 * ?barva=stribrna|zlata
 */
export function GET(req: Request) {
  const u = new URL(req.url);
  const barvaRaw = (u.searchParams.get('barva') || u.searchParams.get('v') || 'stribrna').toLowerCase();
  const zlata = barvaRaw === 'zlata' || barvaRaw === '2' || barvaRaw === 'zlaty';
  const asset = `${u.protocol}//${u.host}`;
  const odkazKarty = `${asset}/klub?k=test-tomek-pravoslav`;

  const klub = {
    odkazKarty,
    jmeno: 'Tomek Pravoslav',
    urovenId: 'staly',
    urovenNazev: 'Věrný host',
    slevaPct: 6,
    booking: false,
    urovenNova: false,
    dalsiNazev: 'Bronzový host',
    dalsiPct: 7,
    chybiKc: 3000,
    pruhPct: 60,
    kartaReprezentacni: true,
    textPodKartou: 'Pro hosty máme nový VIVIEN Klub. Klepněte na kartu a uvidíte své výhody.',
    navrhKarty: 1 as const,
    kartaBarva: (zlata ? 'zlata' : 'stribrna') as 'stribrna' | 'zlata',
  };

  const html = htmlPodekovaniEmail(
    'cs',
    `${asset}/zkouska/po-odjezdu`,
    asset,
    undefined,
    undefined,
    undefined,
    klub,
  );

  const popisek = zlata
    ? 'NÁHLED · zlatá karta v mailu'
    : 'NÁHLED · stříbrná karta v mailu';
  const banner = `<div style="position:sticky;top:0;z-index:9;background:#c9a84c;color:#1a1510;font-family:Arial,sans-serif;font-size:14px;font-weight:700;text-align:center;padding:10px 12px;">${popisek} · <a href="/zkouska/karta-email-tri" style="color:#1a1510;">zpět k výběru</a></div>`;
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
