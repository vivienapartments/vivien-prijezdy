'use client';

import { useCallback, useEffect, useState } from 'react';
import type { VlaknoProHosta } from '@/lib/prani';
import {
  PRANI_CHYBA,
  PRANI_DOSTUPNOST,
  PRANI_LIMIT,
  PRANI_NADPIS,
  PRANI_NOVA_ODPOVED,
  PRANI_ODESILAM,
  PRANI_ODESLANO,
  PRANI_ODESLAT,
  PRANI_ODPOVEDET,
  PRANI_OKNO_ZAVRENO,
  PRANI_POLE,
  PRANI_RAMECEK_ODPOVED,
  PRANI_SMAZAT,
  PRANI_UPRAVIT,
  PRANI_UVOD,
  PRANI_VYRIZENO,
  PRANI_ZOBRAZIT,
  textPrani,
} from '@/lib/prani-texty';
import type { GuideLang } from '@/lib/types';

type Props = {
  token: string | null;
  lang: GuideLang;
  /** Náhled majitele. Nic se neodesílá. */
  cteni?: boolean;
};

type Stav = {
  vlakna: VlaknoProHosta[];
  muzePsat: boolean;
};

function klicVidel(token: string, vlakno: string): string {
  return `pv-prani-videl:${token}:${vlakno}`;
}

