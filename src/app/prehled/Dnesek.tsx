'use client';

import { useEffect, useState } from 'react';
import { stavParkovani, type BranaSlot } from '@/lib/brana';
import { sestavDnesek, textUklizeno, type HostDne, type KdoUklidil, type UklidRadek } from '@/lib/dnesek';
import { odkazPripraveno, textPripraveno } from '@/lib/okno-pobytu';
import type { PrehledRadek } from '@/lib/prehled';
import { casPrevzetiText } from '@/lib/zalozky';
import { TlacitkoWhatsApp } from '@/components/TlacitkoWhatsApp';

type Props = {
  radky: PrehledRadek[];
  dnes: string;
  ukazka?: boolean;
  brana?: BranaSlot[];
  /** Sekce nahoře v přehledu. Bez toho je to vlastní stránka. */
  vPrehledu?: boolean;
  onPrevzato?: (id: string, kdy: string | null) => void;
  /** Otevře kartu hosta v přehledu (jako Hledat). */
  onOtevri?: (id: string) => void;
  onZavadyZapsany?: (odjizdejici: string, prijezdejici: string | null) => void;
};

type KdoZavad = 'miluska' | 'nikol' | 'pravoslav';

type DotazEmail = {
  odjezdId: string;
  dalsiId: string | null;
  iDalsimu: boolean;
  krok: 'odjezd' | 'dalsi';
};

