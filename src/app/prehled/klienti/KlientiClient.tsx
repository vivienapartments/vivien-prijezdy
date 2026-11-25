'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import type { KlubPravidla } from '@/lib/klub-pravidla';

type KartaUi = {
  id: string;
  kod: string;
  jmeno: string;
  prijmeni: string;
  typ: string;
  utrataKc: number;
  kreditKc: number;
  urovenNazev: string;
  slevaPct: number;
};

export function KlientiClient() {
  const [karty, setKarty] = useState<KartaUi[]>([]);
  const [pravidla, setPravidla] = useState<KlubPravidla | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [editDelka7, setEditDelka7] = useState('10');
  const [editDelka14, setEditDelka14] = useState('15');
  const [editOdmena1, setEditOdmena1] = useState('5');
  const [editOdmena2, setEditOdmena2] = useState('2');

  const nacti = useCallback(async () => {
    const res = await fetch('/api/prehled/klienti');
    const json = (await res.json()) as {
      ok?: boolean;
      karty?: KartaUi[];
      pravidla?: KlubPravidla;
    };
    if (json.ok) {
      setKarty(json.karty || []);
      if (json.pravidla) {
        setPravidla(json.pravidla);
        const d7 = json.pravidla.slevaDelka.find((x) => x.odNoci === 7);
        const d14 = json.pravidla.slevaDelka.find((x) => x.odNoci === 14);
        setEditDelka7(String(d7?.pct ?? 10));
        setEditDelka14(String(d14?.pct ?? 15));
        setEditOdmena1(String(json.pravidla.odmenaPrvniPct));
        setEditOdmena2(String(json.pravidla.odmenaDalsiPct));
      }
    }
  }, []);

  useEffect(() => {
    void nacti();
  }, [nacti]);

  async function ulozPravidla() {
    if (!pravidla) return;
    const res = await fetch('/api/prehled/klienti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        akce: 'pravidla',
        pravidla: {
          ...pravidla,
          slevaDelka: [
            { odNoci: 7, pct: Number(editDelka7) || 10 },
            { odNoci: 14, pct: Number(editDelka14) || 15 },
          ],
          odmenaPrvniPct: Number(editOdmena1) || 5,
          odmenaDalsiPct: Number(editOdmena2) || 2,
        },
      }),
    });
    const json = (await res.json()) as { ok?: boolean; pravidla?: KlubPravidla };
    if (json.ok) {
      setPravidla(json.pravidla || null);
      setHlaska('Pravidla uložena.');
    } else {
      setHlaska('Uložení se nepovedlo.');
    }
  }

  async function migrace() {
    const res = await fetch('/api/prehled/klienti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce: 'migrace-dop' }),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      migrace?: {
        zkopirovano: number;
        kolizeKodu: number;
        bezKontaktu: number;
        rezervovanePreskocene: number;
      };
    };
    if (json.migrace) {
      const m = json.migrace;
      setHlaska(
        `Migrace: zkopírováno ${m.zkopirovano}, kolize ${m.kolizeKodu}, bez kontaktu ${m.bezKontaktu}, rezervované ${m.rezervovanePreskocene}.`,
      );
      await nacti();
    } else {
      setHlaska('Migrace se nepovedla.');
    }
  }

  return (
    <main className="ph" style={{ padding: '1rem', maxWidth: 720, margin: '0 auto' }}>
      <p>
        <Link href="/prehled" style={{ color: '#c9a84c' }}>
          ← Zpět do přehledu
        </Link>
      </p>
      <h1 style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>Klienti</h1>
      <p style={{ color: '#b7aa98', fontSize: '0.9rem' }}>
        Dávka 1 klubu. Seznam a pravidla. Hostům se nic nemění, dokud není klub zapnutý.
      </p>
      {hlaska ? <p style={{ color: '#c9a84c' }}>{hlaska}</p> : null}

      <section style={{ marginBottom: '1.4rem' }}>
        <h2 style={{ fontSize: '1rem' }}>Pravidla</h2>
        {pravidla ? (
          <div style={{ display: 'grid', gap: 8, color: '#efe6d8', fontSize: '0.9rem' }}>
            <label>
              Sleva od 7 nocí (%){' '}
              <input
                value={editDelka7}
                onChange={(e) => setEditDelka7(e.target.value)}
                style={inp}
              />
            </label>
            <label>
              Sleva od 14 nocí (%){' '}
              <input
                value={editDelka14}
                onChange={(e) => setEditDelka14(e.target.value)}
                style={inp}
              />
            </label>
            <label>
              Odměna 1. pobyt kamaráda (%){' '}
              <input
                value={editOdmena1}
                onChange={(e) => setEditOdmena1(e.target.value)}
                style={inp}
              />
            </label>
            <label>
              Odměna další pobyty (%){' '}
              <input
                value={editOdmena2}
                onChange={(e) => setEditOdmena2(e.target.value)}
                style={inp}
              />
            </label>
            <p style={{ color: '#b7aa98', margin: 0 }}>
              Sleva úrovně od: {pravidla.slevaUrovneOd === 'po-prvnim-odjezdu' ? 'po prvním odjezdu' : 'od první poptávky'}.
              Rezervované kódy: {pravidla.rezervovaneKody.join(', ')}.
            </p>
            <button type="button" onClick={() => void ulozPravidla()} style={btn}>
              Uložit pravidla
            </button>
          </div>
        ) : (
          <p style={{ color: '#b7aa98' }}>Načítám…</p>
        )}
      </section>

      <section style={{ marginBottom: '1.4rem' }}>
        <h2 style={{ fontSize: '1rem' }}>Migrace z doporučitelů</h2>
        <p style={{ color: '#b7aa98', fontSize: '0.85rem' }}>
          Kopie dop:* → klient:*. Originál zůstane. Na Preview s předponou test:.
        </p>
        <button type="button" onClick={() => void migrace()} style={btn}>
          Spustit migraci
        </button>
      </section>

      <section>
        <h2 style={{ fontSize: '1rem' }}>Seznam ({karty.length})</h2>
        {!karty.length ? (
          <p style={{ color: '#b7aa98' }}>Zatím žádní klienti. Spusťte migraci nebo přijdou v dalších dávkách.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {karty.map((k) => (
              <li
                key={k.id}
                style={{
                  borderBottom: '1px solid #3d342a',
                  padding: '0.65rem 0',
                  color: '#efe6d8',
                  fontSize: '0.92rem',
                }}
              >
                <strong>
                  {k.jmeno} {k.prijmeni}
                </strong>{' '}
                · {k.kod} · {k.typ}
                <br />
                {k.urovenNazev} ({k.slevaPct} %) · útrata {k.utrataKc} Kč · kredit {k.kreditKc} Kč
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

const inp: CSSProperties = {
  width: 64,
  marginLeft: 8,
  padding: 6,
  borderRadius: 8,
  border: '1px solid #3d342a',
  background: '#15110e',
  color: '#efe6d8',
};

const btn: CSSProperties = {
  padding: '8px 14px',
  borderRadius: 18,
  border: 0,
  background: '#c9a84c',
  color: '#1a1510',
  fontWeight: 700,
  cursor: 'pointer',
  width: 'fit-content',
};
