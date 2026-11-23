'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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

type DenRadku = {
  ymd: string;
  plno: boolean;
  cenaOd: number | null;
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

function nazevMesice(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, 1),
  );
}

function weekdayMon0(d: Date): number {
  return (d.getDay() + 6) % 7;
}

const DNY_HLAV = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

export function KalendarPrehled() {
  const [otevreno, setOtevreno] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [mesice, setMesice] = useState<Mesic[]>([]);
  const [stari, setStari] = useState(false);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [cekam, setCekam] = useState(false);
  const [vybranyMesic, setVybranyMesic] = useState<string | null>(null);
  const [dnyMesice, setDnyMesice] = useState<DenRadku[]>([]);
  const [cekamMesic, setCekamMesic] = useState(false);

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
    if (!otevreno) return;
    void nacti();
  }, [otevreno, nacti]);

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
        if (vybranyMesic) await nactiDny(vybranyMesic);
      }
    } finally {
      setCekam(false);
    }
  }

  async function nactiDny(mesic: string) {
    setCekamMesic(true);
    try {
      const res = await fetch(`/api/prehled/kalendar?mesic=${encodeURIComponent(mesic)}`, {
        cache: 'no-store',
      });
      const json = (await res.json()) as {
        ok?: boolean;
        dny?: DenRadku[];
        error?: string;
      };
      if (!json.ok) {
        setHlaska(json.error || 'Dny se nenačetly.');
        setDnyMesice([]);
        return;
      }
      setDnyMesice(json.dny || []);
    } finally {
      setCekamMesic(false);
    }
  }

  async function otevriMesic(mesic: string) {
    if (vybranyMesic === mesic) {
      setVybranyMesic(null);
      setDnyMesice([]);
      return;
    }
    setVybranyMesic(mesic);
    await nactiDny(mesic);
  }

  const bunky = useMemo(() => {
    if (!vybranyMesic) return [] as ({ ymd: string; day: number; plno: boolean; cenaOd: number | null } | null)[];
    const [y, m] = vybranyMesic.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const pad = weekdayMon0(first);
    const daysInMonth = new Date(y, m, 0).getDate();
    const mapa = new Map(dnyMesice.map((d) => [d.ymd, d]));
    const cells: ({ ymd: string; day: number; plno: boolean; cenaOd: number | null } | null)[] = [];
    for (let i = 0; i < pad; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const mm = String(m).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const ymd = `${y}-${mm}-${dd}`;
      const info = mapa.get(ymd);
      cells.push({
        ymd,
        day,
        plno: Boolean(info?.plno),
        cenaOd: info?.cenaOd ?? null,
      });
    }
    return cells;
  }, [vybranyMesic, dnyMesice]);

  return (
    <section className={`ph-kalendar${otevreno ? ' is-open' : ''}`}>
      <button
        type="button"
        className="ph-kalendar__hlavicka"
        aria-expanded={otevreno}
        onClick={() => setOtevreno((v) => !v)}
      >
        <span>Kalendář</span>
        <span className="ph-kalendar__sipka" aria-hidden="true">
          {otevreno ? '▴' : '▾'}
        </span>
      </button>

      {otevreno ? (
        <div className="ph-kalendar__telo">
          <label className="ph-kalendar__check">
            <input
              type="checkbox"
              checked={meta?.cenyZapnuto !== false}
              disabled={cekam || !meta}
              onChange={(e) => void prepniCeny(e.target.checked)}
            />
            Zobrazovat ceny v poptávce
          </label>
          <p className="ph-kalendar__meta">
            Zdroj cen: {meta?.zdrojCen === 'bh-api' ? 'Better Hotel API (neaktivní)' : 'Nahrané xlsx'}
          </p>
          <p className="ph-kalendar__meta">Ceny nahrány: {formatCas(meta?.cenyNahrano || null)}</p>
          <p className="ph-kalendar__meta">
            Obsazenost nahrána: {formatCas(meta?.obsazenostNahrano || null)}
          </p>
          <p className="ph-kalendar__meta">
            Rezervace z průvodce: poslední přišla {formatCas(meta?.posledniRezervace || null)}
          </p>
          {stari ? (
            <p className="ph-kalendar__varovani">
              Tabulka obsazenosti je starší než 3 dny. Nahrajte nový xlsx.
            </p>
          ) : null}
          <label className="ph-btn ph-kalendar__nahrat">
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
          {hlaska ? <p className="ph-kalendar__hlaska">{hlaska}</p> : null}

          {mesice.length ? (
            <div className="ph-kalendar__tabulka">
              <table>
                <thead>
                  <tr>
                    <th align="left">Měsíc</th>
                    <th align="right">Cena od</th>
                    <th align="right">Cena do</th>
                    <th align="right">Plných dnů</th>
                  </tr>
                </thead>
                <tbody>
                  {mesice.map((m) => {
                    const on = vybranyMesic === m.mesic;
                    return (
                      <tr key={m.mesic} className={on ? 'is-on' : undefined}>
                        <td>
                          <button
                            type="button"
                            className="ph-kalendar__mesic-btn"
                            aria-expanded={on}
                            onClick={() => void otevriMesic(m.mesic)}
                          >
                            {nazevMesice(m.mesic)}
                            <span aria-hidden="true">{on ? ' ▴' : ' ▾'}</span>
                          </button>
                        </td>
                        <td align="right">{m.od ?? '—'}</td>
                        <td align="right">{m.do ?? '—'}</td>
                        <td align="right">
                          {m.plnych} / {m.dni}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ph-kalendar__prazdno">
              Zatím žádná nahraná data. Nahrajte xlsx s cenami a obsazeností.
            </p>
          )}

          {vybranyMesic ? (
            <div className="ph-kalendar__dny-box">
              <p className="ph-kalendar__dny-nadpis">{nazevMesice(vybranyMesic)}</p>
              {cekamMesic ? (
                <p className="ph-kalendar__meta">Načítám dny…</p>
              ) : (
                <div className="ph-kalendar__dny">
                  {DNY_HLAV.map((d) => (
                    <span key={d} className="ph-kalendar__den-nazev">
                      {d}
                    </span>
                  ))}
                  {bunky.map((c, i) =>
                    c ? (
                      <div
                        key={c.ymd}
                        className={`ph-kalendar__den${c.plno ? ' is-plno' : ''}`}
                      >
                        <span className={c.plno ? 'is-skrt' : undefined}>{c.day}</span>
                        {c.plno ? (
                          <small>plno</small>
                        ) : c.cenaOd != null ? (
                          <small>{c.cenaOd}</small>
                        ) : (
                          <small>—</small>
                        )}
                      </div>
                    ) : (
                      <span key={`e-${i}`} className="ph-kalendar__den is-empty" />
                    ),
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
