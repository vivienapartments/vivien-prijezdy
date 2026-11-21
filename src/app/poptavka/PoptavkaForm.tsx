'use client';

import { useMemo, useState } from 'react';
import { apartmany } from '@/lib/guide-data';
import { toTelHref } from '@/lib/i18n';
import {
  odkazSmsPoptavky,
  odkazWaPoptavky,
  POPTAVKA_TEL_HOVOR,
  POPTAVKA_TEL_ZALOHA,
  sestavZpravuPoptavky,
  ymdDnesPraha,
  type PoptavkaZdroj,
} from '@/lib/poptavka';
import {
  coverUrl,
  galerieKompletCoverUrl,
  galerieKompletUrls,
  galerieUrls,
  odkazApartmanyWeb,
  odkazKvizAtmosfery,
  POPTAVKA_APARTMANY,
  webLangKod,
} from '@/lib/poptavka-apartmany';
import { formatDatumPoptavky, poptavkaTexty } from '@/lib/poptavka-texty';
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

type Krok = 'termin' | 'zpusob' | 'apartmany' | 'kontakt';
type GalerieStav =
  | { druh: 'apt'; id: AptId; i: number }
  | { druh: 'komplet'; i: number }
  | null;

export function PoptavkaForm(props: PoptavkaVstupni) {
  const vernost = props.zdroj === 'vernost';
  const t = poptavkaTexty(props.lang, props.zdroj);
  const webLang = webLangKod(props.lang);
  const dnes = ymdDnesPraha();
  const [krok, setKrok] = useState<Krok>('termin');
  const [prijezd, setPrijezd] = useState('');
  const [odjezd, setOdjezd] = useState('');
  const [zpusob, setZpusob] = useState<'doporucit' | 'vybrat' | null>(null);
  const [apts, setApts] = useState<AptId[]>([]);
  const [jmeno, setJmeno] = useState(props.jmeno);
  const [telefon, setTelefon] = useState(props.telefon);
  const [doprava, setDoprava] = useState<'auto' | 'pesky' | 'nevim' | ''>('');
  const [poznamka, setPoznamka] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [galerie, setGalerie] = useState<GalerieStav>(null);
  const [cekam, setCekam] = useState(false);
  const [hotovo, setHotovo] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const libovolny = zpusob === 'doporucit';
  const dopravaOdeslat = vernost ? null : doprava || null;

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
        doprava: dopravaOdeslat,
        poznamka,
        jazyk: props.lang,
      }),
    [props, jmeno, telefon, prijezd, odjezd, apts, libovolny, dopravaOdeslat, poznamka],
  );

  const wa = odkazWaPoptavky(zprava);
  const ios = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const sms = odkazSmsPoptavky(zprava, ios);

  const galerieFotky =
    galerie?.druh === 'apt'
      ? (() => {
          const a = POPTAVKA_APARTMANY.find((x) => x.id === galerie.id);
          return a ? galerieUrls(webLang, a) : [];
        })()
      : galerie?.druh === 'komplet'
        ? galerieKompletUrls(webLang)
        : [];
  const galerieIndex = galerie?.i ?? 0;

  function nazevApt(id: AptId): string {
    const a = apartmany.find((x) => x.id === id);
    return props.lang === 'cs' ? a?.nazev.cs || id : a?.nazev.en || id;
  }

  function overTermin(): boolean {
    if (!prijezd || !odjezd || odjezd <= prijezd) {
      setChyba(t.chybaTermin);
      return false;
    }
    setChyba(null);
    return true;
  }

  function toggleApt(id: AptId) {
    setApts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function odeslat() {
    setChyba(null);
    if (!overTermin()) return;
    if (zpusob === 'vybrat' && !apts.length) {
      setChyba(t.chybaApartman);
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
          doprava: dopravaOdeslat,
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

  const souhrnTerminu =
    prijezd && odjezd
      ? vernost
        ? `${formatDatumPoptavky(prijezd, props.lang)} – ${formatDatumPoptavky(odjezd, props.lang)}`
        : `${formatDatumPoptavky(prijezd, props.lang)} → ${formatDatumPoptavky(odjezd, props.lang)}`
      : '';

  const souhrnVyberu = libovolny
    ? t.zpusobDoporucit
    : apts.length
      ? apts.map(nazevApt).join(', ')
      : '';

  const malyRadekVernost =
    vernost && souhrnTerminu
      ? krok === 'zpusob'
        ? `${t.malyKrok.replace('{n}', '2')} · ${souhrnTerminu}`
        : krok === 'apartmany'
          ? `${t.malyKrok.replace('{n}', '3')} · ${souhrnTerminu}`
          : krok === 'kontakt'
            ? `${t.malyPosledni} · ${souhrnTerminu}${souhrnVyberu ? ` · ${souhrnVyberu}` : ''}`
            : ''
      : '';

  /** Věrnost tmavá: 1 zahrada, 2 stropy, konec dům. Apartmány beze změny. */
  const heroVernost = vernost
    ? hotovo
      ? '/pruvodce/zahrada/zahrada-5-celkovy-pohled.jpg'
      : krok === 'termin'
        ? '/pruvodce/zahrada-po-odjezdu.jpg'
        : krok === 'zpusob'
          ? galerieKompletCoverUrl(webLang)
          : null
    : null;

  const ukazLogo = !vernost || krok === 'termin' || hotovo || Boolean(heroVernost);

  return (
    <main className={`pp${vernost ? ' pp--vernost' : ''}`} lang={props.lang}>
      <div className={`pp__karta${heroVernost ? ' pp__karta--s-herem' : ''}`}>
        {heroVernost ? (
          <div
            className={`pp__hero${hotovo ? ' pp__hero--dum' : krok === 'zpusob' ? ' pp__hero--stropy' : ' pp__hero--zahrada'}`}
            style={{ backgroundImage: `url('${heroVernost}')` }}
            role="img"
            aria-hidden="true"
          />
        ) : null}
        <div className={heroVernost ? 'pp__telo' : undefined}>
        {ukazLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="pp__logo"
            src="/pruvodce/va-logo-192.png"
            width={56}
            height={56}
            alt="VIVIEN Apartments"
          />
        ) : null}
        {!vernost ? (
          <>
            <h1>{t.nadpis}</h1>
            {props.firmaNazev ? (
              <p className="pp__firma">{t.firmaRadek.replace('{firma}', props.firmaNazev)}</p>
            ) : null}
            {!hotovo ? <p className="pp__uvod">{t.uvod}</p> : null}
            {t.sleva ? <p className="pp__sleva">{t.sleva}</p> : null}
          </>
        ) : null}
        {vernost && !hotovo && krok === 'termin' ? (
          <>
            <h1>{t.nadpis}</h1>
            <p className="pp__uvod">{t.uvod}</p>
          </>
        ) : null}
        {vernost && hotovo ? <h1>{t.nadpisOdeslano}</h1> : null}

        {hotovo ? (
          <>
            <p className="pp__dekujeme">{t.dekujeme}</p>
            {t.dekujemeSpecha ? <p className="pp__dekujeme-specha">{t.dekujemeSpecha}</p> : null}
          </>
        ) : (
          <>
            {krok === 'termin' ? (
              <section>
                {!vernost ? <h2 className="pp__krok">{t.krokTermin}</h2> : null}
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
                {chyba ? <p className="pp__chyba">{chyba}</p> : null}
                <button
                  type="button"
                  className="pp__btn pp__btn--hlavni"
                  onClick={() => {
                    if (overTermin()) setKrok('zpusob');
                  }}
                >
                  {t.dale}
                </button>
              </section>
            ) : null}

            {krok === 'zpusob' ? (
              <section>
                {vernost ? (
                  <>
                    {malyRadekVernost ? <p className="pp__maly-radek">{malyRadekVernost}</p> : null}
                    <h1 className="pp__nadpis-krok">{t.nadpisZpusob}</h1>
                  </>
                ) : (
                  <h2 className="pp__krok">{t.krokZpusob}</h2>
                )}
                <button
                  type="button"
                  className={`pp__volba${zpusob === 'doporucit' ? ' is-on' : ''}`}
                  onClick={() => {
                    setZpusob('doporucit');
                    setApts([]);
                    setKrok('kontakt');
                  }}
                >
                  <strong>{t.zpusobDoporucit}</strong>
                  <span>{t.zpusobDoporucitPopis}</span>
                </button>
                <button
                  type="button"
                  className={`pp__volba${zpusob === 'vybrat' ? ' is-on' : ''}`}
                  onClick={() => {
                    setZpusob('vybrat');
                    setKrok('apartmany');
                  }}
                >
                  <strong>{t.zpusobVybrat}</strong>
                  <span>{t.zpusobVybratPopis}</span>
                </button>
                <button type="button" className="pp__btn pp__btn--sms" onClick={() => setKrok('termin')}>
                  {t.zpet}
                </button>
              </section>
            ) : null}

            {krok === 'apartmany' ? (
              <section>
                {vernost ? (
                  <>
                    {malyRadekVernost ? <p className="pp__maly-radek">{malyRadekVernost}</p> : null}
                    <h1 className="pp__nadpis-krok">{t.nadpisApartmany}</h1>
                  </>
                ) : (
                  <h2 className="pp__krok">{t.krokApartmany}</h2>
                )}
                <p className="pp__cena">{t.vyberteApartmany}</p>
                <div className="pp__dlazdice">
                  {POPTAVKA_APARTMANY.map((a) => {
                    const on = apts.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className={`pp__dlazdice-polozka${on ? ' is-on' : ''}`}
                        onClick={() => setGalerie({ druh: 'apt', id: a.id, i: 0 })}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverUrl(webLang, a)} alt="" width={400} height={260} />
                        <span className="pp__dlazdice-nazev">{nazevApt(a.id)}</span>
                        {on ? <span className="pp__dlazdice-vybrano">✓</span> : null}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="pp__dlazdice-polozka"
                    onClick={() => setGalerie({ druh: 'komplet', i: 0 })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={galerieKompletCoverUrl(webLang)} alt="" width={400} height={260} />
                    <span className="pp__dlazdice-nazev">{t.galerieKomplet}</span>
                  </button>
                </div>
                {vernost && t.kvizOtazka ? (
                  <a
                    className="pp__kviz-ramecek"
                    href={odkazKvizAtmosfery(webLang)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <strong>{t.kvizOtazka}</strong>
                    <span>{t.kvizAtmosfery}</span>
                  </a>
                ) : (
                  <p className="pp__kviz">
                    <a href={odkazKvizAtmosfery(webLang)} target="_blank" rel="noopener noreferrer">
                      {t.kvizAtmosfery}
                    </a>
                  </p>
                )}
                {chyba ? <p className="pp__chyba">{chyba}</p> : null}
                <div className="pp__akce">
                  <button
                    type="button"
                    className="pp__btn pp__btn--hlavni"
                    onClick={() => {
                      if (!apts.length) {
                        setChyba(t.chybaApartman);
                        return;
                      }
                      setChyba(null);
                      setKrok('kontakt');
                    }}
                  >
                    {t.dale}
                  </button>
                  <button type="button" className="pp__btn pp__btn--sms" onClick={() => setKrok('zpusob')}>
                    {t.zpet}
                  </button>
                </div>
              </section>
            ) : null}

            {krok === 'kontakt' ? (
              <section>
                {vernost ? (
                  <>
                    {malyRadekVernost ? <p className="pp__maly-radek">{malyRadekVernost}</p> : null}
                    <h1 className="pp__nadpis-krok">{t.nadpisKontakt}</h1>
                  </>
                ) : (
                  <>
                    <h2 className="pp__krok">{t.krokKontakt}</h2>
                    <p className="pp__cena">
                      {souhrnTerminu}
                      {souhrnVyberu ? ` · ${souhrnVyberu}` : ''}
                    </p>
                  </>
                )}
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
                {!vernost ? (
                  <fieldset>
                    <legend>{t.doprava}</legend>
                    <div className="pp__doprava">
                      {(
                        [
                          ['auto', t.auto],
                          ['pesky', t.pesky],
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
                ) : null}
                <label>
                  {t.poznamka}
                  <textarea
                    value={poznamka}
                    onChange={(e) => setPoznamka(e.target.value)}
                    maxLength={500}
                  />
                </label>
                <label className="pp__hp" aria-hidden="true">
                  web
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </label>
                {chyba ? <p className="pp__chyba">{chyba}</p> : null}
                <div className="pp__akce">
                  <button
                    type="button"
                    className="pp__btn pp__btn--hlavni"
                    disabled={cekam}
                    onClick={() => void odeslat()}
                  >
                    {t.odeslat}
                  </button>
                  <a className="pp__btn pp__btn--wa" href={wa} target="_blank" rel="noopener noreferrer">
                    {t.whatsapp}
                  </a>
                  <a className="pp__btn pp__btn--sms pp__sms-only" href={sms}>
                    {t.sms}
                  </a>
                  <button
                    type="button"
                    className="pp__btn pp__btn--sms"
                    onClick={() => setKrok(zpusob === 'vybrat' ? 'apartmany' : 'zpusob')}
                  >
                    {t.zpet}
                  </button>
                </div>
              </section>
            ) : null}
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
      </div>

      {galerie && galerieFotky.length ? (
        <div className="pp__lightbox" role="dialog" aria-modal="true">
          <div className="pp__lightbox-vnitr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={galerieFotky[Math.min(galerieIndex, galerieFotky.length - 1)]}
              alt=""
            />
            <div className="pp__lightbox-ovladani">
              <button
                type="button"
                className="pp__chip"
                disabled={galerieIndex <= 0}
                onClick={() =>
                  setGalerie((g) => (g ? { ...g, i: Math.max(0, g.i - 1) } : g))
                }
              >
                ←
              </button>
              <span>
                {galerieIndex + 1} / {galerieFotky.length}
              </span>
              <button
                type="button"
                className="pp__chip"
                disabled={galerieIndex >= galerieFotky.length - 1}
                onClick={() =>
                  setGalerie((g) =>
                    g ? { ...g, i: Math.min(galerieFotky.length - 1, g.i + 1) } : g,
                  )
                }
              >
                →
              </button>
            </div>
            {galerie.druh === 'apt' ? (
              <button
                type="button"
                className="pp__btn pp__btn--hlavni"
                onClick={() => {
                  toggleApt(galerie.id);
                  setGalerie(null);
                }}
              >
                {apts.includes(galerie.id) ? t.zrusitVyber : t.vybratTento}
              </button>
            ) : (
              <a
                className="pp__btn pp__btn--wa"
                href={odkazApartmanyWeb(webLang)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.galerieKomplet}
              </a>
            )}
            <button type="button" className="pp__btn pp__btn--sms" onClick={() => setGalerie(null)}>
              {t.zavritGalerie}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
