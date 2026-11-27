'use client';

import { useEffect, useState } from 'react';
import { GUIDE_LANGS, LANG_LABELS, type GuideLang } from '@/lib/types';
import '../doporucitel.scss';

export default function PozvankaDoporucitelePage() {
  const [pripraveno, setPripraveno] = useState(false);
  const [klic, setKlic] = useState('');
  const [akcniToken, setAkcniToken] = useState('');
  const [zkouska, setZkouska] = useState(false);
  const [stav, setStav] = useState<'ceka' | 'vyplnena' | 'ke_schvaleni' | 'neplatny' | 'nacitam' | 'diky'>(
    'nacitam',
  );
  const [typ, setTyp] = useState<'osoba' | 'firma'>('osoba');
  const [jmeno, setJmeno] = useState('');
  const [prijmeni, setPrijmeni] = useState('');
  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');
  const [jazyk, setJazyk] = useState<GuideLang>('cs');
  const [firmaNazev, setFirmaNazev] = useState('');
  const [firmaIco, setFirmaIco] = useState('');
  const [firmaSidlo, setFirmaSidlo] = useState('');
  const [souhlas, setSouhlas] = useState(false);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [cekam, setCekam] = useState(false);
  const [aresHlaska, setAresHlaska] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const p = (q.get('p') || '').trim();
    const a = (q.get('a') || '').trim();
    const z = q.get('zkouska') === '1';
    setKlic(p);
    setAkcniToken(a);
    setZkouska(z);
    setPripraveno(true);
    if (a && !p) {
      let zruseno = false;
      (async () => {
        try {
          const res = await fetch(`/api/doporucitel/pozvanka?a=${encodeURIComponent(a)}`);
          const json = (await res.json()) as { ok?: boolean };
          if (zruseno) return;
          if (!res.ok || !json.ok) setStav('neplatny');
          else setStav('ceka');
        } catch {
          if (!zruseno) setStav('neplatny');
        }
      })();
      return () => {
        zruseno = true;
      };
    }
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
        const json = (await res.json()) as { ok?: boolean; stav?: 'ceka' | 'vyplnena' | 'ke_schvaleni' };
        if (zruseno) return;
        if (!res.ok || !json.ok) setStav('neplatny');
        else if (json.stav === 'vyplnena' || json.stav === 'ke_schvaleni') setStav(json.stav);
        else setStav('ceka');
      } catch {
        if (!zruseno) setStav('neplatny');
      }
    })();
    return () => {
      zruseno = true;
    };
  }, []);

  async function nactiAres() {
    setAresHlaska(null);
    const ico = firmaIco.replace(/\D/g, '');
    if (ico.length < 8) {
      setAresHlaska('Doplňte IČO (8 číslic).');
      return;
    }
    setCekam(true);
    try {
      const res = await fetch(`/api/doporucitel/ares?ico=${encodeURIComponent(ico)}`);
      const json = (await res.json()) as {
        ok?: boolean;
        ares?: { ok?: boolean; nazev?: string; adresa?: string };
      };
      if (!json.ok || !json.ares?.ok) {
        setAresHlaska('Firmu v ARES jsme nenašli. Doplňte údaje ručně.');
        return;
      }
      if (json.ares.nazev) setFirmaNazev(json.ares.nazev);
      if (json.ares.adresa) setFirmaSidlo(json.ares.adresa);
      setAresHlaska('Načteno z ARES.');
    } catch {
      setAresHlaska('ARES teď nejde. Doplňte údaje ručně.');
    } finally {
      setCekam(false);
    }
  }

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
          a: akcniToken && !klic ? akcniToken : undefined,
          zkouska: zkouska && !klic && !akcniToken ? true : undefined,
          typ,
          jmeno,
          prijmeni,
          email,
          telefon,
          jazyk,
          firmaNazev,
          firmaIco,
          firmaSidlo,
          souhlas,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        duvod?: string;
        cekaNaSchvaleni?: boolean;
      };
      if (!res.ok || !json.ok) {
        setHlaska(
          json.duvod === 'vyplneno'
            ? 'Tento odkaz už je vyplněný.'
            : 'Zkontrolujte vyplněná pole.',
        );
        if (json.duvod === 'vyplneno') setStav('ke_schvaleni');
        return;
      }
      /** Nikdy rovnou karta. Čeká na schválení v přehledu. */
      setStav('diky');
    } catch {
      setHlaska('Odeslání se nepovedlo. Zkuste to znovu.');
    } finally {
      setCekam(false);
    }
  }

  const jmenoNaKarticke =
    typ === 'firma'
      ? firmaNazev.trim() || 'Název firmy'
      : `${jmeno.trim() || 'Vaše'} ${prijmeni.trim() || 'jméno'}`.trim();

  return (
    <main className="dop-page" lang="cs">
      <div className="dop-shell">
        {!pripraveno || stav === 'nacitam' ? (
          <div className="dop-klub">
            <p className="dop-lead">Načítám…</p>
          </div>
        ) : null}

        {stav === 'neplatny' ? (
          <div className="dop-klub">
            <p className="dop-lead dop-lead--blok">Tento odkaz neplatí. Požádejte o nový.</p>
          </div>
        ) : null}

        {stav === 'vyplnena' || stav === 'ke_schvaleni' ? (
          <div className="dop-klub" style={{ marginTop: 48, textAlign: 'center', padding: '22px 16px' }}>
            <div className="dop-karticka" style={{ height: 88, textAlign: 'center' }}>
              <div className="k1" style={{ textAlign: 'center' }}>
                VIVIEN CLUB
              </div>
              <div className="k2" style={{ marginTop: 10, textAlign: 'center', fontSize: '1.25rem' }}>
                Děkujeme
              </div>
            </div>
            <p className="dop-lead">
              Údaje už jsou uložené. Ozveme se, jakmile kartu připravíme.
            </p>
            <button type="button" className="dop-cta2" onClick={() => window.close()}>
              Zavřít
            </button>
          </div>
        ) : null}

        {stav === 'diky' ? (
          <div className="dop-klub" style={{ marginTop: 48, textAlign: 'center', padding: '22px 16px' }}>
            <div className="dop-karticka" style={{ height: 88, textAlign: 'center' }}>
              <div className="k1" style={{ textAlign: 'center' }}>
                VIVIEN CLUB
              </div>
              <div className="k2" style={{ marginTop: 10, textAlign: 'center', fontSize: '1.25rem' }}>
                Děkujeme
              </div>
            </div>
            <p className="dop-lead">Údaje jsme dostali. Ozveme se, jakmile kartu připravíme.</p>
            <p className="dop-muted">Zatím nemáte kam pokračovat. Až kartu schválíme, přijde vám odkaz.</p>
            <button type="button" className="dop-cta2" onClick={() => window.close()}>
              Zavřít
            </button>
          </div>
        ) : null}

        {stav === 'ceka' ? (
          <div className="dop-klub">
            <div className="dop-karticka">
              <div className="k1">VIVIEN CLUB</div>
              <div className="k2">{jmenoNaKarticke}</div>
              <div className="k3">Doporučitel · {typ === 'firma' ? 'firma' : 'vyplnění'}</div>
            </div>
            <div className="dop-duo is-ghost" aria-hidden="true">
              <div className="dop-vC">
                <b>Doporučit</b>
                <i>přítel má 5 %</i>
              </div>
              <div className="dop-vC">
                <b>Rezervovat pro sebe</b>
                <i>váš 1. pobyt 5 %</i>
              </div>
            </div>
            <p className="dop-lead dop-lead--blok" style={{ marginTop: 6 }}>
              {typ === 'firma'
                ? 'Nejdřív IČO. Zbytek zkusíme z ARES. Tlačítka nahoře uvidíte až po schválení.'
                : 'Nejdřív o sobě. Tlačítka nahoře uvidíte až po schválení.'}
            </p>

            <form className="dop-form" onSubmit={(e) => void odeslat(e)}>
              <div className="dop-radky">
                <button type="button" className={typ === 'osoba' ? 'is-on' : undefined} onClick={() => setTyp('osoba')}>
                  Osoba
                </button>
                <button type="button" className={typ === 'firma' ? 'is-on' : undefined} onClick={() => setTyp('firma')}>
                  Firma
                </button>
              </div>

              {typ === 'firma' ? (
                <>
                  <label>
                    IČO
                    <input
                      value={firmaIco}
                      onChange={(e) => setFirmaIco(e.target.value)}
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>
                  <button type="button" className="dop-cta3" style={{ marginTop: 0, marginBottom: 10 }} disabled={cekam} onClick={() => void nactiAres()}>
                    Načíst z ARES
                  </button>
                  {aresHlaska ? <p className="dop-muted" style={{ marginTop: 0, marginBottom: 10 }}>{aresHlaska}</p> : null}
                  <label>
                    Název firmy
                    <input value={firmaNazev} onChange={(e) => setFirmaNazev(e.target.value)} autoComplete="organization" required />
                  </label>
                  <label>
                    Sídlo
                    <input value={firmaSidlo} onChange={(e) => setFirmaSidlo(e.target.value)} />
                  </label>
                  <label>
                    Jméno kontaktní osoby
                    <input value={jmeno} onChange={(e) => setJmeno(e.target.value)} autoComplete="given-name" required />
                  </label>
                  <label>
                    Příjmení
                    <input value={prijmeni} onChange={(e) => setPrijmeni(e.target.value)} autoComplete="family-name" required />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Jméno
                    <input value={jmeno} onChange={(e) => setJmeno(e.target.value)} autoComplete="given-name" required />
                  </label>
                  <label>
                    Příjmení
                    <input value={prijmeni} onChange={(e) => setPrijmeni(e.target.value)} autoComplete="family-name" required />
                  </label>
                </>
              )}

              <label>
                Telefon
                <span style={{ display: 'block' }}>
                  <input
                    type="tel"
                    value={telefon}
                    onChange={(e) => setTelefon(e.target.value)}
                    autoComplete="tel"
                    required
                    style={{ whiteSpace: 'nowrap' }}
                  />
                </span>
              </label>
              <label>
                E-mail
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
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
              <label className="dop-check">
                <input type="checkbox" checked={souhlas} onChange={(e) => setSouhlas(e.target.checked)} />
                Souhlasím s pravidly programu
              </label>
              <button type="submit" className="dop-cta" disabled={cekam}>
                {cekam ? 'Odesílám…' : 'Odeslat'}
              </button>
            </form>
            {hlaska ? <p className="dop-hlaska">{hlaska}</p> : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
