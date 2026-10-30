'use client';

import { useEffect, useState } from 'react';
import {
  chybiCheckin,
  chybiTelefon,
  formatPrijezdDoplnit,
  hosteCoDoplnitFiltr,
  poctyStitkuDoplnit,
  zkratOdkaz,
  type FiltrDoplnit,
  type PoctyStitkuDoplnit,
} from '@/lib/co-doplnit';
import type { PrehledRadek } from '@/lib/prehled';

type Props = {
  radky: PrehledRadek[];
  dnes: string;
  odkazy: Record<string, string>;
  filtr: FiltrDoplnit;
  onFiltr: (f: FiltrDoplnit) => void;
  /** Zvýšení otevře sekci (štítek nahoře). */
  otevrenoVenku?: number;
  onOtevri: (id: string) => void;
  onNapsat: (id: string) => void;
  onUlozOdkaz: (row: PrehledRadek, text: string) => Promise<{ ok: boolean; hodnota?: string }>;
  onUlozTelefon: (row: PrehledRadek, text: string) => Promise<{ ok: boolean; hodnota?: string }>;
};

function sUrl(row: PrehledRadek, odkazy: Record<string, string>): PrehledRadek {
  return {
    ...row,
    checkinUrl: (odkazy[row.rezervace] ?? row.checkinUrl ?? '').trim() || null,
  };
}

export function StitkyDoplnit14({
  pocty,
  aktivni,
  onKlep,
}: {
  pocty: PoctyStitkuDoplnit;
  aktivni?: FiltrDoplnit | null;
  onKlep: (f: FiltrDoplnit) => void;
}) {
  const kusy = (
    [
      { id: 'bez_checkinu' as const, text: 'Bez check-inu', n: pocty.bez_checkinu },
      { id: 'bez_pruvodce' as const, text: 'Bez průvodce', n: pocty.bez_pruvodce },
      { id: 'bez_telefonu' as const, text: 'Bez telefonu', n: pocty.bez_telefonu },
    ] satisfies { id: FiltrDoplnit; text: string; n: number }[]
  ).filter((k) => k.n > 0);
  if (!kusy.length) return null;
  return (
    <div className="ph-doplnit-stitky" role="group" aria-label="Co doplnit na 14 dní">
      {kusy.map((k) => (
        <button
          key={k.id}
          type="button"
          className={aktivni === k.id ? 'is-on' : undefined}
          onClick={() => onKlep(k.id)}
        >
          {k.text} {k.n}
        </button>
      ))}
    </div>
  );
}

