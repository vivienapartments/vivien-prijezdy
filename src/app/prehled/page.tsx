import { LoginForm } from './LoginForm';
import { PrehledClient } from './PrehledClient';
import { chybejiciWifi } from '@/lib/nastaveni-chyby';
import { buildPrehledSOdkazy } from '@/lib/prehled-odkazy';
import { ukazkoveRadky } from '@/lib/prehled-ukazka';
import { dnesVPraze, posunDen } from '@/lib/prehled';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore } from '@/lib/store';
import './prehled.scss';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Přehled rezervací',
  applicationName: 'VIVIEN',
  manifest: '/prehled/manifest.webmanifest',
  robots: { index: false, follow: false, nocache: true },
  appleWebApp: { capable: true, title: 'VIVIEN', statusBarStyle: 'black-translucent' as const },
};

export const viewport = {
  themeColor: '#1c1712',
};

type Props = { searchParams: Promise<{ ukazka?: string }> };

export default async function PrehledPage({ searchParams }: Props) {
  const sp = await searchParams;
  const ukazka = process.env.NODE_ENV !== 'production' && sp.ukazka === '1';
  if (!(await prehledPrihlasen()) && !ukazka) {
    return <LoginForm />;
  }
  const now = new Date();
  const rows = ukazka ? ukazkoveRadky(now) : await buildPrehledSOdkazy(createProcessStore(), now);
  const dnes = dnesVPraze(now);
  return (
    <PrehledClient rows={rows} dnes={dnes} zitra={posunDen(dnes, 1)} chybiWifi={chybejiciWifi()} ukazka={ukazka} />
  );
}
