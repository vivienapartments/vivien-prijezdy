import { Expired } from '@/components/Expired';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Zkouška · Děkujeme · Přidat na plochu',
  robots: { index: false, follow: false, nocache: true },
};

/** Ostrý náhled Děkujeme. Přidat na plochu dole tiše. */
export default function ZkouskaPridejNaPlochuDekujemePage() {
  return <Expired lang="cs" />;
}
