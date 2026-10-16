'use client';

import './prehled.scss';

export default function PrehledError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="ph">
      <h1>Přehled rezervací</h1>
      <p className="ph-chyba">Přehled se teď nepodařilo načíst. Zkuste to za chvíli znovu.</p>
      <button type="button" className="ph-predano" onClick={() => reset()}>
        Zkusit znovu
      </button>
    </main>
  );
}
