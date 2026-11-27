'use client';

import Link from 'next/link';
import QRCode from 'qrcode';
import { useCallback, useEffect, useState } from 'react';
import { KlubPlochaRadek } from '@/components/KlubPlochaRadek';
import {
  blizciEmail,
  blizciKopie,
  blizciWhatsapp,
  blizciZkopirovano,
  tipChybaEmail,
  tipEmailLabel,
  tipJmenoLabel,
  tipLimit,
  tipOdeslat,
  tipOdeslano,
  tipSoukromi,
  tipZpravaWhatsapp,
} from '@/lib/doporuceni-komplet-texty';
import { t } from '@/lib/i18n';
import type { GuideLang } from '@/lib/types';
import './doporucitel.scss';

import { adresaKlub, domenaJesteNebezi } from '@/lib/verejna-adresa';

function baseProTip(): string {
  if (typeof window !== 'undefined') {
    const o = window.location.origin;
    if (o && !domenaJesteNebezi(o)) return o;
  }
  return adresaKlub();
}

type KartaUi = {
  kod: string;
  jmeno: string;
  prijmeni?: string;
  typ?: string;
  firma?: { nazev: string } | null;
  jazyk: GuideLang;
  penize: { ceka: number; kVyplate: number; vyplacenoCelkem: number };
  statistiky?: { poptavky: number; potvrzene: number; probehle: number };
  doporuceni: { krestniJmenoKamarada: string; datumPoptavky: string; stav: string; odmena?: number }[];
};

