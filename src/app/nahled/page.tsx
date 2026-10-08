import { notFound } from 'next/navigation';
import { NahledClient } from './NahledClient';
import { loadSecrets } from '@/lib/secrets';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NahledPage({ searchParams }: Props) {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const q = await searchParams;
  const secrets = loadSecrets();
  return <NahledClient secrets={secrets} searchParams={q} />;
}
