'use client';

import { useState } from 'react';

export function ZavadyPotvrzeni({
  token,
  uzPotvrzeno,
  tlacitko,
  potvrzeno,
  odesilam,
  chybaText,
}: {
  token: string;
  uzPotvrzeno: boolean;
  tlacitko: string;
  potvrzeno: string;
  odesilam: string;
  chybaText: string;
}) {
  const [stav, setStav] = useState<'idle' | 'cekam' | 'ok' | 'chyba'>(uzPotvrzeno ? 'ok' : 'idle');
  const [chyba, setChyba] = useState('');

  async function potvrd() {
    setStav('cekam');
    setChyba('');
    try {
      const res = await fetch('/api/zavady/potvrdit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        setStav('chyba');
        setChyba(json?.error || chybaText);
        return;
      }
      setStav('ok');
    } catch {
      setStav('chyba');
      setChyba(chybaText);
    }
  }

  if (stav === 'ok') {
    return <p className="zv-ok">{potvrzeno}</p>;
  }

  return (
    <div className="zv-akce">
      <button type="button" disabled={stav === 'cekam'} onClick={() => void potvrd()}>
        {stav === 'cekam' ? odesilam : tlacitko}
      </button>
      {chyba ? <p className="zv-chyba">{chyba}</p> : null}
    </div>
  );
}
