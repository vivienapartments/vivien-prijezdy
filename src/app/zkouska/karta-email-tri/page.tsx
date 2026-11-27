/**
 * Stříbrná vs zlatá karta (stejný text). Jen karty, ne celý e-mail.
 */
export default function KartaEmailTriPage() {
  const stribrna = '/email/karticka-stribrny-web-blank.png';
  const zlata = '/email/karticka-zlaty-web-blank.png';

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
      <style>{`
        .wrap { max-width: 420px; margin: 0 auto; }
        .h1 { margin: 0 0 6px; font-size: 22px; color: #c9a84c; font-weight: 400; }
        .lead { margin: 0 0 18px; font-size: 14px; line-height: 1.45; color: #cbbba8; font-family: Arial, sans-serif; }
        .odkazy { display: grid; gap: 10px; margin: 0 0 28px; }
        .odkazy a {
          display: block; padding: 14px 12px; border-radius: 12px;
          border: 1px solid #c9a84c; background: #1c1712; color: #f5efe3;
          text-decoration: none; font-family: Arial, sans-serif;
        }
        .odkazy b { display: block; margin-bottom: 4px; }
        .odkazy span { color: #cbbba8; font-size: 13px; }
        .blok { margin: 0 0 28px; }
        .lab { margin: 0 0 10px; font-size: 15px; color: #f5efe3; font-family: Arial, sans-serif; font-weight: 700; }
        .card {
          position: relative;
          width: 100%;
          aspect-ratio: 1200 / 692;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 13px 28px rgba(28,23,18,0.45);
        }
        .card img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .meta {
          position: absolute;
          right: 5.5%;
          top: 38%;
          bottom: 10%;
          left: 38%;
          text-align: right;
          color: #1c1712;
          font-family: Georgia, 'Times New Roman', serif;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: flex-start;
        }
        .name {
          font-size: clamp(26px, 8.2vw, 34px);
          line-height: 1.1;
          font-weight: 500;
        }
        .pod {
          margin-top: 8px;
          font-size: clamp(12px, 3.5vw, 15px);
          line-height: 1.3;
        }
        .cta {
          margin-top: auto;
          padding-top: 12px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: clamp(12px, 3.4vw, 14px);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
      <div className="wrap">
        <h1 className="h1">Stříbrná, nebo zlatá</h1>
        <p className="lead">
          Stejný text. Vyberte barvu. Pak otevřete celý mail.
        </p>

        <div className="odkazy">
          <a href="/zkouska/email-podekovani?barva=stribrna">
            <b>Mail · stříbrná</b>
            <span>Celý e-mail se stříbrnou kartou</span>
          </a>
          <a href="/zkouska/email-podekovani?barva=zlata">
            <b>Mail · zlatá</b>
            <span>Celý e-mail se zlatou kartou</span>
          </a>
        </div>

        <div className="blok">
          <div className="lab">Stříbrná</div>
          <div className="card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={stribrna} alt="" />
            <div className="meta">
              <div className="name">Anna Šťastná</div>
              <div className="pod">Vaše osobní karta VIVIEN Clubu</div>
              <div className="cta">Prohlédnout kartu ›</div>
            </div>
          </div>
        </div>

        <div className="blok">
          <div className="lab">Zlatá</div>
          <div className="card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zlata} alt="" />
            <div className="meta">
              <div className="name">Anna Šťastná</div>
              <div className="pod">Vaše osobní karta VIVIEN Clubu</div>
              <div className="cta">Prohlédnout kartu ›</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
