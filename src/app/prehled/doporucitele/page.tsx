import { redirect } from 'next/navigation';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { DoporuciteleClient } from './DoporuciteleClient';
import '../prehled.scss';

export const dynamic = 'force-dynamic';

export default async function PrehledDoporucitelePage() {
  if (!(await prehledPrihlasen())) redirect('/prehled');
  return <DoporuciteleClient />;
}
