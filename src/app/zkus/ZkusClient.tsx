'use client';

import { useMemo, useState } from 'react';
import { Guide } from '@/components/Guide';
import { zpravaBrany, zpravaCasu, type ZpravaOdNas } from '@/components/ZpravyOdNas';
import { denPraha } from '@/lib/brana';
import { kodyProHosta } from '@/lib/kody-pruvodce';
import type { GuideSecrets } from '@/lib/secrets';
import { urovenPruvodce } from '@/lib/vstup-pruvodce';
import type { VstupHodnoty } from '@/components/VstupHosta';

type Props = { secrets: GuideSecrets };

type Pohled = 'hostitel' | 'host';
type KrokHosta = 'cas' | 'zprava-cas' | 'brana' | 'obe';

const CAS = '16:00';
const STANI = 26;
const TELEFON_BRANA = '+420777551856';
const TELEFON_ZOBRAZ = '+420\u00a0777\u00a0551\u00a0856';

export function ZkusClient({ secrets }: Props) {
  const [pohled, setPohled] = useState<Pohled>('hostitel');
  const [casOdpoved, setCasOdpoved] = useState<'ne' | 'osobne' | 'telefon'>('ne');
  const [branaOk, setBranaOk] = useState(false);
  const [krok, setKrok] = useState<KrokHosta>('cas');
  const [zpravy, setZpravy] = useState<ZpravaOdNas[]>([]);

  const hodnoty: VstupHodnoty = {
    cas: CAS,
    zpusob: 'auto',
    telefon: TELEFON_BRANA,
    spz: '3C2 1234',
    pujcene: false,
    souhlas: true,
  };

  const vstup = useMemo(
    () => ({
      token: null as string | null,
      uroven: urovenPruvodce({
        cas: hodnoty.cas,
        zpusob: hodnoty.zpusob,
        telefonBrana: hodnoty.telefon,
        spz: hodnoty.spz,
        spzPujcene: false,
        souhlas: true,
        odemceno: false,
      }),
      hodnoty,
      predvyplneny: TELEFON_BRANA,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function nastavKrok(dalsi: KrokHosta) {
    setKrok(dalsi);
    if (dalsi === 'cas') {
      setZpravy([]);
      return;
    }
    if (dalsi === 'zprava-cas') {
      setZpravy([zpravaCasu(CAS)]);
      return;
    }
    if (dalsi === 'brana') {
      setZpravy([{ ...zpravaCasu(CAS), nova: false }, zpravaBrany(STANI, TELEFON_BRANA)]);
      return;
    }
    setZpravy([zpravaCasu(CAS), zpravaBrany(STANI, TELEFON_BRANA)]);
  }

  function precteno(id: ZpravaOdNas['id']) {
    setZpravy((prev) => prev.map((z) => (z.id === id ? { ...z, nova: false } : z)));
  }

  function klikOsobne() {
    setCasOdpoved('osobne');
  }

  function klikTelefon() {
    setCasOdpoved('telefon');
  }

  function klikBrana() {
    setBranaOk(true);
  }

  function ukazUHosta() {
    setPohled('host');
    if (casOdpoved === 'osobne' && branaOk) {
      nastavKrok('obe');
      return;
    }
    if (branaOk && casOdpoved !== 'ne') {
      nastavKrok('brana');
      return;
    }
    if (casOdpoved === 'osobne') {
      nastavKrok('zprava-cas');
      return;
    }
    nastavKrok('cas');
  }

  return (
    <div className="zkus">
      <div className="zkus__lista">
        <p className="zkus__nadpis">Zkouška zpráv</p>
        <div className="zkus__tlacitka" style={{ marginBottom: '0.55rem' }}>
          <button
            type="button"
            className={pohled === 'hostitel' ? 'is-on' : ''}
            onClick={() => setPohled('hostitel')}
          >
            U tebe · hostitel
          </button>
          <button type="button" className={pohled === 'host' ? 'is-on' : ''} onClick={ukazUHosta}>
            U hosta · průvodce
          </button>
        </div>
        {pohled === 'hostitel' ? (
          <p className="zkus__popis">
            Takhle to bude na kartě v přehledu v telefonu. Klepnutím hostovi pošlete zprávu do
            průvodce.
          </p>
        ) : (
          <>
            <p className="zkus__popis">To, co host uvidí po vašem klepnutí.</p>
            <div className="zkus__tlacitka">
              <button
                type="button"
                className={krok === 'cas' ? 'is-on' : ''}
                onClick={() => nastavKrok('cas')}
              >
                1 · Čas uložen
              </button>
              <button
                type="button"
                className={krok === 'zprava-cas' ? 'is-on' : ''}
                onClick={() => nastavKrok('zprava-cas')}
              >
                2 · Potvrdili jste čas
              </button>
              <button
                type="button"
                className={krok === 'brana' ? 'is-on' : ''}
                onClick={() => nastavKrok('brana')}
              >
                3 · Později Brána OK
              </button>
              <button
                type="button"
                className={krok === 'obe' ? 'is-on' : ''}
                onClick={() => nastavKrok('obe')}
              >
                4 · Obě nové najednou
              </button>
            </div>
          </>
        )}
      </div>

      {pohled === 'hostitel' ? (
        <div className="zkus-hostitel">
          <article className="zkus-karta">
            <header className="zkus-karta__hlava">
              <h2>Novák · V3</h2>
              <p>zítra · autem · 2 noci</p>
            </header>

            <div className="zkus-karta__radek">
              <div>
                <span className="zkus-karta__stitek">Příjezd</span>
                <strong className="zkus-karta__cas">{CAS}</strong>
              </div>
              <span className="zkus-karta__stav">
                {casOdpoved === 'ne'
                  ? 'bez odpovědi'
                  : casOdpoved === 'osobne'
                    ? 'osobně ubytujeme'
                    : 'jsme na telefonu'}
              </span>
            </div>

            <div className="zkus-karta__akce">
              <button
                type="button"
                className={casOdpoved === 'osobne' ? 'is-on' : ''}
                onClick={klikOsobne}
              >
                Osobně ubytujeme
              </button>
              <button
                type="button"
                className={casOdpoved === 'telefon' ? 'is-on' : ''}
                onClick={klikTelefon}
              >
                Jsme na telefonu
              </button>
            </div>

            <div className="zkus-karta__radek">
              <div>
                <span className="zkus-karta__stitek">Brána</span>
                <a className="pv-phone" href={`tel:${TELEFON_BRANA}`}>
                  {TELEFON_ZOBRAZ}
                </a>
              </div>
              <span className="zkus-karta__stav">{branaOk ? 'Brána OK' : 'čeká'}</span>
            </div>

            <div className="zkus-karta__akce">
              <button type="button" className={branaOk ? 'is-on' : ''} onClick={klikBrana}>
                Brána OK
              </button>
            </div>

            {(casOdpoved !== 'ne' || branaOk) && (
              <p className="zkus-karta__hint">
                {casOdpoved === 'osobne' && !branaOk
                  ? 'Hostovi se v průvodci ukáže zpráva k času.'
                  : null}
                {casOdpoved === 'telefon' && !branaOk
                  ? 'Hostovi napíšete, že budete na telefonu. (text ještě doladíme)'
                  : null}
                {branaOk && casOdpoved === 'ne'
                  ? 'Hostovi se v průvodci ukáže zpráva k bráně.'
                  : null}
                {branaOk && casOdpoved !== 'ne'
                  ? 'Hostovi jdou zprávy do průvodce (čas / brána podle toho, co jste klepli).'
                  : null}
              </p>
            )}

            <button type="button" className="zkus-karta__nahled" onClick={ukazUHosta}>
              Ukázat, co vidí host
            </button>
          </article>
        </div>
      ) : (
        <Guide
          apt="V3"
          lang="cs"
          secrets={secrets}
          stay={{ noci: 2, osob: 2 }}
          kody={kodyProHosta(false, 'V3', '1234', 'cs')}
          prijezdDen={denPraha(new Date())}
          rezervace="zkus"
          vstup={vstup}
          zpravyOdNas={zpravy}
          onZpravaPrectena={precteno}
        />
      )}
    </div>
  );
}
