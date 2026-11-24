import { NextResponse } from 'next/server';

type Props = { params: Promise<{ token: string }> };

/** Manifest jen pro tento odkaz průvodce. Ikona na ploše otevře stejný token. */
export async function GET(_req: Request, { params }: Props) {
  const { token } = await params;
  const cesta = `/${encodeURIComponent(token)}`;
  const telo = {
    id: cesta,
    name: 'VIVIEN průvodce',
    short_name: 'VIVIEN',
    description: 'Osobní průvodce příjezdem VIVIEN Apartments',
    start_url: cesta,
    scope: cesta,
    display: 'standalone',
    background_color: '#1c1712',
    theme_color: '#1c1712',
    lang: 'cs',
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
