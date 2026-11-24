import type { Metadata } from 'next';
import { nactiOsobuPodleKodu } from '@/lib/doporuceni';
import { ogDescription, ogTitle } from '@/lib/doporuceni-komplet-texty';
import { t } from '@/lib/i18n';
import {
  firmaZKodu,
  jmenoZKarty,
  normalizujKod,
  telefonZKarty,
  type PoptavkaZdroj,
} from '@/lib/poptavka';
import { createProcessStore } from '@/lib/store';
import { parseSignedToken } from '@/lib/token';
import { GUIDE_LANGS, type GuideLang } from '@/lib/types';
import { verejnaAdresa } from '@/lib/verejna-adresa';
import { PoptavkaForm } from './PoptavkaForm';

type Props = {
  searchParams: Promise<{ t?: string; f?: string; od?: string; lang?: string; zkouska?: string }>;
};

function baseUrl(): string {
  return verejnaAdresa();
}

function jazykZParamu(raw: string | undefined): GuideLang | null {
  if (!raw) return null;
  return GUIDE_LANGS.includes(raw as GuideLang) ? (raw as GuideLang) : null;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = await searchParams;
  const od = normalizujKod(q.od);
  const lang = jazykZParamu(q.lang) || 'cs';

  if (!od) {
    return {
      title: 'Poptávka pobytu · VIVIEN',
      robots: { index: false, follow: false, nocache: true },
    };
  }

  const title = t(ogTitle, lang);
  const description = t(ogDescription, lang);
  const image = `${baseUrl()}/og/og-doporuceni.jpg`;

  return {
    title,
    description,
    robots: { index: false, follow: false, nocache: true },
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

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
  const suchyBeh = q.zkouska === '1' || q.zkouska === 'ano';

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
        jmeno = jmenoZKarty(rec);
        telefon = telefonZKarty(rec);
      }
    } catch {
      /* obecná stránka */
    }
  }

  const firma = firmaZKodu(q.f);
  if (firma && !suchyBeh) {
    zdroj = 'firma';
    firmaKod = firma.kod;
    firmaNazev = firma.nazev;
  }

  /** Nejdřív odkaz doporučení, ať ?zkouska=1 nesmaže cestu doporučeného. */
  const od = normalizujKod(q.od);
  if (od && zdroj === 'obecna') {
    zdroj = 'doporucitel';
    doporucitelKod = od;
    try {
      const store = createProcessStore();
      const osoba = await nactiOsobuPodleKodu(store, od);
      const posledni = osoba?.rezervace?.[osoba.rezervace.length - 1];
      if (posledni) {
        const rec = await store.getRezervace(posledni);
        if (rec?.jazyk && GUIDE_LANGS.includes(rec.jazyk)) lang = rec.jazyk;
      }
    } catch {
      /* zůstane cs / výchozí */
    }
  }

  /** Proklik bez tokenu: věrný vzhled, nic se neukládá. Jen když není doporučení. */
  if (suchyBeh && zdroj === 'obecna') {
    zdroj = 'vernost';
    if (!jmeno) jmeno = 'Zkouška';
    if (!telefon) telefon = '+420 604 692 573';
  }

  if (suchyBeh && zdroj === 'doporucitel' && !jmeno) jmeno = 'Zkouška';
  if (suchyBeh && zdroj === 'doporucitel' && !telefon) telefon = '+420 604 692 573';

  if (q.lang && GUIDE_LANGS.includes(q.lang as GuideLang) && (zdroj !== 'vernost' || suchyBeh)) {
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
      suchyBeh={suchyBeh}
    />
  );
}
