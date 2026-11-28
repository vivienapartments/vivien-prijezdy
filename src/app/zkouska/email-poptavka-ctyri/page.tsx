import Link from 'next/link';

const VERZE = [
  {
    v: 1,
    nazev: 'Verze 1 · čistě',
    popis: 'Fotka, nadpis Potvrzení termínu, box, krátký text. Bez druhého loga.',
  },
  {
    v: 2,
    nazev: 'Verze 2 · jemný VIVIEN',
    popis: 'Pod fotkou jen malý řádek VIVIEN APARTMENTS, pak nadpis a box.',
  },
  {
    v: 3,
    nazev: 'Verze 3 · oslovení nahoře',
    popis: 'Nadpis je Martine, pod ním Potvrzení termínu. Osobnější.',
  },
  {
    v: 4,
    nazev: 'Verze 4 · box + telefon',
    popis: 'Termín, apartmán a cena vedle sebe. Dole číslo na zavolání.',
  },
] as const;

export default function EmailPoptavkaCtyriPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        margin: 0,
        padding: '20px 14px 48px',
        background: '#0d0b0a',
        color: '#e8dfc8',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, color: '#c9a84c', fontWeight: 400 }}>
          E-mail potvrzení poptávky
        </h1>
        <p
          style={{
            margin: '0 0 20px',
            fontSize: 14,
            lineHeight: 1.45,
            color: '#cbbba8',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          Čtyři učesané verze. Stejný obsah: fotka, termín, apartmán Jemná harmonie, cena se
          slevou. Bez kódu V1. Vyberte jednu.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          {VERZE.map((x) => (
            <Link
              key={x.v}
              href={`/zkouska/email-poptavka-potvrzeni?v=${x.v}`}
              style={{
                display: 'block',
                padding: '14px 12px',
                borderRadius: 12,
                border: '1px solid #c9a84c',
                background: '#1c1712',
                color: '#f5efe3',
                textDecoration: 'none',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              <b style={{ display: 'block', marginBottom: 4 }}>{x.nazev}</b>
              <span style={{ color: '#cbbba8', fontSize: 13, lineHeight: 1.4 }}>{x.popis}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
