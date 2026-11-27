'use client';

import { useEffect, useState } from 'react';
import { GUIDE_LANGS, LANG_LABELS, type GuideLang } from '@/lib/types';
import '../doporucitel.scss';

export default function PozvankaDoporucitelePage() {
  const [pripraveno, setPripraveno] = useState(false);
  const [klic, setKlic] = useState('');
  const [zkouska, setZkouska] = useState(false);
  const [stav, setStav] = useState<'ceka' | 'vyplnena' | 'neplatny' | 'nacitam'>('nacitam');
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
  const [cekam, setCekam] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const p = (q.get('p') || '').trim();
    const z = q.get('zkouska') === '1';
    setKlic(p);
    setZkouska(z);
    setPripraveno(true);
    if (z && !p) {
      setStav('ceka');
      return;
    }
    if (!p) {
      setStav('neplatny');
      return;
    }
    let zruseno = false;
    (async () => {
      try {
        const res = await fetch(`/api/doporucitel/pozvanka?p=${encodeURIComponent(p)}`);
        const json = (await res.json()) as { ok?: boolean; stav?: 'ceka' | 'vyplnena' };
        if (zruseno) return;
        if (!res.ok || !json.ok) setStav('neplatny');
        else setStav(json.stav === 'vyplnena' ? 'vyplnena' : 'ceka');
      } catch {
        if (!zruseno) setStav('neplatny');
      }
    })();
    return () => {
      zruseno = true;
    };
  }, []);

  async function odeslat(e: React.FormEvent) {
    e.preventDefault();
    setCekam(true);
    setHlaska(null);
    try {
      const res = await fetch('/api/doporucitel/pozvanka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p: klic || undefined,
          zkouska: zkouska && !klic ? true : undefined,
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
      const json = (await res.json()) as { ok?: boolean; duvod?: string; kartaKlic?: string };
      if (!res.ok || !json.ok || !json.kartaKlic) {
        setHlaska(
          json.duvod === 'vyplneno'
            ? 'Tento odkaz už je vyplněný.'
            : 'Zkontrolujte vyplněná pole.',
        );
        if (json.duvod === 'vyplneno') setStav('vyplnena');
        return;
      }
      window.location.href = `/doporucitel?k=${encodeURIComponent(json.kartaKlic)}`;
    } catch {
      setHlaska('Odeslání se nepovedlo. Zkuste to znovu.');
    } finally {
      setCekam(false);
    }
  }

  return (
    <main className="dop-page" lang="cs">
      <div className="dop-karta">
        <h1 className="dop-h1">Doporučení VIVIEN</h1>
        {!pripraveno || stav === 'nacitam' ? <p className="dop-lead">Načítám…</p> : null}
        {stav === 'neplatny' ? (
          <p className="dop-lead dop-lead--blok">Tento odkaz neplatí. Požádejte o nový.</p>
        ) : null}
        {stav === 'vyplnena' ? (
          <p className="dop-lead dop-lead--blok">
            Údaje už jsou uložené. Odkaz na kartu je v e-mailu, který jsme poslali.
          </p>
        ) : null}
        {stav === 'ceka' ? (
          <>
            <p className="dop-lead dop-lead--blok">
              Vyplňte údaje o sobě. Pak vám vznikne karta a odkaz, který pošlete svým lidem.
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
                <input
                  value={jmeno}
                  onChange={(e) => setJmeno(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </label>
              <label>
                Příjmení
                <input
                  value={prijmeni}
                  onChange={(e) => setPrijmeni(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Telefon
                <input
                  type="tel"
                  value={telefon}
                  onChange={(e) => setTelefon(e.target.value)}
                  autoComplete="tel"
                  required
                />
              </label>
              <label>
                Jazyk
                <select value={jazyk} onChange={(e) => setJazyk(e.target.value as GuideLang)}>
                  {GUIDE_LANGS.map((l) => (
                    <option key={l} value={l}>
                      {LANG_LABELS[l]}
                    </option>
                  ))}
                </select>
              </label>
              {typ === 'firma' ? (
                <>
                  <label>
                    Název firmy
                    <input
                      value={firmaNazev}
                      onChange={(e) => setFirmaNazev(e.target.value)}
                      autoComplete="organization"
                      required
                    />
                  </label>
                  <label>
                    IČO
                    <input value={firmaIco} onChange={(e) => setFirmaIco(e.target.value)} inputMode="numeric" />
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
                {cekam ? 'Zakládám kartu…' : 'Založit kartu'}
              </button>
            </form>
            {hlaska ? <p className="dop-hlaska">{hlaska}</p> : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
