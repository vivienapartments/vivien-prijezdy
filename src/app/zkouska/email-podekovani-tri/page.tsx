import Link from 'next/link';

/**
 * Výběr 3 návrhů e-mailu: zlatá reprezentativní karta VIVIEN Klub.
 * Jen zkouška pro majitele.
 */
export default function EmailPodekovaniTriPage() {
  const odkaz = {
    display: 'block',
    padding: '16px 14px',
    borderRadius: 12,
    border: '1px solid #c9a84c',
    background: '#1c1712',
    color: '#f5efe3',
    textDecoration: 'none',
    fontFamily: 'Arial, sans-serif',
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        margin: 0,
        padding: '24px 16px 48px',
        background: '#0d0b0a',
        color: '#e8dfc8',
        fontFamily: 'Georgia, serif',
      }}
    >
      <h1 style={{ margin: '0 0 8px', fontSize: 22, color: '#c9a84c', fontWeight: 400 }}>
        Tři návrhy karty v mailu
      </h1>
      <p style={{ margin: '0 0 20px', fontSize: 15, lineHeight: 1.45, color: '#cbbba8' }}>
        Zlatá karta reprezentuje VIVIEN Klub (není to úroveň hosta). Klepnutím otevře živou kartu.
        Pod kartou je text. Vyberte, co sedí.
      </p>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 12 }}>
        <li>
          <Link href="/zkouska/email-podekovani?v=1" style={odkaz}>
            <b style={{ display: 'block', marginBottom: 4 }}>1 · Krátký text</b>
            <span style={{ color: '#cbbba8', fontSize: 14 }}>
              Pro hosty máme nový VIVIEN Klub. Klepněte na kartu a uvidíte své výhody.
            </span>
          </Link>
        </li>
        <li>
          <Link href="/zkouska/email-podekovani?v=2" style={odkaz}>
            <b style={{ display: 'block', marginBottom: 4 }}>2 · Delší text + Zjistit více</b>
            <span style={{ color: '#cbbba8', fontSize: 14 }}>
              Připravili jsme VIVIEN Klub. Na kartě najdete slevu, historii pobytů a odkaz na další
              rezervaci.
            </span>
          </Link>
        </li>
        <li>
          <Link href="/zkouska/email-podekovani?v=3" style={odkaz}>
            <b style={{ display: 'block', marginBottom: 4 }}>3 · Výzva na kartě</b>
            <span style={{ color: '#cbbba8', fontSize: 14 }}>
              Na kartě „klepněte a uvidíte víc“. Pod ní: VIVIEN Klub je vaše karta u nás.
            </span>
          </Link>
        </li>
      </ol>
    </main>
  );
}
