import { notFound } from 'next/navigation';
import { loadSecrets } from '@/lib/secrets';
import { ZkusClient } from './ZkusClient';

/** Jednoduchý náhled pro majitele. Na ostrém webu hostů (Production) nefunguje. */
export default function ZkusPage() {
  // Blokuje jen ostrý Vercel. Lokálně i Preview větev fungují.
  if (process.env.VERCEL_ENV === 'production') notFound();

  return <ZkusClient secrets={loadSecrets()} />;
}
