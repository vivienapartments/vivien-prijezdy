import { notFound } from 'next/navigation';
import { Guide } from '@/components/Guide';
import { Expired } from '@/components/Expired';
import { loadSecrets } from '@/lib/secrets';
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

  const { a, l, i } = result.payload;
  const secrets = loadSecrets();
  const stay = stayFromPayload(result.payload);

  return (
    <Guide
      apt={a}
      lang={l as GuideLang}
      secrets={secrets}
      stay={stay}
      accessPin={i ?? null}
      initialPrijezd={null}
    />
  );
}