function datum(dnes: string): string {
  const [y, m, d] = dnes.split('-');
  if (!y || !m || !d) return '';
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

function branaZ(row: PrehledRadek, sloty: BranaSlot[]): HostDne['brana'] {
  if (row.zpusobPrijezdu !== 'auto') return null;
  if (row.branaRegistrovano) return 'misto';
  const stav = stavParkovani(
    {
      rezervace: row.rezervace,
      apartman: row.apartman,
      prijezd: row.prijezd,
      odjezd: row.odjezd,
      zpusob: row.zpusobPrijezdu,
      telefonBrana: row.telefonBrana,
      branaRegistrovano: row.branaRegistrovano,
      zruseno: row.stav === 'zruseno',
    },
    sloty,
    new Date(),
  );
  return stav.text.includes('má místo') ? 'misto' : 'registrovat';
}

function hostZRadku(row: PrehledRadek, sloty: BranaSlot[]): HostDne {
  return {
    rezervace: row.rezervace,
    apartman: row.apartman,
    jmeno: row.jmeno || 'Host',
    prijezd: row.prijezd,
    odjezd: row.odjezd,
    casPrijezdu: row.casPrijezdu,
    casOdjezdu: row.casOdjezdu,
    stav: row.stav,
    zpusob: row.zpusobPrijezdu,
    brana: branaZ(row, sloty),
    faze: row.fazeText,
    dluh: row.dluhText,
    uklizenoKdy: row.uklizenoKdy,
    uklizenoKdo: row.uklizenoKdo,
    prevzatoKdy: row.prevzatoKdy,
    predanoKdy: row.predano,
  };
}

function odkazHosta(id: string, ukazka: boolean, vPrehledu: boolean): string {
  if (vPrehledu) return `#${id}`;
  return ukazka ? `/prehled?ukazka=1#${id}` : `/prehled#${id}`;
}

export function Dnesek({
  radky,
  dnes,
  ukazka = false,
  brana = [],
  vPrehledu = false,
  onPrevzato,
  onOtevri,
  onZavadyZapsany,
}: Props) {
  const [mistoPrevzeti, setMistoPrevzeti] = useState<Record<string, string | null>>({});
  const [cerstve, setCerstve] = useState<string | null>(null);
  const chybne = radky.filter((row) => row.nelzeNacist).map((row) => row.rezervace);
  const pohled = sestavDnesek(
    radky
      .filter((row) => !row.nelzeNacist)
      .map((row) => hostZRadku(row, brana))
      .map((h) =>
        Object.prototype.hasOwnProperty.call(mistoPrevzeti, h.rezervace) ? { ...h, prevzatoKdy: mistoPrevzeti[h.rezervace] } : h,
      ),
    dnes,
    new Date(),
  );
  const chybyKaret = vPrehledu ? pohled.chyby : [...chybne, ...pohled.chyby];
  const [misto, setMisto] = useState<Record<string, { kdy: string; kdo: KdoUklidil } | null>>({});
  const [ptam, setPtam] = useState<string | null>(null);
  const [chyba, setChyba] = useState('');
  const [nabidka, setNabidka] = useState<{ id: string; jmeno: string } | null>(null);
  const [nabidkaStav, setNabidkaStav] = useState('');
  const [zavadyId, setZavadyId] = useState<string | null>(null);
  const [zavadyText, setZavadyText] = useState('');
  const [zavadyKdo, setZavadyKdo] = useState<KdoZavad | null>(null);
  const [zavadyDalsimu, setZavadyDalsimu] = useState(false);
  const [zavadyCekam, setZavadyCekam] = useState(false);
  const [dotazEmail, setDotazEmail] = useState<DotazEmail | null>(null);
  /** Uklizené karty jsou sbalené. Tady jsou ty, které majitel rozbalil. */
  const [rozbalUklid, setRozbalUklid] = useState<Record<string, true>>({});
  const [rozbalPrijezd, setRozbalPrijezd] = useState<Record<string, true>>({});
  useEffect(() => {
    if (!cerstve) return;
    const casovac = window.setTimeout(() => setCerstve(null), 10_000);
    return () => window.clearTimeout(casovac);
  }, [cerstve]);
  const maNeco =
    pohled.uklid.length + pohled.prijezdy.length + pohled.nedoplatky.length + chybyKaret.length > 0;

  function hotovo(rezervace: string, kdy: string | null, kdo: KdoUklidil | null) {
    if (Object.prototype.hasOwnProperty.call(misto, rezervace)) return misto[rezervace];
    if (kdy && kdo) return { kdy, kdo };
    return null;
  }

  function hostKNabidce(odjezdId: string) {
    const od = radky.find((r) => r.rezervace === odjezdId);
    if (!od?.apartman) return null;
    return (
      radky.find(
        (r) =>
          r.apartman === od.apartman &&
          r.prijezd === dnes &&
          r.rezervace !== od.rezervace &&
          !r.predano &&
          (!r.casPrijezdu || r.casPrijezdu > '14:00'),
      ) || null
    );
  }

  async function prevzit(id: string, vratit = false) {
    setChyba('');
    if (!ukazka) {
      const res = await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace: id, akce: vratit ? 'vratit-odjezd' : 'prevzato' }),
      });
      if (!res.ok) {
        setChyba('Převzetí se nepodařilo zapsat.');
        return;
      }
    }
    const kdy = vratit ? null : new Date().toISOString();
    setMistoPrevzeti((stav) => ({ ...stav, [id]: kdy }));
    onPrevzato?.(id, kdy);
    setCerstve(vratit ? null : id);
  }

  async function zapis(id: string, akce: 'uklid' | 'vratit-uklid', kdo?: KdoUklidil) {
    setChyba('');
    let zApi: { id: string; jmeno: string } | null = null;
    if (!ukazka) {
      const res = await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace: id, akce, kdo }),
      });
      const json = (await res.json().catch(() => null)) as { nabidka?: { id: string; jmeno: string } | null } | null;
      if (!res.ok) {
        setChyba('Úklid se nepodařilo zapsat.');
        return;
      }
      zApi = json?.nabidka || null;
    }
    if (akce === 'vratit-uklid') {
      setMisto((stav) => ({ ...stav, [id]: null }));
      setRozbalUklid((stav) => {
        if (!stav[id]) return stav;
        const dalsi = { ...stav };
        delete dalsi[id];
        return dalsi;
      });
      return;
    }
    if (!kdo) return;
    setMisto((stav) => ({ ...stav, [id]: { kdy: new Date().toISOString(), kdo } }));
    setRozbalUklid((stav) => {
      if (!stav[id]) return stav;
      const dalsi = { ...stav };
      delete dalsi[id];
      return dalsi;
    });
    setPtam(null);
    const host = ukazka ? hostKNabidce(id) : null;
    const dalsi = zApi || (host ? { id: host.rezervace, jmeno: host.jmeno } : null);
    if (dalsi) {
      setNabidka(dalsi);
      setNabidkaStav('');
    }
  }

  async function odeslatNabidku(jak: 'email' | 'whatsapp' | 'ne') {
    if (!nabidka || jak === 'ne') {
      setNabidka(null);
      return;
    }
    if (ukazka) {
      setNabidkaStav('V ukázce se nic neposílá.');
      return;
    }
    const id = nabidka.id;
    if (jak === 'whatsapp') {
      await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace: id, akce: 'pripraveno-whatsapp' }),
      });
      setNabidka(null);
      return;
    }
    await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: id, akce: 'email', zprava: 'pripraveno' }),
    });
    setNabidka(null);
  }

  if (!maNeco) {
    if (vPrehledu) return null;
    return <p className="ph-dnesek__prazdno">Dnes nikdo neodjíždí ani nepřijíždí.</p>;
  }

  const odkazStranky = ukazka ? '/prehled/dnes?ukazka=1' : '/prehled/dnes';
  const odkaz = (id: string) => odkazHosta(id, ukazka, vPrehledu);

  function odkazNaKartu(id: string, jmeno: string) {
    if (onOtevri) {
      return (
        <button type="button" className="ph-dnesek__odkaz" onClick={() => onOtevri(id)}>
          {jmeno}
        </button>
      );
    }
    return <a href={odkaz(id)}>{jmeno}</a>;
  }

  function resetZavad() {
    setZavadyId(null);
    setZavadyText('');
    setZavadyKdo(null);
    setZavadyDalsimu(false);
  }

  async function ulozZavadyPoOdjezdu(r: UklidRadek) {
    const text = zavadyText.trim();
    if (!text) {
      setChyba('Napište, co není v pořádku.');
      return;
    }
    if (!zavadyKdo) {
      setChyba('Vyberte, kdo zapsal.');
      return;
    }
    const iDalsimu = zavadyDalsimu && Boolean(r.dalsiRezervace);
    const dalsiId = iDalsimu ? r.dalsiRezervace : null;
    if (ukazka) {
      resetZavad();
      setDotazEmail({ odjezdId: r.rezervace, dalsiId, iDalsimu, krok: 'odjezd' });
      setChyba('');
      return;
    }
    setZavadyCekam(true);
    setChyba('');
    try {
      const res = await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rezervace: r.rezervace,
          akce: 'zavady-po-odjezdu',
          text,
          kdo: zavadyKdo,
          iDalsimu,
          dalsiRezervace: dalsiId,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        setChyba(json?.error || 'Závady se neuložily.');
        return;
      }
      resetZavad();
      setDotazEmail({ odjezdId: r.rezervace, dalsiId, iDalsimu, krok: 'odjezd' });
      onZavadyZapsany?.(r.rezervace, dalsiId);
    } catch {
      setChyba('Závady se neuložily.');
    } finally {
      setZavadyCekam(false);
    }
  }

  async function odpovedEmail(ano: boolean) {
    if (!dotazEmail) return;
    const { odjezdId, dalsiId, iDalsimu, krok } = dotazEmail;
    if (!ano) {
      if (krok === 'odjezd' && iDalsimu && dalsiId) {
        setDotazEmail({ odjezdId, dalsiId, iDalsimu, krok: 'dalsi' });
        return;
      }
      setDotazEmail(null);
      return;
    }
    if (ukazka) {
      if (krok === 'odjezd' && iDalsimu && dalsiId) {
        setDotazEmail({ odjezdId, dalsiId, iDalsimu, krok: 'dalsi' });
        return;
      }
      setDotazEmail(null);
      return;
    }
    setZavadyCekam(true);
    try {
      if (krok === 'odjezd') {
        await fetch('/api/prehled/akce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rezervace: odjezdId, akce: 'zavady-po-odjezdu-odeslat' }),
        });
        if (iDalsimu && dalsiId) {
          setDotazEmail({ odjezdId, dalsiId, iDalsimu, krok: 'dalsi' });
          return;
        }
        setDotazEmail(null);
        return;
      }
      if (dalsiId) {
        await fetch('/api/prehled/akce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rezervace: dalsiId, akce: 'zavady-odeslat' }),
        });
      }
      setDotazEmail(null);
    } finally {
      setZavadyCekam(false);
    }
  }

  function tlacitkaUklidu(r: UklidRadek) {
    if (ptam === r.rezervace) {
      return (
        <p className="ph-dnesek__akce">
          Kdo uklidil?
          <button type="button" onClick={() => zapis(r.rezervace, 'uklid', 'miluska')}>
            Miluška
          </button>
          <button type="button" onClick={() => zapis(r.rezervace, 'uklid', 'nikol')}>
            Nikol
          </button>
        </p>
      );
    }
    return (
      <p className="ph-dnesek__akce">
        <button
          type="button"
          onClick={() => {
            setZavadyId(r.rezervace);
            setZavadyText('');
            setZavadyKdo(null);
            setZavadyDalsimu(false);
            setPtam(null);
            setDotazEmail(null);
          }}
        >
          Závady po odjezdu
        </button>
        {r.prevzato || r.uvolni.startsWith('uvolněno') ? null : (
          <button type="button" onClick={() => void prevzit(r.rezervace)}>
            Převzato
          </button>
        )}
        {cerstve === r.rezervace ? (
          <button type="button" onClick={() => void prevzit(r.rezervace, true)}>
            Vrátit
          </button>
        ) : null}
        <button type="button" onClick={() => setPtam(r.rezervace)}>
          Uklizeno
        </button>
      </p>
    );
  }

  return (
    <section className="ph-dnesek" aria-label="Dnešek">
      {vPrehledu ? (
        <h2>
          <a href={odkazStranky}>Dnešek</a>
        </h2>
      ) : (
        <h1>Dnešek</h1>
      )}
      <p className="ph-dnesek__den">{datum(dnes)}</p>
      {chybyKaret.map((id) => (
        <p key={id} className="ph-chyba">
          Kartu {id} se nepodařilo načíst
        </p>
      ))}

      {pohled.prijezdy.length ? (
        <div>
          <h2>Příjezdy</h2>
          <ul>
            {pohled.prijezdy.map((r) => {
              const casPredani = r.predanoKdy ? casPrevzetiText(r.predanoKdy) : '';
              const sbaleno = Boolean(r.predanoKdy) && !rozbalPrijezd[r.rezervace];
              if (sbaleno) {
                return (
                  <li key={r.rezervace} className="ph-dnesek__radek is-uklizeno is-sbaleno">
                    <button
                      type="button"
                      className="ph-dnesek__odkaz"
                      onClick={() => {
                        if (onOtevri) onOtevri(r.rezervace);
                        else setRozbalPrijezd((s) => ({ ...s, [r.rezervace]: true }));
                      }}
                    >
                      <strong>{r.apartman}</strong>
                      {' · '}
                      {r.jmeno}
                      {casPredani ? ` · předáno ${casPredani}` : ' · předáno'}
                    </button>
                  </li>
                );
              }
              return (
                <li key={r.rezervace} className={r.predanoKdy ? 'ph-dnesek__radek is-uklizeno' : 'ph-dnesek__radek'}>
                  <p>
                    <strong>{r.apartman}</strong>
                    {' · '}
                    {odkazNaKartu(r.rezervace, r.jmeno)}
                    {' · '}
                    <span className={r.casZnamy ? undefined : 'ph-dnesek__neznamy'}>{r.cas}</span>
                    {r.zpusob ? ` · ${r.zpusob}` : ''}
                    {r.brana ? ` · ${r.brana}` : ''}
                    {r.faze ? ` · Fáze · ${r.faze}` : ''}
                    {casPredani ? ` · předáno ${casPredani}` : ''}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {pohled.uklid.length ? (
        <div>
          <h2>Úklid a odjezdy</h2>
          <ul>
            {pohled.uklid.map((r) => {
              const stav = hotovo(r.rezervace, r.uklizenoKdy, r.uklizenoKdo);
              const sbaleno = Boolean(stav) && !rozbalUklid[r.rezervace];
              if (sbaleno && stav) {
                return (
                  <li key={r.rezervace} className="ph-dnesek__radek is-uklizeno is-sbaleno">
                    <p className="ph-dnesek__akce">
                      <strong>{r.apartman}</strong>
                      <span>{textUklizeno(stav.kdy, stav.kdo)}</span>
                      <button
                        type="button"
                        onClick={() => setRozbalUklid((s) => ({ ...s, [r.rezervace]: true }))}
                      >
                        Rozbalit
                      </button>
                      <button type="button" onClick={() => void zapis(r.rezervace, 'vratit-uklid')}>
                        Vrátit
                      </button>
                    </p>
                  </li>
                );
              }
              return (
                <li key={r.rezervace} className={stav ? 'ph-dnesek__radek is-uklizeno' : 'ph-dnesek__radek'}>
                  <p>
                    <strong>{r.apartman}</strong>
                    {r.prvni ? (
                      <>
                        {' · '}
                        <span className="ph-dnesek__prvni">Uklidit první</span>
                      </>
                    ) : null}
                    {r.nestihneSeDo ? (
                      <>
                        {' · '}
                        <span className="ph-dnesek__nestihne">nestihne se do {r.nestihneSeDo}</span>
                      </>
                    ) : null}
                  </p>
                  <p>
                    Odjíždí: {odkazNaKartu(r.rezervace, r.jmeno)}
                    {' · '}
                    {r.casOdjezduText}
                    {r.nedoplatek ? (
                      <>
                        {' · '}
                        <span className="ph-dnesek__nestihne">{r.nedoplatek}</span>
                      </>
                    ) : null}
                  </p>
                  <p>
                    Přijíždí:{' '}
                    {r.dalsiRezervace && r.dalsiJmeno
                      ? odkazNaKartu(r.dalsiRezervace, r.dalsiJmeno)
                      : null}
                    {r.dalsiRezervace && r.dalsiJmeno ? ' · ' : null}
                    {r.maPrijezd
                      ? r.prijezdCas
                        ? r.prijezdCas.replace(/^0(\d:)/, '$1')
                        : 'čas neznámý'
                      : 'dnes nikdo nepřijede'}
                  </p>
                  {zavadyId === r.rezervace ? (
                    <div className="ph-predano-dotaz">
                      <p>
                        Odjíždí: {r.jmeno}
                        {r.dalsiJmeno ? ` · Přijíždí: ${r.dalsiJmeno}` : ''}
                      </p>
                      <p>Závady po odjezdu</p>
                      <textarea
                        value={zavadyText}
                        onChange={(e) => setZavadyText(e.target.value)}
                        rows={4}
                        maxLength={2000}
                        aria-label="Závady po odjezdu"
                      />
                      <p className="ph-dnesek__akce">
                        Kdo zapsal?
                        <button
                          type="button"
                          className={zavadyKdo === 'miluska' ? 'is-on' : undefined}
                          onClick={() => setZavadyKdo('miluska')}
                        >
                          Miluška
                        </button>
                        <button
                          type="button"
                          className={zavadyKdo === 'nikol' ? 'is-on' : undefined}
                          onClick={() => setZavadyKdo('nikol')}
                        >
                          Nikol
                        </button>
                        <button
                          type="button"
                          className={zavadyKdo === 'pravoslav' ? 'is-on' : undefined}
                          onClick={() => setZavadyKdo('pravoslav')}
                        >
                          Pravoslav
                        </button>
                      </p>
                      {r.dalsiRezervace ? (
                        <label className="ph-dnesek__check">
                          <input
                            type="checkbox"
                            checked={zavadyDalsimu}
                            onChange={(e) => setZavadyDalsimu(e.target.checked)}
                          />
                          Neopraveno, zapsat i dalšímu hostovi
                        </label>
                      ) : null}
                      <p className="ph-dnesek__akce">
                        <button type="button" disabled={zavadyCekam} onClick={() => void ulozZavadyPoOdjezdu(r)}>
                          Uložit
                        </button>
                        <button type="button" onClick={resetZavad}>
                          Zrušit
                        </button>
                      </p>
                    </div>
                  ) : null}
                  {dotazEmail?.odjezdId === r.rezervace ? (
                    <div className="ph-predano-dotaz">
                      <p>
                        {dotazEmail.krok === 'odjezd'
                          ? 'Poslat hostovi e-mail teď?'
                          : 'Poslat i dalšímu hostovi zápis z předání?'}
                      </p>
                      <p className="ph-dnesek__akce">
                        <button type="button" disabled={zavadyCekam} onClick={() => void odpovedEmail(true)}>
                          Ano
                        </button>
                        <button type="button" disabled={zavadyCekam} onClick={() => void odpovedEmail(false)}>
                          Ne
                        </button>
                      </p>
                    </div>
                  ) : null}
                  {stav ? (
                    <p className="ph-dnesek__akce">
                      <span>{textUklizeno(stav.kdy, stav.kdo)}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setRozbalUklid((s) => {
                            const dalsi = { ...s };
                            delete dalsi[r.rezervace];
                            return dalsi;
                          })
                        }
                      >
                        Sbalit
                      </button>
                      <button type="button" onClick={() => void zapis(r.rezervace, 'vratit-uklid')}>
                        Vrátit
                      </button>
                    </p>
                  ) : zavadyId === r.rezervace || dotazEmail?.odjezdId === r.rezervace ? null : (
                    tlacitkaUklidu(r)
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {pohled.nedoplatky.length ? (
        <div>
          <h2>Nedoplatky</h2>
          <ul>
            {pohled.nedoplatky.map((r) => (
              <li key={r.rezervace} className="ph-dnesek__radek">
                <p>
                  <strong>{r.apartman}</strong>
                  {' · '}
                  {odkazNaKartu(r.rezervace, r.jmeno)}
                  {' · '}
                  {r.text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {nabidka ? (
        <div className="ph-okno">
          <p>Dát hostovi vědět, že je apartmán připravený?</p>
          <p>{nabidka.jmeno}</p>
          <div className="ph-zpravy-akce">
            <TlacitkoWhatsApp
              wa={radky.find((r) => r.rezervace === nabidka.id)?.telefonWa}
              zprava={(() => {
                const row = radky.find((r) => r.rezervace === nabidka.id);
                return textPripraveno(row?.jazyk ?? null, row?.odkaz ? odkazPripraveno(row.odkaz) : '');
              })()}
              userAgent={typeof navigator !== 'undefined' ? navigator.userAgent : ''}
              onPredOtevrenim={() => odeslatNabidku('whatsapp')}
            />
            {radky.find((r) => r.rezervace === nabidka.id)?.email.includes('@') ? (
              <button type="button" className="ph-wa" onClick={() => void odeslatNabidku('email')}>
                Poslat e-mailem
              </button>
            ) : null}
            <button
              type="button"
              className="ph-kopie"
              onClick={() => {
                const row = radky.find((r) => r.rezervace === nabidka.id);
                const text = textPripraveno(row?.jazyk ?? null, row?.odkaz ? odkazPripraveno(row.odkaz) : '');
                void navigator.clipboard.writeText(text);
              }}
            >
              Zkopírovat zprávu
            </button>
            <button type="button" className="ph-kopie" onClick={() => void odeslatNabidku('ne')}>
              Ne
            </button>
          </div>
          {nabidkaStav ? <p>{nabidkaStav}</p> : null}
        </div>
      ) : null}
      {chyba ? <p className="ph-chyba">{chyba}</p> : null}
    </section>
  );
}
