import { LoginForm } from '../LoginForm';
import { Dnesek } from '../Dnesek';
import { nactiDokument, ukazkovaBrana } from '@/lib/brana';
import { zajistiVychoziBranu } from '@/lib/brana-akce';
import { buildPrehledSOdkazy } from '@/lib/prehled-odkazy';
import { ukazkoveRadky } from '@/lib/prehled-ukazka';
import { dnesVPraze } from '@/lib/prehled';
import { migracePredaniJednou } from '@/lib/predani';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore } from '@/lib/store';
import '../prehled.scss';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dnešek',
  robots: { index: false, follow: false, nocache: true },
};

type Props = { searchParams: Promise<{ ukazka?: string }> };

export default async function DnesekPage({ searchParams }: Props) {
  const sp = await searchParams;
  const ukazka = process.env.NODE_ENV !== 'production' && sp.ukazka === '1';
  if (!(await prehledPrihlasen()) && !ukazka) {
    return <LoginForm dal="/prehled/dnes" />;
  }
  const now = new Date();
  const store = createProcessStore();
  let branaDoc = ukazka ? { sloty: ukazkovaBrana(now), potvrzeno: 'ukazka' } : nactiDokument(null);
  if (!ukazka && process.env.VERCEL_ENV === 'production') {
    try {
      await migracePredaniJednou(store, dnesVPraze(now), now.toISOString());
    } catch {
      // Stránka se otevře i když se starší hosté nepodařilo označit.
    }
    try {
      branaDoc = await zajistiVychoziBranu(store);
    } catch {
      // Stav brány se doplní při dalším otevření.
    }
  } else if (!ukazka) {
    branaDoc = nactiDokument(await store.getBrana());
  }
  const radky = ukazka ? ukazkoveRadky(now) : await buildPrehledSOdkazy(store, now);
  return (
    <main className="ph">
      <Dnesek radky={radky} dnes={dnesVPraze(now)} ukazka={ukazka} brana={branaDoc.sloty} />
    </main>
  );
}
