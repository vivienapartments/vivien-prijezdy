'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import type { KlubPravidla } from '@/lib/klub-pravidla';
import type { ImportBhNahled, UtrataCekaPolozka } from '@/lib/klub-import-bh-csv';

type KartaUi = {
  id: string;
  kod: string;
  tajnyKlic?: string;
  jmeno: string;
  prijmeni: string;
  typ: string;
  email?: string;
  telefon?: string;
  firmaNazev?: string | null;
  utrataKc: number;
  utrataCekaKc?: number;
  kreditKc: number;
  urovenNazev: string;
  slevaPct: number;
  pocetPobytu?: number;
  posledniPobyt?: string | null;
  pristiPobyt?: string | null;
  praveBydli?: boolean;
  preview?: boolean;
};

type Razeni = 'utrata' | 'uroven' | 'pristi';

type NahledXlsx = {
  souhrn: { host: string; pocet: number; utrata: number; uroven: string }[];
  primaHoste: { jmeno: string; telefon: string; email: string; utrata: number }[];
};

function kc(n: number) {
  return `${n.toLocaleString('cs-CZ')} Kč`;
}

export function KlientiClient() {
  const [karty, setKarty] = useState<KartaUi[]>([]);
  const [pravidla, setPravidla] = useState<KlubPravidla | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [editDelka7, setEditDelka7] = useState('10');
  const [editDelka14, setEditDelka14] = useState('15');
  const [editOdmena1, setEditOdmena1] = useState('5');
  const [editOdmena2, setEditOdmena2] = useState('2');
  const [nahledImport, setNahledImport] = useState<NahledXlsx | null>(null);
  const [nahledBh, setNahledBh] = useState<ImportBhNahled | null>(null);
  const [utrataCeka, setUtrataCeka] = useState<UtrataCekaPolozka[]>([]);
  const [spojVyber, setSpojVyber] = useState<Record<string, string>>({});
  const [utrataId, setUtrataId] = useState('');
  const [utrataCastka, setUtrataCastka] = useState('');
  const [utrataPozn, setUtrataPozn] = useState('');
  const [hledat, setHledat] = useState('');
  const [razeni, setRazeni] = useState<Razeni>('utrata');
  const [detailId, setDetailId] = useState<string | null>(null);

  const nacti = useCallback(async () => {
    const res = await fetch('/api/prehled/klienti');
    const json = (await res.json()) as {
      ok?: boolean;
      karty?: KartaUi[];
      pravidla?: KlubPravidla;
      utrataCeka?: UtrataCekaPolozka[];
    };
    if (json.ok) {
      setKarty(json.karty || []);
      setUtrataCeka(json.utrataCeka || []);
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

  async function nahledXlsx(file: File) {
    const form = new FormData();
    form.set('akce', 'import-nahled');
    form.set('soubor', file);
    const res = await fetch('/api/prehled/klienti', { method: 'POST', body: form });
    const json = (await res.json()) as { ok?: boolean; nahled?: NahledXlsx };
    if (json.ok && json.nahled) {
      setNahledImport(json.nahled);
      setHlaska(`Náhled xlsx: ${json.nahled.souhrn.length} hostů. Zápis až po potvrzení.`);
    } else {
      setHlaska('Náhled xlsx se nepovedl.');
    }
  }

  async function potvrdImport() {
    if (!nahledImport) return;
    const res = await fetch('/api/prehled/klienti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce: 'import-potvrdit', nahled: nahledImport }),
    });
    const json = (await res.json()) as { ok?: boolean; zapsano?: number };
    if (json.ok) {
      setHlaska(`Import zapsán: ${json.zapsano || 0}.`);
      setNahledImport(null);
      await nacti();
    } else {
      setHlaska('Import se nezapsal (klub vypnutý?).');
    }
  }

  async function nactiNahledBhPrime() {
    const res = await fetch('/api/prehled/klienti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce: 'import-bh-prime-nahled' }),
    });
    const json = (await res.json()) as { ok?: boolean; nahled?: ImportBhNahled };
    if (json.ok && json.nahled) {
      setNahledBh(json.nahled);
      setHlaska(
        `Náhled BH CSV: ${json.nahled.souhrn.length} souhrnů, ${json.nahled.kontrola.length} k kontrole. Zápis až po potvrzení.`,
      );
    } else {
      setHlaska('Náhled BH CSV se nepovedl.');
    }
  }

  async function nahledBhCsv(file: File) {
    const form = new FormData();
    form.set('akce', 'import-bh-csv-nahled');
    form.set('soubor', file);
    const res = await fetch('/api/prehled/klienti', { method: 'POST', body: form });
    const json = (await res.json()) as { ok?: boolean; nahled?: ImportBhNahled };
    if (json.ok && json.nahled) {
      setNahledBh(json.nahled);
      setHlaska(
        `Náhled z nahraného CSV: ${json.nahled.souhrn.length} souhrnů. Zápis až po potvrzení.`,
      );
    } else {
      setHlaska('Náhled CSV se nepovedl.');
    }
  }

  async function potvrdBhCsv() {
    if (!nahledBh) return;
    const res = await fetch('/api/prehled/klienti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce: 'import-bh-csv-potvrdit', nahled: nahledBh }),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      zapsano?: number;
      ceka?: number;
      firmy?: number;
    };
    if (json.ok) {
      setHlaska(
        `BH import zapsán: ${json.zapsano || 0} karet, ${json.firmy || 0} firem, ${json.ceka || 0} čekajících.`,
      );
      setNahledBh(null);
      await nacti();
    } else {
      setHlaska('BH import se nezapsal (klub vypnutý?).');
    }
  }

  async function spojitCeka(cekaId: string) {
    const klientId = spojVyber[cekaId];
    if (!klientId) {
      setHlaska('Vyberte kartu ke spojení.');
      return;
    }
    const res = await fetch('/api/prehled/klienti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce: 'utrata-ceka-spojit', cekaId, klientId }),
    });
    const json = (await res.json()) as { ok?: boolean; castka?: number };
    if (json.ok) {
      setHlaska(`Spojeno: ${kc(json.castka || 0)}.`);
      await nacti();
    } else {
      setHlaska('Spojení se nepovedlo (klub vypnutý?).');
    }
  }

  async function utrataRucne() {
    const res = await fetch('/api/prehled/klienti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        akce: 'utrata-rucne',
        id: utrataId,
        castka: Number(utrataCastka),
        poznamka: utrataPozn || 'ruční',
      }),
    });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) {
      setHlaska('Útrata doplněna.');
      setUtrataCastka('');
      setUtrataPozn('');
      await nacti();
    } else {
      setHlaska('Útrata se neuložila.');
    }
  }

  const bhPriradit = nahledBh?.souhrn.filter((s) => s.akce === 'priradit') || [];
  const bhFirmy = nahledBh?.souhrn.filter((s) => s.akce === 'firma') || [];
  const bhCeka = nahledBh?.cekajici || [];

  const q = hledat.trim().toLowerCase();
  const filtrovane = karty
    .filter((k) => {
      if (!q) return true;
      const blob = [
        k.jmeno,
        k.prijmeni,
        k.email,
        k.telefon,
        k.firmaNazev,
        k.kod,
        k.urovenNazev,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    })
    .slice()
    .sort((a, b) => {
      if (razeni === 'utrata') return (b.utrataKc || 0) - (a.utrataKc || 0);
      if (razeni === 'uroven') return (b.slevaPct || 0) - (a.slevaPct || 0);
      const ap = a.pristiPobyt || 'zzzz';
      const bp = b.pristiPobyt || 'zzzz';
      return ap.localeCompare(bp, 'cs');
    });
  const detail = detailId ? karty.find((k) => k.id === detailId) || null : null;

  return (
    <main className="ph" style={{ padding: '1rem', maxWidth: 720, margin: '0 auto' }}>
      <p>
        <Link href="/prehled" style={{ color: '#c9a84c' }}>
          ← Zpět do přehledu
        </Link>
      </p>
      <h1 style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>Klienti</h1>
      <p style={{ color: '#b7aa98', fontSize: '0.9rem' }}>
        Útrata, import BH, párování. Hostům se nic nemění, dokud není klub zapnutý.
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
              Sleva úrovně od:{' '}
              {pravidla.slevaUrovneOd === 'po-prvnim-odjezdu'
                ? 'po prvním odjezdu'
                : 'od první poptávky'}
              . Rezervované kódy: {pravidla.rezervovaneKody.join(', ')}.
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

      <section style={{ marginBottom: '1.4rem' }}>
        <h2 style={{ fontSize: '1rem' }}>Ruční útrata</h2>
        <div style={{ display: 'grid', gap: 8, color: '#efe6d8', fontSize: '0.9rem' }}>
          <label>
            Klient{' '}
            <select
              value={utrataId}
              onChange={(e) => setUtrataId(e.target.value)}
              style={{ ...inp, width: '100%', maxWidth: 320 }}
            >
              <option value="">vyberte</option>
              {karty.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.jmeno} {k.prijmeni} · {k.kod}
                </option>
              ))}
            </select>
          </label>
          <label>
            Částka Kč{' '}
            <input
              value={utrataCastka}
              onChange={(e) => setUtrataCastka(e.target.value)}
              style={inp}
            />
          </label>
          <label>
            Poznámka{' '}
            <input
              value={utrataPozn}
              onChange={(e) => setUtrataPozn(e.target.value)}
              style={{ ...inp, width: 180 }}
            />
          </label>
          <button type="button" onClick={() => void utrataRucne()} style={btn}>
            Připsat útratu
          </button>
        </div>
      </section>

      <section style={{ marginBottom: '1.4rem' }}>
        <h2 style={{ fontSize: '1rem' }}>Import útraty BH přímé (CSV)</h2>
        <p style={{ color: '#b7aa98', fontSize: '0.85rem' }}>
          Export přímých rezervací. Všechny jako zaplacené. Anna / firmy / kontrola /
          čekající. Nejdřív náhled, zápis až po potvrzení.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={() => void nactiNahledBhPrime()} style={btn}>
            Náhled exportu 25. 11.
          </button>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void nahledBhCsv(f);
            }}
          />
        </div>
        {nahledBh ? (
          <div style={{ marginTop: 12, color: '#efe6d8', fontSize: '0.9rem' }}>
            <p style={{ color: '#b7aa98', fontSize: '0.82rem' }}>
              <span style={{ color: '#e09a3e' }}>■ započteno</span>
              {' · '}
              <span style={{ color: '#7eb8d8' }}>■ čeká po odjezdu</span>
            </p>
            <p style={{ color: '#c9a84c', marginBottom: 6 }}>
              Přiřadit teď ({bhPriradit.length})
            </p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {bhPriradit.map((s) => (
                <li key={`p-${s.host}-${s.rezervace.join('-')}`} style={{ marginBottom: 10 }}>
                  <strong>{s.host}</strong> · {s.pocet} pobytů · započteno {kc(s.utrata)}
                  {s.utrataCeka > 0 ? ` · čeká ${kc(s.utrataCeka)}` : ''} · {s.uroven}
                  <ul style={{ listStyle: 'none', padding: 0, marginTop: 6 }}>
                    {(s.pobyty || []).map((p) => (
                      <li
                        key={p.rezervace}
                        style={{
                          borderLeft: `3px solid ${p.stavUtraty === 'ceka' ? '#7eb8d8' : '#e09a3e'}`,
                          background:
                            p.stavUtraty === 'ceka'
                              ? 'rgba(126, 184, 216, 0.12)'
                              : 'rgba(224, 154, 62, 0.12)',
                          padding: '0.35rem 0.5rem',
                          marginBottom: 4,
                          borderRadius: 6,
                          fontSize: '0.82rem',
                        }}
                      >
                        rez. {p.rezervace} · {p.castka > 0 ? kc(p.castka) : '—'} ·{' '}
                        {p.stavUtraty === 'ceka'
                          ? 'čeká, započítá se po odjezdu'
                          : p.popisek || 'započteno'}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p style={{ color: '#c9a84c', marginBottom: 6 }}>Firmy ({bhFirmy.length})</p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {bhFirmy.map((s) => (
                <li key={`f-${s.host}`} style={{ marginBottom: 10 }}>
                  <strong>{s.host}</strong> · {s.pocet} pobytů · započteno {kc(s.utrata)}
                  {s.utrataCeka > 0 ? ` · čeká ${kc(s.utrataCeka)}` : ''} · {s.uroven}
                  <ul style={{ listStyle: 'none', padding: 0, marginTop: 6 }}>
                    {(s.pobyty || []).map((p) => (
                      <li
                        key={p.rezervace}
                        style={{
                          borderLeft: `3px solid ${p.stavUtraty === 'ceka' ? '#7eb8d8' : '#e09a3e'}`,
                          background:
                            p.stavUtraty === 'ceka'
                              ? 'rgba(126, 184, 216, 0.12)'
                              : 'rgba(224, 154, 62, 0.12)',
                          padding: '0.35rem 0.5rem',
                          marginBottom: 4,
                          borderRadius: 6,
                          fontSize: '0.82rem',
                        }}
                      >
                        rez. {p.rezervace} · {p.castka > 0 ? kc(p.castka) : '—'} ·{' '}
                        {p.stavUtraty === 'ceka'
                          ? 'čeká, započítá se po odjezdu'
                          : p.popisek || 'započteno'}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p style={{ color: '#c9a84c', marginBottom: 6 }}>
              Čekající na kartu ({bhCeka.length})
            </p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {bhCeka.map((s) => (
                <li key={`c-${s.host}-${s.rezervace.join('-')}`} style={{ marginBottom: 10 }}>
                  <strong>{s.host}</strong> · {s.pocet} pobytů · započteno {kc(s.utrata)}
                  {s.utrataCeka > 0 ? ` · čeká ${kc(s.utrataCeka)}` : ''} · {s.uroven}
                  <ul style={{ listStyle: 'none', padding: 0, marginTop: 6 }}>
                    {(s.pobyty || []).map((p) => (
                      <li
                        key={p.rezervace}
                        style={{
                          borderLeft: `3px solid ${p.stavUtraty === 'ceka' ? '#7eb8d8' : '#e09a3e'}`,
                          background:
                            p.stavUtraty === 'ceka'
                              ? 'rgba(126, 184, 216, 0.12)'
                              : 'rgba(224, 154, 62, 0.12)',
                          padding: '0.35rem 0.5rem',
                          marginBottom: 4,
                          borderRadius: 6,
                          fontSize: '0.82rem',
                        }}
                      >
                        rez. {p.rezervace} · {p.castka > 0 ? kc(p.castka) : '—'} ·{' '}
                        {p.stavUtraty === 'ceka'
                          ? 'čeká, započítá se po odjezdu'
                          : p.popisek || 'započteno'}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p style={{ color: '#c9a84c', marginBottom: 6 }}>
              K ruční kontrole ({nahledBh.kontrola.length})
            </p>
            <ul>
              {nahledBh.kontrola.map((r) => (
                <li key={`k-${r.rezervace}`}>
                  {r.oznaceni || r.cilJmeno || r.rezervace} · {kc(r.castka)} · {r.duvod}
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => void potvrdBhCsv()} style={btn}>
              Potvrdit zápis BH CSV
            </button>
          </div>
        ) : null}
      </section>

      {utrataCeka.length ? (
        <section style={{ marginBottom: '1.4rem' }}>
          <h2 style={{ fontSize: '1rem' }}>Čekající útrata ({utrataCeka.length})</h2>
          <p style={{ color: '#b7aa98', fontSize: '0.85rem' }}>
            Při nejistotě spojte s kartou ručně.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {utrataCeka.map((u) => (
              <li
                key={u.id}
                style={{
                  borderBottom: '1px solid #3d342a',
                  padding: '0.65rem 0',
                  color: '#efe6d8',
                  fontSize: '0.9rem',
                }}
              >
                <strong>{u.jmenoZobrazeni}</strong> · {kc(u.castka)}
                <br />
                <span style={{ color: '#b7aa98', fontSize: '0.82rem' }}>
                  rez. {u.rezervace.join(', ')}
                </span>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginTop: 8,
                    alignItems: 'center',
                  }}
                >
                  <select
                    value={spojVyber[u.id] || ''}
                    onChange={(e) =>
                      setSpojVyber((prev) => ({ ...prev, [u.id]: e.target.value }))
                    }
                    style={{ ...inp, width: '100%', maxWidth: 260 }}
                  >
                    <option value="">karta…</option>
                    {karty.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.jmeno} {k.prijmeni} · {k.kod}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => void spojitCeka(u.id)} style={btn}>
                    Spojit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section style={{ marginBottom: '1.4rem' }}>
        <h2 style={{ fontSize: '1rem' }}>Import útraty z BH (xlsx)</h2>
        <p style={{ color: '#b7aa98', fontSize: '0.85rem' }}>
          Jen řádky bez agentury / přímé. Nejdřív náhled, zápis až po potvrzení.
        </p>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void nahledXlsx(f);
          }}
        />
        {nahledImport ? (
          <div style={{ marginTop: 12, color: '#efe6d8', fontSize: '0.9rem' }}>
            <p>Co by se připsalo:</p>
            <ul>
              {nahledImport.souhrn.map((s) => (
                <li key={s.host}>
                  {s.host} · {s.pocet} pobytů · {s.utrata} Kč · {s.uroven}
                </li>
              ))}
            </ul>
            <p>Přímí hosté (poděkování):</p>
            <ul>
              {nahledImport.primaHoste.map((h) => (
                <li key={`${h.jmeno}-${h.email}`}>
                  {h.jmeno}
                  {h.email ? ` · ${h.email}` : ''}
                  {h.telefon ? ` · ${h.telefon}` : ''} · {h.utrata} Kč
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => void potvrdImport()} style={btn}>
              Potvrdit zápis
            </button>
          </div>
        ) : null}
      </section>

      <section>
        <h2 style={{ fontSize: '1rem', color: '#c9a84c' }}>
          Moji klienti ({filtrovane.length})
        </h2>
        <p style={{ color: '#b7aa98', fontSize: '0.85rem' }}>
          Oranžová = započtená útrata. Modrá = čeká po odjezdu. Kliknutím detail a karta
          hosta.
        </p>
        <input
          value={hledat}
          onChange={(e) => setHledat(e.target.value)}
          placeholder="Hledat jméno, telefon, e-mail, firmu…"
          style={{ ...inp, width: '100%', maxWidth: 420, marginLeft: 0, marginBottom: 10 }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {(
            [
              ['utrata', 'Podle útraty'],
              ['uroven', 'Podle úrovně'],
              ['pristi', 'Podle příštího pobytu'],
            ] as const
          ).map(([id, pop]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRazeni(id)}
              style={{
                ...btn,
                background: razeni === id ? '#c9a84c' : '#2a231c',
                color: razeni === id ? '#1a1510' : '#cfc5b0',
              }}
            >
              {pop}
            </button>
          ))}
        </div>

        {detail ? (
          <div
            style={{
              border: '1px solid #3d342a',
              borderRadius: 14,
              padding: '0.9rem 1rem',
              marginBottom: 14,
              background: '#15110e',
              color: '#efe6d8',
            }}
          >
            <p style={{ marginTop: 0 }}>
              <strong>
                {detail.firmaNazev || `${detail.jmeno} ${detail.prijmeni}`.trim()}
              </strong>
              {detail.praveBydli ? (
                <span style={{ color: '#7fb8e6', marginLeft: 8 }}>právě bydlí</span>
              ) : null}
            </p>
            <p style={{ fontSize: '0.9rem', color: '#b7aa98' }}>
              {detail.urovenNazev} · sleva {detail.slevaPct} %
              <br />
              <span style={{ color: '#e09a3e' }}>útrata {kc(detail.utrataKc)}</span>
              {(detail.utrataCekaKc || 0) > 0 ? (
                <>
                  {' · '}
                  <span style={{ color: '#7eb8d8' }}>
                    čeká {kc(detail.utrataCekaKc || 0)}
                  </span>
                </>
              ) : null}
              <br />
              kredit {kc(detail.kreditKc)} · {detail.pocetPobytu || 0} pobytů
              <br />
              poslední: {detail.posledniPobyt || '—'} · příští:{' '}
              {detail.pristiPobyt || '—'}
              {detail.telefon ? (
                <>
                  <br />
                  {detail.telefon}
                </>
              ) : null}
              {detail.email ? (
                <>
                  <br />
                  {detail.email}
                </>
              ) : null}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {detail.tajnyKlic ? (
                <a
                  href={`/klub?k=${encodeURIComponent(detail.tajnyKlic)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...btn, textDecoration: 'none', display: 'inline-block' }}
                >
                  Zobrazit kartu jako host
                </a>
              ) : null}
              <button type="button" onClick={() => setDetailId(null)} style={{ ...btn, background: '#2a231c', color: '#cfc5b0' }}>
                Zavřít detail
              </button>
            </div>
          </div>
        ) : null}

        {!filtrovane.length ? (
          <p style={{ color: '#b7aa98' }}>Nikdo v seznamu neodpovídá hledání.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {filtrovane.map((k) => (
              <li key={k.id} style={{ borderBottom: '1px solid #3d342a', padding: '0.7rem 0' }}>
                <button
                  type="button"
                  onClick={() => setDetailId(k.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 0,
                    padding: 0,
                    color: '#efe6d8',
                    cursor: 'pointer',
                    font: 'inherit',
                  }}
                >
                  <strong>
                    {k.firmaNazev || `${k.jmeno} ${k.prijmeni}`.trim()}
                  </strong>
                  {k.praveBydli ? (
                    <span style={{ color: '#7fb8e6', marginLeft: 8, fontSize: '0.8rem' }}>
                      právě bydlí
                    </span>
                  ) : null}
                  <br />
                  <span style={{ fontSize: '0.85rem', color: '#b7aa98' }}>
                    {k.urovenNazev} · sleva {k.slevaPct} % · {k.pocetPobytu || 0} pobytů
                    <br />
                    <span style={{ color: '#e09a3e' }}>{kc(k.utrataKc)}</span>
                    {(k.utrataCekaKc || 0) > 0 ? (
                      <>
                        {' · '}
                        <span style={{ color: '#7eb8d8' }}>čeká {kc(k.utrataCekaKc || 0)}</span>
                      </>
                    ) : null}
                    {' · '}
                    kredit {kc(k.kreditKc)}
                    <br />
                    posl. {k.posledniPobyt || '—'} · příští {k.pristiPobyt || '—'}
                  </span>
                </button>
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
