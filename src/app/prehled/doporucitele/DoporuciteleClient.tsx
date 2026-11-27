'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { jeIos, smsOdkaz } from '@/lib/brana';
import { odkazWhatsAppPrehled } from '@/lib/whatsapp-zprava';

type Karta = {
  kod: string;
  tajnyKlic?: string;
  jmeno: string;
  prijmeni: string;
  typ: string;
  penize: { ceka: number; kVyplate: number; vyplacenoCelkem: number };
  statistiky: { poptavky: number; potvrzene: number; probehle: number };
  doporuceni: { id: string; krestniJmenoKamarada: string; stav: string; odmena: number }[];
};

type Pravidla = {
  odmenaPct: number;
  azPoOdjezdu: boolean;
  jenPrvniPobyt: boolean;
  minVyplata: number;
};

type Udaje = {
  typ?: 'osoba' | 'firma';
  jmeno?: string;
  prijmeni?: string;
  email?: string;
  telefon?: string;
  jazyk?: string;
  firmaNazev?: string;
};

type Pozvanka = {
  klic: string;
  poznamka: string;
  stav: 'ceka' | 'ke_schvaleni' | 'vyplnena';
  kod: string | null;
  udaje?: Udaje;
};

const ZPRAVA_VYCHOZI =
  'Dobrý den,\n\nděkujeme, že chcete doporučovat apartmány VIVIEN. Tady je odkaz, kde o sobě vyplníte údaje. Pak vám pošleme vaši kartu s odkazem pro vaše klienty.';

function jenCisliceTel(raw: string): string {
  return String(raw || '').replace(/\D/g, '');
}

