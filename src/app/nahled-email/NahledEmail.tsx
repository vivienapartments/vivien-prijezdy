'use client';

import { useEffect, useRef, useState } from 'react';

/** Čtyři návrhy okna v e-mailu. 1 a 2 jsou ploché, 3 a 4 mají klidný přechod. */
const VERZE = [
  { nazev: '1. Plochá růžová', bg: '#f6cfc6', image: 'none', border: '#c4554c' },
  { nazev: '2. Plochá zlatá', bg: '#f3d7a4', image: 'none', border: '#a86a45' },
  { nazev: '3. Růžový přechod', bg: '#f0c4bb', image: 'linear-gradient(180deg,#fff6f3 0%,#e7aaa0 100%)', border: '#c4554c' },
  { nazev: '4. Zlatý přechod', bg: '#f0d0b0', image: 'linear-gradient(180deg,#f8d4c8 0%,#e4c07a 100%)', border: '#a86a45' },
] as const;

export function NahledEmail({ html }: { html: string }) {
  const ram = useRef<HTMLIFrameElement>(null);
  const [volba, setVolba] = useState(0);
  const volbaRef = useRef(volba);
  volbaRef.current = volba;

  function aplikuj(index: number) {
    const frame = ram.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc) return false;
    doc.querySelectorAll('style').forEach((el) => el.remove());
    const td = doc.querySelector('td[bgcolor]');
    if (!td || td.tagName !== 'TD') return false;
    const bunka = td as HTMLElement;
    const v = VERZE[index];
    bunka.setAttribute('bgcolor', v.bg);
    bunka.style.setProperty('background-color', v.bg, 'important');
    bunka.style.setProperty('background-image', v.image, 'important');
    bunka.style.setProperty('border', `2px solid ${v.border}`, 'important');
    bunka.style.borderRadius = '14px';
    bunka.style.color = '#1c1210';
    const span = bunka.querySelector('span');
    if (span && span.tagName === 'SPAN') {
      const pismo = span as HTMLElement;
      pismo.style.color = '#1c1210';
      pismo.style.background = 'none';
    }
    frame.style.height = `${doc.documentElement.scrollHeight}px`;
    return true;
  }

  useEffect(() => {
    let pokus = 0;
    const casovac = window.setInterval(() => {
      pokus += 1;
      if (aplikuj(volbaRef.current) || pokus > 20) window.clearInterval(casovac);
    }, 100);
    return () => window.clearInterval(casovac);
  }, []);

  return (
    <div className="mail-nahled">
      <div className="mail-nahled__lista">
        <p>Jen náhled e-mailu. Host to neuvidí.</p>
        <div role="group" aria-label="Podbarvení okna v e-mailu">
          {VERZE.map((v, i) => (
            <button key={v.nazev} type="button" aria-pressed={volba === i} onClick={() => { setVolba(i); aplikuj(i); }}>
              {v.nazev}
            </button>
          ))}
        </div>
      </div>
      <iframe
        ref={ram}
        title="Náhled e-mailu"
        srcDoc={html}
        onLoad={() => aplikuj(volba)}
      />
      <style>{`
        .mail-nahled { min-height: 100vh; background: #1c1712; color: #f5efe3; }
        .mail-nahled__lista {
          position: sticky; top: 0; z-index: 2;
          padding: 12px 12px 10px; background: #1c1712;
        }
        .mail-nahled__lista p { margin: 0 0 8px; font-size: 14px; }
        .mail-nahled__lista div { display: flex; flex-wrap: wrap; gap: 8px; }
        .mail-nahled__lista button {
          border: 1px solid #c9a84c; border-radius: 999px; background: transparent;
          color: #f5efe3; padding: 0.4rem 0.75rem; font: inherit; font-size: 0.95rem; cursor: pointer;
        }
        .mail-nahled__lista button[aria-pressed='true'] { background: #c9a84c; color: #1c1712; }
        .mail-nahled iframe { display: block; width: 100%; border: 0; min-height: 900px; background: #1c1712; }
      `}</style>
    </div>
  );
}
