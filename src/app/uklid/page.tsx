import { LoginForm } from './LoginForm';
import { UklidClient } from './UklidClient';
import { uklidPrihlasen } from '@/lib/uklid-session';
import './uklid.scss';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'VIVIEN Úklid',
  applicationName: 'VIVIEN Úklid',
  manifest: '/uklid/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/prehled/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/prehled/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/prehled/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  robots: { index: false, follow: false, nocache: true },
  appleWebApp: { capable: true, title: 'VIVIEN Úklid', statusBarStyle: 'black-translucent' as const },
};

/** Stejně jako Přehled: bez pinch-zoom na iPhonu. */
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1c1712',
  viewportFit: 'cover' as const,
};

export default async function UklidPage() {
  if (!(await uklidPrihlasen())) {
    return <LoginForm />;
  }
  return <UklidClient />;
}
