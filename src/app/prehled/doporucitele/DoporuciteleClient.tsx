'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type Karta = {
  kod: string;
  tajnyKlic?: string;
  jmeno: string;
  prijmeni: string;
  typ: string;
  penize: { ceka: number; kVyplate: number; vyplacenoCelkem: number };
  statistiky: { poptavky: number; potvrzene: number; probehle: number };
  doporuceni: { id: string; krestniJmenoKamarada: string; stav: string; odmena: number }[];
};

type Pravidla = {
  odmenaPct: number;
  azPoOdjezdu: boolean;
  jenPrvniPobyt: boolean;
  minVyplata: number;
};

type Pozvanka = {
  klic: string;
  poznamka: string;
  stav: 'ceka' | 'vyplnena';
  kod: string | null;
};

export function DoporuciteleClient() {
  const [karty, setKarty] = useState<Karta[]>([]);
  const [pozvanky, setPozvanky] = useState<Pozvanka[]>([]);
  const [pravidla, setPravidla] = useState<Pravidla | null>(null);
  const [detail, setDetail] = useState<Karta | null>(null);
  const [poznamka, setPoznamka] = useState('');
  const [odkazNovy, setOdkazNovy] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);

  const nacti = useCallback(async () => {
    const res = await fetch('/api/prehled/doporucitele');
    const json = (await res.json()) as {
      ok?: boolean;
      karty?: Karta[];
      pravidla?: Pravidla;
      pozvanky?: Pozvanka[];
    };
    if (json.ok) {
      setKarty(json.karty || []);
      setPravidla(json.pravidla || null);
      setPozvanky(json.pozvanky || []);
    }
  }, []);

  useEffect(() => {
    void nacti();
  }, [nacti]);

  function odkazPozvanky(klic: string): string {
    return `${window.location.origin}/doporucitel/pozvanka?p=${encodeURIComponent(klic)}`;
  }

  async function pozvat() {
    const res = await fetch('/api/prehled/doporucitele', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce: 'pozvat', poznamka: poznamka.trim() }),
    });
    const json = (await res.json()) as { ok?: boolean; pozvanka?: Pozvanka };
    if (json.ok && json.pozvanka?.klic) {
      setPoznamka('');
      setOdkazNovy(odkazPozvanky(json.pozvanka.klic));
      setHlaska('Odkaz je hotový. Pošlete ho.');
      await nacti();
    }
  }

  async function kopirovat(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setHlaska('Odkaz je zkopírovaný.');
    } catch {
      setHlaska('Odkaz vyberte a zkopírujte ručně.');
    }
  }

  async function vyplaceno(kod: string, castka: number) {
    const res = await fetch('/api/prehled/doporucitele', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce: 'vyplaceno', kod, castka }),
    });
    const json = (await res.json()) as { ok?: boolean; karta?: Karta };
    if (json.ok && json.karta) {
      setDetail(json.karta);
      await nacti();
      setHlaska('Označeno jako vyplaceno.');
    }
  }

  return (
    <main className="ph" style={{ padding: '1rem', maxWidth: 720, margin: '0 auto' }}>
      <p>
        <Link href="/prehled" style={{ color: '#c9a84c' }}>
          ← Zpět do přehledu
        </Link>
      </p>
      <h1 style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>Doporučitelé</h1>
      {hlaska ? <p style={{ color: '#c9a84c' }}>{hlaska}</p> : null}

      <section style={{ marginBottom: '1.2rem' }}>
        <h2 style={{ fontSize: '1rem' }}>Pozvat doporučitele</h2>
        <p style={{ color: '#b7aa98', fontSize: '0.9rem', textAlign: 'justify', hyphens: 'auto' }}>
          Vznikne odkaz. Pošlete ho člověku nebo firmě. Údaje vyplní sami a vznikne jejich karta.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={poznamka}
            onChange={(e) => setPoznamka(e.target.value)}
            placeholder="Poznámka pro vás (nepovinné)"
            style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #3d342a', background: '#15110e', color: '#efe6d8' }}
          />
          <button type="button" onClick={() => void pozvat()} style={{ padding: '8px 14px', borderRadius: 18, border: 0, background: '#c9a84c', color: '#1a1510', fontWeight: 700 }}>
            Vytvořit odkaz
          </button>
        </div>
        {odkazNovy ? (
          <p style={{ marginTop: 10, wordBreak: 'break-all', fontSize: '0.85rem' }}>
            {odkazNovy}{' '}
            <button type="button" onClick={() => void kopirovat(odkazNovy)} style={{ marginLeft: 8, padding: '6px 12px', borderRadius: 16, border: '1px solid #c9a84c', background: 'transparent', color: '#c9a84c' }}>
              Kopírovat
            </button>
          </p>
        ) : null}
        {pozvanky.some((p) => p.stav === 'ceka') ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0.8rem 0 0' }}>
            {pozvanky
              .filter((p) => p.stav === 'ceka')
              .map((p) => (
                <li key={p.klic} style={{ padding: '0.45rem 0', borderBottom: '1px solid #2c2520', fontSize: '0.85rem' }}>
                  {p.poznamka || 'Bez poznámky'} · čeká na údaje{' '}
                  <button type="button" onClick={() => void kopirovat(odkazPozvanky(p.klic))} style={{ marginLeft: 8, padding: '4px 10px', borderRadius: 16, border: '1px solid #c9a84c', background: 'transparent', color: '#c9a84c' }}>
                    Kopírovat odkaz
                  </button>
                </li>
              ))}
          </ul>
        ) : null}
      </section>

      {pravidla ? (
        <p style={{ color: '#b7aa98', fontSize: '0.85rem' }}>
          Pravidla: odměna {pravidla.odmenaPct} %, až po odjezdu, jen první pobyt.
        </p>
      ) : null}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {karty.map((k) => (
          <li
            key={k.kod}
            style={{ borderBottom: '1px solid #2c2520', padding: '0.7rem 0', cursor: 'pointer' }}
            onClick={() => setDetail(k)}
          >
            <strong>{k.jmeno} {k.prijmeni}</strong> · {k.typ} · poptávky {k.statistiky.poptavky} / pobyty{' '}
            {k.statistiky.probehle} · k výplatě {k.penize.kVyplate} Kč · vyplaceno {k.penize.vyplacenoCelkem} Kč
          </li>
        ))}
      </ul>

      {detail ? (
        <section style={{ marginTop: '1.2rem', border: '1px solid #3d342a', borderRadius: 12, padding: '1rem' }}>
          <h2 style={{ marginTop: 0, color: '#c9a84c' }}>
            {detail.jmeno} {detail.prijmeni}
          </h2>
          <p style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>
            Kód ?od={detail.kod}
            {detail.tajnyKlic ? (
              <>
                <br />
                Karta: /doporucitel?k={detail.tajnyKlic}
              </>
            ) : null}
          </p>
          <ul style={{ paddingLeft: '1.1rem' }}>
            {detail.doporuceni.map((d) => (
              <li key={d.id}>
                {d.krestniJmenoKamarada} · {d.stav} · {d.odmena} Kč
              </li>
            ))}
          </ul>
          {detail.penize.kVyplate > 0 ? (
            <button
              type="button"
              onClick={() => void vyplaceno(detail.kod, detail.penize.kVyplate)}
              style={{ padding: '8px 14px', borderRadius: 18, border: 0, background: '#c9a84c', color: '#1a1510', fontWeight: 700 }}
            >
              Vyplaceno {detail.penize.kVyplate} Kč
            </button>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
