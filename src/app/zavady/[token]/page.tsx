import { createProcessStore } from '@/lib/store';
import { overTokenZavad } from '@/lib/zavady-predani';
import { ZavadyPotvrzeni } from './ZavadyPotvrzeni';
import './zavady.scss';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'VIVIEN · Potvrzení závad',
  robots: { index: false, follow: false, nocache: true },
};

type Props = { params: Promise<{ token: string }> };

export default async function ZavadyPage({ params }: Props) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw || '').trim();
  const overeno = overTokenZavad(token);
  if (!overeno.ok) {
    return (
      <main className="zv-stranka">
        <p>Tento odkaz neplatí.</p>
      </main>
    );
  }

  const store = createProcessStore();
  const rec = await store.getRezervace(overeno.rezervace);
  const z = rec?.zavadyPredani;
  if (!z || z.odeslanoKdy !== overeno.odeslanoKdy) {
    return (
      <main className="zv-stranka">
        <p>Zápis z předání tu už není.</p>
      </main>
    );
  }

  return (
    <main className="zv-stranka">
      <h1>Zápis z předání</h1>
      <p className="zv-text">{z.text}</p>
      <ZavadyPotvrzeni token={token} uzPotvrzeno={Boolean(z.potvrzenoKdy)} />
    </main>
  );
}
