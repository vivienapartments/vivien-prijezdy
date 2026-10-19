'use client';

import { useState } from 'react';
import { nazevDluhu, textRozpisu, type DruhDluhu } from '@/lib/odjezd';
import type { PrehledRadek } from '@/lib/prehled';
import type { JakPlatby, PlatbaPolozky } from '@/lib/store';
import {
  formatKc,
  hledejHosty,
  jeVNedoplatcich,
  seradNedoplatky,
  textHromadne,
  type FiltrHledani,
  type Zalozka,
} from '@/lib/zalozky';

const JAKY: { id: JakPlatby; text: string }[] = [
  { id: 'hotove', text: 'hotově' },
  { id: 'karta', text: 'kartou' },
  { id: 'prevod', text: 'převodem' },
  { id: 'cena', text: 'v ceně rezervace' },
];

const FILTRY: { id: FiltrHledani; text: string }[] = [
  { id: 'dnes', text: 'Dnes' },
  { id: 'zitra', text: 'Zítra' },
  { id: 'tyden', text: 'Tento týden' },
  { id: 'minule', text: 'Minulé' },
  { id: 'dluh', text: 'S nedoplatkem' },
];

function denKratce(ymd: string | null): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '';
  const [, m, d] = ymd.split('-');
  return `${Number(d)}. ${Number(m)}.`;
}

function nezaplacene(row: PrehledRadek): { druh: DruhDluhu; kc: number; nazev: string }[] {
  const platby = new Set((row.platby || []).map((p) => p.druh));
  const polozky = row.dluhPolozky || [];
  if (row.zaplaceno && platby.size === 0) return [];
  return polozky.filter((p) => !platby.has(p.druh));
}

function kcRadku(row: PrehledRadek): number {
  return nezaplacene(row).reduce((s, p) => s + p.kc, 0);
}

export function RadaZalozek({
  zalozka,
  pocty,
  nove,
  onZmena,
}: {
  zalozka: Zalozka;
  pocty: Record<Zalozka, number>;
  nove: Record<Zalozka, boolean>;
  onZmena: (z: Zalozka) => void;
}) {
  const polozky: { id: Zalozka; text: string }[] = [
    { id: 'prijezdy', text: 'Příjezdy' },
    { id: 'dnes', text: 'Dnešek' },
    { id: 'dluhy', text: 'Nedoplatky' },
    { id: 'hledat', text: 'Hledat' },
  ];
  return (
    <div className="ph-zalozky" role="tablist">
      {polozky.map((p) => {
        const cislo = pocty[p.id];
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={zalozka === p.id}
            className={zalozka === p.id ? 'is-on' : nove[p.id] ? 'is-nove' : undefined}
            onClick={() => onZmena(p.id)}
          >
            {p.text}
            {cislo > 0 ? ` ${cislo}` : ''}
          </button>
        );
      })}
    </div>
  );
}

