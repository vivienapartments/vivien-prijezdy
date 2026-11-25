import type { CSSProperties } from 'react';
import { KLUB_IMPORT_BH_PRIME_SEED } from '@/lib/klub-import-bh-prime-seed';
import type { ImportBhPobyt, ImportBhSouhrn } from '@/lib/klub-import-bh-csv';

export const dynamic = 'force-static';

function kc(n: number) {
  return `${n.toLocaleString('cs-CZ')} Kč`;
}

function formatTermin(p: ImportBhPobyt) {
  const a = (p.prijezd || '').slice(0, 10);
  const b = (p.odjezd || '').slice(0, 10);
  if (!a) return p.rezervace;
  const fa = a.slice(8, 10) + '. ' + a.slice(5, 7) + '.';
  const fb = b ? b.slice(8, 10) + '. ' + b.slice(5, 7) + '.' : '';
  return fb ? `${fa}–${fb}` : fa;
}

function RadekPobytu({ p }: { p: ImportBhPobyt }) {
  const ceka = p.stavUtraty === 'ceka';
  return (
    <li
      style={{
        ...liPobyt,
        borderLeft: `3px solid ${ceka ? '#7eb8d8' : '#e09a3e'}`,
        background: ceka ? 'rgba(126, 184, 216, 0.12)' : 'rgba(224, 154, 62, 0.12)',
      }}
    >
      <span style={{ color: ceka ? '#b8d9ec' : '#f0c48a' }}>
        {formatTermin(p)} · {p.castka > 0 ? kc(p.castka) : '—'}
      </span>
      <br />
      <span style={muted}>
        {ceka ? 'čeká, započítá se po odjezdu' : p.popisek} · rez. {p.rezervace}
      </span>
    </li>
  );
}

function BlokHost({ s, nadpis }: { s: ImportBhSouhrn; nadpis?: string }) {
  return (
    <li style={li}>
      <strong>{s.host}</strong>
      {nadpis ? (
        <>
          <br />
          <span style={muted}>{nadpis}</span>
        </>
      ) : null}
      <br />
      {s.pocet} pobytů · započteno {kc(s.utrata)}
      {s.utrataCeka > 0 ? ` · čeká ${kc(s.utrataCeka)}` : ''} · {s.uroven}
      <ul style={{ ...ul, marginTop: 8 }}>
        {s.pobyty.map((p) => (
          <RadekPobytu key={p.rezervace} p={p} />
        ))}
      </ul>
    </li>
  );
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
        Náhled importu útraty · BH přímé 25. 11. 2026 · oprava barev a Hromada
      </p>
      <h1 style={{ color: '#c9a84c', fontSize: '1.45rem', marginBottom: '0.4rem' }}>
        Co by se zapsalo
      </h1>
      <p style={{ color: '#b7aa98', fontSize: '0.9rem', lineHeight: 1.45 }}>
        Oranžová = odbydlené, útrata započtená. Světle modrá = budoucí nebo probíhající,
        započítá se po odjezdu. Zápis až po vašem potvrzení.
      </p>
      <p style={{ color: '#b7aa98', fontSize: '0.82rem' }}>
        <span style={{ color: '#e09a3e' }}>■ započteno</span>
        {' · '}
        <span style={{ color: '#7eb8d8' }}>■ čeká po odjezdu</span>
      </p>

      <section style={{ marginTop: '1.4rem' }}>
        <h2 style={h2}>Přiřadit teď ({priradit.length})</h2>
        <ul style={ul}>
          {priradit.map((s) => (
            <BlokHost key={`p-${s.host}-${s.rezervace.join(',')}`} s={s} />
          ))}
        </ul>
      </section>

      <section style={{ marginTop: '1.2rem' }}>
        <h2 style={h2}>Firmy ({firmy.length})</h2>
        <ul style={ul}>
          {firmy.map((s) => (
            <BlokHost key={`f-${s.host}`} s={s} />
          ))}
        </ul>
      </section>

      <section style={{ marginTop: '1.2rem' }}>
        <h2 style={h2}>Čekající na kartu ({ceka.length})</h2>
        <p style={{ ...muted, marginTop: 0 }}>
          Útrata odbydlených se uloží teď. Ke kartě se přiřadí, až host příště přijede nebo
          vyplní check-in a jméno sedí. Při nejistotě Spojit v přehledu.
        </p>
        <ul style={ul}>
          {ceka.map((s) => (
            <BlokHost key={`c-${s.host}-${s.rezervace.join(',')}`} s={s} />
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
              {kc(r.castka)} · {r.duvod}
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
        Soubor CSV zůstává jen lokálně (.data/import). Příjezdy před 1. 5. 2026 jsou vynechané.
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

const liPobyt: CSSProperties = {
  listStyle: 'none',
  padding: '0.45rem 0.55rem',
  marginBottom: 6,
  borderRadius: 8,
  fontSize: '0.85rem',
  lineHeight: 1.35,
};

const muted: CSSProperties = {
  color: '#b7aa98',
  fontSize: '0.82rem',
};
