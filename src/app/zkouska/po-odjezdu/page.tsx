import { Expired } from '@/components/Expired';

/**
 * Ostrá veřejná zkouška stránky po odjezdu (bez přihlášení).
 * Hostům se neposílá. Cesty /nahled… jsou v produkci schválně zavřené.
 */
export default function ZkouskaPoOdjezduPage() {
  return <Expired lang="cs" token="nahled" />;
}
