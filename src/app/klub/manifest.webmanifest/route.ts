import { NextResponse } from 'next/server';
import { adresaPrujezd } from '@/lib/verejna-adresa';

const OSTRA = adresaPrujezd();

/** Manifest karty klubu. Ikona na ploše / PC otevře stejnou kartu. */
export async function GET(req: Request) {
  const k = (() => {
    try {
      return (new URL(req.url).searchParams.get('k') || '').trim();
    } catch {
      return '';
    }
  })();
  if (!k) {
    return new NextResponse('Chybí k', { status: 400 });
  }

  const origin = (() => {
    try {
      return new URL(req.url).origin || OSTRA;
    } catch {
      return OSTRA;
    }
  })();
  const cesta = `/klub?k=${encodeURIComponent(k)}`;
  const manifestUrl = `${origin}/klub/manifest.webmanifest?k=${encodeURIComponent(k)}`;

  const telo = {
    id: cesta,
    name: 'VIVIEN Klub',
    short_name: 'VIVIEN',
    description: 'Karta VIVIEN Klubu',
    start_url: cesta,
    scope: '/',
    display: 'standalone',
    background_color: '#1c1712',
    theme_color: '#1c1712',
    lang: 'cs',
    prefer_related_applications: false,
    related_applications: [{ platform: 'webapp', url: manifestUrl }],
    icons: [
      { src: '/prehled/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/prehled/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/prehled/icon-192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/prehled/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };

  return NextResponse.json(telo, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
