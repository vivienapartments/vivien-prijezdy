import { readFileSync } from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import { buildGuestEmail } from '@/lib/email-host';
import { htmlEmailuHostovi, predmetZpravy } from '@/lib/email-zprava';
import { textSouhrnu, zpravaOdjezdu } from '@/lib/odjezd';
import { sestavDnesek, textRano, textZmenyPoradi, type HostDne } from '@/lib/dnesek';
import { textCasNeznamy, textHodinuPred } from '@/lib/prijezd-upozorneni';
import { zpravaNedojezdu } from '@/lib/whatsapp-zprava';
import { NahledEmail } from './NahledEmail';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function jeden(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] || '' : v || '';
}

function denVPraze(posun: number): string {
  const den = new Date(Date.now() + posun * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(den);
}

/** Místní náhled okna v e-mailu. Na ostrém webu tahle stránka není. */
export default async function NahledEmailPage({ searchParams }: Props) {
  if (process.env.NODE_ENV === 'production') notFound();
  const q = await searchParams;
  const druh = jeden(q.druh);
  if (druh === 'upozorneni') {
    const veta = textHodinuPred({ apartman: 'V3', jmeno: 'Jan Novák', rezervace: '1', casPrijezdu: '16:30' });
    return (
      <main style={{ minHeight: '100vh', margin: 0, padding: '1.2rem', background: '#1c1712', color: '#f5efe3', fontFamily: 'Georgia, serif' }}>
        <article style={{ maxWidth: '22rem', padding: '0.9rem 1rem', borderRadius: '1.1rem', background: '#2a241c', border: '1px solid #c9a84c' }}>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.78rem', letterSpacing: '0.04em' }}>VIVIEN</p>
          <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.35 }}>{veta}</p>
        </article>
        <article style={{ maxWidth: '22rem', marginTop: '0.8rem', padding: '0.9rem 1rem', borderRadius: '1.1rem', background: '#2a241c', border: '1px solid #c9a84c' }}>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.78rem', letterSpacing: '0.04em' }}>VIVIEN</p>
          <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.35 }}>
            {textCasNeznamy({ apartman: 'V3', jmeno: 'Jan Novák', rezervace: '1' })}
          </p>
        </article>
      </main>
    );
  }
  if (druh === 'dnes') {
    const den = '2026-10-16';
    const zaklad = (rezervace: string, apartman: HostDne['apartman']): HostDne => ({
      rezervace,
      apartman,
      jmeno: 'Host',
      prijezd: null,
      odjezd: null,
      casPrijezdu: null,
      casOdjezdu: null,
      stav: 'odeslano',
      zpusob: null,
      brana: null,
      faze: '',
      dluh: '',
      uklizenoKdy: null,
      uklizenoKdo: null,
    });
    const rano = textRano(
      sestavDnesek(
        [
          { ...zaklad('4', 'V4'), odjezd: den, casOdjezdu: '09:30', dluh: '200 Kč (poplatek z pobytu)' },
          { ...zaklad('2', 'V2'), odjezd: den },
          { ...zaklad('1', 'V1'), odjezd: den },
          { ...zaklad('5', 'V4'), prijezd: den, casPrijezdu: '13:00' },
          { ...zaklad('6', 'V2'), prijezd: den, casPrijezdu: '16:00' },
        ],
        den,
      ),
    );
    const zmena = textZmenyPoradi(
      sestavDnesek(
        [
          { ...zaklad('4', 'V4'), odjezd: den, casOdjezdu: '09:30' },
          { ...zaklad('2', 'V2'), odjezd: den },
          { ...zaklad('5', 'V4'), prijezd: den, casPrijezdu: '14:00' },
          { ...zaklad('6', 'V2'), prijezd: den, casPrijezdu: '12:30' },
        ],
        den,
      ),
    );
    return (
      <main style={{ minHeight: '100vh', margin: 0, padding: '1.2rem', background: '#1c1712', color: '#f5efe3', fontFamily: 'Georgia, serif' }}>
        <article style={{ maxWidth: '22rem', padding: '0.9rem 1rem', borderRadius: '1.1rem', background: '#2a241c', border: '1px solid #c9a84c' }}>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.78rem', letterSpacing: '0.04em' }}>VIVIEN</p>
          <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.35 }}>{rano}</p>
        </article>
        <article style={{ maxWidth: '22rem', marginTop: '0.8rem', padding: '0.9rem 1rem', borderRadius: '1.1rem', background: '#2a241c', border: '1px solid #c9a84c' }}>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.78rem', letterSpacing: '0.04em' }}>VIVIEN</p>
          <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.35 }}>{zmena}</p>
        </article>
      </main>
    );
  }
  if (druh === 'odjezd') {
    const text = zpravaOdjezdu('cs', [{ druh: 'poplatek', kc: 400 }], 'https://vivien-prijezdy-six.vercel.app/nahled');
    const souhrn = textSouhrnu([
      { rec: { apartman: 'V2', jmeno: 'Petr Kovář', rezervace: '2' }, polozky: [{ druh: 'poplatek', kc: 400 }] },
      {
        rec: { apartman: 'V4', jmeno: 'John Smith', rezervace: '4' },
        polozky: [
          { druh: 'prijezd', kc: 200 },
          { druh: 'cesta', kc: 100 },
        ],
      },
    ]);
    return (
      <main style={{ minHeight: '100vh', margin: 0, padding: '1.2rem', background: '#0b141a', color: '#e9edef', fontFamily: 'Segoe UI, sans-serif' }}>
        <article style={{ maxWidth: '24rem', marginLeft: 'auto', padding: '0.7rem 0.85rem', borderRadius: '0.6rem', background: '#005c4b' }}>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{text}</p>
        </article>
        <article style={{ maxWidth: '24rem', marginTop: '1.2rem', padding: '0.9rem 1rem', borderRadius: '1.1rem', background: '#2a241c', border: '1px solid #c9a84c', color: '#f5efe3', fontFamily: 'Georgia, serif' }}>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.78rem' }}>VIVIEN</p>
          <p style={{ margin: 0, lineHeight: 1.4 }}>{souhrn}</p>
        </article>
      </main>
    );
  }
  if (druh === 'zprava') {
    return (
      <main style={{ minHeight: '100vh', margin: 0, padding: '1.2rem', background: '#1c1712' }}>
        <article style={{ maxWidth: '36rem', padding: '1.2rem 1.3rem', borderRadius: '14px', background: '#f6f1e8' }}>
          <p style={{ margin: '0 0 0.8rem', color: '#6b5b45', fontFamily: 'Georgia, serif', fontSize: '0.95rem' }}>
            {predmetZpravy('nedojezd', 'cs', '2026-10-15')}
          </p>
          <div dangerouslySetInnerHTML={{ __html: htmlEmailuHostovi(zpravaNedojezdu('cs'), 'cs') }} />
        </article>
      </main>
    );
  }

  const logo = readFileSync(path.join(process.cwd(), 'assets', 'email', 'logo.png'));
  const podpis = readFileSync(path.join(process.cwd(), 'assets', 'email', 'logo-podpis.png'));
  const { html } = buildGuestEmail({
    lang: 'cs',
    apt: 'V1',
    prijezd: denVPraze(0),
    odjezd: denVPraze(2),
    noci: 2,
    osob: 2,
    osloveni: null,
    jmeno: 'Anna',
    narodnost: 'CZE',
    guideUrl: '#pruvodce',
    intendedTo: 'nahled@example.com',
    logoSrc: `data:image/png;base64,${logo.toString('base64')}`,
    podpisSrc: `data:image/png;base64,${podpis.toString('base64')}`,
  });

  return <NahledEmail html={html} />;
}