function mesic(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function DoporucitelKartaPage() {
  const [klic, setKlic] = useState('');
  const [pripraveno, setPripraveno] = useState(false);
  const [karta, setKarta] = useState<KartaUi | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [ukazEmail, setUkazEmail] = useState(false);
  const [ukazQrKlient, setUkazQrKlient] = useState(false);
  const [qrKlient, setQrKlient] = useState<string | null>(null);
  const [emailKam, setEmailKam] = useState('');
  const [jmeno, setJmeno] = useState('');
  const [cekam, setCekam] = useState(false);

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('k') || '';
    setKlic(k);
    setPripraveno(true);
  }, []);

  useEffect(() => {
    if (!klic) return;
    let zruseno = false;
    (async () => {
      try {
        const res = await fetch(`/api/doporucitel/karta?k=${encodeURIComponent(klic)}`);
        const json = (await res.json()) as { ok?: boolean; karta?: KartaUi };
        if (!zruseno && json.ok && json.karta) {
          setKarta(json.karta);
          setJmeno(json.karta.jmeno || '');
        } else if (!zruseno) setChyba('Kartu se nepodařilo otevřít.');
      } catch {
        if (!zruseno) setChyba('Kartu se nepodařilo otevřít.');
      }
    })();
    return () => {
      zruseno = true;
    };
  }, [klic]);

  const lang: GuideLang = karta?.jazyk || 'cs';
  const odkaz = karta
    ? `${baseProTip()}/poptavka?od=${encodeURIComponent(karta.kod)}&lang=${encodeURIComponent(lang)}`
    : '';
  const rezervovatUrl = karta
    ? `${baseProTip()}/poptavka?od=${encodeURIComponent(karta.kod)}&lang=${encodeURIComponent(lang)}&pro=sebe`
    : '/poptavka';
  const odkazKarty = klic
    ? `${baseProTip()}/doporucitel?k=${encodeURIComponent(klic)}`
    : '';

  useEffect(() => {
    if (!odkaz || !ukazQrKlient) {
      setQrKlient(null);
      return;
    }
    let zruseno = false;
    void QRCode.toDataURL(odkaz, {
      width: 320,
      margin: 2,
      color: { dark: '#1a1510', light: '#efe6d8' },
    }).then((url) => {
      if (!zruseno) setQrKlient(url);
    });
    return () => {
      zruseno = true;
    };
  }, [odkaz, ukazQrKlient]);

  const whatsapp = useCallback(() => {
    if (!odkaz) return;
    const text = `${tipZpravaWhatsapp(lang)} ${odkaz}&k=w`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }, [odkaz, lang]);

  const kopie = useCallback(async () => {
    if (!odkaz) return;
    await navigator.clipboard.writeText(`${tipZpravaWhatsapp(lang)} ${odkaz}&k=c`);
    setHlaska(t(blizciZkopirovano, lang));
  }, [odkaz, lang]);

  const tipEmail = useCallback(async () => {
    if (!karta || cekam) return;
    setCekam(true);
    setChyba(null);
    try {
      const res = await fetch('/api/doporuceni/tip-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kod: karta.kod,
          email: emailKam.trim(),
          jmeno: jmeno.trim(),
          lang,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; duvod?: string };
      if (!res.ok || !json.ok) {
        setChyba(json.duvod === 'limit' ? t(tipLimit, lang) : t(tipChybaEmail, lang));
        return;
      }
      setHlaska(t(tipOdeslano, lang));
      setUkazEmail(false);
    } catch {
      setChyba(t(tipChybaEmail, lang));
    } finally {
      setCekam(false);
    }
  }, [karta, cekam, emailKam, jmeno, lang]);

  async function pozadatVyplatu() {
    if (!klic) return;
    setCekam(true);
    try {
      const res = await fetch('/api/doporucitel/karta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ k: klic, akce: 'pozadat-vyplatu' }),
      });
      const json = (await res.json()) as { ok?: boolean; castka?: number };
      if (json.ok) setHlaska(`Žádost o výplatu ${json.castka} Kč jsme poslali.`);
      else setChyba('Výplatu teď nelze požádat.');
    } finally {
      setCekam(false);
    }
  }

  if (!pripraveno || !klic) {
    return (
      <main className="dop-page">
        <div className="dop-klub">
          <p className="dop-lead">{pripraveno ? 'Chybí odkaz na kartu.' : 'Načítám…'}</p>
        </div>
      </main>
    );
  }

  if (!karta) {
    return (
      <main className="dop-page">
        <div className="dop-klub">
          <p className="dop-lead">{chyba || 'Načítám…'}</p>
        </div>
      </main>
    );
  }

  const celeJmeno =
    karta.typ === 'firma' && karta.firma?.nazev
      ? karta.firma.nazev
      : `${karta.jmeno} ${karta.prijmeni || ''}`.trim();
  const probehle = karta.statistiky?.probehle ?? karta.doporuceni.filter((d) => d.stav === 'pobyt-probehl' || d.stav === 'vyplaceno' || d.stav === 'pripsano').length;

  return (
    <main className="dop-page" lang={lang}>
      <div className="dop-shell">
        <div className="dop-klub">
          <div className="dop-karticka">
            <div className="k1">VIVIEN CLUB</div>
            <div className="k2">{celeJmeno}</div>
            <div className="k3">Doporučitel</div>
          </div>

          <div className="dop-duo">
            <button type="button" className="dop-vC" onClick={() => setUkazEmail(false)}>
              <b>Doporučit</b>
              <i>přítel má 5 %</i>
            </button>
            <a className="dop-vC" href={rezervovatUrl}>
              <b>Rezervovat pro sebe</b>
              <i>váš 1. pobyt 5 %</i>
            </a>
          </div>

          {odkazKarty ? (
            <KlubPlochaRadek
              lang={lang}
              token={klic}
              odkazKarty={odkazKarty}
              manifestHref={`/doporucitel/manifest.webmanifest?k=${encodeURIComponent(klic)}`}
            />
          ) : null}

          <p className="dop-sub">Váš odkaz pro klienty</p>
          <div className="dop-odkaz">{odkaz}</div>

          <button type="button" className="dop-cta" onClick={() => setUkazQrKlient(true)}>
            QR kód pro klienty
          </button>
          <button type="button" className="dop-cta2" onClick={whatsapp}>
            {t(blizciWhatsapp, lang)}
          </button>
          <button type="button" className="dop-cta3" onClick={() => void kopie()}>
            {t(blizciKopie, lang)}
          </button>
          <button type="button" className="dop-cta3" onClick={() => setUkazEmail((v) => !v)}>
            {t(blizciEmail, lang)}
          </button>

          {ukazQrKlient ? (
            <div
              role="dialog"
              aria-label="QR pro klienty"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 80,
                background: 'rgba(8, 6, 5, 0.94)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
              }}
            >
              <p
                style={{
                  color: '#c9a84c',
                  fontFamily: 'Georgia, serif',
                  fontSize: '1.3rem',
                  margin: '0 0 8px',
                  textAlign: 'center',
                }}
              >
                QR pro vaše klienty
              </p>
              <p
                style={{
                  color: '#b7aa98',
                  fontSize: '0.9rem',
                  margin: '0 0 14px',
                  textAlign: 'center',
                  maxWidth: 280,
                }}
              >
                Naskenují a otevře se poptávka s vaší slevou. Rezervace se zapíše pod vámi.
              </p>
              {qrKlient ? (
                <img
                  src={qrKlient}
                  alt="QR odkaz na poptávku"
                  width={320}
                  height={320}
                  style={{
                    display: 'block',
                    width: 'min(320px, 86vw)',
                    height: 'auto',
                    borderRadius: 16,
                    marginBottom: 14,
                  }}
                />
              ) : (
                <p style={{ color: '#d4a08a' }}>Připravuji QR…</p>
              )}
              <button type="button" className="dop-cta" onClick={() => setUkazQrKlient(false)}>
                Zavřít
              </button>
            </div>
          ) : null}

          {ukazEmail ? (
            <form
              className="dop-form"
              style={{ marginTop: 12 }}
              onSubmit={(e) => {
                e.preventDefault();
                void tipEmail();
              }}
            >
              <label>
                {t(tipEmailLabel, lang)}
                <input type="email" value={emailKam} onChange={(e) => setEmailKam(e.target.value)} required />
              </label>
              <label>
                {t(tipJmenoLabel, lang)}
                <input value={jmeno} onChange={(e) => setJmeno(e.target.value)} required />
              </label>
              <button type="submit" className="dop-cta" disabled={cekam}>
                {t(tipOdeslat, lang)}
              </button>
              <p className="dop-muted">{t(tipSoukromi, lang)}</p>
            </form>
          ) : null}

          <div className="dop-stat">
            <div>
              <strong>{probehle}</strong>
              <span>přijeli</span>
            </div>
            <div>
              <strong>{karta.penize.ceka}</strong>
              <span>Kč čeká</span>
            </div>
            <div>
              <strong>{karta.penize.kVyplate}</strong>
              <span>k výplatě</span>
            </div>
          </div>

          <p className="dop-sub">Přátelé</p>
          <ul className="dop-list">
            {karta.doporuceni.length === 0 ? <li>Zatím nikdo nepřišel.</li> : null}
            {karta.doporuceni.map((d, i) => (
              <li key={`${d.krestniJmenoKamarada}-${i}`}>
                <span>
                  {d.krestniJmenoKamarada || 'host'} · {mesic(d.datumPoptavky)}
                </span>
                <span className="st">
                  {typeof d.odmena === 'number' && d.odmena > 0 ? `${d.odmena} Kč` : d.stav}
                </span>
              </li>
            ))}
          </ul>

          {karta.penize.kVyplate > 0 ? (
            <button type="button" className="dop-cta" disabled={cekam} onClick={() => void pozadatVyplatu()}>
              Požádat o výplatu
            </button>
          ) : null}

          <p className="dop-muted" style={{ marginTop: '1rem' }}>
            <Link href="/doporucitel/registrace" style={{ color: '#c9a84c' }}>
              Podmínky programu
            </Link>
          </p>
          {hlaska ? <p className="dop-hlaska">{hlaska}</p> : null}
          {chyba ? <p className="dop-hlaska">{chyba}</p> : null}
        </div>
      </div>
    </main>
  );
}
