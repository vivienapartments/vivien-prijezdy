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
    jmeno: 'Pravoslav Tomek',
    urovenId: 'host',
    urovenNazev: 'Náš host',
    slevaPct: 5,
    booking: true,
    urovenNova: true,
    dalsiNazev: 'Věrný host',
    dalsiPct: 6,
    chybiKc: 8000,
    pruhPct: 0,
    kartaReprezentacni: true,
    textPodKartou: 'Pro hosty máme nový VIVIEN Club. Klepněte na kartu a uvidíte své výhody.',
    navrhKarty: 1 as const,
    kartaBarva: (zlata ? 'zlata' : 'stribrna') as 'stribrna' | 'zlata',
  };

  const html = htmlPodekovaniEmail(
    'cs',
    `${asset}/zkouska/po-odjezdu`,
    asset,
    `${asset}/klub?k=test-tomek-pravoslav&doporucit=1`,
    `${asset}/klub?k=test-tomek-pravoslav&plocha=1`,
    `${asset}/poptavka?zkouska=1`,
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
