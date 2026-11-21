'use client';

import { useMemo, useState, type ReactNode, type FormEvent } from 'react';
import { apartmany } from '@/lib/guide-data';
import { toTelHref } from '@/lib/i18n';
import {
  odkazSmsPoptavky,
  odkazWaPoptavky,
  POPTAVKA_TEL_HOVOR,
  POPTAVKA_TEL_ZALOHA,
  sestavZpravuPoptavky,
  ymdDnesPraha,
  type PoptavkaKanal,
  type PoptavkaZdroj,
} from '@/lib/poptavka';
import {
  coverUrl,
  galerieKompletCoverUrl,
  galerieKompletPolozky,
  galerieUrls,
  odkazKvizAtmosfery,
  POPTAVKA_APARTMANY,
  webLangKod,
} from '@/lib/poptavka-apartmany';
import { formatDatumPoptavky, poptavkaTexty } from '@/lib/poptavka-texty';
import {
  odpovedHlavni,
  odpovedRozstrel,
  prazdnyPruvodceStav,
  pruvodceText,
  pruvodceZpet,
  type PruvodceStav,
  type QuizAnswerKey,
  type TieAnswerKey,
} from '@/lib/poptavka-pruvodce';
import type { AptId, GuideLang } from '@/lib/types';
import { PoptavkaPlochaRoot, PoptavkaPlochaTlacitko } from './PoptavkaPlocha';
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
  /** Zkouška: nic se neukládá. */
  suchyBeh?: boolean;
};

type Krok = 'termin' | 'zpusob' | 'apartmany' | 'pruvodce' | 'kontakt';
type GalerieZpet = 'apartmany' | 'pruvodce';
type GalerieStav =
  | { druh: 'apt'; id: AptId; i: number; zpetNa: GalerieZpet }
  | { druh: 'komplet'; i: number; zpetNa: 'apartmany' }
  | null;

function prvniVety(text: string, maxVet = 2): string {
  const s = text.trim();
  if (!s) return '';
  const casti = s.match(/[^.!?…]+[.!?…]+(?:\s+|$)|[^.!?…]+$/gu);
  if (!casti?.length) return s;
  return casti.slice(0, maxVet).join('').trim();
}