export function DoporuciteleClient() {
  const [karty, setKarty] = useState<Karta[]>([]);
  const [pozvanky, setPozvanky] = useState<Pozvanka[]>([]);
  const [pravidla, setPravidla] = useState<Pravidla | null>(null);
  const [detail, setDetail] = useState<Karta | null>(null);
  const [novy, setNovy] = useState(false);
  const [kanalKontakt, setKanalKontakt] = useState<'telefon' | 'email'>('telefon');
  const [telefon, setTelefon] = useState('');
  const [email, setEmail] = useState('');
  const [zprava, setZprava] = useState(ZPRAVA_VYCHOZI);
  const [cekam, setCekam] = useState(false);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [editace, setEditace] = useState<{
    klic: string;
    jmeno: string;
    prijmeni: string;
    telefon: string;
    email: string;
  } | null>(null);
  const autoZadostRef = useRef<string | null>(null);

  const nacti = useCallback(async () => {
    const res = await fetch('/api/prehled/doporucitele');
    const json = (await res.json()) as {
      ok?: boolean;
      karty?: Karta[];
      pravidla?: Pravidla;
      pozvanky?: Pozvanka[];
    };
    if (json.ok) {
      setKarty(json.karty || []);
      setPravidla(json.pravidla || null);
      setPozvanky(json.pozvanky || []);
    }
  }, []);

  useEffect(() => {
    void nacti();
  }, [nacti]);

  /** První nová žádost se otevře sama ke zpracování. */
  useEffect(() => {
    if (editace || novy) return;
    const prvni = pozvanky.find((p) => p.stav === 'ke_schvaleni' && p.udaje);
    if (!prvni) {
      autoZadostRef.current = null;
      return;
    }
    if (autoZadostRef.current === prvni.klic) return;
    autoZadostRef.current = prvni.klic;
    const u = prvni.udaje || {};
    setEditace({
      klic: prvni.klic,
      jmeno: u.jmeno || '',
      prijmeni: u.prijmeni || '',
      telefon: u.telefon || '',
      email: u.email || '',
    });
  }, [pozvanky, editace, novy]);

  function odkazPozvanky(klic: string): string {
    return `${window.location.origin}/doporucitel/pozvanka?p=${encodeURIComponent(klic)}`;
  }

  function textSeOdkazem(odkaz: string): string {
    const zaklad = zprava.trim() || ZPRAVA_VYCHOZI;
    if (zaklad.includes('{odkaz}')) return zaklad.replace(/\{odkaz\}/g, odkaz);
    if (zaklad.includes(odkaz)) return zaklad;
    return `${zaklad}\n\n${odkaz}`;
  }

  async function zalozAPosli(kanal: 'whatsapp' | 'email' | 'sms') {
    setHlaska(null);
    if (kanalKontakt === 'telefon') {
      const dig = jenCisliceTel(telefon);
      if (dig.length < 9) {
        setHlaska('Doplňte telefon.');
        return;
      }
    } else if (!email.trim() || !email.includes('@')) {
      setHlaska('Doplňte e-mail.');
      return;
    }
    if (kanal === 'email' && kanalKontakt === 'telefon') {
      setHlaska('Pro e-mail přepněte na E-mail nahoře.');
      return;
    }
    if ((kanal === 'whatsapp' || kanal === 'sms') && kanalKontakt === 'email') {
      setHlaska('Pro WhatsApp nebo SMS přepněte na Telefon.');
      return;
    }

    setCekam(true);
    try {
      const poznamka =
        kanalKontakt === 'telefon' ? telefon.trim().slice(0, 80) : email.trim().slice(0, 80);
      const res = await fetch('/api/prehled/doporucitele', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ akce: 'pozvat', poznamka }),
      });
      const json = (await res.json()) as { ok?: boolean; pozvanka?: Pozvanka; chyba?: string };
      if (!json.ok || !json.pozvanka?.klic) {
        setHlaska(json.chyba || 'Odkaz se nepodařilo vytvořit.');
        return;
      }
      const odkaz = odkazPozvanky(json.pozvanka.klic);
      const text = textSeOdkazem(odkaz);
      const dig = jenCisliceTel(telefon);
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

      if (kanal === 'email') {
        const mailRes = await fetch('/api/prehled/doporucitele', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            akce: 'poslat-email',
            email: email.trim(),
            klic: json.pozvanka.klic,
          }),
        });
        const mailJson = (await mailRes.json()) as {
          ok?: boolean;
          poslano?: boolean;
          mailto?: boolean;
          odkaz?: string;
        };
        if (!mailRes.ok || !mailJson.ok) {
          setHlaska('E-mail se nepodařilo odeslat.');
          return;
        }
        if (mailJson.mailto) {
          const mailto = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent('Doporučení VIVIEN')}&body=${encodeURIComponent(text)}`;
          window.location.href = mailto;
          setHlaska('Otevřel se e-mail v telefonu (bez HTML vzhledu). Na ostře odejde hezký mail.');
        } else {
          setHlaska('E-mail s fotkou a tlačítkem je odeslaný. Otevře stejnou stránku jako WhatsApp.');
        }
      } else if (kanal === 'whatsapp') {
        window.open(odkazWhatsAppPrehled(dig, text, ua), '_blank');
        setHlaska('WhatsApp je otevřený. Odkaz vede na stejnou stránku vyplnění jako e-mail.');
      } else {
        window.location.href = smsOdkaz(`+${dig}`, text, jeIos(ua));
        setHlaska('SMS je připravená. Odkaz vede na stejnou stránku vyplnění.');
      }

      setNovy(false);
      setTelefon('');
      setEmail('');
      setZprava(ZPRAVA_VYCHOZI);
      await nacti();
    } finally {
      setCekam(false);
    }
  }

  function otevriSchvaleni(p: Pozvanka) {
    const u = p.udaje || {};
    setEditace({
      klic: p.klic,
      jmeno: u.jmeno || '',
      prijmeni: u.prijmeni || '',
      telefon: u.telefon || '',
      email: u.email || '',
    });
  }

  async function schvalit() {
    if (!editace) return;
    setCekam(true);
    setHlaska(null);
    try {
      const res = await fetch('/api/prehled/doporucitele', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          akce: 'schvalit',
          klic: editace.klic,
          udaje: {
            jmeno: editace.jmeno.trim(),
            prijmeni: editace.prijmeni.trim(),
            telefon: editace.telefon.trim(),
            email: editace.email.trim(),
          },
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        chyba?: string;
        odkazKarta?: string;
        tajnyKlic?: string;
        emailPoslan?: boolean;
        telefon?: string | null;
      };
      if (!res.ok || !json.ok) {
        setHlaska(json.chyba || 'Schválení se nepovedlo.');
        return;
      }
      setEditace(null);
      const casti = ['Schváleno.'];
      if (json.emailPoslan) casti.push('Odkaz na kartu mu odešel e-mailem.');
      else if (json.odkazKarta) casti.push(`Odkaz na kartu: ${json.odkazKarta}`);
      setHlaska(casti.join(' '));
      await nacti();
    } finally {
      setCekam(false);
    }
  }

  async function kopirovat(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setHlaska('Odkaz je zkopírovaný.');
    } catch {
      setHlaska('Odkaz vyberte a zkopírujte ručně.');
    }
  }

  async function vyplaceno(kod: string, castka: number) {
    const res = await fetch('/api/prehled/doporucitele', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce: 'vyplaceno', kod, castka }),
    });
    const json = (await res.json()) as { ok?: boolean; karta?: Karta };
    if (json.ok && json.karta) {
      setDetail(json.karta);
      await nacti();
      setHlaska('Označeno jako vyplaceno.');
    }
  }

  const cekaUdaje = pozvanky.filter((p) => p.stav === 'ceka');
  const keSchvaleni = pozvanky.filter((p) => p.stav === 'ke_schvaleni');

  if (novy) {
    return (
      <main className="ph" style={{ padding: '1rem', maxWidth: 720, margin: '0 auto' }}>
        <p>
          <button
            type="button"
            className="ph-dnesek__odkaz"
            onClick={() => {
              setNovy(false);
              setHlaska(null);
            }}
            style={{ background: 'none', border: 0, padding: 0, color: '#c9a84c', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}
          >
            ← Zpět k doporučitelům
          </button>
        </p>
        <h1 style={{ color: '#c9a84c', fontFamily: 'Georgia, serif', fontWeight: 500 }}>
          Přidat doporučitele
        </h1>
        <p style={{ color: '#b7aa98', fontSize: '0.9rem', textAlign: 'justify', hyphens: 'auto' }}>
          Vyplňte telefon nebo e-mail. Pod tím je text zprávy. Odkaz pošlete stejně jako jindy.
        </p>
        {hlaska ? <p style={{ color: '#c9a84c' }}>{hlaska}</p> : null}

        <div
          style={{
            background: '#1c1712',
            border: '1px solid #3d342a',
            borderRadius: 16,
            padding: '16px 14px 18px',
            marginTop: 12,
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
                  background: '#15110e',
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
                  background: '#15110e',
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
              rows={8}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 4,
                padding: '11px 12px',
                borderRadius: 10,
                border: '1px solid #3d342a',
                background: '#15110e',
                color: '#efe6d8',
                font: 'inherit',
                lineHeight: 1.4,
                resize: 'vertical',
              }}
            />
          </label>
          <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#b7aa98' }}>
            Odkaz se doplní automaticky při odeslání.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <button
              type="button"
              className="ph-btn"
              disabled={cekam}
              onClick={() => void zalozAPosli('whatsapp')}
              style={{ border: '1px solid #c9a84c', background: 'transparent', color: '#c9a84c', fontWeight: 700 }}
            >
              WhatsApp
            </button>
            <button
              type="button"
              className="ph-btn"
              disabled={cekam}
              onClick={() => void zalozAPosli('email')}
              style={{ border: '1px solid #c9a84c', background: 'transparent', color: '#c9a84c', fontWeight: 700 }}
            >
              E-mail
            </button>
            <button
              type="button"
              className="ph-btn"
              disabled={cekam}
              onClick={() => void zalozAPosli('sms')}
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
      <p>
        <Link href="/prehled" style={{ color: '#c9a84c' }}>
          ← Zpět do přehledu
        </Link>
      </p>
      <h1 style={{ color: '#c9a84c', fontFamily: 'Georgia, serif', fontWeight: 500 }}>Doporučitelé</h1>
      <p style={{ color: '#b7aa98', fontSize: '0.9rem', textAlign: 'justify', hyphens: 'auto' }}>
        Nejdřív pozvete. On vyplní. Pak tady zpracujete žádost a teprve po OK mu odejde karta.
      </p>
      {hlaska ? <p style={{ color: '#c9a84c' }}>{hlaska}</p> : null}

      <button
        type="button"
        className="ph-nova-predani"
        onClick={() => {
          setNovy(true);
          setHlaska(null);
          setDetail(null);
          setEditace(null);
        }}
        style={{ marginBottom: '1rem' }}
      >
        Nový doporučitel
      </button>

      {keSchvaleni.length > 0 ? (
        <section style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: '#ff8a80' }}>
            Nové žádosti ({keSchvaleni.length})
          </h2>
          <p style={{ color: '#b7aa98', fontSize: '0.85rem', marginTop: 0 }}>
            Otevřete žádost, případně upravte údaje, pak Uložit a schválit. Teprve potom mu odejde
            odkaz na kartu.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {keSchvaleni.map((p) => {
              const u = p.udaje;
              const jmeno =
                u?.jmeno || u?.prijmeni
                  ? `${u?.jmeno || ''} ${u?.prijmeni || ''}`.trim()
                  : p.poznamka || 'Vyplněná pozvánka';
              return (
                <li key={p.klic} style={{ padding: '0.55rem 0', borderBottom: '1px solid #2c2520' }}>
                  <strong>{jmeno}</strong>
                  {u?.email ? <span style={{ color: '#b7aa98', fontSize: '0.85rem' }}> · {u.email}</span> : null}
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="ph-btn"
                      onClick={() => otevriSchvaleni(p)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 18,
                        border: 0,
                        background: '#c9a84c',
                        color: '#1a1510',
                        fontWeight: 700,
                      }}
                    >
                      Upravit a schválit
                    </button>
                    {u?.telefon ? (
                      <a
                        href={`tel:${String(u.telefon).replace(/\s+/g, '')}`}
                        style={{
                          marginLeft: 8,
                          padding: '8px 14px',
                          borderRadius: 18,
                          border: '1px solid #6a4034',
                          color: '#d4a08a',
                          textDecoration: 'none',
                          display: 'inline-block',
                        }}
                      >
                        Zavolat
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {editace ? (
        <section
          style={{
            marginBottom: '1.2rem',
            border: '1px solid #3d342a',
            borderRadius: 14,
            padding: '12px 14px',
            background: '#15110e',
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: '1.1rem', color: '#c9a84c' }}>Ke schválení</h2>
          <p style={{ color: '#b7aa98', fontSize: '0.9rem' }}>
            Když má něco špatně, upravte to tady. Pak zavolejte nebo rovnou schvalte.
          </p>
          <label style={{ display: 'block', marginBottom: 8, fontSize: '0.82rem', color: '#b7aa98' }}>
            Jméno
            <input
              value={editace.jmeno}
              onChange={(e) => setEditace({ ...editace, jmeno: e.target.value })}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 4,
                padding: 10,
                borderRadius: 10,
                border: '1px solid #3d342a',
                background: '#1c1712',
                color: '#efe6d8',
              }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 8, fontSize: '0.82rem', color: '#b7aa98' }}>
            Příjmení
            <input
              value={editace.prijmeni}
              onChange={(e) => setEditace({ ...editace, prijmeni: e.target.value })}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 4,
                padding: 10,
                borderRadius: 10,
                border: '1px solid #3d342a',
                background: '#1c1712',
                color: '#efe6d8',
              }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 8, fontSize: '0.82rem', color: '#b7aa98' }}>
            Telefon
            <input
              value={editace.telefon}
              onChange={(e) => setEditace({ ...editace, telefon: e.target.value })}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 4,
                padding: 10,
                borderRadius: 10,
                border: '1px solid #3d342a',
                background: '#1c1712',
                color: '#efe6d8',
                whiteSpace: 'nowrap',
              }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12, fontSize: '0.82rem', color: '#b7aa98' }}>
            E-mail
            <input
              value={editace.email}
              onChange={(e) => setEditace({ ...editace, email: e.target.value })}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 4,
                padding: 10,
                borderRadius: 10,
                border: '1px solid #3d342a',
                background: '#1c1712',
                color: '#efe6d8',
              }}
            />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={cekam}
              onClick={() => void schvalit()}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 16,
                border: 0,
                background: '#c9a84c',
                color: '#1a1510',
                fontWeight: 700,
              }}
            >
              Uložit a schválit
            </button>
            <a
              href={editace.telefon ? `tel:${editace.telefon.replace(/\s+/g, '')}` : undefined}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 16,
                border: '1px solid #6a4034',
                color: '#d4a08a',
                textAlign: 'center',
                textDecoration: 'none',
                fontWeight: 700,
              }}
            >
              Zavolat
            </a>
          </div>
          <button
            type="button"
            onClick={() => setEditace(null)}
            style={{
              marginTop: 8,
              width: '100%',
              padding: 10,
              borderRadius: 16,
              border: '1px solid #3d342a',
              background: 'transparent',
              color: '#b7aa98',
            }}
          >
            Zrušit
          </button>
        </section>
      ) : null}

      {cekaUdaje.length > 0 ? (
        <section style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem' }}>Čeká na vyplnění</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {cekaUdaje.map((p) => (
              <li key={p.klic} style={{ padding: '0.45rem 0', borderBottom: '1px solid #2c2520', fontSize: '0.85rem' }}>
                {p.poznamka || 'Bez poznámky'}{' '}
                <button
                  type="button"
                  onClick={() => void kopirovat(odkazPozvanky(p.klic))}
                  style={{
                    marginLeft: 8,
                    padding: '4px 10px',
                    borderRadius: 16,
                    border: '1px solid #c9a84c',
                    background: 'transparent',
                    color: '#c9a84c',
                  }}
                >
                  Kopírovat odkaz
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pravidla ? (
        <p style={{ color: '#b7aa98', fontSize: '0.85rem' }}>
          Pravidla: odměna {pravidla.odmenaPct} %, až po odjezdu, jen první pobyt.
        </p>
      ) : null}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {karty.map((k) => (
          <li
            key={k.kod}
            style={{ borderBottom: '1px solid #2c2520', padding: '0.7rem 0', cursor: 'pointer' }}
            onClick={() => setDetail(k)}
          >
            <strong>
              {k.jmeno} {k.prijmeni}
            </strong>{' '}
            · {k.typ} · poptávky {k.statistiky.poptavky} / pobyty {k.statistiky.probehle} · k výplatě{' '}
            {k.penize.kVyplate} Kč · vyplaceno {k.penize.vyplacenoCelkem} Kč
          </li>
        ))}
      </ul>

      {detail ? (
        <section style={{ marginTop: '1.2rem', border: '1px solid #3d342a', borderRadius: 12, padding: '1rem' }}>
          <h2 style={{ marginTop: 0, color: '#c9a84c' }}>
            {detail.jmeno} {detail.prijmeni}
          </h2>
          <p style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>
            Kód ?od={detail.kod}
            {detail.tajnyKlic ? (
              <>
                <br />
                Karta: /doporucitel?k={detail.tajnyKlic}
              </>
            ) : null}
          </p>
          <ul style={{ paddingLeft: '1.1rem' }}>
            {detail.doporuceni.map((d) => (
              <li key={d.id}>
                {d.krestniJmenoKamarada} · {d.stav} · {d.odmena} Kč
              </li>
            ))}
          </ul>
          {detail.penize.kVyplate > 0 ? (
            <button
              type="button"
              onClick={() => void vyplaceno(detail.kod, detail.penize.kVyplate)}
              style={{
                padding: '8px 14px',
                borderRadius: 18,
                border: 0,
                background: '#c9a84c',
                color: '#1a1510',
                fontWeight: 700,
              }}
            >
              Vyplaceno {detail.penize.kVyplate} Kč
            </button>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