function noveId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function casKratky(iso: string): string {
  try {
    return new Intl.DateTimeFormat('cs-CZ', {
      timeZone: 'Europe/Prague',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

export function PraniHosta({ token, lang, cteni = false }: Props) {
  const tt = (tab: Parameters<typeof textPrani>[0]) => textPrani(tab, lang);
  const [stav, setStav] = useState<Stav | null>(null);
  const [text, setText] = useState('');
  const [odesilam, setOdesilam] = useState(false);
  const [hlaska, setHlaska] = useState('');
  const [otevrene, setOtevrene] = useState<string | null>(null);
  const [odpovedText, setOdpovedText] = useState('');
  const [upravaId, setUpravaId] = useState<string | null>(null);
  const [videne, setVidene] = useState<Record<string, boolean>>({});

  const nacti = useCallback(async () => {
    if (!token || cteni) return;
    try {
      const res = await fetch('/api/pruvodce/prani', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, akce: 'nacti' }),
      });
      const data = (await res.json().catch(() => null)) as Stav & { ok?: boolean } | null;
      if (!res.ok || !data?.ok) return;
      setStav({ vlakna: data.vlakna || [], muzePsat: Boolean(data.muzePsat) });
    } catch {
      /* síť */
    }
  }, [token, cteni]);

  useEffect(() => {
    void nacti();
  }, [nacti]);

  useEffect(() => {
    if (!token || cteni) return;
    const map: Record<string, boolean> = {};
    for (const v of stav?.vlakna || []) {
      try {
        map[v.id] = Boolean(localStorage.getItem(klicVidel(token, v.id)));
      } catch {
        map[v.id] = false;
      }
    }
    setVidene(map);
  }, [stav, token, cteni]);

  useEffect(() => {
    if (!token || cteni) return;
    function obnov() {
      if (document.visibilityState === 'visible') void nacti();
    }
    const t = window.setInterval(obnov, 60_000);
    document.addEventListener('visibilitychange', obnov);
    window.addEventListener('online', obnov);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', obnov);
      window.removeEventListener('online', obnov);
    };
  }, [token, cteni, nacti]);

  function oznacVidel(vlaknoId: string) {
    if (!token) return;
    try {
      localStorage.setItem(klicVidel(token, vlaknoId), '1');
    } catch {
      /* paměť */
    }
    setVidene((prev) => ({ ...prev, [vlaknoId]: true }));
  }

  function maNovouOdpoved(v: VlaknoProHosta): boolean {
    if (videne[v.id]) return false;
    const posledni = [...v.zpravy].reverse().find((z) => z.autor === 'vivien');
    return Boolean(posledni);
  }

  const cekaOdpoved = (stav?.vlakna || []).filter(maNovouOdpoved);

  async function posli(akce: 'napis' | 'uprav' | 'smaz', telo: Record<string, string>) {
    if (!token || cteni) return false;
    setOdesilam(true);
    setHlaska('');
    try {
      const res = await fetch('/api/pruvodce/prani', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, akce, ...telo }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; duvod?: string } | null;
      if (!res.ok || !data?.ok) {
        setHlaska(data?.duvod === 'limit' ? tt(PRANI_LIMIT) : tt(PRANI_CHYBA));
        return false;
      }
      await nacti();
      return true;
    } catch {
      setHlaska(tt(PRANI_CHYBA));
      return false;
    } finally {
      setOdesilam(false);
    }
  }

  async function odesliNove() {
    const t = text.trim();
    if (!t || odesilam) return;
    const id = noveId();
    const ok = await posli('napis', { id, text: t });
    if (ok) {
      setText('');
      setOtevrene(id);
    }
  }

  async function odesliOdpoved(vlakno: string) {
    const t = odpovedText.trim();
    if (!t || odesilam) return;
    const ok = await posli('napis', { id: noveId(), vlakno, text: t });
    if (ok) setOdpovedText('');
  }

  async function ulozUpravu(id: string) {
    const t = text.trim();
    if (!t || odesilam) return;
    const ok = await posli('uprav', { id, text: t });
    if (ok) {
      setUpravaId(null);
      setText('');
    }
  }

  if (cteni) {
    return (
      <aside className="pv-prani" lang={lang} id="pv-prani">
        <h2 className="pv-prani__nadpis">{tt(PRANI_NADPIS)}</h2>
        <p className="pv-prani__uvod">{tt(PRANI_UVOD)}</p>
        <p className="pv-prani__dost">{tt(PRANI_DOSTUPNOST)}</p>
        <p className="pv-prani__muted">Náhled. Host tady píše po předání.</p>
      </aside>
    );
  }

  if (!token) return null;

  return (
    <>
      {cekaOdpoved.length ? (
        <aside className="pv-prani-alert" lang={lang}>
          <p className="pv-prani-alert__nadpis">{tt(PRANI_RAMECEK_ODPOVED)}</p>
          <button
            type="button"
            className="pv-prani-alert__btn"
            onClick={() => {
              const id = cekaOdpoved[0].id;
              oznacVidel(id);
              setOtevrene(id);
              document.getElementById('pv-prani')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            {tt(PRANI_ZOBRAZIT)}
          </button>
        </aside>
      ) : null}

      <aside className="pv-prani" lang={lang} id="pv-prani">
        <h2 className="pv-prani__nadpis">
          {tt(PRANI_NADPIS)}
          {cekaOdpoved.length ? <span className="pv-prani__tecka" aria-hidden="true" /> : null}
        </h2>
        <p className="pv-prani__uvod">{tt(PRANI_UVOD)}</p>
        <p className="pv-prani__dost">{tt(PRANI_DOSTUPNOST)}</p>

        {(stav?.vlakna || []).map((v) => {
          const nova = maNovouOdpoved(v);
          const open = otevrene === v.id;
          return (
            <div key={v.id} className="pv-prani__vlakno" id={`pv-prani-${v.id}`}>
              <button
                type="button"
                className="pv-prani__vlakno-hlava"
                onClick={() => {
                  setOtevrene(open ? null : v.id);
                  if (!open) oznacVidel(v.id);
                }}
              >
                <span className="pv-prani__vlakno-nadpis">
                  {(v.zpravy.find((z) => z.autor === 'host')?.text || '').slice(0, 80)}
                </span>
                <span className="pv-prani__stav">
                  {nova ? tt(PRANI_NOVA_ODPOVED) : v.stav === 'vyrizeno' ? tt(PRANI_VYRIZENO) : tt(PRANI_ODESLANO)}
                </span>
              </button>
              {open ? (
                <div className="pv-prani__konverzace">
                  {v.zpravy.map((z) => (
                    <div key={z.id} className={`pv-prani__bublina pv-prani__bublina--${z.autor}`}>
                      <div className="pv-prani__meta">
                        {z.autor === 'vivien' ? `${z.jmeno || 'VIVIEN'} · VIVIEN` : 'Vy'}
                        {z.cas ? ` · ${casKratky(z.cas)}` : ''}
                        {z.upraveno ? ' · upraveno' : ''}
                      </div>
                      <p>{z.text}</p>
                      {z.muzeUpravit && stav?.muzePsat ? (
                        <div className="pv-prani__akce">
                          <button
                            type="button"
                            onClick={() => {
                              setUpravaId(z.id);
                              setText(z.text);
                            }}
                          >
                            {tt(PRANI_UPRAVIT)}
                          </button>
                          <button
                            type="button"
                            onClick={() => void posli('smaz', { id: z.id })}
                          >
                            {tt(PRANI_SMAZAT)}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {upravaId ? (
                    <div className="pv-prani__form">
                      <label>
                        {tt(PRANI_POLE)}
                        <textarea
                          value={text}
                          maxLength={1000}
                          rows={3}
                          onChange={(e) => setText(e.target.value)}
                        />
                      </label>
                      <button type="button" disabled={odesilam || !text.trim()} onClick={() => void ulozUpravu(upravaId)}>
                        {odesilam ? tt(PRANI_ODESILAM) : tt(PRANI_ODESLAT)}
                      </button>
                      <button type="button" onClick={() => { setUpravaId(null); setText(''); }}>
                        Zrušit
                      </button>
                    </div>
                  ) : stav?.muzePsat ? (
                    <div className="pv-prani__form">
                      <label>
                        {tt(PRANI_ODPOVEDET)}
                        <textarea
                          value={odpovedText}
                          maxLength={1000}
                          rows={3}
                          onChange={(e) => setOdpovedText(e.target.value)}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={odesilam || !odpovedText.trim()}
                        onClick={() => void odesliOdpoved(v.id)}
                      >
                        {odesilam ? tt(PRANI_ODESILAM) : tt(PRANI_ODESLAT)}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}

        {stav && !stav.muzePsat ? <p className="pv-prani__okno">{tt(PRANI_OKNO_ZAVRENO)}</p> : null}

        {stav?.muzePsat && !upravaId ? (
          <div className="pv-prani__form">
            <label>
              {tt(PRANI_POLE)}
              <textarea value={text} maxLength={1000} rows={4} onChange={(e) => setText(e.target.value)} />
            </label>
            <button type="button" disabled={odesilam || !text.trim()} onClick={() => void odesliNove()}>
              {odesilam ? tt(PRANI_ODESILAM) : tt(PRANI_ODESLAT)}
            </button>
          </div>
        ) : null}

        {hlaska ? <p className="pv-prani__chyba">{hlaska}</p> : null}
      </aside>
    </>
  );
}
