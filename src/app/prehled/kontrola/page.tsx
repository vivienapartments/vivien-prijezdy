import Link from 'next/link';
import { LoginForm } from '../LoginForm';
import { KONTROLA_DNY, radkyKontroly, type RadekKontroly } from '@/lib/kontrola-prijezdu';
import { casPraha } from '@/lib/prehled';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore, type BehZpracovani } from '@/lib/store';
import '../prehled.scss';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Kontrola příjezdů',
  robots: { index: false, follow: false, nocache: true },
};

const NADPIS: Record<(typeof KONTROLA_DNY)[number], string> = {
  '2026-10-14': '14. října 2026',
  '2026-10-15': '15. října 2026',
  '2026-10-16': '16. října 2026',
};

function bunka(nazev: string, hodnota: string) {
  return (
    <>
      <th scope="row">{nazev}</th>
      <td>{hodnota}</td>
    </>
  );
}

function Karta({ radek }: { radek: RadekKontroly }) {
  const cas = radek.cas === 'není' ? 'není' : radek.casKdo ? `${radek.cas}, ${radek.casKdo}` : radek.cas;
  const predano = radek.predano === 'ne' ? 'ne' : `${radek.predano}, ${radek.predanoKdo}`;
  return (
    <article className="ph-kontrola-karta" id={radek.rezervace}>
      <h3>
        {radek.jmeno}
        {radek.zruseno ? ' (zrušeno)' : ''}
      </h3>
      <table>
        <tbody>
          <tr>{bunka('Číslo rezervace', radek.rezervace)}</tr>
          <tr>{bunka('Apartmán', radek.apartman)}</tr>
          <tr>{bunka('Termín', radek.termin)}</tr>
          <tr>{bunka('Osoby a noci', radek.pobyt)}</tr>
          <tr>
            <th scope="row">Telefon</th>
            <td className="ph-kontrola-tel">{radek.telefon}</td>
          </tr>
          <tr>{bunka('WhatsApp', radek.whatsapp)}</tr>
          <tr>
            <th scope="row">Druhé číslo</th>
            <td className="ph-kontrola-tel">{radek.druhe}</td>
          </tr>
          <tr>{bunka('WhatsApp u druhého', radek.whatsappDruhe)}</tr>
          <tr>{bunka('Čas příjezdu', cas)}</tr>
          <tr>{bunka('Předáno', predano)}</tr>
          <tr>{bunka('Check-in VIVIEN-DATA', radek.checkin)}</tr>
          <tr>{bunka('Odkaz na check-in', radek.odkaz)}</tr>
          <tr>{bunka('Datum vzniku', radek.vznik)}</tr>
          <tr>{bunka('Poplatek', radek.poplatek)}</tr>
          <tr>
            <th scope="row">Poslední historie</th>
            <td>
              {radek.historie.length ? (
                <ul>
                  {radek.historie.map((veta, i) => (
                    <li key={`${radek.rezervace}-${i}`}>{veta}</li>
                  ))}
                </ul>
              ) : (
                'není'
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}

function Beh({ beh }: { beh: BehZpracovani | null }) {
  if (!beh) {
    return <p>Poslední čtení schránky ještě není zapsané. Ukáže se po dalším běhu automatu.</p>;
  }
  const cas = casPraha(beh.cas) || beh.cas;
  return (
    <section className="ph-kontrola-beh">
      <h2>Poslední čtení schránky</h2>
      <p>Čas {cas}</p>
      <p>Přihlášení do schránky {beh.schranka === 'ano' ? 'ano' : 'ne'}</p>
      <p>Přečteno e-mailů {beh.mailu}</p>
      <p>Poslední chyba {beh.chyba || 'žádná'}</p>
    </section>
  );
}

export default async function KontrolaPage() {
  if (!(await prehledPrihlasen())) {
    return <LoginForm dal="/prehled/kontrola" />;
  }

  let radky: RadekKontroly[] = [];
  let beh: BehZpracovani | null = null;
  let chyba = false;
  try {
    const store = createProcessStore();
    const vse = await store.listRezervace();
    radky = radkyKontroly(vse.map((e) => e.record));
    beh = await store.getBeh();
  } catch {
    chyba = true;
  }

  return (
    <main className="ph ph-kontrola">
      <h1>Kontrola příjezdů</h1>
      <p>Jen čtení. Nic se neukládá a nikomu se neposílá.</p>
      <p>
        <Link href="/prehled">Zpět na přehled</Link>
      </p>
      <Beh beh={beh} />
      {chyba ? <p>Úložiště se nepovedlo přečíst.</p> : null}
      {KONTROLA_DNY.map((den) => {
        const denni = radky.filter((r) => r.den === den);
        return (
          <section key={den}>
            <h2>
              {NADPIS[den]} ({denni.length})
            </h2>
            {denni.length === 0 ? <p>Nikdo.</p> : denni.map((radek) => <Karta key={radek.rezervace} radek={radek} />)}
          </section>
        );
      })}
    </main>
  );
}
