'use client';

import { useState } from 'react';

export function LoginForm() {
  const [chyba, setChyba] = useState('');
  const [cekam, setCekam] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setCekam(true);
    setChyba('');
    const res = await fetch('/api/prehled/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heslo: String(data.get('heslo') || '') }),
    });
    setCekam(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      setChyba(json?.error || 'Přihlášení se nepovedlo.');
      return;
    }
    window.location.href = '/prehled';
  }

  return (
    <main className="ph">
      <form className="ph-login" onSubmit={onSubmit}>
        <h1>Přehled rezervací</h1>
        <p>Jen pro majitele.</p>
        <label>
          Heslo
          <input name="heslo" type="password" autoComplete="current-password" required />
        </label>
        {chyba ? <p className="ph-chyba">{chyba}</p> : null}
        <button type="submit" disabled={cekam}>
          {cekam ? 'Přihlašuji…' : 'Vstoupit'}
        </button>
      </form>
    </main>
  );
}
