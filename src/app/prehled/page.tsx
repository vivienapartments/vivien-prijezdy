import { LoginForm } from './LoginForm';
import { PrehledClient } from './PrehledClient';
import { chybejiciWifi } from '@/lib/nastaveni-chyby';
import { buildPrehled, souhrnDnes } from '@/lib/prehled';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore } from '@/lib/store';
import './prehled.scss';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Přehled rezervací',
  robots: { index: false, follow: false, nocache: true },
};

export default async function PrehledPage() {
  if (!(await prehledPrihlasen())) {
    return <LoginForm />;
  }
  const rows = await buildPrehled(createProcessStore());
  return <PrehledClient rows={rows} souhrn={souhrnDnes(rows)} chybiWifi={chybejiciWifi()} />;
}
