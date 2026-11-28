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

function otevriOdkazy(odkazy: Partial<Record<OdeslaniKanal, string>>) {
  const poradi: OdeslaniKanal[] = ['whatsapp', 'sms', 'email'];
  const hrefs = poradi.map((k) => odkazy[k]).filter((x): x is string => Boolean(x));
  if (!hrefs.length) return;
  /* První v novém okně / mailto, další taky otevřít (SMS často window.location). */
  for (let i = 0; i < hrefs.length; i += 1) {
    const href = hrefs[i];
    if (href.startsWith('mailto:') || href.startsWith('sms:')) {
      if (i === 0) window.location.href = href;
      else window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }
}

export function PoptavkaDetail({ id, onZavrit }: { id: string; onZavrit: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [chyba, setChyba] = useState('');
  const [hlaska, setHlaska] = useState('');
  const [cekam, setCekam] = useState(false);
  const [navrh, setNavrh] = useState('');
  const [ukazNejde, setUkazNejde] = useState(false);
  const [emailHosta, setEmailHosta] = useState('');
  const [wa, setWa] = useState(true);
  const [sms, setSms] = useState(false);
  const [email, setEmail] = useState(false);
  const [waNejde, setWaNejde] = useState(true);
  const [smsNejde, setSmsNejde] = useState(false);
  const [emailNejde, setEmailNejde] = useState(false);

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

  function vybrane(proNejde: boolean): OdeslaniKanal[] {
    const out: OdeslaniKanal[] = [];
    if (proNejde ? waNejde : wa) out.push('whatsapp');
    if (proNejde ? smsNejde : sms) out.push('sms');
    if (proNejde ? emailNejde : email) out.push('email');
    return out;
  }

  async function akce(
    kod: string,
    extras: Record<string, unknown> = {},
  ): Promise<{
    ok: boolean;
    odkazy?: Partial<Record<OdeslaniKanal, string>>;
    emailPoslan?: boolean;
    emailMailto?: boolean;
    emailOdeslanoNa?: string | null;
    emailTestMode?: boolean;
  }> {
    setCekam(true);
    setChyba('');
    setHlaska('');
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
        odkazy?: Partial<Record<OdeslaniKanal, string>>;
        emailPoslan?: boolean;
        emailMailto?: boolean;
        emailOdeslanoNa?: string | null;
        emailTestMode?: boolean;
        error?: string;
      };
      if (!json.ok || !json.poptavka) {
        setChyba(json.error || 'Akce se nepovedla.');
        return { ok: false };
      }
      setD(json.poptavka);
      const odkazy = json.odkazy || (json.odkaz ? { whatsapp: json.odkaz } : {});
      return {
        ok: true,
        odkazy,
        emailPoslan: json.emailPoslan,
        emailMailto: json.emailMailto,
        emailOdeslanoNa: json.emailOdeslanoNa,
        emailTestMode: json.emailTestMode,
      };
    } catch {
      setChyba('Akce se nepovedla.');
      return { ok: false };
    } finally {
      setCekam(false);
    }
  }

  async function posliVybrane(kod: 'potvrdit' | 'nejde') {
    const kanaly = vybrane(kod === 'nejde');
    if (!kanaly.length) {
      setChyba('Zaškrtněte aspoň WhatsApp, SMS nebo e-mail.');
      return;
    }
    if (kanaly.includes('email') && !emailHosta.trim().includes('@')) {
      setChyba('Napište e-mail hosta.');
      return;
    }
    const vysledek = await akce(kod, {
      kanaly,
      email: emailHosta.trim(),
      ...(kod === 'nejde' ? { navrh: navrh.trim() } : {}),
    });
    if (!vysledek.ok) return;
    if (vysledek.odkazy) otevriOdkazy(vysledek.odkazy);
    if (vysledek.emailPoslan) {
      setHlaska(
        vysledek.emailTestMode && vysledek.emailOdeslanoNa
          ? `TEST: hezký e-mail šel na ${vysledek.emailOdeslanoNa}.`
          : vysledek.emailOdeslanoNa
            ? `Hezký e-mail odešel na ${vysledek.emailOdeslanoNa}.`
            : 'Hezký e-mail je odeslaný.',
      );
    } else if (vysledek.emailMailto) {
      setHlaska('E-mail se otevřel v telefonu (bez SMTP). Na ostře odejde hezký mail.');
    }
    if (kod === 'nejde') setUkazNejde(false);
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

  function kanalyUi(
    waOn: boolean,
    setWaOn: (v: boolean) => void,
    smsOn: boolean,
    setSmsOn: (v: boolean) => void,
    emailOn: boolean,
    setEmailOn: (v: boolean) => void,
  ) {
    return (
      <div className="ph-poptavka__kanaly">
        <label className="ph-poptavka__check">
          <input type="checkbox" checked={waOn} onChange={(e) => setWaOn(e.target.checked)} />
          WhatsApp
        </label>
        <label className="ph-poptavka__check">
          <input type="checkbox" checked={smsOn} onChange={(e) => setSmsOn(e.target.checked)} />
          SMS
        </label>
        <label className="ph-poptavka__check">
          <input type="checkbox" checked={emailOn} onChange={(e) => setEmailOn(e.target.checked)} />
          E-mail
        </label>
      </div>
    );
  }

  return (
    <div className="ph-poptavka" role="dialog" aria-modal="true" aria-label="Poptávka">
      <div className="ph-poptavka__vnitr">
        <button type="button" className="ph-poptavka__zavrit" onClick={onZavrit}>
          Zavřít
        </button>
        {chyba ? <p className="ph-poptavka__chyba">{chyba}</p> : null}
        {hlaska ? <p className="ph-poptavka__ok">{hlaska}</p> : null}
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
                {kanalyUi(wa, setWa, sms, setSms, email, setEmail)}
                {email ? (
                  <label className="ph-poptavka__email">
                    E-mail hosta
                    <input
                      type="email"
                      value={emailHosta}
                      onChange={(e) => setEmailHosta(e.target.value)}
                      placeholder="host@email.cz"
                      autoComplete="email"
                    />
                  </label>
                ) : null}
                <div className="ph-poptavka__akce">
                  <button
                    type="button"
                    className="ph-btn"
                    disabled={cekam}
                    onClick={() => void posliVybrane('potvrdit')}
                  >
                    Potvrdit a odeslat
                  </button>
                </div>
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
                  onClick={() => setUkazNejde((v) => !v)}
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
                {kanalyUi(waNejde, setWaNejde, smsNejde, setSmsNejde, emailNejde, setEmailNejde)}
                {emailNejde ? (
                  <label className="ph-poptavka__email">
                    E-mail hosta
                    <input
                      type="email"
                      value={emailHosta}
                      onChange={(e) => setEmailHosta(e.target.value)}
                      placeholder="host@email.cz"
                      autoComplete="email"
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  className="ph-btn"
                  disabled={cekam}
                  onClick={() => void posliVybrane('nejde')}
                >
                  Odeslat NEJDE
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
