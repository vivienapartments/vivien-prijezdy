'use client';

import { useState } from 'react';
import { stavParkovani, type BranaSlot } from '@/lib/brana';
import { sestavDnesek, textUklizeno, type HostDne, type KdoUklidil } from '@/lib/dnesek';
import { odkazPripraveno, textPripraveno } from '@/lib/okno-pobytu';
import type { PrehledRadek } from '@/lib/prehled';

type Props = {
  radky: PrehledRadek[];
  dnes: string;
  ukazka?: boolean;
  brana?: BranaSlot[];
  /** Sekce nahoře v přehledu. Bez toho je to vlastní stránka. */
  vPrehledu?: boolean;
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
  };
}

function odkazHosta(id: string, ukazka: boolean, vPrehledu: boolean): string {
  if (vPrehledu) return `#${id}`;
  return ukazka ? `/prehled?ukazka=1#${id}` : `/prehled#${id}`;
}

export function Dnesek({ radky, dnes, ukazka = false, brana = [], vPrehledu = false }: Props) {
  const pohled = sestavDnesek(
    radky.map((row) => hostZRadku(row, brana)),
    dnes,
  );
  const [misto, setMisto] = useState<Record<string, { kdy: string; kdo: KdoUklidil } | null>>({});
  const [ptam, setPtam] = useState<string | null>(null);
  const [chyba, setChyba] = useState('');
  const [nabidka, setNabidka] = useState<{ id: string; jmeno: string } | null>(null);
  const [nabidkaStav, setNabidkaStav] = useState('');
  const maNeco = pohled.uklid.length + pohled.odjezdy.length + pohled.prijezdy.length + pohled.nedoplatky.length > 0;

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
      return;
    }
    if (!kdo) return;
    setMisto((stav) => ({ ...stav, [id]: { kdy: new Date().toISOString(), kdo } }));
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
    const row = radky.find((r) => r.rezervace === nabidka.id);
    if (jak === 'whatsapp' && row?.telefonWa) {
      const text = textPripraveno(row.jazyk, row.odkaz ? odkazPripraveno(row.odkaz) : '');
      window.open(`https://wa.me/${row.telefonWa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace: nabidka.id, akce: 'pripraveno-whatsapp' }),
      });
    }
    if (jak === 'email') {
      await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace: nabidka.id, akce: 'email', zprava: 'pripraveno' }),
      });
    }
    setNabidka(null);
  }

  if (!maNeco) {
    if (vPrehledu) return null;
    return <p className="ph-dnesek__prazdno">Dnes nikdo neodjíždí ani nepřijíždí.</p>;
  }

  const odkazStranky = ukazka ? '/prehled/dnes?ukazka=1' : '/prehled/dnes';
  const odkaz = (id: string) => odkazHosta(id, ukazka, vPrehledu);

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

      {pohled.uklid.length ? (
        <div>
          <h2>Úklid</h2>
          <ul>
            {pohled.uklid.map((r) => {
              const stav = hotovo(r.rezervace, r.uklizenoKdy, r.uklizenoKdo);
              return (
                <li key={r.rezervace} className={stav ? 'ph-dnesek__radek is-uklizeno' : 'ph-dnesek__radek'}>
                  <p>
                    {r.prvni ? <span className="ph-dnesek__prvni">Uklidit první</span> : null}
                    {r.prvni ? ' · ' : null}
                    <strong>{r.apartman}</strong>
                    {' · '}
                    {r.uvolni}
                    {' · '}
                    {r.dalsi}
                  </p>
                  {stav ? (
                    <p className="ph-dnesek__akce">
                      <span>{textUklizeno(stav.kdy, stav.kdo)}</span>
                      <button type="button" onClick={() => zapis(r.rezervace, 'vratit-uklid')}>
                        Vrátit
                      </button>
                    </p>
                  ) : ptam === r.rezervace ? (
                    <p className="ph-dnesek__akce">
                      Kdo uklidil?
                      <button type="button" onClick={() => zapis(r.rezervace, 'uklid', 'pravoslav')}>
                        Pravoslav
                      </button>
                      <button type="button" onClick={() => zapis(r.rezervace, 'uklid', 'nikol')}>
                        Nikol
                      </button>
                    </p>
                  ) : (
                    <p className="ph-dnesek__akce">
                      <button type="button" onClick={() => setPtam(r.rezervace)}>
                        Uklizeno
                      </button>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {pohled.odjezdy.length ? (
        <div>
          <h2>Odjezdy</h2>
          <ul>
            {pohled.odjezdy.map((r) => (
              <li key={r.rezervace} className="ph-dnesek__radek">
                <p>
                  <strong>{r.apartman}</strong>
                  {' · '}
                  <a href={odkaz(r.rezervace)}>{r.jmeno}</a>
                  {' · '}
                  {r.cas}
                  {r.dluh ? ` · ${r.dluh}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pohled.prijezdy.length ? (
        <div>
          <h2>Příjezdy</h2>
          <ul>
            {pohled.prijezdy.map((r) => (
              <li key={r.rezervace} className="ph-dnesek__radek">
                <p>
                  <strong>{r.apartman}</strong>
                  {' · '}
                  <a href={odkaz(r.rezervace)}>{r.jmeno}</a>
                  {' · '}
                  <span className={r.casZnamy ? undefined : 'ph-dnesek__neznamy'}>{r.cas}</span>
                  {r.zpusob ? ` · ${r.zpusob}` : ''}
                  {r.brana ? ` · ${r.brana}` : ''}
                  {r.faze ? ` · Fáze · ${r.faze}` : ''}
                </p>
              </li>
            ))}
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
                  <a href={odkaz(r.rezervace)}>{r.jmeno}</a>
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
          <button type="button" onClick={() => void odeslatNabidku('email')}>
            Poslat e-mailem
          </button>
          <button type="button" onClick={() => void odeslatNabidku('whatsapp')}>
            Napsat na WhatsApp
          </button>
          <button type="button" onClick={() => void odeslatNabidku('ne')}>
            Ne
          </button>
          {nabidkaStav ? <p>{nabidkaStav}</p> : null}
        </div>
      ) : null}
      {chyba ? <p className="ph-chyba">{chyba}</p> : null}
    </section>
  );
}