export function Nedoplatky({
  radky,
  dnes,
  ukazka,
  onOtevri,
  onPlatby,
}: {
  radky: PrehledRadek[];
  dnes: string;
  ukazka: boolean;
  onOtevri: (id: string) => void;
  onPlatby: (id: string, platby: PlatbaPolozky[], zaplaceno: string | null, dluh: string) => void;
}) {
  const [vybrane, setVybrane] = useState<Record<string, boolean>>({});
  const [ptam, setPtam] = useState<{ id: string; druh: DruhDluhu | 'vse' } | null>(null);
  const [kdo, setKdo] = useState<'pravoslav' | 'nikol' | null>(null);
  const [hromadne, setHromadne] = useState(false);
  const [chyba, setChyba] = useState('');
  const [vratit, setVratit] = useState<{ id: string; druh: DruhDluhu | 'vse' } | null>(null);

  const dluhy = seradNedoplatky(
    radky
      .filter((r) => !r.nelzeNacist && jeVNedoplatcich({ prijezd: r.prijezd, odjezd: r.odjezd, stav: r.stav }, dnes) && kcRadku(r) > 0)
      .map((r) => ({ row: r, odjezd: r.odjezd, prijezd: r.prijezd, kc: kcRadku(r) })),
    dnes,
  );
  const zaskrtnute = dluhy.filter((d) => vybrane[d.row.rezervace]);
  const soucet = zaskrtnute.reduce((s, d) => s + d.kc, 0);

  async function uloz(id: string, druh: DruhDluhu | 'vse', jak: JakPlatby, clovek: 'pravoslav' | 'nikol') {
    setChyba('');
    const row = radky.find((r) => r.rezervace === id);
    if (!row) return;
    if (ukazka) {
      const nove = nezaplacene(row).filter((p) => druh === 'vse' || p.druh === druh);
      const platby = [
        ...(row.platby || []),
        ...nove.map((p) => ({ druh: p.druh, kc: p.kc, jak, kdo: clovek, kdy: new Date().toISOString() })),
      ];
      const zbyva = (row.dluhPolozky || []).filter((p) => !platby.some((x) => x.druh === p.druh));
      onPlatby(id, platby, zbyva.length ? row.zaplaceno : new Date().toISOString(), textRozpisu(zbyva));
      setVratit({ id, druh });
      setPtam(null);
      setKdo(null);
      return;
    }
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: id, akce: 'platba', druh, jak, kdo: clovek }),
    });
    const json = (await res.json().catch(() => null)) as { platby?: PlatbaPolozky[]; zaplaceno?: string | null; dluh?: string; error?: string } | null;
    if (!res.ok || !json) {
      setChyba(json?.error || 'Platbu se nepodařilo zapsat.');
      return;
    }
    onPlatby(id, json.platby || [], json.zaplaceno ?? null, json.dluh || '');
    setVratit({ id, druh });
    setPtam(null);
    setKdo(null);
  }

  async function vrat(id: string, druh: DruhDluhu | 'vse') {
    setChyba('');
    const row = radky.find((r) => r.rezervace === id);
    if (!row) return;
    if (ukazka) {
      const platby = druh === 'vse' ? [] : (row.platby || []).filter((p) => p.druh !== druh);
      const zbyva = (row.dluhPolozky || []).filter((p) => !platby.some((x) => x.druh === p.druh));
      onPlatby(id, platby, zbyva.length ? null : row.zaplaceno, textRozpisu(zbyva));
      setVratit(null);
      return;
    }
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: id, akce: 'vratit-platbu', druh }),
    });
    const json = (await res.json().catch(() => null)) as { platby?: PlatbaPolozky[]; zaplaceno?: string | null; dluh?: string } | null;
    if (!res.ok || !json) {
      setChyba('Platbu se nepodařilo vrátit.');
      return;
    }
    onPlatby(id, json.platby || [], json.zaplaceno ?? null, json.dluh || '');
    setVratit(null);
  }

  async function hromadneZaplat(jak: JakPlatby, clovek: 'pravoslav' | 'nikol') {
    const ids = zaskrtnute.map((d) => d.row.rezervace);
    if (!ids.length) return;
    if (ukazka) {
      for (const id of ids) await uloz(id, 'vse', jak, clovek);
      setVybrane({});
      setHromadne(false);
      return;
    }
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce: 'platba-hromadne', ids, jak, kdo: clovek }),
    });
    if (!res.ok) {
      setChyba('Vybrané platby se nepodařilo zapsat.');
      return;
    }
    for (const id of ids) {
      const row = radky.find((r) => r.rezervace === id);
      if (!row) continue;
      const platby = (row.dluhPolozky || []).map((p) => ({
        druh: p.druh,
        kc: p.kc,
        jak,
        kdo: clovek,
        kdy: new Date().toISOString(),
      }));
      onPlatby(id, platby, new Date().toISOString(), '');
    }
    setVybrane({});
    setHromadne(false);
    setKdo(null);
  }

  if (!dluhy.length) return <p className="ph-prazdno">Žádné nedoplatky.</p>;

  return (
    <section className="ph-dluhy" aria-label="Nedoplatky">
      {chyba ? <p className="ph-chyba">{chyba}</p> : null}
      {vratit ? (
        <p className="ph-dnesek__akce">
          Zaplaceno.
          <button type="button" onClick={() => void vrat(vratit.id, vratit.druh)}>
            Vrátit platbu
          </button>
        </p>
      ) : null}
      <ul>
        {dluhy.map(({ row, kc }) => {
          const polozky = nezaplacene(row);
          return (
            <li key={row.rezervace}>
              <p>
                <input
                  type="checkbox"
                  checked={Boolean(vybrane[row.rezervace])}
                  onChange={(e) => setVybrane((s) => ({ ...s, [row.rezervace]: e.target.checked }))}
                  aria-label={row.jmeno || row.rezervace}
                />
                {' '}
                {row.apartman || 'bez apartmánu'}
                {' · '}
                <button type="button" className="ph-jmeno" onClick={() => onOtevri(row.rezervace)}>
                  {row.jmeno || 'Host'}
                </button>
                {' · '}
                {denKratce(row.prijezd)}–{denKratce(row.odjezd)}
                {' · '}
                {polozky.map((p) => `${p.nazev} ${formatKc(p.kc)}`).join(', ')}
                {' · '}
                <strong>{formatKc(kc)}</strong>
              </p>
              <p className="ph-dnesek__akce">
                {polozky.map((p) => (
                  <button key={p.druh} type="button" onClick={() => { setHromadne(false); setPtam({ id: row.rezervace, druh: p.druh }); setKdo(null); }}>
                    {nazevDluhu(p.druh)} zaplaceno
                  </button>
                ))}
                <button type="button" onClick={() => { setHromadne(false); setPtam({ id: row.rezervace, druh: 'vse' }); setKdo(null); }}>
                  Zaplaceno
                </button>
              </p>
              {ptam?.id === row.rezervace && !hromadne ? (
                <Volba
                  kdo={kdo}
                  onKdo={setKdo}
                  onJak={(jak) => kdo && void uloz(row.rezervace, ptam.druh, jak, kdo)}
                  onZavri={() => setPtam(null)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      {zaskrtnute.length ? (
        <p className="ph-dnesek__akce">
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(textHromadne(zaskrtnute.length, soucet))) return;
              setHromadne(true);
              setPtam(null);
              setKdo(null);
            }}
          >
            Označit vybrané jako zaplacené
          </button>
        </p>
      ) : null}
      {hromadne ? (
        <Volba
          kdo={kdo}
          onKdo={setKdo}
          onJak={(jak) => kdo && void hromadneZaplat(jak, kdo)}
          onZavri={() => setHromadne(false)}
        />
      ) : null}
    </section>
  );
}

function Volba({
  kdo,
  onKdo,
  onJak,
  onZavri,
}: {
  kdo: 'pravoslav' | 'nikol' | null;
  onKdo: (k: 'pravoslav' | 'nikol') => void;
  onJak: (jak: JakPlatby) => void;
  onZavri: () => void;
}) {
  return (
    <div className="ph-predano-dotaz">
      {kdo ? (
        <>
          <p>Jak bylo zaplaceno?</p>
          {JAKY.map((j) => (
            <button key={j.id} type="button" onClick={() => onJak(j.id)}>
              {j.text}
            </button>
          ))}
        </>
      ) : (
        <>
          <p>Kdo to zapsal?</p>
          <button type="button" onClick={() => onKdo('pravoslav')}>
            Pravoslav
          </button>
          <button type="button" onClick={() => onKdo('nikol')}>
            Nikol
          </button>
        </>
      )}
      <button type="button" onClick={onZavri}>
        Zrušit
      </button>
    </div>
  );
}

export function Hledani({
  radky,
  dnes,
  zitra,
  onOtevri,
  dotaz: dotazVenku,
  onDotaz,
  jenVysledky = false,
}: {
  radky: PrehledRadek[];
  dnes: string;
  zitra: string;
  onOtevri: (id: string) => void;
  /** Když je zvenku, hledání řídí rodič (pole nahoře v přehledu). */
  dotaz?: string;
  onDotaz?: (text: string) => void;
  /** Jen seznam výsledků, bez vlastního políčka. */
  jenVysledky?: boolean;
}) {
  const [dotazVnitrni, setDotazVnitrni] = useState('');
  const [filtr, setFiltr] = useState<FiltrHledani>('');
  const dotaz = dotazVenku ?? dotazVnitrni;
  const setDotaz = onDotaz ?? setDotazVnitrni;
  const hoste = radky
    .filter((r) => !r.nelzeNacist)
    .map((r) => ({
      rezervace: r.rezervace,
      jmeno: r.jmeno || '',
      apartman: r.apartman,
      prijezd: r.prijezd,
      odjezd: r.odjezd,
      stav: r.stav,
      dluhKc: jeVNedoplatcich({ prijezd: r.prijezd, odjezd: r.odjezd, stav: r.stav }, dnes) ? kcRadku(r) : 0,
    }));
  const nalezene = hledejHosty(hoste, dotaz, filtr, dnes, zitra);
  return (
    <section className="ph-hledat" aria-label="Hledat">
      {jenVysledky ? null : (
      <label>
        Hledat
        <input value={dotaz} onChange={(e) => setDotaz(e.target.value)} placeholder="jméno, číslo, apartmán nebo datum" />
      </label>
      )}
      <div className="ph-zalozky">
        {FILTRY.map((f) => (
          <button key={f.id} type="button" className={filtr === f.id ? 'is-on' : undefined} onClick={() => setFiltr((n) => (n === f.id ? '' : f.id))}>
            {f.text}
          </button>
        ))}
      </div>
      {dotaz || filtr ? (
        nalezene.length ? (
          <ul>
            {nalezene.map((h) => (
              <li key={h.rezervace} className={h.stav === 'zruseno' ? 'is-zruseno' : undefined}>
                <button type="button" className="ph-jmeno" onClick={() => onOtevri(h.rezervace)}>
                  {h.apartman || 'bez apartmánu'} · {h.jmeno || 'Host'} · {denKratce(h.prijezd)}–{denKratce(h.odjezd)}
                  {h.stav === 'zruseno' ? ' · zrušeno' : ''}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ph-prazdno">Nic tu není.</p>
        )
      ) : (
        <p className="ph-prazdno">Napište jméno, číslo rezervace, apartmán nebo datum.</p>
      )}
    </section>
  );
}
