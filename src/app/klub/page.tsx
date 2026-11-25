import type { Metadata } from 'next';
import KlubClient from './KlubClient';

export const metadata: Metadata = {
  title: 'VIVIEN Klub',
  description: 'Vaše karta VIVIEN Klubu.',
  robots: { index: false, follow: false, nocache: true },
};

export default function KlubPage() {
  return <KlubClient />;
}
