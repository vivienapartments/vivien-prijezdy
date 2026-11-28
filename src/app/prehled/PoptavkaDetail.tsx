'use client';

import { useEffect, useState } from 'react';

type Detail = {
  id: string;
  jmeno: string;
  telefon: string;
  termin: string;
  apartman: string;
  cena: string;
  odkud: string;
  jazyk: string;
  poznamka: string;
  stav: string;
  stavText: string;
  lhutaDo: string | null;
  navrhMajitele: string;
  kanal: string;
  zkouska: boolean;
};

type OdeslaniKanal = 'whatsapp' | 'sms' | 'email';

export function PoptavkaDetail({ id, onZavrit }: { id: string; onZavrit: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [chyba, setChyba] = useState('');
  const [cekam, setCekam] = useState(false);
  const [navrh, setNavrh] = useState('');
  const [ukazNejde, setUkazNejde] = useState(false);
  const [emailHosta, setEmailHosta] = useState('');
  const [ukazEmail, setUkazEmail] = useState(false);
  const [cekajiciAkce, setCekajiciAkce] = useState<'potvrdit' | 'nejde' | null>(null);

  useEffect(() => {
    let zrus = false;
    void (async () => {
      try {
        const res = await fetch(`/api/prehled/poptavka?id=${encodeURIComponent(id)}`, {
          cache: 'no-store',
        });
        const json = (await res.json()) as { ok?: boolean; poptavka?: Detail; error?: string };
        if (zrus) return;
        if (!json.ok || !json.poptavka) {
          setChyba(json.error || 'Poptávka se nenačetla.');
          return;
        }
        setD(json.poptavka);
        setNavrh(json.poptavka.navrhMajitele || '');
      } catch {
        if (!zrus) setChyba('Poptávka se nenačetla.');
      }
    })();
    return () => {
      zrus = true;
    };
  }, [id]);

  async function akce(
    kod: string,
    extras: Record<string, unknown> = {},
  ): Promise<boolean> {
    setCekam(true);
    setChyba('');
    try {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const res = await fetch('/api/prehled/poptavka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, akce: kod, ios, ...extras }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        poptavka?: Detail;
        odkaz?: string | null;
        error?: string;
      };
      if (!json.ok || !json.poptavka) {
        setChyba(json.error || 'Akce se nepovedla.');
        return false;
      }
      setD(json.poptavka);
      if (json.odkaz) {
        if (String(json.odkaz).startsWith('mailto:')) {
          window.location.href = json.odkaz;
        } else {
          window.open(json.odkaz, '_blank', 'noopener,noreferrer');
        }
      }
      return true;
    } catch {
      setChyba('Akce se nepovedla.');
      return false;
    } finally {
      setCekam(false);
    }
  }

  async function posli(kod: 'potvrdit' | 'nejde', kanal: OdeslaniKanal) {
    if (kanal === 'email') {
      const mail = emailHosta.trim();
      if (!mail.includes('@')) {
        setUkazEmail(true);
        setCekajiciAkce(kod);
        setChyba('Napište e-mail hosta.');
        return;
      }
      const ok = await akce(kod, {
        kanal: 'email',
        email: mail,
        ...(kod === 'nejde' ? { navrh: navrh.trim() } : {}),
      });
      if (ok) {
        setUkazEmail(false);
        setCekajiciAkce(null);
        if (kod === 'nejde') setUkazNejde(false);
      }
      return;
    }
    const ok = await akce(kod, {
      kanal,
      ...(kod === 'nejde' ? { navrh: navrh.trim() } : {}),
    });
    if (ok && kod === 'nejde') setUkazNejde(false);
  }

  const telCiste = (d?.telefon || '').replace(/\D/g, '');
  const telHref = telCiste ? `tel:+${telCiste}` : '';
  const stav = d?.stav || '';
  const muzePotvrdit = stav === 'predbezne' || stav === 'nova';
  const muzeNejde =
    stav === 'predbezne' ||
    stav === 'nova' ||
    stav === 'ceka_na_hosta' ||
    stav === 'neozval_se';

  return (
    <div className="ph-poptavka" role="dialog" aria-modal="true" aria-label="Poptávka">
      <div className="ph-poptavka__vnitr">
        <button type="button" className="ph-poptavka__zavrit" onClick={onZavrit}>
          Zavřít
        </button>
        {chyba ? <p className="ph-poptavka__chyba">{chyba}</p> : null}
        {!d && !chyba ? <p>Načítám…</p> : null}
        {d ? (
          <>
            {d.zkouska ? <p className="ph-poptavka__zkouska">ZKOUŠKA</p> : null}
            <h2>{d.jmeno}</h2>
            <p>{d.termin}</p>
            <p>{d.apartman}</p>
            {d.cena ? <p>{d.cena}</p> : null}
            <p>{d.odkud}</p>
            <p>Jazyk: {d.jazyk}</p>
            <p style={{ whiteSpace: 'nowrap' }}>{d.telefon}</p>
            {d.poznamka ? <p>{d.poznamka}</p> : null}
            <p>Stav: {d.stavText || d.stav}</p>
            {d.lhutaDo ? (
              <p>
                Lhůta hosta:{' '}
                {new Date(d.lhutaDo).toLocaleString('cs-CZ', {
                  timeZone: 'Europe/Prague',
                  day: 'numeric',
                  month: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            ) : null}

            <div className="ph-poptavka__akce">
              {telHref ? (
                <a className="ph-btn" href={telHref}>
                  Zavolat
                </a>
              ) : null}
            </div>

            {muzePotvrdit ? (
              <div className="ph-poptavka__odeslani">
                <p className="ph-poptavka__odeslani-nadpis">Potvrdit a poslat hostovi</p>
                <div className="ph-poptavka__akce">
                  <button
                    type="button"
                    className="ph-btn"
                    disabled={cekam}
                    onClick={() => void posli('potvrdit', 'whatsapp')}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    className="ph-btn"
                    disabled={cekam}
                    onClick={() => void posli('potvrdit', 'sms')}
                  >
                    SMS
                  </button>
                  <button
                    type="button"
                    className="ph-btn"
                    disabled={cekam}
                    onClick={() => {
                      setUkazEmail(true);
                      setCekajiciAkce('potvrdit');
                      setChyba('');
                    }}
                  >
                    E-mail
                  </button>
                </div>
              </div>
            ) : null}

            {ukazEmail && (muzePotvrdit || ukazNejde) ? (
              <div className="ph-poptavka__nejde">
                <label>
                  E-mail hosta
                  <input
                    type="email"
                    value={emailHosta}
                    onChange={(e) => setEmailHosta(e.target.value)}
                    placeholder="host@email.cz"
                    autoComplete="email"
                  />
                </label>
                <button
                  type="button"
                  className="ph-btn"
                  disabled={cekam}
                  onClick={() => void posli(cekajiciAkce || 'potvrdit', 'email')}
                >
                  Odeslat e-mailem
                </button>
              </div>
            ) : null}

            <div className="ph-poptavka__akce">
              {stav === 'ceka_na_hosta' ? (
                <button
                  type="button"
                  className="ph-btn"
                  disabled={cekam}
                  onClick={() => void akce('host_potvrdil')}
                >
                  HOST POTVRDIL
                </button>
              ) : null}
              {stav === 'potvrzeno' ? (
                <button
                  type="button"
                  className="ph-btn"
                  disabled={cekam}
                  onClick={() => void akce('zapsano_bh')}
                >
                  ZAPSÁNO V BETTER HOTELU
                </button>
              ) : null}
              {stav === 'predbezne' ||
              stav === 'nova' ||
              stav === 'ceka_na_hosta' ||
              stav === 'potvrzeno' ||
              stav === 'neozval_se' ? (
                <button
                  type="button"
                  className="ph-btn"
                  disabled={cekam}
                  onClick={() => void akce('do_vyrizenych')}
                >
                  DO VYŘÍZENÝCH
                </button>
              ) : null}
              {stav === 'neozval_se' ? (
                <button
                  type="button"
                  className="ph-btn"
                  disabled={cekam}
                  onClick={() => void akce('prodlouzit')}
                >
                  PRODLOUŽIT O 24 H
                </button>
              ) : null}
              {muzeNejde ? (
                <button
                  type="button"
                  className="ph-btn"
                  disabled={cekam}
                  onClick={() => {
                    setUkazNejde((v) => !v);
                    setUkazEmail(false);
                    setCekajiciAkce(null);
                  }}
                >
                  NEJDE
                </button>
              ) : null}
            </div>

            {ukazNejde ? (
              <div className="ph-poptavka__nejde">
                <label>
                  Můj návrh
                  <textarea
                    value={navrh}
                    onChange={(e) => setNavrh(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                </label>
                <p className="ph-poptavka__odeslani-nadpis">Poslat NEJDE hostovi</p>
                <div className="ph-poptavka__akce">
                  <button
                    type="button"
                    className="ph-btn"
                    disabled={cekam}
                    onClick={() => void posli('nejde', 'whatsapp')}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    className="ph-btn"
                    disabled={cekam}
                    onClick={() => void posli('nejde', 'sms')}
                  >
                    SMS
                  </button>
                  <button
                    type="button"
                    className="ph-btn"
                    disabled={cekam}
                    onClick={() => {
                      setUkazEmail(true);
                      setCekajiciAkce('nejde');
                      setChyba('');
                    }}
                  >
                    E-mail
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
