import { notFound } from 'next/navigation';
import { Guide } from '@/components/Guide';
import { OtevreniBeacon } from '@/components/OtevreniBeacon';
import { Expired } from '@/components/Expired';
import { kodyProHosta } from '@/lib/kody-pruvodce';
import { poplatekZTokenu } from '@/lib/poplatek';
import { loadSecrets } from '@/lib/secrets';
import { createProcessStore } from '@/lib/store';
import { stayFromPayload, verifyToken } from '@/lib/token';
import type { GuideLang } from '@/lib/types';
import { urovenZRezervace, vstupZRezervace } from '@/lib/vstup-pruvodce';

type Props = { params: Promise<{ token: string }> };

export default async function TokenPage({ params }: Props) {
  const { token } = await params;
  let result;
  try {
    result = verifyToken(decodeURIComponent(token));
  } catch {
    notFound();
  }

  if (!result.ok) {
    if (result.reason === 'expired') {
      return <Expired lang="cs" />;
    }
    notFound();
  }

  const { a, l, i, r } = result.payload;
  const secrets = loadSecrets();
  const stay = stayFromPayload(result.payload);
  const lang = l as GuideLang;
  const store = createProcessStore();
  const rec = await store.getRezervace(r);
  const vstupHosta = vstupZRezervace(rec);
  const predano = Boolean(rec?.predano);

  return (
    <>
      <OtevreniBeacon token={decodeURIComponent(token)} />
      <Guide
        apt={a}
        lang={lang}
        secrets={secrets}
        stay={stay}
        kody={kodyProHosta(predano, a, i ?? null, lang)}
        poplatek={poplatekZTokenu(result.payload.f)}
        initialPrijezd={null}
        vstup={{
          token: decodeURIComponent(token),
          uroven: urovenZRezervace(rec),
          hodnoty: {
            cas: vstupHosta.cas,
            zpusob: vstupHosta.zpusob,
            telefon: vstupHosta.telefonBrana || '',
            spz: vstupHosta.spz || '',
            pujcene: vstupHosta.spzPujcene,
            souhlas: Boolean(rec?.souhlasPravidel),
          },
          predvyplneny: rec?.telefon || '',
          ubytovan: Boolean(rec?.predano),
        }}
      />
    </>
  );
}