export function PoptavkaForm(props: PoptavkaVstupni) {
  const vernost = props.zdroj === 'vernost';
  const suchyBeh = Boolean(props.suchyBeh);
  const t = poptavkaTexty(props.lang, props.zdroj);
  const webLang = webLangKod(props.lang);
  const dnes = ymdDnesPraha();
  const [krok, setKrok] = useState<Krok>('termin');
  const [prijezd, setPrijezd] = useState('');
  const [odjezd, setOdjezd] = useState('');
  const [zpusob, setZpusob] = useState<'doporucit' | 'vybrat' | 'pruvodce' | null>(null);
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
  const [pruvodce, setPruvodce] = useState<PruvodceStav>(() => prazdnyPruvodceStav(props.lang));

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

  const galerieKomplet = useMemo(
    () => (galerie?.druh === 'komplet' ? galerieKompletPolozky(webLang) : []),
    [galerie?.druh, webLang],
  );
  const galerieFotky =
    galerie?.druh === 'apt'
      ? (() => {
          const a = POPTAVKA_APARTMANY.find((x) => x.id === galerie.id);
          return a ? galerieUrls(webLang, a) : [];
        })()
      : galerieKomplet.map((p) => p.url);
  const galerieIndex = galerie?.i ?? 0;
  const galerieAptId: AptId | null =
    galerie?.druh === 'apt'
      ? galerie.id
      : galerie?.druh === 'komplet'
        ? galerieKomplet[Math.min(galerieIndex, Math.max(0, galerieKomplet.length - 1))]?.aptId ??
          null
        : null;

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

  async function odeslat(kanal: PoptavkaKanal = 'formular') {
    setChyba(null);
    if (!overTermin()) return;
    if ((zpusob === 'vybrat' || zpusob === 'pruvodce') && !apts.length && !libovolny) {
      setChyba(t.chybaApartman);
      return;
    }
    if (!jmeno.trim() || !telefon.trim()) {
      setChyba(t.chybaKontakt);
      return;
    }
    setCekam(true);
    let ulozOk = false;
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
          kanal,
          zkouska: suchyBeh || undefined,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; duvod?: string };
      ulozOk = Boolean(json.ok);
      if (!json.ok && kanal === 'formular') {
        if (json.duvod === 'blok') setChyba(t.chybaBlok);
        else if (json.duvod === 'termin') setChyba(t.chybaTermin);
        else if (json.duvod === 'kontakt') setChyba(t.chybaKontakt);
        else setChyba(t.chybaObecna);
        return;
      }
    } catch {
      if (kanal === 'formular') {
        setChyba(t.chybaObecna);
        return;
      }
    } finally {
      setCekam(false);
    }

    if (kanal === 'whatsapp' || kanal === 'sms') {
      const cil = kanal === 'whatsapp' ? wa : sms;
      try {
        sessionStorage.setItem('poptavka-diky', '1');
      } catch {
        /* ignorovat */
      }
      setHotovo(true);
      try {
        window.location.href = cil;
      } catch {
        /* ignorovat */
      }
      return;
    }

    if (ulozOk) setHotovo(true);
  }

  function resetPruvodce() {
    setPruvodce(prazdnyPruvodceStav(props.lang));
  }

  function pokracujSApartmanem(id: AptId) {
    setApts([id]);
    setGalerie(null);
    setChyba(null);
    setKrok('kontakt');
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
      ? krok === 'zpusob' || krok === 'pruvodce'
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

  function ikonaVolby(druh: 'vybrat' | 'doporucit' | 'pruvodce'): ReactNode {
    if (druh === 'vybrat') {
      return (
        <span className="pp__volba-ikona" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              fill="currentColor"
              d="M4 5h7v7H4V5zm9 0h7v7h-7V5zM4 14h7v5H4v-5zm9 0h7v5h-7v-5z"
            />
          </svg>
        </span>
      );
    }
    if (druh === 'doporucit') {
      return (
        <span className="pp__volba-ikona" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              fill="currentColor"
              d="M12 2a7 7 0 0 0-7 7c0 3.2 2.1 5.9 5 6.7V18H8v2h8v-2h-2v-2.3c2.9-.8 5-3.5 5-6.7a7 7 0 0 0-7-7zm0 2a5 5 0 0 1 5 5c0 2.3-1.6 4.2-3.7 4.8L12 14l-1.3-.2C8.6 13.2 7 11.3 7 9a5 5 0 0 1 5-5z"
            />
          </svg>
        </span>
      );
    }
    return (
      <span className="pp__volba-ikona" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path
            fill="currentColor"
            d="M6 4h9l3 3v13H6V4zm2 2v12h8V8h-3V6H8zm2 4h4v2h-4v-2zm0 4h4v2h-4v-2z"
          />
        </svg>
      </span>
    );
  }

  return (
    <PoptavkaPlochaRoot lang={props.lang}>
    <main className={`pp${vernost ? ' pp--vernost' : ''}${suchyBeh ? ' pp--zkouska' : ''}`} lang={props.lang}>
      <div className={`pp__karta${heroVernost ? ' pp__karta--s-herem' : ''}`}>
        {suchyBeh ? <span className="pp__zkouska-stitkek">zkouška</span> : null}
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
                    <button
                      type="button"
                      className={`pp__volba pp__volba--ikona${zpusob === 'vybrat' ? ' is-on' : ''}`}
                      onClick={() => {
                        setZpusob('vybrat');
                        setKrok('apartmany');
                      }}
                    >
                      {ikonaVolby('vybrat')}
                      <span className="pp__volba-text">
                        <strong>{t.zpusobVybrat}</strong>
                        <span>{t.zpusobVybratPopis}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`pp__volba pp__volba--ikona${zpusob === 'doporucit' ? ' is-on' : ''}`}
                      onClick={() => {
                        setZpusob('doporucit');
                        setApts([]);
                        setKrok('kontakt');
                      }}
                    >
                      {ikonaVolby('doporucit')}
                      <span className="pp__volba-text">
                        <strong>{t.zpusobDoporucit}</strong>
                        <span>{t.zpusobDoporucitPopis}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`pp__volba pp__volba--ikona${zpusob === 'pruvodce' ? ' is-on' : ''}`}
                      onClick={() => {
                        setZpusob('pruvodce');
                        resetPruvodce();
                        setApts([]);
                        setKrok('pruvodce');
                      }}
                    >
                      {ikonaVolby('pruvodce')}
                      <span className="pp__volba-text">
                        <strong>{t.zpusobPruvodce}</strong>
                        <span>{t.zpusobPruvodcePopis}</span>
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="pp__krok">{t.krokZpusob}</h2>
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
                  </>
                )}
                <button type="button" className="pp__btn pp__btn--sms" onClick={() => setKrok('termin')}>
                  {t.zpet}
                </button>
              </section>
            ) : null}

            {krok === 'pruvodce' ? (
              <section className={pruvodce.phase === 'result' ? 'pp__vysledek' : undefined}>
                {malyRadekVernost ? <p className="pp__maly-radek">{malyRadekVernost}</p> : null}
                {pruvodce.phase === 'result' && pruvodce.result ? (
                  <>
                    {(() => {
                      const primary = POPTAVKA_APARTMANY.find((x) => x.id === pruvodce.result!.primary);
                      const profil = pruvodce.result!.profiles[pruvodce.result!.primary];
                      return (
                        <>
                          {primary ? (
                            <div className="pp__dlazdice pp__dlazdice--jedna">
                              <button
                                type="button"
                                className="pp__dlazdice-polozka"
                                onClick={() =>
                                  setGalerie({
                                    druh: 'apt',
                                    id: pruvodce.result!.primary,
                                    i: 0,
                                    zpetNa: 'pruvodce',
                                  })
                                }
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={coverUrl(webLang, primary)} alt="" width={400} height={260} />
                              </button>
                            </div>
                          ) : null}
                          <p className="pp__maly-radek">
                            {pruvodceText(props.lang, 'quiz.result.matchLabel')}
                          </p>
                          <h1 className="pp__nadpis-krok">{nazevApt(pruvodce.result!.primary)}</h1>
                          <p className="pp__cena">
                            {prvniVety(profil?.body || '', 2)}
                          </p>
                          {profil?.traits ? (
                            <p className="pp__maly-radek">{profil.traits}</p>
                          ) : null}
                          <button
                            type="button"
                            className="pp__btn pp__btn--hlavni"
                            onClick={() => pokracujSApartmanem(pruvodce.result!.primary)}
                          >
                            {t.pruvodceVybrat}
                          </button>
                        </>
                      );
                    })()}
                    <p className="pp__maly-radek">
                      {pruvodceText(props.lang, 'quiz.result.altsHeading')}
                    </p>
                    <div className="pp__dlazdice">
                      {pruvodce.result.alternatives.map((id) => {
                        const a = POPTAVKA_APARTMANY.find((x) => x.id === id);
                        if (!a) return null;
                        return (
                          <button
                            key={id}
                            type="button"
                            className="pp__dlazdice-polozka"
                            onClick={() =>
                              setGalerie({ druh: 'apt', id, i: 0, zpetNa: 'pruvodce' })
                            }
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={coverUrl(webLang, a)} alt="" width={400} height={260} />
                            <span className="pp__dlazdice-nazev">{nazevApt(id)}</span>
                          </button>
                        );
                      })}
                    </div>
                    <button type="button" className="pp__btn pp__btn--sms" onClick={resetPruvodce}>
                      {t.pruvodceZnovu}
                    </button>
                    <button type="button" className="pp__btn pp__btn--sms" onClick={() => setKrok('zpusob')}>
                      {t.zpet}
                    </button>
                  </>
                ) : (
                  <>
                    <h1 className="pp__nadpis-krok">{t.nadpisPruvodce}</h1>
                    <p className="pp__maly-radek">{pruvodce.questionCounter}</p>
                    <p className="pp__cena" style={{ textAlign: 'center' }}>
                      {pruvodce.question?.text}
                    </p>
                    {pruvodce.question?.options.map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        className="pp__volba"
                        onClick={() => {
                          if (pruvodce.phase === 'tie') {
                            setPruvodce(
                              odpovedRozstrel(
                                props.lang,
                                pruvodce.mainAnswers,
                                pruvodce.tieBoosts,
                                o.key as TieAnswerKey,
                              ),
                            );
                          } else {
                            setPruvodce(
                              odpovedHlavni(
                                props.lang,
                                pruvodce.mainAnswers,
                                pruvodce.tieBoosts,
                                o.key as QuizAnswerKey,
                              ),
                            );
                          }
                        }}
                      >
                        <strong>{o.text}</strong>
                      </button>
                    ))}
                    {pruvodce.mainAnswers.length > 0 || pruvodce.tieBoosts.length > 0 ? (
                      <button
                        type="button"
                        className="pp__btn pp__btn--sms"
                        onClick={() =>
                          setPruvodce(
                            pruvodceZpet(props.lang, pruvodce.mainAnswers, pruvodce.tieBoosts),
                          )
                        }
                      >
                        {pruvodceText(props.lang, 'quiz.ui.back')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="pp__btn pp__btn--sms"
                        onClick={() => setKrok('zpusob')}
                      >
                        {t.zpet}
                      </button>
                    )}
                  </>
                )}
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
                        onClick={() =>
                          setGalerie({ druh: 'apt', id: a.id, i: 0, zpetNa: 'apartmany' })
                        }
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
                    onClick={() => setGalerie({ druh: 'komplet', i: 0, zpetNa: 'apartmany' })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={galerieKompletCoverUrl(webLang)} alt="" width={400} height={260} />
                    <span className="pp__dlazdice-nazev">{t.galerieKomplet}</span>
                  </button>
                </div>
                {!vernost ? (
                  <p className="pp__kviz">
                    <a href={odkazKvizAtmosfery(webLang)} target="_blank" rel="noopener noreferrer">
                      {t.kvizAtmosfery}
                    </a>
                  </p>
                ) : null}
                {chyba ? <p className="pp__chyba">{chyba}</p> : null}
                <button type="button" className="pp__btn pp__btn--sms" onClick={() => setKrok('zpusob')}>
                  {t.zpet}
                </button>
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
                    className="pp__poznamka"
                    rows={2}
                    value={poznamka}
                    onChange={(e) => {
                      setPoznamka(e.target.value);
                      const el = e.currentTarget;
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }}
                    onInput={(e: FormEvent<HTMLTextAreaElement>) => {
                      const el = e.currentTarget;
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }}
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
                    onClick={() => void odeslat('formular')}
                  >
                    {t.odeslat}
                  </button>
                  {vernost ? (
                    <>
                      <p className="pp__nebo-pres">{t.neboOdeslatPres}</p>
                      <div className="pp__odeslat-pres">
                        <button
                          type="button"
                          className="pp__btn pp__btn--wa pp__btn--mensi"
                          disabled={cekam}
                          onClick={() => void odeslat('whatsapp')}
                        >
                          {t.whatsapp}
                        </button>
                        <button
                          type="button"
                          className="pp__btn pp__btn--sms pp__btn--mensi pp__sms-only"
                          disabled={cekam}
                          onClick={() => void odeslat('sms')}
                        >
                          {t.sms}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="pp__btn pp__btn--wa"
                        disabled={cekam}
                        onClick={() => void odeslat('whatsapp')}
                      >
                        {t.whatsapp}
                      </button>
                      <button
                        type="button"
                        className="pp__btn pp__btn--sms pp__sms-only"
                        disabled={cekam}
                        onClick={() => void odeslat('sms')}
                      >
                        {t.sms}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="pp__btn pp__btn--sms"
                    onClick={() =>
                      setKrok(
                        zpusob === 'vybrat' ? 'apartmany' : zpusob === 'pruvodce' ? 'pruvodce' : 'zpusob',
                      )
                    }
                  >
                    {t.zpet}
                  </button>
                </div>
              </section>
            ) : null}
          </>
        )}

        <PoptavkaPlochaTlacitko />

        <div className="pp__kontakty">
          <a className="pp__kontakt" href={toTelHref(POPTAVKA_TEL_HOVOR)}>
            <span className="pp__kontakt-popis">{t.zavolat}</span>
            <span className="pp__kontakt-cislo">{telNikol}</span>
          </a>
          <a className="pp__kontakt" href={toTelHref(POPTAVKA_TEL_ZALOHA)}>
            <span className="pp__kontakt-popis">{t.zaloha}</span>
            <span className="pp__kontakt-cislo">{telZaloha}</span>
          </a>
        </div>
        </div>
      </div>

      {galerie && galerieFotky.length ? (
        <div className="pp__lightbox" role="dialog" aria-modal="true">
          <div className="pp__lightbox-vnitr">
            {galerieAptId ? (
              <p className="pp__lightbox-nazev">{nazevApt(galerieAptId)}</p>
            ) : null}
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
            {galerieAptId ? (
              <button
                type="button"
                className="pp__btn pp__btn--hlavni"
                onClick={() => pokracujSApartmanem(galerieAptId)}
              >
                {t.vybratTento}
              </button>
            ) : null}
            <button type="button" className="pp__btn pp__btn--sms" onClick={() => setGalerie(null)}>
              {galerie.zpetNa === 'pruvodce' ? t.zpetNaVysledek : t.zpet}
            </button>
          </div>
        </div>
      ) : null}
    </main>
    </PoptavkaPlochaRoot>
  );
}
