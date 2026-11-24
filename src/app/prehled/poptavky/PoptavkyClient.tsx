'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PoptavkaDetail } from '../PoptavkaDetail';

type Radek = {
  id: string;
  cas: string;
  jmeno: string;
  telefon: string;
  prijezd: string;
  odjezd: string;
  termin: string;
  apartman: string;
  odkud: string;
  stav: string;
  stavText: string;
  zkouska: boolean;
  vyrizena: boolean;
};

function casCesky(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  return new Intl.DateTimeFormat('cs-CZ', {
    timeZone: 'Europe/Prague',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(t));
}

export function PoptavkyClient() {
  const [radky, setRadky] = useState<Radek[]>([]);
  const [zalozka, setZalozka] = useState<'nevyrizene' | 'vyrizene'>('nevyrizene');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [chyba, setChyba] = useState('');
  const [cekam, setCekam] = useState(false);

  const nacti = useCallback(async () => {
    setChyba('');
    try {
      const res = await fetch('/api/prehled/poptavka', { cache: 'no-store' });
      const json = (await res.json()) as { ok?: boolean; poptavky?: Radek[]; error?: string };
      if (!json.ok || !json.poptavky) {
        setChyba(json.error || 'Seznam se nenačetl.');
        return;
      }
      setRadky(json.poptavky);
    } catch {
      setChyba('Seznam se nenačetl.');
    }
  }, []);

  useEffect(() => {
    void nacti();
  }, [nacti]);

  const filtrovane = useMemo(() => {
    return radky.filter((r) => (zalozka === 'vyrizene' ? r.vyrizena : !r.vyrizena));
  }, [radky, zalozka]);

  async function archivovat(id: string) {
    setCekam(true);
    setChyba('');
    try {
      const res = await fetch('/api/prehled/poptavka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, akce: 'do_vyrizenych' }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!json.ok) {
        setChyba(json.error || 'Nepovedlo se.');
        return;
      }
      await nacti();
    } catch {
      setChyba('Nepovedlo se.');
    } finally {
      setCekam(false);
    }
  }

  async function zpet(id: string) {
    setCekam(true);
    setChyba('');
    try {
      const res = await fetch('/api/prehled/poptavka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, akce: 'zpet_nevyrizene' }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!json.ok) {
        setChyba(json.error || 'Nepovedlo se.');
        return;
      }
      await nacti();
    } catch {
      setChyba('Nepovedlo se.');
    } finally {
      setCekam(false);
    }
  }

  async function smazat(id: string, jmeno: string) {
    if (!window.confirm(`Smazat poptávku ${jmeno}? Termín se uvolní.`)) return;
    setCekam(true);
    setChyba('');
    try {
      const res = await fetch('/api/prehled/poptavka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, akce: 'smazat' }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!json.ok) {
        setChyba(json.error || 'Nepovedlo se smazat.');
        return;
      }
      setDetailId(null);
      await nacti();
    } catch {
      setChyba('Nepovedlo se smazat.');
    } finally {
      setCekam(false);
    }
  }

  const pocetNev = radky.filter((r) => !r.vyrizena).length;
  const pocetVyr = radky.filter((r) => r.vyrizena).length;

  return (
    <main className="ph" style={{ padding: '1rem', maxWidth: 720, margin: '0 auto' }}>
      {detailId ? (
        <PoptavkaDetail
          id={detailId}
          onZavrit={() => {
            setDetailId(null);
            void nacti();
          }}
        />
      ) : null}

      <p>
        <Link href="/prehled" style={{ color: '#c9a84c' }}>
          ← Zpět do přehledu
        </Link>
      </p>
      <h1 style={{ color: '#c9a84c', fontFamily: 'Georgia, serif', fontWeight: 500 }}>Poptávky</h1>
      <p style={{ color: '#b7aa98', fontSize: '0.9rem' }}>Řazeno od nejnovější.</p>

      <div style={{ display: 'flex', gap: 8, margin: '1rem 0' }}>
        <button
          type="button"
          className="ph-btn"
          style={{
            background: zalozka === 'nevyrizene' ? '#c9a84c' : 'transparent',
            color: zalozka === 'nevyrizene' ? '#1a1510' : '#c9a84c',
            border: '1px solid #c9a84c',
          }}
          onClick={() => setZalozka('nevyrizene')}
        >
          Nevyřízené ({pocetNev})
        </button>
        <button
          type="button"
          className="ph-btn"
          style={{
            background: zalozka === 'vyrizene' ? '#c9a84c' : 'transparent',
            color: zalozka === 'vyrizene' ? '#1a1510' : '#c9a84c',
            border: '1px solid #c9a84c',
          }}
          onClick={() => setZalozka('vyrizene')}
        >
          Vyřízené ({pocetVyr})
        </button>
      </div>

      {chyba ? <p className="ph-chyba">{chyba}</p> : null}

      {!filtrovane.length && !chyba ? (
        <p style={{ color: '#b7aa98' }}>
          {zalozka === 'nevyrizene' ? 'Žádná nevyřízená poptávka.' : 'Žádná vyřízená poptávka.'}
        </p>
      ) : null}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {filtrovane.map((r) => (
          <li
            key={r.id}
            style={{
              border: '1px solid #3d342a',
              borderRadius: 14,
              padding: '12px 14px',
              marginBottom: 10,
              background: '#15110e',
            }}
          >
            <button
              type="button"
              onClick={() => setDetailId(r.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 0,
                color: '#efe6d8',
                padding: 0,
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              <strong style={{ color: '#efe6d8' }}>{r.jmeno}</strong>
              {r.zkouska ? (
                <span style={{ marginLeft: 8, color: '#c9a84c', fontSize: '0.8rem' }}>ZKOUŠKA</span>
              ) : null}
              <div style={{ color: '#b7aa98', fontSize: '0.9rem', marginTop: 4 }}>
                {r.termin} · {r.apartman}
              </div>
              <div style={{ color: '#b7aa98', fontSize: '0.85rem', marginTop: 2 }}>
                {r.odkud} · {r.stavText}
                {casCesky(r.cas) ? ` · přišlo ${casCesky(r.cas)}` : ''}
              </div>
            </button>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button type="button" className="ph-btn" onClick={() => setDetailId(r.id)}>
                Otevřít
              </button>
              {zalozka === 'nevyrizene' ? (
                <button
                  type="button"
                  className="ph-btn"
                  disabled={cekam}
                  onClick={() => void archivovat(r.id)}
                >
                  Do vyřízených
                </button>
              ) : (
                <button type="button" className="ph-btn" disabled={cekam} onClick={() => void zpet(r.id)}>
                  Zpět mezi nevyřízené
                </button>
              )}
              <button
                type="button"
                className="ph-btn"
                disabled={cekam}
                onClick={() => void smazat(r.id, r.jmeno)}
              >
                Smazat
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