export function CoDoplnit({
  radky,
  dnes,
  odkazy,
  filtr,
  onFiltr,
  otevrenoVenku,
  onOtevri,
  onNapsat,
  onUlozOdkaz,
  onUlozTelefon,
}: Props) {
  const sUrlRadky = radky.map((r) => sUrl(r, odkazy));
  const seznam = hosteCoDoplnitFiltr(sUrlRadky, dnes, filtr);
  const pocty = poctyStitkuDoplnit(sUrlRadky, dnes);
  const [hlaska, setHlaska] = useState('');
  const [predchoziPocet, setPredchoziPocet] = useState(seznam.length);
  const [otevreno, setOtevreno] = useState(false);
  const [rozbalene, setRozbalene] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    function sync() {
      setOtevreno(mq.matches);
    }
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (otevrenoVenku && otevrenoVenku > 0) setOtevreno(true);
  }, [otevrenoVenku, filtr]);

  useEffect(() => {
    if (predchoziPocet > 0 && seznam.length < predchoziPocet) {
      setHlaska('Doplněno ✓');
      const t = window.setTimeout(() => setHlaska(''), 2500);
      setPredchoziPocet(seznam.length);
      return () => window.clearTimeout(t);
    }
    setPredchoziPocet(seznam.length);
  }, [seznam.length, predchoziPocet]);

  const prazdneVse =
    filtr === 'vse' && !pocty.bez_checkinu && !pocty.bez_pruvodce && !pocty.bez_telefonu && !seznam.length;

  if (prazdneVse) {
    return (
      <section className="ph-co-doplnit" id="ph-co-doplnit">
        <div className="ph-co-doplnit__hlava">
          <h2>Co doplnit</h2>
          <OdkazyZeSchrankyTlacitko />
        </div>
        {hlaska ? <p className="ph-co-doplnit__ok">{hlaska}</p> : null}
        <p className="ph-co-doplnit__prazdne">Všichni hosté na 14 dní mají check-in i telefon ✓</p>
      </section>
    );
  }

  return (
    <details
      className="ph-co-doplnit"
      id="ph-co-doplnit"
      open={otevreno}
      onToggle={(e) => setOtevreno(e.currentTarget.open)}
    >
      <summary className="ph-co-doplnit__souhrn">Co doplnit ({seznam.length})</summary>
      <div className="ph-co-doplnit__hlava ph-co-doplnit__hlava--akce">
        <div className="ph-doplnit-stitky ph-doplnit-stitky--hlava" role="group" aria-label="Filtr">
          <button
            type="button"
            className={filtr === 'vse' ? 'is-on' : undefined}
            onClick={() => onFiltr('vse')}
          >
            Vše
          </button>
          {pocty.bez_checkinu ? (
            <button
              type="button"
              className={filtr === 'bez_checkinu' ? 'is-on' : undefined}
              onClick={() => onFiltr('bez_checkinu')}
            >
              Bez check-inu {pocty.bez_checkinu}
            </button>
          ) : null}
          {pocty.bez_pruvodce ? (
            <button
              type="button"
              className={filtr === 'bez_pruvodce' ? 'is-on' : undefined}
              onClick={() => onFiltr('bez_pruvodce')}
            >
              Bez průvodce {pocty.bez_pruvodce}
            </button>
          ) : null}
          {pocty.bez_telefonu ? (
            <button
              type="button"
              className={filtr === 'bez_telefonu' ? 'is-on' : undefined}
              onClick={() => onFiltr('bez_telefonu')}
            >
              Bez telefonu {pocty.bez_telefonu}
            </button>
          ) : null}
        </div>
        <OdkazyZeSchrankyTlacitko />
      </div>
      {hlaska ? <p className="ph-co-doplnit__ok">{hlaska}</p> : null}

      {!seznam.length ? (
        <p className="ph-co-doplnit__prazdne">V tomhle filtru teď nic není.</p>
      ) : (
        <>
          <ul className="ph-co-doplnit__mobil">
            {seznam.map((row) => {
              const url = (row.checkinUrl || '').trim();
              const open = Boolean(rozbalene[row.rezervace]);
              const prijezd = row.prijezd ? formatPrijezdDoplnit(row.prijezd) : '—';
              const zdroj = row.zdrojText || row.zdroj || '—';
              const stitky = stitkyRadku(row, filtr);
              return (
                <li key={row.rezervace} className={open ? 'is-open' : undefined}>
                  <button
                    type="button"
                    className="ph-co-doplnit__radek"
                    onClick={() =>
                      setRozbalene((prev) => ({ ...prev, [row.rezervace]: !prev[row.rezervace] }))
                    }
                  >
                    <span className="ph-co-doplnit__radek-text">
                      {prijezd} · {row.apartman || '—'} · {row.jmeno || row.rezervace} · {zdroj}
                    </span>
                    <span className="ph-co-doplnit__stitky">
                      {stitky.map((s) => (
                        <span key={s} className="ph-co-doplnit__stitek">
                          {s}
                        </span>
                      ))}
                    </span>
                  </button>
                  {open ? (
                    <div className="ph-co-doplnit__rozbal">
                      {poleRadku({
                        row,
                        filtr,
                        url,
                        onUlozOdkaz,
                        onUlozTelefon,
                        onNapsat,
                      })}
                      <button
                        type="button"
                        className="ph-co-doplnit__karta"
                        onClick={() => onOtevri(row.rezervace)}
                      >
                        karta →
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="ph-co-doplnit__tabulka">
            <table>
              <thead>
                <tr>
                  <th>Příjezd</th>
                  <th>Apt</th>
                  <th>Host</th>
                  <th>Zdroj</th>
                  <th>Údaje</th>
                </tr>
              </thead>
              <tbody>
                {seznam.map((row) => {
                  const url = (row.checkinUrl || '').trim();
                  return (
                    <tr key={row.rezervace}>
                      <td data-label="Příjezd">{row.prijezd ? formatPrijezdDoplnit(row.prijezd) : '—'}</td>
                      <td data-label="Apt">{row.apartman || '—'}</td>
                      <td data-label="Host">
                        <button
                          type="button"
                          className="ph-co-doplnit__jmeno"
                          onClick={() => onOtevri(row.rezervace)}
                        >
                          {row.jmeno || row.rezervace}
                        </button>
                      </td>
                      <td data-label="Zdroj">{row.zdrojText || row.zdroj || '—'}</td>
                      <td data-label="Údaje">
                        <div className="ph-co-doplnit__rozbal">
                          {poleRadku({
                            row,
                            filtr,
                            url,
                            onUlozOdkaz,
                            onUlozTelefon,
                            onNapsat,
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </details>
  );
}

function stitkyRadku(row: PrehledRadek, filtr: FiltrDoplnit): string[] {
  if (filtr === 'bez_checkinu') return ['check-in'];
  if (filtr === 'bez_pruvodce') return ['průvodce'];
  if (filtr === 'bez_telefonu') return ['telefon'];
  const out: string[] = [];
  if (chybiCheckin(row)) out.push('check-in');
  if (chybiTelefon(row)) out.push('telefon');
  return out;
}

function poleRadku({
  row,
  filtr,
  url,
  onUlozOdkaz,
  onUlozTelefon,
  onNapsat,
}: {
  row: PrehledRadek;
  filtr: FiltrDoplnit;
  url: string;
  onUlozOdkaz: Props['onUlozOdkaz'];
  onUlozTelefon: Props['onUlozTelefon'];
  onNapsat: (id: string) => void;
}) {
  if (filtr === 'bez_pruvodce') {
    return (
      <button type="button" className="ph-ulozit" onClick={() => onNapsat(row.rezervace)}>
        Napsat zprávu
      </button>
    );
  }
  if (filtr === 'bez_telefonu') {
    return <TelefonPole onUloz={(text) => onUlozTelefon(row, text)} />;
  }
  if (filtr === 'bez_checkinu') {
    if (!url) return <OdkazPole url="" onUloz={(text) => onUlozOdkaz(row, text)} />;
    return (
      <span className="ph-co-doplnit__odkaz-ok">
        <span>odkaz ✓</span>
        <span title={url}>{zkratOdkaz(url)}</span>
        <button type="button" className="ph-ulozit" onClick={() => onNapsat(row.rezervace)}>
          Napsat zprávu
        </button>
      </span>
    );
  }
  return (
    <>
      {chybiCheckin(row) ? <OdkazPole url={url} onUloz={(text) => onUlozOdkaz(row, text)} /> : null}
      {chybiTelefon(row) ? <TelefonPole onUloz={(text) => onUlozTelefon(row, text)} /> : null}
    </>
  );
}

function OdkazPole({
  url,
  onUloz,
}: {
  url: string;
  onUloz: (text: string) => Promise<{ ok: boolean; hodnota?: string }>;
}) {
  const [menim, setMenim] = useState(!url);
  const [text, setText] = useState(url);
  const [cekam, setCekam] = useState(false);

  useEffect(() => {
    setText(url);
    if (url) setMenim(false);
  }, [url]);

  if (url && !menim) {
    return (
      <span className="ph-co-doplnit__odkaz-ok">
        <span className="ph-co-doplnit__fajfka" aria-hidden="true">
          ✓
        </span>
        <span title={url}>{zkratOdkaz(url)}</span>
        <button type="button" className="ph-co-doplnit__zmenit" onClick={() => setMenim(true)}>
          změnit
        </button>
      </span>
    );
  }

  return (
    <span className="ph-co-doplnit__pole">
      <input
        type="url"
        value={text}
        placeholder="https://…"
        aria-label="Odkaz na check-in"
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="button"
        disabled={cekam}
        onClick={() => {
          setCekam(true);
          void onUloz(text)
            .then((v) => {
              if (v.ok) setMenim(false);
            })
            .finally(() => setCekam(false));
        }}
      >
        Uložit
      </button>
    </span>
  );
}

function TelefonPole({ onUloz }: { onUloz: (text: string) => Promise<{ ok: boolean; hodnota?: string }> }) {
  const [text, setText] = useState('');
  const [cekam, setCekam] = useState(false);
  return (
    <span className="ph-co-doplnit__pole">
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+420 …"
        aria-label="Telefon hosta"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="button"
        disabled={cekam}
        onClick={() => {
          setCekam(true);
          void onUloz(text).finally(() => setCekam(false));
        }}
      >
        Uložit
      </button>
    </span>
  );
}

type RadekOdkazu = {
  rezervace: string;
  host: string;
  nalezen: string;
  naKarte: string;
  stane: string;
};

function OdkazyZeSchrankyTlacitko() {
  const [radky, setRadky] = useState<RadekOdkazu[] | null>(null);
  const [cekam, setCekam] = useState('');
  const [hlaska, setHlaska] = useState('');
  const [potvrdit, setPotvrdit] = useState(false);
  const [otevreno, setOtevreno] = useState(false);

  async function nacti(akce: 'ukazat' | 'doplnit') {
    setCekam(akce);
    setHlaska('');
    const res = await fetch('/api/prehled/checkin-odkazy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      radky?: RadekOdkazu[];
      doplneno?: { rezervace: string; host: string }[];
    } | null;
    setCekam('');
    if (!res.ok || !json?.ok || !json.radky) {
      setHlaska(json?.error || 'Schránku se nepodařilo přečíst.');
      return;
    }
    setRadky(json.radky);
    setOtevreno(true);
    setPotvrdit(false);
    if (akce === 'doplnit') {
      const kdo = (json.doplneno || []).map((r) => `${r.rezervace} ${r.host}`).join(', ');
      setHlaska(kdo ? `Doplněno u ${json.doplneno?.length}: ${kdo}.` : 'Doplněno nikde. Odkaz už na kartách je.');
    }
  }

  const jdeDoplnit = Boolean(radky?.some((r) => r.stane === 'doplní se'));

  return (
    <div className="ph-co-doplnit__schranka">
      <button
        type="button"
        className="ph-co-doplnit__schranka-btn"
        disabled={cekam !== ''}
        onClick={() => void nacti('ukazat')}
      >
        {cekam === 'ukazat' ? 'Čtu schránku…' : 'Najít odkazy ve schránce'}
      </button>
      {hlaska ? <p>{hlaska}</p> : null}
      {otevreno && radky ? (
        <div className="ph-odkazy-tabulka">
          <table>
            <thead>
              <tr>
                <th>Rezervace</th>
                <th>Host</th>
                <th>Odkaz nalezen</th>
                <th>Na kartě už je</th>
                <th>Co se stane</th>
              </tr>
            </thead>
            <tbody>
              {radky.length ? (
                radky.map((r) => (
                  <tr key={r.rezervace}>
                    <td>{r.rezervace}</td>
                    <td>{r.host}</td>
                    <td>{r.nalezen}</td>
                    <td>{r.naKarte}</td>
                    <td>{r.stane}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>Za 30 dní tu žádná výzva k check-inu není.</td>
                </tr>
              )}
            </tbody>
          </table>
          {jdeDoplnit && !potvrdit ? (
            <button type="button" className="ph-ulozit" disabled={cekam !== ''} onClick={() => setPotvrdit(true)}>
              Doplnit
            </button>
          ) : null}
          {potvrdit ? (
            <div className="ph-predano-dotaz">
              <p>Doplnit odkaz jen tam, kde na kartě žádný není?</p>
              <button type="button" disabled={cekam !== ''} onClick={() => void nacti('doplnit')}>
                {cekam === 'doplnit' ? 'Doplňuji…' : 'Ano, doplnit'}
              </button>
              <button type="button" onClick={() => setPotvrdit(false)}>
                Zrušit
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
