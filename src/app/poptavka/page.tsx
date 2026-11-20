import type { Metadata } from 'next';
import { firmaZKodu, normalizujKod, type PoptavkaZdroj } from '@/lib/poptavka';
import { createProcessStore } from '@/lib/store';
import { parseSignedToken } from '@/lib/token';
import { GUIDE_LANGS, type GuideLang } from '@/lib/types';
import { PoptavkaForm } from './PoptavkaForm';

export const metadata: Metadata = {
  title: 'Poptávka pobytu · VIVIEN',
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<{ t?: string; f?: string; od?: string; lang?: string }>;
};

export default async function PoptavkaPage({ searchParams }: Props) {
  const q = await searchParams;
  let lang: GuideLang = 'cs';
  let zdroj: PoptavkaZdroj = 'obecna';
  let firmaKod: string | null = null;
  let firmaNazev: string | null = null;
  let doporucitelKod: string | null = null;
  let token: string | null = null;
  let rezervace: string | null = null;
  let jmeno = '';
  let telefon = '';

  const tokenRaw = (q.t || '').trim();
  if (tokenRaw) {
    try {
      const parsed = parseSignedToken(decodeURIComponent(tokenRaw));
      if (parsed.ok) {
        token = tokenRaw;
        zdroj = 'vernost';
        rezervace = parsed.payload.r;
        if (GUIDE_LANGS.includes(parsed.payload.l)) lang = parsed.payload.l;
        const store = createProcessStore();
        const rec = await store.getRezervace(rezervace);
        if (rec?.jazyk && GUIDE_LANGS.includes(rec.jazyk)) lang = rec.jazyk;
        jmeno = (rec?.jmeno || '').trim();
        telefon = (rec?.telefon || '').trim();
      }
    } catch {
      /* obecná stránka */
    }
  }

  const firma = firmaZKodu(q.f);
  if (firma) {
    zdroj = 'firma';
    firmaKod = firma.kod;
    firmaNazev = firma.nazev;
  }

  const od = normalizujKod(q.od);
  if (od && zdroj === 'obecna') {
    zdroj = 'doporucitel';
    doporucitelKod = od;
  }

  if (q.lang && GUIDE_LANGS.includes(q.lang as GuideLang) && zdroj !== 'vernost') {
    lang = q.lang as GuideLang;
  }

  return (
    <PoptavkaForm
      lang={lang}
      zdroj={zdroj}
      firmaKod={firmaKod}
      firmaNazev={firmaNazev}
      doporucitelKod={doporucitelKod}
      token={token}
      rezervace={rezervace}
      jmeno={jmeno}
      telefon={telefon}
    />
  );
}
