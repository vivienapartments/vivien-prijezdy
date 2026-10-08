import { notFound } from 'next/navigation';
import { Guide } from '@/components/Guide';
import { Expired } from '@/components/Expired';
import { loadSecrets } from '@/lib/secrets';
import { verifyToken } from '@/lib/token';
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

  const { a, l } = result.payload;
  const secrets = loadSecrets();

  return (
    <Guide
      apt={a}
      lang={l as GuideLang}
      secrets={secrets}
      stay={{ noci: 2, osob: 2 }}
      initialPrijezd={null}
    />
  );
}
