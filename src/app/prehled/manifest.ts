import type { MetadataRoute } from 'next';

const POZADI = '#1c1712';

/** Jen pro /prehled. Průvodce hosta tenhle soubor nepoužívá. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VIVIEN přehled',
    short_name: 'VIVIEN',
    start_url: '/prehled',
    scope: '/prehled',
    display: 'standalone',
    background_color: POZADI,
    theme_color: POZADI,
    lang: 'cs',
    icons: [
      { src: '/prehled/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/prehled/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/prehled/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/prehled/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
