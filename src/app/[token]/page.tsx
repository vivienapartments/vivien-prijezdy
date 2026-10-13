import { notFound } from 'next/navigation';
import { Guide } from '@/components/Guide';
import { OtevreniBeacon } from '@/components/OtevreniBeacon';
import { Expired } from '@/components/Expired';
import { kodyProHosta } from '@/lib/kody-pruvodce';
import { poplatekZTokenu } from '@/lib/poplatek';
import { predanoRezervace } from '@/lib/predani';
import { loadSecrets } from '@/lib/secrets';
import { createProcessStore } from '@/lib/store';
import { stayFromPayload, verifyToken } from '@/lib/token';
import type { GuideLang } from '@/lib/types';

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
  const predano = await predanoRezervace(createProcessStore(), r);

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
      />
    </>
  );
}
