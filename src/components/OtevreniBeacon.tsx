'use client';

import { useEffect } from 'react';

/** Až po vykreslení v prohlížeči. Samotné stažení stránky serverem se nepočítá. */
export function OtevreniBeacon({ token }: { token: string }) {
  useEffect(() => {
    fetch('/api/otevreni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {});
  }, [token]);
  return null;
}
