'use client';

import { useEffect, useState } from 'react';
import { odkazWhatsApp } from '@/lib/whatsapp-zprava';

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
  zkouska: boolean;
};

export function PoptavkaDetail({ id, onZavrit }: { id: string; onZavrit: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [chyba, setChyba] = useState('');
  const [cekam, setCekam] = useState(false);

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
      } catch {
        if (!zrus) setChyba('Poptávka se nenačetla.');
      }
    })();
    return () => {
      zrus = true;
    };
  }, [id]);

  async function potvrdit() {
    setCekam(true);
    try {
      const res = await fetch('/api/prehled/poptavka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, akce: 'potvrdit' }),
      });
      const json = (await res.json()) as { ok?: boolean };
      if (json.ok) setD((prev) => (prev ? { ...prev, stav: 'hotovo' } : prev));
      else setChyba('Nepovedlo se potvrdit.');
    } catch {
      setChyba('Nepovedlo se potvrdit.');
    } finally {
      setCekam(false);
    }
  }

  const telCiste = (d?.telefon || '').replace(/\D/g, '');
  const telHref = telCiste ? `tel:+${telCiste}` : '';
  const waHref = d ? odkazWhatsApp(telCiste, `Dobrý den, ${d.jmeno}, k Vaší poptávce termínu ${d.termin}.`) : '';

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
            <p>Stav: {d.stav === 'hotovo' ? 'potvrzeno' : 'nová'}</p>
            <div className="ph-poptavka__akce">
              {telHref ? (
                <a className="ph-btn" href={telHref}>
                  Zavolat
                </a>
              ) : null}
              {waHref ? (
                <a className="ph-btn" href={waHref} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              ) : null}
              {d.stav !== 'hotovo' ? (
                <button type="button" className="ph-btn" disabled={cekam} onClick={() => void potvrdit()}>
                  Potvrdit termín
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
