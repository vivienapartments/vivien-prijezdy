import { redirect } from 'next/navigation';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { KlientiClient } from './KlientiClient';
import '../prehled.scss';

export const dynamic = 'force-dynamic';

export default async function PrehledKlientiPage() {
  if (!(await prehledPrihlasen())) redirect('/prehled');
  return <KlientiClient />;
}
