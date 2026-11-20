'use client';

import { useMemo, useState } from 'react';
import { apartmany } from '@/lib/guide-data';
import {
  odkazSmsPoptavky,
  odkazWaPoptavky,
  POPTAVKA_TEL_HOVOR,
  POPTAVKA_TEL_ZALOHA,
  sestavZpravuPoptavky,
  ymdDnesPraha,
  type PoptavkaZdroj,
} from '@/lib/poptavka';
import { poptavkaTexty } from '@/lib/poptavka-texty';
import { toTelHref } from '@/lib/i18n';
import type { AptId, GuideLang } from '@/lib/types';
import './poptavka.scss';

export type PoptavkaVstupni = {
  lang: GuideLang;
  zdroj: PoptavkaZdroj;
  firmaKod: string | null;
  firmaNazev: string | null;
  doporucitelKod: string | null;
  token: string | null;
  rezervace: string | null;
  jmeno: string;
  telefon: string;
};

export function PoptavkaForm(props: PoptavkaVstupni) {
  const t = poptavkaTexty(props.lang);
  const dnes = ymdDnesPraha();
  const [prijezd, setPrijezd] = useState('');
  const [odjezd, setOdjezd] = useState('');
  const [apts, setApts] = useState<AptId[]>([]);
  const [libovolny, setLibovolny] = useState(false);
  const [jmeno, setJmeno] = useState(props.jmeno);
  const [telefon, setTelefon] = useState(props.telefon);
  const [doprava, setDoprava] = useState<'auto' | 'dodavka' | 'nevim' | ''>('');
  const [poznamka, setPoznamka] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [cekam, setCekam] = useState(false);
  const [hotovo, setHotovo] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const zprava = useMemo(
    () =>
      sestavZpravuPoptavky({
        zdroj: props.zdroj,
        firmaKod: props.firmaKod,
        firmaNazev: props.firmaNazev,
        doporucitelKod: props.doporucitelKod,
        rezervace: props.rezervace,
        jmeno,
        telefon,
        prijezd,
        odjezd,
        apartmany: libovolny ? [] : apts,
        libovolnyApartman: libovolny,
        doprava: doprava || null,
        poznamka,
        jazyk: props.lang,
      }),
    [props, jmeno, telefon, prijezd, odjezd, apts, libovolny, doprava, poznamka],
  );

  const wa = odkazWaPoptavky(zprava);
  const ios = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const sms = odkazSmsPoptavky(zprava, ios);

  function toggleApt(id: AptId) {
    setLibovolny(false);
    setApts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function odeslat() {
    setChyba(null);
    if (!prijezd || !odjezd || odjezd <= prijezd) {
      setChyba(t.chybaTermin);
      return;
    }
    if (!jmeno.trim() || !telefon.trim()) {
      setChyba(t.chybaKontakt);
      return;
    }
    setCekam(true);
    try {
      const res = await fetch('/api/poptavka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: props.token,
          f: props.firmaKod,
          od: props.doporucitelKod,
          jmeno,
          telefon,
          prijezd,
          odjezd,
          apartmany: libovolny ? [] : apts,
          libovolnyApartman: libovolny,
          doprava: doprava || null,
          poznamka,
          lang: props.lang,
          honeypot,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; duvod?: string };
      if (!json.ok) {
        if (json.duvod === 'blok') setChyba(t.chybaBlok);
        else if (json.duvod === 'termin') setChyba(t.chybaTermin);
        else if (json.duvod === 'kontakt') setChyba(t.chybaKontakt);
        else setChyba(t.chybaObecna);
        return;
      }
      setHotovo(true);
    } catch {
      setChyba(t.chybaObecna);
    } finally {
      setCekam(false);
    }
  }

  const telNikol = POPTAVKA_TEL_HOVOR.replace(/ /g, '\u00a0');
  const telZaloha = POPTAVKA_TEL_ZALOHA.replace(/ /g, '\u00a0');

  return (
    <main className="pp" lang={props.lang}>
      <div className="pp__karta">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="pp__logo"
          src="/pruvodce/va-logo-192.png"
          width={56}
          height={56}
          alt="VIVIEN Apartments"
        />
        <h1>{t.nadpis}</h1>
        {props.firmaNazev ? (
          <p className="pp__firma">{t.firmaRadek.replace('{firma}', props.firmaNazev)}</p>
        ) : null}
        <p className="pp__uvod">{t.uvod}</p>
        <p className="pp__sleva">{t.sleva}</p>
        <p className="pp__cena">{t.cenaPozdeji}</p>

        {hotovo ? (
          <p className="pp__dekujeme">{t.dekujeme}</p>
        ) : (
          <>
            <fieldset>
              <legend>{t.termin}</legend>
              <div className="pp__termin">
                <label>
                  {t.prijezd}
                  <input
                    type="date"
                    min={dnes}
                    value={prijezd}
                    onChange={(e) => setPrijezd(e.target.value)}
                    required
                  />
                </label>
                <label>
                  {t.odjezd}
                  <input
                    type="date"
                    min={prijezd || dnes}
                    value={odjezd}
                    onChange={(e) => setOdjezd(e.target.value)}
                    required
                  />
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>{t.apartmany}</legend>
              <div className="pp__apts">
                {apartmany.map((a) => {
                  const on = !libovolny && apts.includes(a.id);
                  return (
                    <label key={a.id} className={`pp__apt${on ? ' is-on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleApt(a.id)}
                      />
                      {props.lang === 'cs' ? a.nazev.cs : a.nazev.en}
                    </label>
                  );
                })}
                <label className={`pp__apt${libovolny ? ' is-on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={libovolny}
                    onChange={() => {
                      setLibovolny((v) => !v);
                      if (!libovolny) setApts([]);
                    }}
                  />
                  {t.libovolny}
                </label>
              </div>
            </fieldset>

            <label>
              {t.jmeno}
              <input
                type="text"
                autoComplete="name"
                value={jmeno}
                onChange={(e) => setJmeno(e.target.value)}
                required
              />
            </label>
            <label>
              {t.telefon}
              <input
                type="tel"
                autoComplete="tel"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                required
              />
            </label>

            <fieldset>
              <legend>{t.doprava}</legend>
              <div className="pp__doprava">
                {(
                  [
                    ['auto', t.auto],
                    ['dodavka', t.dodavka],
                    ['nevim', t.nevim],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`pp__chip${doprava === id ? ' is-on' : ''}`}
                    onClick={() => setDoprava((d) => (d === id ? '' : id))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label>
              {t.poznamka}
              <textarea value={poznamka} onChange={(e) => setPoznamka(e.target.value)} maxLength={500} />
            </label>

            <label className="pp__hp" aria-hidden="true">
              web
              <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </label>

            {chyba ? <p className="pp__chyba">{chyba}</p> : null}

            <div className="pp__akce">
              <button type="button" className="pp__btn pp__btn--hlavni" disabled={cekam} onClick={() => void odeslat()}>
                {t.odeslat}
              </button>
              <a className="pp__btn pp__btn--wa" href={wa} target="_blank" rel="noopener noreferrer">
                {t.whatsapp}
              </a>
              <a className="pp__btn pp__btn--sms pp__sms-only" href={sms}>
                {t.sms}
              </a>
            </div>
          </>
        )}

        <a className="pp__tel" href={toTelHref(POPTAVKA_TEL_HOVOR)}>
          {t.zavolat} · <span>{telNikol}</span>
        </a>
        <p className="pp__zaloha">
          {t.zaloha}{' '}
          <a className="pp__tel" href={toTelHref(POPTAVKA_TEL_ZALOHA)} style={{ display: 'inline' }}>
            <span>{telZaloha}</span>
          </a>
        </p>
      </div>
    </main>
  );
}
