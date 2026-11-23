'use client';

import { useEffect, useState } from 'react';

type Detail = {
  id: string;
  jmeno: string;
  telefon: string;
  termin: string;
  apartman: string;
  cena: string;
  odkud: string;
  jazyk: string;
  poznamka: string;
  stav: string;
  stavText: string;
  lhutaDo: string | null;
  navrhMajitele: string;
  kanal: string;
  zkouska: boolean;
};

export function PoptavkaDetail({ id, onZavrit }: { id: string; onZavrit: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [chyba, setChyba] = useState('');
  const [cekam, setCekam] = useState(false);
  const [navrh, setNavrh] = useState('');
  const [ukazNejde, setUkazNejde] = useState(false);

  useEffect(() => {
    let zrus = false;
    void (async () => {
      try {
        const res = await fetch(`/api/prehled/poptavka?id=${encodeURIComponent(id)}`, {
          cache: 'no-store',
        });
        const json = (await res.json()) as { ok?: boolean; poptavka?: Detail; error?: string };
        if (zrus) return;
        if (!json.ok || !json.poptavka) {
          setChyba(json.error || 'Poptávka se nenačetla.');
          return;
        }
        setD(json.poptavka);
        setNavrh(json.poptavka.navrhMajitele || '');
      } catch {
        if (!zrus) setChyba('Poptávka se nenačetla.');
      }
    })();
    return () => {
      zrus = true;
    };
  }, [id]);

  async function akce(kod: string, extras: Record<string, unknown> = {}) {
    setCekam(true);
    setChyba('');
    try {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const res = await fetch('/api/prehled/poptavka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, akce: kod, ios, ...extras }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        poptavka?: Detail;
        odkaz?: string | null;
        error?: string;
      };
      if (!json.ok || !json.poptavka) {
        setChyba(json.error || 'Akce se nepovedla.');
        return;
      }
      setD(json.poptavka);
      if (json.odkaz) window.open(json.odkaz, '_blank', 'noopener,noreferrer');
    } catch {
      setChyba('Akce se nepovedla.');
    } finally {
      setCekam(false);
    }
  }

  const telCiste = (d?.telefon || '').replace(/\D/g, '');
  const telHref = telCiste ? `tel:+${telCiste}` : '';
  const stav = d?.stav || '';

  return (
    <div className="ph-poptavka" role="dialog" aria-modal="true" aria-label="Poptávka">
      <div className="ph-poptavka__vnitr">
        <button type="button" className="ph-poptavka__zavrit" onClick={onZavrit}>
          Zavřít
        </button>
        {chyba ? <p className="ph-poptavka__chyba">{chyba}</p> : null}
        {!d && !chyba ? <p>Načítám…</p> : null}
        {d ? (
          <>
            {d.zkouska ? <p className="ph-poptavka__zkouska">ZKOUŠKA</p> : null}
            <h2>{d.jmeno}</h2>
            <p>{d.termin}</p>
            <p>{d.apartman}</p>
            {d.cena ? <p>{d.cena}</p> : null}
            <p>{d.odkud}</p>
            <p>Jazyk: {d.jazyk}</p>
            <p style={{ whiteSpace: 'nowrap' }}>{d.telefon}</p>
            {d.poznamka ? <p>{d.poznamka}</p> : null}
            <p>Stav: {d.stavText || d.stav}</p>
            {d.lhutaDo ? (
              <p>
                Lhůta hosta:{' '}
                {new Date(d.lhutaDo).toLocaleString('cs-CZ', {
                  timeZone: 'Europe/Prague',
                  day: 'numeric',
                  month: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            ) : null}
            <div className="ph-poptavka__akce">
              {telHref ? (
                <a className="ph-btn" href={telHref}>
                  Zavolat
                </a>
              ) : null}
              {stav === 'predbezne' || stav === 'nova' ? (
                <button type="button" className="ph-btn" disabled={cekam} onClick={() => void akce('potvrdit')}>
                  POTVRDIT
                </button>
              ) : null}
              {stav === 'ceka_na_hosta' ? (
                <button
                  type="button"
                  className="ph-btn"
                  disabled={cekam}
                  onClick={() => void akce('host_potvrdil')}
                >
                  HOST POTVRDIL
                </button>
              ) : null}
              {stav === 'potvrzeno' ? (
                <button
                  type="button"
                  className="ph-btn"
                  disabled={cekam}
                  onClick={() => void akce('zapsano_bh')}
                >
                  ZAPSÁNO V BETTER HOTELU
                </button>
              ) : null}
              {stav === 'neozval_se' ? (
                <button
                  type="button"
                  className="ph-btn"
                  disabled={cekam}
                  onClick={() => void akce('prodlouzit')}
                >
                  PRODLOUŽIT O 24 H
                </button>
              ) : null}
              {stav === 'predbezne' ||
              stav === 'nova' ||
              stav === 'ceka_na_hosta' ||
              stav === 'neozval_se' ? (
                <button
                  type="button"
                  className="ph-btn"
                  disabled={cekam}
                  onClick={() => setUkazNejde((v) => !v)}
                >
                  NEJDE
                </button>
              ) : null}
            </div>
            {ukazNejde ? (
              <div className="ph-poptavka__nejde">
                <label>
                  Můj návrh
                  <textarea
                    value={navrh}
                    onChange={(e) => setNavrh(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                </label>
                <button
                  type="button"
                  className="ph-btn"
                  disabled={cekam || !navrh.trim()}
                  onClick={() => void akce('nejde', { navrh: navrh.trim() })}
                >
                  Odeslat NEJDE hostovi
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
