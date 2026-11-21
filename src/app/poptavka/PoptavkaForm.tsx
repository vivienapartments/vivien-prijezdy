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
import { TerminPole } from './TerminKalendar';
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

  const malyRadekVernost = vernost
    ? krok === 'zpusob' || krok === 'pruvodce'
      ? t.malyKrok.replace('{n}', '2')
      : krok === 'apartmany'
        ? t.malyKrok.replace('{n}', '3')
        : krok === 'kontakt' && souhrnTerminu
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
  /** Termín věrnosti: karta přes okno, fotka vyplní místo (jako Děkujeme). */
  const kartaTermin = Boolean(vernost && !hotovo && krok === 'termin');
  /** Krátké kroky vyplní výšku. Apartmány a Kontakt necháváme jako dnes. */
  const kartaVypln =
    !galerie && !hotovo && !kartaTermin && krok !== 'apartmany' && krok !== 'kontakt';
  /** Po odeslání: karta přes okno, fotka vyplní zbylé místo. */
  const kartaDekujeme = Boolean(vernost && hotovo);
  /** Věrnost: kontakty jen na Kontakt a Děkujeme. Ostatní cesty beze změny. */
  const ukazPaticku = !vernost || hotovo || krok === 'kontakt';

  function ikonaVolby(druh: 'vybrat' | 'doporucit' | 'pruvodce'): ReactNode {
    const stroke = {
      fill: 'none' as const,
      stroke: '#c9a84c',
      strokeWidth: 1.5,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      width: 30,
      height: 30,
      viewBox: '0 0 24 24',
      'aria-hidden': true as const,
    };
    if (druh === 'vybrat') {
      return (
        <span className="pp__volba-ikona" aria-hidden="true">
          <svg {...stroke}>
            <rect x="7" y="3" width="14" height="12" rx="2" />
            <path d="M3 7v11a2 2 0 0 0 2 2h12" />
            <circle cx="12" cy="7.5" r="1.3" />
            <path d="M21 12l-3.5-3.5L10 15" />
          </svg>
        </span>
      );
    }
    if (druh === 'doporucit') {
      return (
        <span className="pp__volba-ikona" aria-hidden="true">
          <svg {...stroke}>
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
            <path d="M12 8.5l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z" />
          </svg>
        </span>
      );
    }
    return (
      <span className="pp__volba-ikona" aria-hidden="true">
        <svg {...stroke}>
          <circle cx="12" cy="12" r="9" />
          <path d="M15.5 8.5l-2 5-5 2 2-5z" />
        </svg>
      </span>
    );
  }

  return (
    <PoptavkaPlochaRoot lang={props.lang}>
    <main className={`pp${vernost ? ' pp--vernost' : ''}`} lang={props.lang}>
      <div
        className={`pp__karta${heroVernost ? ' pp__karta--s-herem' : ''}${kartaVypln ? ' pp__karta--vypln' : ''}${kartaTermin ? ' pp__karta--termin' : ''}${kartaDekujeme ? ' pp__karta--dekujeme' : ''}${krok === 'zpusob' ? ' pp__karta--zpusob' : ''}`}
      >
        {heroVernost ? (
          <div
            className={`pp__hero${hotovo ? ' pp__hero--dum' : krok === 'zpusob' ? ' pp__hero--stropy' : ' pp__hero--zahrada'}`}
            style={{ backgroundImage: `url('${heroVernost}')` }}
            role="img"
            aria-hidden="true"
          />
        ) : null}
        <div className="pp__telo">
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
            {vernost ? <PoptavkaPlochaTlacitko sTelefonem /> : null}
          </>
        ) : (
          <>
            {krok === 'termin' ? (
              <section>
                {!vernost ? <h2 className="pp__krok">{t.krokTermin}</h2> : null}
                <div className="pp__termin">
                  <TerminPole
                    label={t.prijezd}
                    value={prijezd}
                    min={dnes}
                    lang={props.lang}
                    zavritLabel={t.zpet}
                    prazdnyText={vernost ? (props.lang === 'cs' ? 'Vyberte datum' : 'Select date') : undefined}
                    onChange={(ymd) => {
                      setPrijezd(ymd);
                      if (odjezd && odjezd <= ymd) setOdjezd('');
                    }}
                  />
                  <TerminPole
                    label={t.odjezd}
                    value={odjezd}
                    min={prijezd || dnes}
                    lang={props.lang}
                    zavritLabel={t.zpet}
                    prazdnyText={vernost ? (props.lang === 'cs' ? 'Vyberte datum' : 'Select date') : undefined}
                    onChange={setOdjezd}
                  />
                </div>
                {chyba ? <p className="pp__chyba">{chyba}</p> : null}
                <button
                  type="button"
                  className={`pp__btn${vernost ? ' pp__btn--tlumeny' : ' pp__btn--hlavni'}`}
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
                {pruvodce.phase === 'result' ? null : malyRadekVernost ? (
                  <p className="pp__maly-radek">{malyRadekVernost}</p>
                ) : null}
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
                          {profil?.traits ? <p className="pp__vysledek-vlastnosti">{profil.traits}</p> : null}
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
                    <h2 className="pp__vysledek-dalsi">
                      {pruvodceText(props.lang, 'quiz.result.altsHeading')}
                    </h2>
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
                    <div className="pp__vysledek-zpet">
                      <button type="button" className="pp__btn pp__btn--sms" onClick={resetPruvodce}>
                        {t.pruvodceZnovu}
                      </button>
                      <button
                        type="button"
                        className="pp__btn pp__btn--sms"
                        onClick={() => setKrok('zpusob')}
                      >
                        {t.zpet}
                      </button>
                    </div>
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

        {ukazPaticku ? (
          <div className="pp__paticka">
            {vernost ? null : <PoptavkaPlochaTlacitko />}
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
        ) : null}
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
