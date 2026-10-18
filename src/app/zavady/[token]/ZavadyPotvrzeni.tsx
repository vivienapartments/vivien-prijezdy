'use client';

import { useState } from 'react';

export function ZavadyPotvrzeni({ token, uzPotvrzeno }: { token: string; uzPotvrzeno: boolean }) {
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
        setChyba(json?.error || 'Potvrzení se nepodařilo.');
        return;
      }
      setStav('ok');
    } catch {
      setStav('chyba');
      setChyba('Potvrzení se nepodařilo.');
    }
  }

  if (stav === 'ok') {
    return <p className="zv-ok">Děkujeme. Zápis je potvrzený.</p>;
  }

  return (
    <div className="zv-akce">
      <button type="button" disabled={stav === 'cekam'} onClick={() => void potvrd()}>
        {stav === 'cekam' ? 'Odesílám…' : 'Potvrdit'}
      </button>
      {chyba ? <p className="zv-chyba">{chyba}</p> : null}
    </div>
  );
}
