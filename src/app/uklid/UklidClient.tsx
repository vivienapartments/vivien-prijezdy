'use client';

import { useCallback, useEffect, useState } from 'react';
import type { UklidKarta } from '@/lib/uklid-den';

type DenVolba = 'dnes' | 'zitra' | 'pozitri';

type DenOdpoved = {
  ok?: boolean;
  dnes?: string;
  den?: string;
  karty?: UklidKarta[];
  pocetKUklidu?: number;
  pocty?: { dnes: number; zitra: number; pozitri: number };
  dny?: { dnes: string; zitra: string; pozitri: string };
  error?: string;
};

function popisekDne(volba: DenVolba, dny?: DenOdpoved['dny']): string {
  if (volba === 'dnes') return 'Dnes';
  if (volba === 'zitra') return 'Zítra';
  if (!dny?.pozitri) return 'Pozítří';
  const [y, m, d] = dny.pozitri.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dnyTyden = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  return `${dnyTyden[dt.getUTCDay()]} ${d}. ${m}.`;
}

function datumCesky(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  return `${d}. ${m}. ${y}`;
}

export function UklidClient() {
  const [volba, setVolba] = useState<DenVolba>('dnes');
  const [data, setData] = useState<DenOdpoved | null>(null);
  const [chyba, setChyba] = useState('');
  const [cekam, setCekam] = useState(false);
  const [zavadyId, setZavadyId] = useState<string | null>(null);
  const [zavadyText, setZavadyText] = useState('');
  const [sbalene, setSbalene] = useState<Record<string, boolean>>({});
  const [pushHlaska, setPushHlaska] = useState('');

  const nacti = useCallback(async (ktery: DenVolba) => {
    setCekam(true);
    setChyba('');
    try {
      const denUrl = data?.dny?.[ktery];
      const qs = denUrl ? `?den=${encodeURIComponent(denUrl)}` : '';
      const res = await fetch(`/api/uklid/den${qs}`, { cache: 'no-store' });
      const json = (await res.json().catch(() => null)) as DenOdpoved | null;
      if (!res.ok || !json?.ok) {
        setChyba(json?.error || 'Načtení se nepovedlo.');
        return;
      }
      setData(json);
      const sbal: Record<string, boolean> = {};
      for (const k of json.karty || []) {
        if (k.uklizeno) sbal[k.rezervace] = true;
      }
      setSbalene(sbal);
    } finally {
      setCekam(false);
    }
  }, [data?.dny]);

  useEffect(() => {
    void nacti('dnes');
    // jen při startu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function zmenDen(nova: DenVolba) {
    setVolba(nova);
    if (!data?.dny) {
      await nacti(nova);
      return;
    }
    setCekam(true);
    setChyba('');
    try {
      const den = data.dny[nova];
      const res = await fetch(`/api/uklid/den?den=${encodeURIComponent(den)}`, { cache: 'no-store' });
      const json = (await res.json().catch(() => null)) as DenOdpoved | null;
      if (!res.ok || !json?.ok) {
        setChyba(json?.error || 'Načtení se nepovedlo.');
        return;
      }
      setData(json);
      const sbal: Record<string, boolean> = {};
      for (const k of json.karty || []) {
        if (k.uklizeno) sbal[k.rezervace] = true;
      }
      setSbalene(sbal);
    } finally {
      setCekam(false);
    }
  }

  async function akce(body: Record<string, unknown>) {
    setCekam(true);
    setChyba('');
    try {
      const res = await fetch('/api/uklid/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        setChyba(json?.error || 'Akce se nepovedla.');
        return false;
      }
      await zmenDen(volba);
      return true;
    } finally {
      setCekam(false);
    }
  }

  async function zapnoutPush() {
    setPushHlaska('');
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushHlaska('Tento telefon upozornění neumí.');
        return;
      }
      const reg = await navigator.serviceWorker.register('/uklid/sw.js', { scope: '/uklid/' });
      await navigator.serviceWorker.ready;
      const meta = await fetch('/api/uklid/push', { cache: 'no-store' });
      const info = (await meta.json().catch(() => null)) as { publicKey?: string; error?: string } | null;
      if (!info?.publicKey) {
        setPushHlaska('Upozornění ještě nejsou připravená.');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setPushHlaska('Bez povolení upozornění nepřijdou.');
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: klicNaBajty(info.publicKey),
      });
      const raw = sub.toJSON();
      const res = await fetch('/api/uklid/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          akce: 'zapnout',
          nazev: 'Miluška',
          endpoint: raw.endpoint,
          keys: raw.keys,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      setPushHlaska(res.ok && json?.ok ? 'Upozornění zapnutá.' : json?.error || 'Nepovedlo se.');
    } catch {
      setPushHlaska('Nepovedlo se zapnout upozornění.');
    }
  }

  async function zkusitPush() {
    setPushHlaska('');
    const res = await fetch('/api/uklid/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce: 'zkusit' }),
    });
    const json = (await res.json().catch(() => null)) as { text?: string; error?: string } | null;
    setPushHlaska(json?.text || json?.error || 'Hotovo.');
  }

  const karty = data?.karty || [];
  const dnesni = volba === 'dnes';
  const pocty = data?.pocty || { dnes: 0, zitra: 0, pozitri: 0 };

  return (
    <main className="uk">
      <h1>Úklid</h1>
      <p className="uk-kdo">
        Miluška
        {data?.den ? ` · ${datumCesky(data.den)}` : ''}
      </p>

      <div className="uk-dny">
        {(
          [
            ['dnes', pocty.dnes],
            ['zitra', pocty.zitra],
            ['pozitri', pocty.pozitri],
          ] as const
        ).map(([k, n]) => (
          <button
            key={k}
            type="button"
            className={volba === k ? 'is-on' : undefined}
            onClick={() => void zmenDen(k)}
            disabled={cekam}
          >
            {popisekDne(k, data?.dny)} {n}
          </button>
        ))}
      </div>

      {chyba ? <p className="uk-chyba">{chyba}</p> : null}

      {!karty.length && !cekam ? <p className="uk-prazdno">Nic k úklidu.</p> : null}

      {karty.map((k) => {
        const sbaleno = Boolean(sbalene[k.rezervace]);
        return (
          <article
            key={k.rezervace}
            className={`uk-karta${k.uklizeno ? ' is-hotovo' : ''}${sbaleno ? ' is-sbaleno' : ''}`}
          >
            <button
              type="button"
              className="uk-karta__hlava"
              style={{ width: '100%', background: 'transparent', border: 0, padding: 0, color: 'inherit', cursor: k.uklizeno ? 'pointer' : 'default' }}
              onClick={() => {
                if (!k.uklizeno) return;
                setSbalene((prev) => ({ ...prev, [k.rezervace]: !prev[k.rezervace] }));
              }}
            >
              <span className="uk-apt">{k.apartman}</span>
              <span
                className={`uk-stitek${k.uklizeno ? ' is-ok' : k.poradi === 0 ? ' is-ted' : ''}`}
              >
                {k.poradiStitek}
              </span>
            </button>

            <div className="uk-karta__telo">
              <div className="uk-radky">
                Odjezd: <b>{k.odjezdText}</b>
                <br />
                Další host: <b>{k.dalsiText}</b>
              </div>
              {k.poznamka ? <div className="uk-poznamka">{k.poznamka}</div> : null}

              <div className="uk-tl">
                {k.uklizeno ? (
                  <>
                    {k.emailHostovi.stav === 'muze' && dnesni ? (
                      <button
                        type="button"
                        className="is-email"
                        disabled={cekam}
                        onClick={() => {
                          if (!window.confirm('Opravdu odeslat?')) return;
                          void akce({ rezervace: k.rezervace, akce: 'email-pripraveno' });
                        }}
                      >
                        Dát vědět hostovi (e-mail)
                      </button>
                    ) : null}
                    {k.emailHostovi.stav === 'odeslano' ? (
                      <button type="button" className="is-email" disabled>
                        {k.emailHostovi.odeslanoText || 'E-mail odeslán ✓'}
                      </button>
                    ) : null}
                    {k.emailHostovi.stav === 'bez_emailu' ? (
                      <button type="button" className="is-email" disabled>
                        host nemá e-mail, dáme vědět my
                      </button>
                    ) : null}
                    {dnesni ? (
                      <button
                        type="button"
                        disabled={cekam}
                        onClick={() => void akce({ rezervace: k.rezervace, akce: 'vratit-uklid' })}
                      >
                        Vrátit
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={cekam}
                      onClick={() => {
                        setZavadyId(k.rezervace);
                        setZavadyText('');
                      }}
                    >
                      Závada
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="is-hl"
                      disabled={cekam || !dnesni || !k.muzeUklidit}
                      onClick={() => void akce({ rezervace: k.rezervace, akce: 'uklid' })}
                    >
                      Uklizeno
                    </button>
                    <button
                      type="button"
                      disabled={cekam}
                      onClick={() => {
                        setZavadyId(k.rezervace);
                        setZavadyText('');
                      }}
                    >
                      Závada
                    </button>
                  </>
                )}
              </div>
              {!k.uklizeno && dnesni && !k.muzeUklidit ? (
                <p className="uk-mdl">Uklizeno půjde po převzetí</p>
              ) : null}

              {zavadyId === k.rezervace ? (
                <div className="uk-zavady">
                  <textarea
                    value={zavadyText}
                    onChange={(e) => setZavadyText(e.target.value)}
                    placeholder="Co není v pořádku"
                    maxLength={2000}
                  />
                  <button
                    type="button"
                    className="is-hl"
                    disabled={cekam || !zavadyText.trim()}
                    onClick={() => {
                      void akce({
                        rezervace: k.rezervace,
                        akce: 'zavady',
                        text: zavadyText,
                        dalsiRezervace: k.dalsiRezervace,
                      }).then((ok) => {
                        if (ok) {
                          setZavadyId(null);
                          setZavadyText('');
                        }
                      });
                    }}
                  >
                    Uložit závadu
                  </button>
                  <button type="button" onClick={() => setZavadyId(null)}>
                    Zrušit
                  </button>
                </div>
              ) : null}
            </div>
          </article>
        );
      })}

      <details className="uk-push">
        <summary>Upozornění na tomto telefonu</summary>
        <div className="uk-push__telo">
          <button type="button" onClick={() => void zapnoutPush()}>
            Zapnout upozornění
          </button>
          <button type="button" onClick={() => void zkusitPush()}>
            Zkusit
          </button>
          {pushHlaska ? <p className="uk-mdl">{pushHlaska}</p> : null}
        </div>
      </details>
    </main>
  );
}

function klicNaBajty(klic: string): ArrayBuffer {
  const pad = '='.repeat((4 - (klic.length % 4)) % 4);
  const raw = atob((klic + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new ArrayBuffer(raw.length);
  const pohled = new Uint8Array(out);
  for (let i = 0; i < raw.length; i += 1) pohled[i] = raw.charCodeAt(i);
  return out;
}
