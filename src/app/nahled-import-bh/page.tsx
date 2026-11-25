import type { CSSProperties } from 'react';
import { KLUB_IMPORT_BH_PRIME_SEED } from '@/lib/klub-import-bh-prime-seed';

export const dynamic = 'force-static';

function kc(n: number) {
  return `${n.toLocaleString('cs-CZ')} Kč`;
}

export default function NahledImportBhPage() {
  const n = KLUB_IMPORT_BH_PRIME_SEED;
  const priradit = n.souhrn.filter((s) => s.akce === 'priradit');
  const firmy = n.souhrn.filter((s) => s.akce === 'firma');
  const ceka = n.cekajici;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#1a1510',
        color: '#efe6d8',
        padding: '1.25rem',
        maxWidth: 720,
        margin: '0 auto',
        fontFamily: 'Georgia, serif',
      }}
    >
      <p style={{ color: '#b7aa98', fontSize: '0.85rem', marginTop: 0 }}>
        Náhled importu útraty · BH přímé 25. 11. 2026
      </p>
      <h1 style={{ color: '#c9a84c', fontSize: '1.45rem', marginBottom: '0.4rem' }}>
        Co by se zapsalo
      </h1>
      <p style={{ color: '#b7aa98', fontSize: '0.9rem', lineHeight: 1.45 }}>
        Zápis až po vašem potvrzení v /prehled/klienti. Všechny přímé pobyty bereme jako
        zaplacené (cena po předání). Řádky k ruční kontrole se nepřiřadí.
      </p>

      <section style={{ marginTop: '1.4rem' }}>
        <h2 style={h2}>Přiřadit teď ({priradit.length})</h2>
        <ul style={ul}>
          {priradit.map((s) => (
            <li key={`p-${s.host}-${s.rezervace.join(',')}`} style={li}>
              <strong>{s.host}</strong>
              <br />
              {s.pocet} pobytů · {kc(s.utrata)} · {s.uroven}
              <br />
              <span style={muted}>rez. {s.rezervace.join(', ')}</span>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: '1.2rem' }}>
        <h2 style={h2}>Firmy ({firmy.length})</h2>
        <ul style={ul}>
          {firmy.map((s) => (
            <li key={`f-${s.host}`} style={li}>
              <strong>{s.host}</strong>
              <br />
              {s.pocet} pobytů · {kc(s.utrata)} · {s.uroven}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: '1.2rem' }}>
        <h2 style={h2}>Čekající na kartu ({ceka.length})</h2>
        <p style={{ ...muted, marginTop: 0 }}>
          Útrata se uloží teď. Ke kartě se přiřadí, až host příště přijede nebo vyplní
          check-in a jméno sedí. Při nejistotě Spojit v přehledu.
        </p>
        <ul style={ul}>
          {ceka.map((s) => (
            <li key={`c-${s.host}-${s.rezervace.join(',')}`} style={li}>
              <strong>{s.host}</strong>
              <br />
              {s.pocet} pobytů · {kc(s.utrata)} · {s.uroven}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: '1.2rem' }}>
        <h2 style={h2}>K ruční kontrole ({n.kontrola.length})</h2>
        <ul style={ul}>
          {n.kontrola.map((r) => (
            <li key={`k-${r.rezervace}`} style={li}>
              <strong>{r.oznaceni || r.cilJmeno || r.rezervace}</strong>
              <br />
              {r.mena === 'EUR' ? `${r.castka} €` : kc(r.castka)} · {r.duvod}
              <br />
              <span style={muted}>
                rez. {r.rezervace}
                {r.prijezd ? ` · ${r.prijezd}–${r.odjezd}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p style={{ color: '#6e6356', fontSize: '0.8rem', marginTop: '2rem' }}>
        Soubor CSV zůstává jen lokálně (.data/import). Na Preview je tento seed náhled.
      </p>
    </main>
  );
}

const h2: CSSProperties = {
  fontSize: '1.05rem',
  color: '#c9a84c',
  marginBottom: 8,
};

const ul: CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

const li: CSSProperties = {
  borderBottom: '1px solid #3d342a',
  padding: '0.7rem 0',
  fontSize: '0.92rem',
  lineHeight: 1.4,
};

const muted: CSSProperties = {
  color: '#b7aa98',
  fontSize: '0.82rem',
};
