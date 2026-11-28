'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { jeIos, smsOdkaz } from '@/lib/brana';
import { odkazObecnePoptavky, textPozvankyPoptavky } from '@/lib/poptavka-pozvanka';
import { odkazWhatsAppPrehled } from '@/lib/whatsapp-zprava';
import { PoptavkaDetail } from '../PoptavkaDetail';

type Radek = {
  id: string;
  cas: string;
  jmeno: string;
  telefon: string;
  prijezd: string;
  odjezd: string;
  termin: string;
  apartman: string;
  cena?: string;
  odkud: string;
  stav: string;
  stavText: string;
  zkouska: boolean;
  vyrizena: boolean;
};

type KanalKontakt = 'telefon' | 'email';
type KanalOdeslani = 'whatsapp' | 'sms' | 'email';

function casCesky(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  return new Intl.DateTimeFormat('cs-CZ', {
    timeZone: 'Europe/Prague',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(t));
}

function jenCisliceTel(raw: string): string {
  return String(raw || '').replace(/\D/g, '');
}

function vychoziZprava(): string {
  return textPozvankyPoptavky('[Odkaz na poptávku]');
}

export function PoptavkyClient() {
  const [radky, setRadky] = useState<Radek[]>([]);
  const [zalozka, setZalozka] = useState<'nevyrizene' | 'vyrizene'>('nevyrizene');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [chyba, setChyba] = useState('');
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [cekam, setCekam] = useState(false);
  const [nova, setNova] = useState(false);
  const [kanalKontakt, setKanalKontakt] = useState<KanalKontakt>('telefon');
  const [telefon, setTelefon] = useState('');
  const [email, setEmail] = useState('');
  const [zprava, setZprava] = useState(vychoziZprava);

  const nacti = useCallback(async () => {
    setChyba('');
    try {
      const res = await fetch('/api/prehled/poptavka', { cache: 'no-store' });
      const json = (await res.json()) as { ok?: boolean; poptavky?: Radek[]; error?: string };
      if (!json.ok || !json.poptavky) {
        setChyba(json.error || 'Seznam se nenačetl.');
        return;
      }
      setRadky(json.poptavky);
    } catch {
      setChyba('Seznam se nenačetl.');
    }
  }, []);

  useEffect(() => {
    void nacti();
  }, [nacti]);

  const filtrovane = useMemo(() => {
    return radky.filter((r) => (zalozka === 'vyrizene' ? r.vyrizena : !r.vyrizena));
  }, [radky, zalozka]);

  function textSeOdkazem(): string {
    /* Vždy ostrá adresa, i když majitel zkouší z localhostu. */
    const odkaz = odkazObecnePoptavky();
    const zaklad = (zprava || '').trim() || vychoziZprava();
    if (zaklad.includes('[Odkaz na poptávku]')) {
      return zaklad.split('[Odkaz na poptávku]').join(odkaz);
    }
    if (zaklad.includes(odkaz)) return zaklad;
    return `${zaklad}\n\n${odkaz}`;
  }

  async function posliPozvanku(kanal: KanalOdeslani) {
    setCekam(true);
    setChyba('');
    setHlaska(null);
    try {
      const dig = jenCisliceTel(telefon);
      const mail = email.trim();
      if (kanalKontakt === 'telefon' && dig.length < 9) {
        setChyba('Napište telefon hosta.');
        return;
      }
      if (kanalKontakt === 'email' && !mail.includes('@')) {
        setChyba('Napište e-mail hosta.');
        return;
      }
      if ((kanal === 'whatsapp' || kanal === 'sms') && kanalKontakt === 'email') {
        setChyba('Pro WhatsApp a SMS zvolte telefon.');
        return;
      }
      if (kanal === 'email' && kanalKontakt === 'telefon') {
        setChyba('Pro e-mail zvolte e-mailovou adresu.');
        return;
      }

      const text = textSeOdkazem();
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

      if (kanal === 'email') {
        const mailto = `mailto:${encodeURIComponent(mail)}?subject=${encodeURIComponent(
          'VIVIEN Apartments, poptávka termínu',
        )}&body=${encodeURIComponent(text)}`;
        window.location.href = mailto;
        setHlaska('Otevřel se e-mail s textem a odkazem na poptávku.');
      } else if (kanal === 'whatsapp') {
        window.open(odkazWhatsAppPrehled(dig, text, ua), '_blank');
        setHlaska('WhatsApp je otevřený. Zkontrolujte text a odešlete.');
      } else {
        window.location.href = smsOdkaz(`+${dig}`, text, jeIos(ua));
        setHlaska('SMS je připravená. Zkontrolujte text a odešlete.');
      }

      setNova(false);
      setTelefon('');
      setEmail('');
      setZprava(vychoziZprava());
    } finally {
      setCekam(false);
    }
  }

  async function archivovat(id: string) {
    setCekam(true);
    setChyba('');
    try {
      const res = await fetch('/api/prehled/poptavka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, akce: 'do_vyrizenych' }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!json.ok) {
        setChyba(json.error || 'Nepovedlo se.');
        return;
      }
      await nacti();
    } catch {
      setChyba('Nepovedlo se.');
    } finally {
      setCekam(false);
    }
  }

  async function zpet(id: string) {
    setCekam(true);
    setChyba('');
    try {
      const res = await fetch('/api/prehled/poptavka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, akce: 'zpet_nevyrizene' }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!json.ok) {
        setChyba(json.error || 'Nepovedlo se.');
        return;
      }
      await nacti();
    } catch {
      setChyba('Nepovedlo se.');
    } finally {
      setCekam(false);
    }
  }

  async function smazat(id: string, jmeno: string) {
    if (!window.confirm(`Smazat poptávku ${jmeno}? Termín se uvolní.`)) return;
    setCekam(true);
    setChyba('');
    try {
      const res = await fetch('/api/prehled/poptavka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, akce: 'smazat' }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!json.ok) {
        setChyba(json.error || 'Nepovedlo se smazat.');
        return;
      }
      setDetailId(null);
      await nacti();
    } catch {
      setChyba('Nepovedlo se smazat.');
    } finally {
      setCekam(false);
    }
  }

  const pocetNev = radky.filter((r) => !r.vyrizena).length;
  const pocetVyr = radky.filter((r) => r.vyrizena).length;

  if (nova) {
    return (
      <main className="ph" style={{ padding: '1rem', maxWidth: 720, margin: '0 auto' }}>
        <p>
          <button
            type="button"
            onClick={() => {
              setNova(false);
              setChyba('');
            }}
            style={{
              background: 'transparent',
              border: 0,
              color: '#c9a84c',
              padding: 0,
              cursor: 'pointer',
              font: 'inherit',
            }}
          >
            ← Zpět na poptávky
          </button>
        </p>
        <h1 style={{ color: '#c9a84c', fontFamily: 'Georgia, serif', fontWeight: 500 }}>
          Nová poptávka
        </h1>
        <p style={{ color: '#b7aa98', fontSize: '0.9rem' }}>
          Pošlete hostovi odkaz na poptávku. Až ji vyplní, uvidíte ji tady se jménem a telefonem.
        </p>
        {chyba ? <p className="ph-chyba">{chyba}</p> : null}

        <div
          style={{
            border: '1px solid #3d342a',
            borderRadius: 14,
            padding: '14px 14px 16px',
            background: '#15110e',
            marginTop: '1rem',
          }}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              className="ph-btn"
              style={{
                flex: 1,
                background: kanalKontakt === 'telefon' ? '#c9a84c' : 'transparent',
                color: kanalKontakt === 'telefon' ? '#1a1510' : '#c9a84c',
                border: '1px solid #c9a84c',
              }}
              onClick={() => setKanalKontakt('telefon')}
            >
              Telefon
            </button>
            <button
              type="button"
              className="ph-btn"
              style={{
                flex: 1,
                background: kanalKontakt === 'email' ? '#c9a84c' : 'transparent',
                color: kanalKontakt === 'email' ? '#1a1510' : '#c9a84c',
                border: '1px solid #c9a84c',
              }}
              onClick={() => setKanalKontakt('email')}
            >
              E-mail
            </button>
          </div>

          {kanalKontakt === 'telefon' ? (
            <label style={{ display: 'block', marginBottom: 10, fontSize: '0.82rem', color: '#b7aa98' }}>
              Telefon
              <input
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                placeholder="+420 …"
                inputMode="tel"
                autoComplete="tel"
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 4,
                  padding: '11px 12px',
                  borderRadius: 10,
                  border: '1px solid #3d342a',
                  background: '#0f0c0a',
                  color: '#efe6d8',
                  font: 'inherit',
                }}
              />
            </label>
          ) : (
            <label style={{ display: 'block', marginBottom: 10, fontSize: '0.82rem', color: '#b7aa98' }}>
              E-mail
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jmeno@email.cz"
                inputMode="email"
                autoComplete="email"
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 4,
                  padding: '11px 12px',
                  borderRadius: 10,
                  border: '1px solid #3d342a',
                  background: '#0f0c0a',
                  color: '#efe6d8',
                  font: 'inherit',
                }}
              />
            </label>
          )}

          <label style={{ display: 'block', marginBottom: 10, fontSize: '0.82rem', color: '#b7aa98' }}>
            Zpráva
            <textarea
              value={zprava}
              onChange={(e) => setZprava(e.target.value)}
              rows={14}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 4,
                padding: '11px 12px',
                borderRadius: 10,
                border: '1px solid #3d342a',
                background: '#0f0c0a',
                color: '#efe6d8',
                font: 'inherit',
                lineHeight: 1.4,
                resize: 'vertical',
              }}
            />
          </label>
          <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#b7aa98' }}>
            Odkaz se doplní automaticky při odeslání místo [Odkaz na poptávku].
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <button
              type="button"
              className="ph-btn"
              disabled={cekam}
              onClick={() => void posliPozvanku('whatsapp')}
              style={{ border: '1px solid #c9a84c', background: 'transparent', color: '#c9a84c', fontWeight: 700 }}
            >
              WhatsApp
            </button>
            <button
              type="button"
              className="ph-btn"
              disabled={cekam}
              onClick={() => void posliPozvanku('email')}
              style={{ border: '1px solid #c9a84c', background: 'transparent', color: '#c9a84c', fontWeight: 700 }}
            >
              E-mail
            </button>
            <button
              type="button"
              className="ph-btn"
              disabled={cekam}
              onClick={() => void posliPozvanku('sms')}
              style={{ border: '1px solid #c9a84c', background: 'transparent', color: '#c9a84c', fontWeight: 700 }}
            >
              SMS
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ph" style={{ padding: '1rem', maxWidth: 720, margin: '0 auto' }}>
      {detailId ? (
        <PoptavkaDetail
          id={detailId}
          onZavrit={() => {
            setDetailId(null);
            void nacti();
          }}
        />
      ) : null}

      <p>
        <Link href="/prehled" style={{ color: '#c9a84c' }}>
          ← Zpět do přehledu
        </Link>
      </p>
      <h1 style={{ color: '#c9a84c', fontFamily: 'Georgia, serif', fontWeight: 500 }}>Poptávky</h1>
      <p style={{ color: '#b7aa98', fontSize: '0.9rem' }}>Řazeno od nejnovější.</p>
      {hlaska ? <p style={{ color: '#c9a84c' }}>{hlaska}</p> : null}

      <div style={{ margin: '1rem 0' }}>
        <button
          type="button"
          className="ph-nova-predani"
          onClick={() => {
            setNova(true);
            setChyba('');
            setHlaska(null);
            setDetailId(null);
            setZprava(vychoziZprava());
          }}
        >
          Nová poptávka
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '1rem 0' }}>
        <button
          type="button"
          className="ph-btn"
          style={{
            background: zalozka === 'nevyrizene' ? '#c9a84c' : 'transparent',
            color: zalozka === 'nevyrizene' ? '#1a1510' : '#c9a84c',
            border: '1px solid #c9a84c',
          }}
          onClick={() => setZalozka('nevyrizene')}
        >
          Nevyřízené ({pocetNev})
        </button>
        <button
          type="button"
          className="ph-btn"
          style={{
            background: zalozka === 'vyrizene' ? '#c9a84c' : 'transparent',
            color: zalozka === 'vyrizene' ? '#1a1510' : '#c9a84c',
            border: '1px solid #c9a84c',
          }}
          onClick={() => setZalozka('vyrizene')}
        >
          Vyřízené ({pocetVyr})
        </button>
      </div>

      {chyba ? <p className="ph-chyba">{chyba}</p> : null}

      {!filtrovane.length && !chyba ? (
        <p style={{ color: '#b7aa98' }}>
          {zalozka === 'nevyrizene' ? 'Žádná nevyřízená poptávka.' : 'Žádná vyřízená poptávka.'}
        </p>
      ) : null}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {filtrovane.map((r) => (
          <li
            key={r.id}
            style={{
              border: '1px solid #3d342a',
              borderRadius: 14,
              padding: '12px 14px',
              marginBottom: 10,
              background: '#15110e',
            }}
          >
            <button
              type="button"
              onClick={() => setDetailId(r.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 0,
                color: '#efe6d8',
                padding: 0,
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              <strong style={{ color: '#efe6d8' }}>{r.jmeno}</strong>
              {r.zkouska ? (
                <span style={{ marginLeft: 8, color: '#c9a84c', fontSize: '0.8rem' }}>ZKOUŠKA</span>
              ) : null}
              <div style={{ color: '#b7aa98', fontSize: '0.9rem', marginTop: 4 }}>
                {r.termin} · {r.apartman}
                {r.cena ? ` · ${r.cena}` : ''}
              </div>
              <div style={{ color: '#b7aa98', fontSize: '0.85rem', marginTop: 2 }}>
                {r.odkud} · {r.stavText}
                {casCesky(r.cas) ? ` · přišlo ${casCesky(r.cas)}` : ''}
              </div>
            </button>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button type="button" className="ph-btn" onClick={() => setDetailId(r.id)}>
                Otevřít
              </button>
              {zalozka === 'nevyrizene' ? (
                <button
                  type="button"
                  className="ph-btn"
                  disabled={cekam}
                  onClick={() => void archivovat(r.id)}
                >
                  Do vyřízených
                </button>
              ) : (
                <button type="button" className="ph-btn" disabled={cekam} onClick={() => void zpet(r.id)}>
                  Zpět mezi nevyřízené
                </button>
              )}
              <button
                type="button"
                className="ph-btn"
                disabled={cekam}
                onClick={() => void smazat(r.id, r.jmeno)}
              >
                Smazat
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
