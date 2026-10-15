import { readFileSync } from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import { buildGuestEmail } from '@/lib/email-host';
import { NahledEmail } from './NahledEmail';

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
export default function NahledEmailPage() {
  if (process.env.NODE_ENV === 'production') notFound();

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
