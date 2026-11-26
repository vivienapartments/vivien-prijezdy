import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Guide } from '@/components/Guide';
import { OtevreniBeacon } from '@/components/OtevreniBeacon';
import { Expired } from '@/components/Expired';
import { nightsBetween } from '@/lib/dates';
import { kodyProHosta } from '@/lib/kody-pruvodce';
import { klubZapnut } from '@/lib/klub-klic';
import { oknoProHosta } from '@/lib/okno-pobytu';
import { poplatekZTokenu } from '@/lib/poplatek';
import { loadSecrets } from '@/lib/secrets';
import { createProcessStore } from '@/lib/store';
import {
  denPlatnostiPruvodce,
  isDepartureExpired,
  parseSignedToken,
  stayFromPayload,
} from '@/lib/token';
import { GUIDE_LANGS, type GuideLang } from '@/lib/types';
import { urovenZRezervace, vstupZRezervace } from '@/lib/vstup-pruvodce';
import { zpravyOdNasZRezervace } from '@/lib/zpravy-od-nas';

type Props = { params: Promise<{ token: string }> };

/** Skutečný HTTPS manifest (ne blob) — start_url = /{token}. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const cesta = `/${encodeURIComponent(token)}`;
  return {
    title: 'VIVIEN · průvodce příjezdem',
    applicationName: 'VIVIEN',
    manifest: `${cesta}/manifest.webmanifest`,
    icons: {
      icon: [
        { url: '/prehled/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/prehled/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/prehled/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    appleWebApp: {
      capable: true,
      title: 'VIVIEN',
      statusBarStyle: 'black-translucent',
    },
  };
}

export default async function TokenPage({ params }: Props) {
  const { token } = await params;
  let result;
  try {
    result = parseSignedToken(decodeURIComponent(token));
  } catch {
    notFound();
  }

  if (!result.ok) {
    notFound();
  }

  const { a, l, i, r, p, d, f } = result.payload;
  const secrets = loadSecrets();
  const store = createProcessStore();
  const rec = await store.getRezervace(r);
  const lang: GuideLang =
    rec?.jazyk && GUIDE_LANGS.includes(rec.jazyk) ? rec.jazyk : (l as GuideLang);
  const { jazykHostaJeZnamy } = await import('@/lib/jazyk-hosta');
  const jazykZnamy = jazykHostaJeZnamy({
    jazyk: rec?.jazyk,
    zdroj: rec?.zdroj,
    email: rec?.emailHosta,
  });
  const denPlatnosti = denPlatnostiPruvodce(d, rec?.odjezd);
  if (isDepartureExpired(denPlatnosti)) {
    // Dávka 6: po odjezdu ikona na ploše → karta klubu (starý start_url /{token} dál funguje).
    if (klubZapnut() && rec) {
      try {
        const { klubKlic } = await import('@/lib/klub-klic');
        const raw = await store.getKv(klubKlic(`klient-index:rez:${rec.rezervace}`));
        if (raw) {
          const o = JSON.parse(raw) as { id?: string };
          if (o.id) {
            const { nactiKlientPodleId } = await import('@/lib/klient-karta');
            const k = await nactiKlientPodleId(store, o.id);
            if (k?.tajnyKlic && k.stav === 'aktivni') {
              redirect(`/klub?k=${encodeURIComponent(k.tajnyKlic)}`);
            }
          }
        }
      } catch (err) {
        // redirect() hází speciální chybu – musí projít ven.
        if (err && typeof err === 'object' && 'digest' in err) throw err;
        /* spadni na Expired */
      }
    }
    return <Expired lang={lang} token={decodeURIComponent(token)} />;
  }

  const stayFromKarty =
    rec?.prijezd && rec.odjezd
      ? { noci: nightsBetween(rec.prijezd, rec.odjezd), osob: rec.osob }
      : null;
  const stay = stayFromKarty ?? stayFromPayload(result.payload);
  const vstupHosta = vstupZRezervace(rec);
  const predano = Boolean(rec?.predano);
  const apt = rec?.apartman || a;
  const pin = (rec?.accessPin || i || '').trim() || null;
  const poplatek =
    rec?.poplatek === 'ano' || rec?.poplatek === 'ne' ? rec.poplatek : poplatekZTokenu(f);
  const okno = rec
    ? oknoProHosta(
        rec,
        (await store.listRezervace()).map((e) => e.record),
        new Date(),
        urovenZRezervace(rec) !== 'nic',
      )
    : null;

  return (
    <>
      <OtevreniBeacon token={decodeURIComponent(token)} />
      <Guide
        apt={apt}
        lang={lang}
        jazykZnamy={jazykZnamy}
        secrets={secrets}
        stay={stay}
        kody={kodyProHosta(predano, apt, pin, lang)}
        poplatek={poplatek}
        zdroj={rec?.zdroj ?? null}
        vytvoreno={rec?.vytvoreno ?? null}
        initialPrijezd={null}
        prijezdDen={rec?.prijezd ?? p ?? null}
        rezervace={r}
        narodnost={rec?.narodnost ?? null}
        vstup={{
          token: decodeURIComponent(token),
          uroven: urovenZRezervace(rec),
          hodnoty: {
            cas: vstupHosta.cas,
            zpusob: vstupHosta.zpusob,
            telefon: vstupHosta.telefonBrana || '',
            spz: vstupHosta.spz || '',
            pujcene: vstupHosta.spzPujcene,
            souhlas: Boolean(rec?.souhlasPravidel),
          },
          predvyplneny: rec?.telefon || '',
          ubytovan: Boolean(rec?.predano),
        }}
        odjezd={
          rec
            ? { den: rec.odjezd, cas: rec.casOdjezdu, rucni: Boolean(rec.rucniZnacky?.some((z) => z.pole === 'casOdjezdu')) }
            : null
        }
        okno={okno}
        zpravyOdNas={zpravyOdNasZRezervace(rec, lang)}
        faktura={rec?.faktura ?? null}
      />
    </>
  );
}
