import { redirect } from 'next/navigation';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { PoptavkyClient } from './PoptavkyClient';
import '../prehled.scss';

export const dynamic = 'force-dynamic';

export default async function PrehledPoptavkyPage() {
  if (!(await prehledPrihlasen())) redirect('/prehled');
  return <PoptavkyClient />;
}
