'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
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
  doporuceni: { krestniJmenoKamarada: string; datumPoptavky: string; stav: string }[];
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
        <div className="dop-karta">
          <p className="dop-lead">{pripraveno ? 'Chybí odkaz na kartu.' : 'Načítám…'}</p>
        </div>
      </main>
    );
  }

  if (!karta) {
    return (
      <main className="dop-page">
        <div className="dop-karta">
          <p className="dop-lead">{chyba || 'Načítám…'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="dop-page">
      <div className="dop-karta">
        <h1 className="dop-h1">Moje doporučení</h1>
        <p className="dop-lead">
          {karta.jmeno} {karta.prijmeni || ''}
          {karta.typ === 'firma' && karta.firma?.nazev ? ` (${karta.firma.nazev})` : ''}
        </p>
        <p className="dop-lead">Váš odkaz pro lidi, které chcete pozvat</p>
        <p className="dop-odkaz">{odkaz.replace('&lang=', '\n&lang=')}</p>
        <p className="dop-lead dop-lead--blok">
          Když někdo přes tento odkaz pošle poptávku, uvidíme, že jde od vás.
        </p>
        <div className="dop-radky" style={{ flexDirection: 'column' }}>
          <button type="button" onClick={() => setUkazEmail((v) => !v)}>
            {t(blizciEmail, lang)}
          </button>
          <button type="button" onClick={whatsapp}>
            {t(blizciWhatsapp, lang)}
          </button>
          <button type="button" onClick={() => void kopie()}>
            {t(blizciKopie, lang)}
          </button>
        </div>
        {ukazEmail ? (
          <form
            className="dop-form"
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
            <p className="dop-lead" style={{ fontSize: '0.8rem' }}>
              {t(tipSoukromi, lang)}
            </p>
          </form>
        ) : null}

        <div className="dop-stat">
          <div>
            <strong>{karta.penize.ceka}</strong>
            čeká
          </div>
          <div>
            <strong>{karta.penize.kVyplate}</strong>
            k výplatě
          </div>
          <div>
            <strong>{karta.penize.vyplacenoCelkem}</strong>
            vyplaceno
          </div>
        </div>

        <h2 className="dop-h1" style={{ fontSize: '1.25rem' }}>
          Přátelé
        </h2>
        <ul className="dop-list">
          {karta.doporuceni.length === 0 ? <li>Zatím nikdo nepřišel.</li> : null}
          {karta.doporuceni.map((d, i) => (
            <li key={`${d.krestniJmenoKamarada}-${i}`}>
              {d.krestniJmenoKamarada || 'host'} · {mesic(d.datumPoptavky)} · {d.stav}
            </li>
          ))}
        </ul>

        {karta.penize.kVyplate > 0 ? (
          <button type="button" className="dop-cta" disabled={cekam} onClick={() => void pozadatVyplatu()}>
            Požádat o výplatu
          </button>
        ) : null}

        <p className="dop-lead" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
          <Link href="/doporucitel/registrace">Podmínky programu</Link>
        </p>
        {hlaska ? <p className="dop-hlaska">{hlaska}</p> : null}
        {chyba ? <p className="dop-hlaska">{chyba}</p> : null}
      </div>
    </main>
  );
}
