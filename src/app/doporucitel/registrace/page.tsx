'use client';

import { useState } from 'react';
import { GUIDE_LANGS, type GuideLang } from '@/lib/types';
import '../doporucitel.scss';

export default function DoporucitelRegistracePage() {
  const [typ, setTyp] = useState<'osoba' | 'firma'>('osoba');
  const [jmeno, setJmeno] = useState('');
  const [prijmeni, setPrijmeni] = useState('');
  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');
  const [jazyk, setJazyk] = useState<GuideLang>('cs');
  const [firmaNazev, setFirmaNazev] = useState('');
  const [firmaIco, setFirmaIco] = useState('');
  const [podminky, setPodminky] = useState(false);
  const [zpracovani, setZpracovani] = useState(false);
  const [novinky, setNovinky] = useState(false);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [odkaz, setOdkaz] = useState<string | null>(null);
  const [cekam, setCekam] = useState(false);

  async function odeslat(e: React.FormEvent) {
    e.preventDefault();
    setCekam(true);
    setHlaska(null);
    try {
      const res = await fetch('/api/doporucitel/registrace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typ,
          jmeno,
          prijmeni,
          email,
          telefon,
          jazyk,
          firmaNazev,
          firmaIco,
          podminky,
          zpracovani,
          novinky,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        duvod?: string;
        odkazKarta?: string;
      };
      if (!res.ok || !json.ok) {
        setHlaska(
          json.duvod === 'limit'
            ? 'Dnes už nelze registrovat znovu z tohoto zařízení.'
            : 'Zkontrolujte vyplněná pole.',
        );
        return;
      }
      setOdkaz(json.odkazKarta || null);
      setHlaska('Hotovo. Odkaz jsme poslali e-mailem.');
    } catch {
      setHlaska('Odeslání se nepovedlo.');
    } finally {
      setCekam(false);
    }
  }

  return (
    <main className="dop-page">
      <div className="dop-karta">
        <h1 className="dop-h1">Doporučení VIVIEN</h1>
        <p className="dop-lead">
          Založte si svůj odkaz. Když přes něj někdo zarezervuje pobyt, dostane slevu a vy odměnu.
        </p>
        <form className="dop-form" onSubmit={(e) => void odeslat(e)}>
          <div className="dop-radky">
            <button
              type="button"
              className={typ === 'osoba' ? 'is-on' : undefined}
              onClick={() => setTyp('osoba')}
            >
              Osoba
            </button>
            <button
              type="button"
              className={typ === 'firma' ? 'is-on' : undefined}
              onClick={() => setTyp('firma')}
            >
              Firma
            </button>
          </div>
          <label>
            Jméno
            <input value={jmeno} onChange={(e) => setJmeno(e.target.value)} required />
          </label>
          <label>
            Příjmení
            <input value={prijmeni} onChange={(e) => setPrijmeni(e.target.value)} required />
          </label>
          <label>
            E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Telefon
            <input value={telefon} onChange={(e) => setTelefon(e.target.value)} required />
          </label>
          <label>
            Jazyk
            <select value={jazyk} onChange={(e) => setJazyk(e.target.value as GuideLang)}>
              {GUIDE_LANGS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          {typ === 'firma' ? (
            <>
              <label>
                Název firmy
                <input value={firmaNazev} onChange={(e) => setFirmaNazev(e.target.value)} required />
              </label>
              <label>
                IČO
                <input value={firmaIco} onChange={(e) => setFirmaIco(e.target.value)} />
              </label>
            </>
          ) : null}
          <label className="dop-check">
            <input type="checkbox" checked={podminky} onChange={(e) => setPodminky(e.target.checked)} />
            Souhlasím s podmínkami programu
          </label>
          <label className="dop-check">
            <input
              type="checkbox"
              checked={zpracovani}
              onChange={(e) => setZpracovani(e.target.checked)}
            />
            Souhlasím se zpracováním údajů
          </label>
          <label className="dop-check">
            <input type="checkbox" checked={novinky} onChange={(e) => setNovinky(e.target.checked)} />
            Novinky e-mailem (nepovinné)
          </label>
          <button type="submit" className="dop-cta" disabled={cekam}>
            Registrovat
          </button>
        </form>
        {hlaska ? <p className="dop-hlaska">{hlaska}</p> : null}
        {odkaz ? (
          <p className="dop-hlaska">
            <a href={odkaz}>Otevřít moji kartu</a>
          </p>
        ) : null}
      </div>
    </main>
  );
}
