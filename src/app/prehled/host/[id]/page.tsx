import { notFound } from 'next/navigation';
import { Guide } from '@/components/Guide';
import { ListaZpet } from '@/components/ListaZpet';
import { kodyProHosta } from '@/lib/kody-pruvodce';
import { loadSecrets } from '@/lib/secrets';
import { ukazkoveZaznamy } from '@/lib/prehled-ukazka';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { jeUkazkaPruvodce, rezervaceProMajitele } from '@/lib/pruvodce-stav';
import { createProcessStore } from '@/lib/store';
import { APT_IDS, GUIDE_LANGS, type AptId, type GuideLang } from '@/lib/types';
import { urovenZRezervace, vstupZRezervace } from '@/lib/vstup-pruvodce';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Průvodce hosta',
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ukazka?: string }>;
};

/** Stejný průvodce jako u hosta. Jen ke čtení. Otevření se nepočítá. */
export default async function PruvodceHostaPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const ukazka = jeUkazkaPruvodce(sp.ukazka);
  const prihlasen = ukazka ? false : await prehledPrihlasen();
  if (!ukazka && !prihlasen) notFound();

  const rec = await rezervaceProMajitele({
    prihlasen,
    id: decodeURIComponent(id),
    ukazka,
    store: createProcessStore(),
    ukazkove: ukazka ? ukazkoveZaznamy() : [],
  });
  if (!rec?.apartman || !APT_IDS.includes(rec.apartman)) notFound();

  const lang: GuideLang = rec.jazyk && GUIDE_LANGS.includes(rec.jazyk) ? rec.jazyk : 'cs';
  const apt = rec.apartman as AptId;
  const vstup = vstupZRezervace(rec);
  const predano = Boolean(rec.predano);

  return (
    <>
      <ListaZpet id={rec.rezervace} ukazka={ukazka} />
      <div className="pv-pod-listou">
        <Guide
          apt={apt}
          lang={lang}
          secrets={loadSecrets()}
          stay={{ noci: rec.noci, osob: rec.osob }}
          kody={kodyProHosta(predano, apt, rec.accessPin, lang)}
          poplatek={rec.poplatek}
          vstup={{
            token: null,
            cteni: true,
            uroven: urovenZRezervace(rec),
            hodnoty: {
              cas: vstup.cas,
              zpusob: vstup.zpusob,
              telefon: vstup.telefonBrana || '',
              spz: vstup.spz || '',
              pujcene: vstup.spzPujcene,
              souhlas: Boolean(rec.souhlasPravidel),
            },
            predvyplneny: '',
            ubytovan: predano,
          }}
          odjezd={{
            den: rec.odjezd,
            cas: rec.casOdjezdu,
            rucni: Boolean(rec.rucniZnacky?.some((z) => z.pole === 'casOdjezdu')),
          }}
        />
      </div>
    </>
  );
}
