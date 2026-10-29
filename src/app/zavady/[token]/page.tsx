import { createProcessStore } from '@/lib/store';
import {
  jazykZavad,
  overTokenZavad,
  SKRYTA_ZAVADA,
  STRANKA_ZAVAD,
  tlacitkoPotvrditZavady,
} from '@/lib/zavady-predani';
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
        <p>{STRANKA_ZAVAD.cs.neplatny}</p>
      </main>
    );
  }

  const store = createProcessStore();
  const rec = await store.getRezervace(overeno.rezervace);
  const lang = jazykZavad(rec?.jazyk);
  const t = STRANKA_ZAVAD[lang];
  const z = rec?.zavadyPredani;
  if (!z || !z.odeslanoKdy || z.odeslanoKdy !== overeno.odeslanoKdy) {
    return (
      <main className="zv-stranka" lang={lang}>
        <p>{t.zmizel}</p>
      </main>
    );
  }

  return (
    <main className="zv-stranka" lang={lang}>
      <h1>{t.nadpis}</h1>
      <p className="zv-text">{z.text}</p>
      <p className="zv-text">{SKRYTA_ZAVADA[lang]}</p>
      <ZavadyPotvrzeni
        token={token}
        uzPotvrzeno={Boolean(z.potvrzenoKdy)}
        tlacitko={tlacitkoPotvrditZavady(lang)}
        potvrzeno={t.potvrzeno}
        odesilam={t.odesilam}
        chybaText={t.chyba}
      />
    </main>
  );
}
