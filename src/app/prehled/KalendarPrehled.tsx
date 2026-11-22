'use client';

import { useCallback, useEffect, useState } from 'react';

type Meta = {
  cenyNahrano: string | null;
  obsazenostNahrano: string | null;
  cenyZapnuto: boolean;
  zdrojCen: string;
  posledniRezervace: string | null;
};

type Mesic = {
  mesic: string;
  od: number | null;
  do: number | null;
  plnych: number;
  dni: number;
};

function formatCas(iso: string | null): string {
  if (!iso) return 'ještě ne';
  try {
    return new Intl.DateTimeFormat('cs-CZ', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Europe/Prague',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function KalendarPrehled() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [mesice, setMesice] = useState<Mesic[]>([]);
  const [stari, setStari] = useState(false);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [cekam, setCekam] = useState(false);

  const nacti = useCallback(async () => {
    const res = await fetch('/api/prehled/kalendar', { cache: 'no-store' });
    const json = (await res.json()) as {
      ok?: boolean;
      meta?: Meta;
      mesice?: Mesic[];
      stariObsazenost?: boolean;
      error?: string;
    };
    if (!json.ok) {
      setHlaska(json.error || 'Kalendář se nenačetl.');
      return;
    }
    setMeta(json.meta || null);
    setMesice(json.mesice || []);
    setStari(Boolean(json.stariObsazenost));
  }, []);

  useEffect(() => {
    void nacti();
  }, [nacti]);

  async function prepniCeny(zap: boolean) {
    setCekam(true);
    setHlaska(null);
    try {
      const res = await fetch('/api/prehled/kalendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cenyZapnuto: zap }),
      });
      const json = (await res.json()) as { ok?: boolean; meta?: Meta; error?: string };
      if (!json.ok) setHlaska(json.error || 'Neuloženo.');
      else {
        setMeta(json.meta || null);
        setHlaska(zap ? 'Ceny v poptávce zapnuté.' : 'Ceny v poptávce vypnuté.');
      }
    } finally {
      setCekam(false);
    }
  }

  async function nahraj(file: File) {
    setCekam(true);
    setHlaska(null);
    try {
      const fd = new FormData();
      fd.set('soubor', file);
      const res = await fetch('/api/prehled/kalendar', { method: 'POST', body: fd });
      const json = (await res.json()) as { ok?: boolean; druh?: string; error?: string };
      if (!json.ok) setHlaska(json.error || 'Nahrání selhalo.');
      else {
        setHlaska(json.druh === 'ceny' ? 'Ceny nahrané.' : 'Obsazenost nahraná.');
        await nacti();
      }
    } finally {
      setCekam(false);
    }
  }

  return (
    <section className="ph-kalendar" style={{ margin: '1.25rem 0', padding: '1rem', border: '1px solid #3d342a', borderRadius: 12 }}>
      <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: '#c9a84c' }}>Kalendář a ceny</h2>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          type="checkbox"
          checked={meta?.cenyZapnuto !== false}
          disabled={cekam || !meta}
          onChange={(e) => void prepniCeny(e.target.checked)}
        />
        Zobrazovat ceny v poptávce
      </label>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#cbbba8' }}>
        Zdroj cen: {meta?.zdrojCen === 'bh-api' ? 'Better Hotel API (neaktivní)' : 'Nahrané xlsx'}
      </p>
      <p style={{ margin: '0 0 0.35rem', fontSize: '0.85rem', color: '#cbbba8' }}>
        Ceny nahrány: {formatCas(meta?.cenyNahrano || null)}
      </p>
      <p style={{ margin: '0 0 0.35rem', fontSize: '0.85rem', color: '#cbbba8' }}>
        Obsazenost nahrána: {formatCas(meta?.obsazenostNahrano || null)}
      </p>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#cbbba8' }}>
        Rezervace z průvodce: poslední přišla {formatCas(meta?.posledniRezervace || null)}
      </p>
      {stari ? (
        <p style={{ margin: '0 0 0.75rem', color: '#e8a070', fontSize: '0.85rem' }}>
          Tabulka obsazenosti je starší než 3 dny. Nahrajte nový xlsx.
        </p>
      ) : null}
      <label className="ph-btn" style={{ display: 'inline-block', cursor: 'pointer', marginBottom: '0.75rem' }}>
        Nahrát xlsx
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
          disabled={cekam}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void nahraj(f);
            e.target.value = '';
          }}
        />
      </label>
      {hlaska ? <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>{hlaska}</p> : null}
      {mesice.length ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">Měsíc</th>
                <th align="right">Cena od</th>
                <th align="right">Cena do</th>
                <th align="right">Plných dnů</th>
              </tr>
            </thead>
            <tbody>
              {mesice.map((m) => (
                <tr key={m.mesic}>
                  <td>{m.mesic}</td>
                  <td align="right">{m.od ?? '—'}</td>
                  <td align="right">{m.do ?? '—'}</td>
                  <td align="right">
                    {m.plnych} / {m.dni}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ fontSize: '0.85rem', color: '#a09080' }}>Zatím žádná nahraná data. Nahrajte xlsx s cenami a obsazeností.</p>
      )}
    </section>
  );
}
