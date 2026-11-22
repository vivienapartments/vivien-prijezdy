'use client';

import { useEffect, useMemo, useState, type ReactNode, type FormEvent } from 'react';
import { isValidPhoneNumber } from 'libphonenumber-js';
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
import {
  doporucitelUiTexty,
  klicJazykDoporuceni,
} from '@/lib/poptavka-doporucitel-ui';
import {
  formatDatumPoptavky,
  formatRozsahPoptavky,
  poptavkaTexty,
} from '@/lib/poptavka-texty';
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
import { GUIDE_LANGS, type AptId, type GuideLang } from '@/lib/types';
import { JazykPrepinac } from './JazykPrepinac';
import { PoptavkaPlochaRoot, PoptavkaPlochaTlacitko } from './PoptavkaPlocha';
import { TelefonPole } from './TelefonPole';
import { nazevDlazdice } from '@/lib/poptavka-nazev-dlazdice';
import { TerminPole } from './TerminKalendar';
import { usePoptavkaKalendar } from './usePoptavkaKalendar';
import { VyberJazyka } from './VyberJazyka';
import { formatKc, kalendarTexty, tvarNoci } from '@/lib/kalendar-texty';
import { nociPobytu } from '@/lib/kalendar-denni';
import './poptavka.scss';

const GUIDE_LANG_SET = new Set<string>(GUIDE_LANGS);

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
  /** Věrný i doporučený host: stejná stavba obrazovek (PROMPT-76 / 77). */
  const vernost = props.zdroj === 'vernost' || props.zdroj === 'doporucitel';
  const doporucitel = props.zdroj === 'doporucitel';
  const suchyBeh = Boolean(props.suchyBeh);
  const [lang, setLang] = useState<GuideLang>(props.lang);
  const kal = usePoptavkaKalendar();
  const firma = props.zdroj === 'firma';
  const ukazCeny = kal.cenyZapnuto && !firma;
  const slevaCesty = props.zdroj === 'vernost' || props.zdroj === 'doporucitel';
  const t = poptavkaTexty(lang, props.zdroj, kal.cenyZapnuto);
  const kt = kalendarTexty(lang);
  const uiDop = doporucitel ? doporucitelUiTexty(lang) : null;
  const webLang = webLangKod(lang);
  const dnes = ymdDnesPraha();
  const [krok, setKrok] = useState<Krok>('termin');
  const [prijezd, setPrijezd] = useState('');
  const [odjezd, setOdjezd] = useState('');
  const [zpusob, setZpusob] = useState<'doporucit' | 'vybrat' | 'pruvodce' | null>(null);
  const [apts, setApts] = useState<AptId[]>([]);
  const [jmeno, setJmeno] = useState(props.jmeno);
  const [telefon, setTelefon] = useState(props.telefon);
  const [telefonChyba, setTelefonChyba] = useState(false);
  const [doprava, setDoprava] = useState<'auto' | 'pesky' | 'nevim' | ''>('');
  const [poznamka, setPoznamka] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [galerie, setGalerie] = useState<GalerieStav>(null);
  const [cekam, setCekam] = useState(false);
  const [hotovo, setHotovo] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [pruvodce, setPruvodce] = useState<PruvodceStav>(() => prazdnyPruvodceStav(props.lang));
  const [volneNabidka, setVolneNabidka] = useState<AptId[]>([]);
  const [terminyProApt, setTerminyProApt] = useState<{
    apt: AptId;
    terminy: { prijezd: string; odjezd: string }[];
  } | null>(null);
  const [cekamJazyk, setCekamJazyk] = useState(doporucitel);
  const [vyberJazyka, setVyberJazyka] = useState(false);

  useEffect(() => {
    if (!doporucitel) {
      setCekamJazyk(false);
      return;
    }
    try {
      const k = klicJazykDoporuceni(props.doporucitelKod || '');
      const ulozeny = localStorage.getItem(k);
      if (ulozeny && GUIDE_LANG_SET.has(ulozeny)) {
        setLang(ulozeny as GuideLang);
        setVyberJazyka(false);
      } else {
        setVyberJazyka(true);
      }
    } catch {
      setVyberJazyka(true);
    }
    setCekamJazyk(false);
  }, [doporucitel, props.doporucitelKod]);

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
        jazyk: lang,
        cenaKc: (() => {
          if (!ukazCeny || !prijezd || !odjezd) return null;
          const c = kal.cenaProVyber(prijezd, odjezd, apts, libovolny, slevaCesty);
          return c ? (slevaCesty ? c.seSlevou : c.suma) : null;
        })(),
        cenaSeSlevou: slevaCesty && ukazCeny,
      }),
    [props, jmeno, telefon, prijezd, odjezd, apts, libovolny, dopravaOdeslat, poznamka, lang, ukazCeny, slevaCesty, kal],
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
    return lang === 'cs' ? a?.nazev.cs || id : a?.nazev.en || id;
  }

  function nazevNaDlazdici(id: AptId): string {
    return nazevDlazdice(id, lang, nazevApt(id));
  }

  function overTermin(): boolean {
    if (!prijezd || !odjezd || odjezd <= prijezd) {
      setChyba(t.chybaTermin);
      return false;
    }
    if (kal.nacteno && kal.terminPlny(prijezd, odjezd)) {
      setChyba(kt.terminBezVolneho);
      return false;
    }
    setChyba(null);
    return true;
  }

  function nastavNejblizsiTermin() {
    if (!prijezd || !odjezd) return;
    const nab = kal.nejblizsi(prijezd, odjezd);
    if (!nab.length) return;
    setPrijezd(nab[0].prijezd);
    setOdjezd(nab[0].odjezd);
    setChyba(null);
  }

  const cenaVyberu =
    ukazCeny && prijezd && odjezd
      ? kal.cenaProVyber(prijezd, odjezd, apts, libovolny, slevaCesty)
      : null;
  const nociPocet = prijezd && odjezd ? nociPobytu(prijezd, odjezd).length : 0;

  function telefonOk(): boolean {
    const raw = telefon.trim();
    if (!raw) return false;
    try {
      return isValidPhoneNumber(raw);
    } catch {
      return false;
    }
  }

  async function odeslat(kanal: PoptavkaKanal = 'formular') {
    setChyba(null);
    if (!overTermin()) return;
    if ((zpusob === 'vybrat' || zpusob === 'pruvodce') && !apts.length && !libovolny) {
      setChyba(t.chybaApartman);
      return;
    }
    if (!jmeno.trim()) {
      setChyba(t.chybaKontakt);
      return;
    }
    if (!telefonOk()) {
      setTelefonChyba(true);
      setChyba(t.chybaTelefon);
      return;
    }
    setTelefonChyba(false);
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
          lang: lang,
          honeypot,
          kanal,
          zkouska: suchyBeh || undefined,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        duvod?: string;
        nabidka?: AptId[];
      };
      ulozOk = Boolean(json.ok);
      if (!json.ok && kanal === 'formular') {
        if (json.duvod === 'blok') setChyba(t.chybaBlok);
        else if (json.duvod === 'termin') setChyba(t.chybaTermin);
        else if (json.duvod === 'kontakt') setChyba(t.chybaKontakt);
        else if (json.duvod === 'obsazeno') {
          setChyba(kt.aptObsazenOdeslani);
          if (Array.isArray(json.nabidka) && json.nabidka.length) {
            setVolneNabidka(json.nabidka);
          }
        } else setChyba(t.chybaObecna);
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
    setPruvodce(prazdnyPruvodceStav(lang));
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
        ? formatRozsahPoptavky(prijezd, odjezd, lang)
        : `${formatDatumPoptavky(prijezd, lang)} → ${formatDatumPoptavky(odjezd, lang)}`
      : '';

  const souhrnVyberu = libovolny
    ? t.zpusobDoporucit
    : apts.length
      ? apts.map(nazevApt).join(', ')
      : '';

  const malyRadekVernost =
    vernost && krok === 'kontakt' && souhrnTerminu
      ? `${souhrnTerminu}${souhrnVyberu ? `\u00a0·\u00a0${souhrnVyberu}` : ''}`
      : '';

  /**
   * Tmavá cesta: věrný host svoje fotky, doporučený v kroku 1 večerní zahradu.
   * 1 termín / 2 stropy / konec dům. Apartmány beze změny.
   */
  const heroVernost = vernost
    ? hotovo
      ? '/pruvodce/zahrada/zahrada-5-celkovy-pohled.jpg'
      : krok === 'termin'
        ? doporucitel
          ? '/poptavka/doporuceny-zahrada-vecer.webp'
          : '/pruvodce/zahrada-po-odjezdu.jpg'
        : krok === 'zpusob'
          ? galerieKompletCoverUrl(webLang)
          : null
    : null;
  const heroVecer = Boolean(doporucitel && krok === 'termin' && heroVernost);

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

  if (cekamJazyk) {
    return <main className="pp pp--vernost pp--doporuceny" lang={lang} />;
  }
  if (doporucitel && vyberJazyka) {
    return (
      <VyberJazyka
        lang={lang}
        onLang={setLang}
        daleText={t.dale}
        onDale={() => {
          try {
            localStorage.setItem(klicJazykDoporuceni(props.doporucitelKod || ''), lang);
          } catch {
            /* */
          }
          setVyberJazyka(false);
        }}
      />
    );
  }

  return (
    <PoptavkaPlochaRoot lang={lang}>
    <main
      className={`pp${vernost ? ' pp--vernost' : ''}${doporucitel ? ' pp--doporuceny' : ''}`}
      lang={lang}
    >
      <div
        className={`pp__karta${heroVernost ? ' pp__karta--s-herem' : ''}${kartaVypln ? ' pp__karta--vypln' : ''}${kartaTermin ? ' pp__karta--termin' : ''}${kartaDekujeme ? ' pp__karta--dekujeme' : ''}${krok === 'zpusob' ? ' pp__karta--zpusob' : ''}${krok === 'kontakt' ? ' pp__karta--kontakt' : ''}`}
      >
        {heroVernost ? (
          <div
            className={`pp__hero${
              hotovo
                ? ' pp__hero--dum'
                : krok === 'zpusob'
                  ? ' pp__hero--stropy'
                  : heroVecer
                    ? ' pp__hero--vecer'
                    : ' pp__hero--zahrada'
            }`}
            style={{ backgroundImage: `url('${heroVernost}')` }}
            role="img"
            aria-label=""
          >
            <JazykPrepinac lang={lang} onLang={setLang} />
          </div>
        ) : (
          <div className="pp__lang-wrap">
            <JazykPrepinac lang={lang} onLang={setLang} />
          </div>
        )}
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
            {doporucitel && uiDop ? (
              <p className="pp__uvod">
                {uiDop.poptavkaVeta}{' '}
                <span className="pp__sleva-inline">{uiDop.poptavkaSleva}</span>{' '}
                {uiDop.poptavkaNapoveda}
              </p>
            ) : (
              <p className="pp__uvod">{t.uvod}</p>
            )}
          </>
        ) : null}
        {vernost && hotovo ? <h1>{t.nadpisOdeslano}</h1> : null}

        {hotovo ? (
          <>
            <p className="pp__dekujeme">
              {t.dekujeme}
              {t.dekujemeVolejte ? (
                <>
                  <br />
                  <span className="pp__dekujeme-volejte">{t.dekujemeVolejte}</span>
                </>
              ) : null}
            </p>
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
                    dnes={dnes}
                    lang={lang}
                    zavritLabel={t.zpet}
                    rezim="prijezd"
                    denInfo={kal.denInfo}
                    plnoLabel={kt.plno}
                    ukazCeny={ukazCeny}
                    legenda={kt.cenaLegenda}
                    rozsahOd={prijezd}
                    rozsahDo={odjezd}
                    prazdnyText={vernost ? (lang === 'cs' ? 'Vyberte datum' : 'Select date') : undefined}
                    onChange={(ymd) => {
                      setPrijezd(ymd);
                      if (odjezd && odjezd <= ymd) setOdjezd('');
                    }}
                  />
                  <TerminPole
                    label={t.odjezd}
                    value={odjezd}
                    min={prijezd || dnes}
                    dnes={dnes}
                    lang={lang}
                    zavritLabel={t.zpet}
                    rezim="odjezd"
                    denInfo={kal.denInfo}
                    plnoLabel={kt.plno}
                    ukazCeny={ukazCeny}
                    legenda={kt.cenaLegenda}
                    rozsahOd={prijezd}
                    rozsahDo={odjezd}
                    prazdnyText={vernost ? (lang === 'cs' ? 'Vyberte datum' : 'Select date') : undefined}
                    onChange={setOdjezd}
                  />
                </div>
                {prijezd && !odjezd ? <p className="pp__maly-radek">{kt.tedVyberteOdjezd}</p> : null}
                {prijezd && odjezd && nociPocet > 0 && !(ukazCeny && cenaVyberu) ? (
                  <p className="pp__maly-radek">
                    {(souhrnTerminu || `${prijezd} → ${odjezd}`) + ' · ' + tvarNoci(nociPocet, lang)}
                  </p>
                ) : null}
                {chyba === kt.terminBezVolneho ? (
                  <button type="button" className="pp__btn pp__btn--tlumeny" onClick={nastavNejblizsiTermin}>
                    {kt.ukazNejblizsi}
                  </button>
                ) : null}
                {ukazCeny && cenaVyberu && nociPocet > 0 ? (
                  <div className="pp__cena-souhrn">
                    <p className="pp__cena-souhrn-radek">
                      {souhrnTerminu || ''}
                      {' · '}
                      {tvarNoci(nociPocet, lang)}
                    </p>
                    <p className="pp__cena-souhrn-radek">
                      {kt.cenaZaPobyt}{' '}
                      {slevaCesty ? (
                        <>
                          <span className="pp__cena-souhrn-skrtnute">{formatKc(cenaVyberu.suma)}</span>
                          <span className="pp__cena-souhrn-castka">{formatKc(cenaVyberu.seSlevou)}</span>
                        </>
                      ) : (
                        <span className="pp__cena-souhrn-castka">{formatKc(cenaVyberu.suma)}</span>
                      )}
                    </p>
                    {slevaCesty ? <p className="pp__cena-souhrn-radek">{kt.cenaSleva}</p> : null}
                    <p className="pp__cena-souhrn-pozn">{kt.cenaPoznamka}</p>
                  </div>
                ) : null}
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
                      const r = pruvodce.result!;
                      const poradi: AptId[] = [r.primary, ...r.alternatives];
                      const volnePoradi = poradi.filter(
                        (id) => !prijezd || !odjezd || !kal.aptObsazenyVeTerminu(id, prijezd, odjezd),
                      );
                      const primaryId = volnePoradi[0] || null;
                      const idealObsazen =
                        Boolean(prijezd && odjezd) &&
                        kal.aptObsazenyVeTerminu(r.primary, prijezd, odjezd);
                      const dalsi = poradi.filter((id) => id !== primaryId);
                      const primary = primaryId
                        ? POPTAVKA_APARTMANY.find((x) => x.id === primaryId)
                        : null;
                      const profil = primaryId ? r.profiles[primaryId] : null;
                      const ideal = POPTAVKA_APARTMANY.find((x) => x.id === r.primary);
                      return (
                        <>
                          {primary && primaryId ? (
                            <>
                              <div className="pp__dlazdice pp__dlazdice--jedna">
                                <button
                                  type="button"
                                  className="pp__dlazdice-polozka"
                                  onClick={() =>
                                    setGalerie({
                                      druh: 'apt',
                                      id: primaryId,
                                      i: 0,
                                      zpetNa: 'pruvodce',
                                    })
                                  }
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={coverUrl(webLang, primary)} alt="" width={400} height={260} />
                                </button>
                              </div>
                              <p className="pp__maly-radek">
                                {pruvodceText(lang, 'quiz.result.matchLabel')}
                              </p>
                              <h1 className="pp__nadpis-krok">{nazevApt(primaryId)}</h1>
                              {profil?.traits ? (
                                <p className="pp__vysledek-vlastnosti">{profil.traits}</p>
                              ) : null}
                              <button
                                type="button"
                                className="pp__btn pp__btn--hlavni"
                                onClick={() => pokracujSApartmanem(primaryId)}
                              >
                                {t.pruvodceVybrat}
                              </button>
                            </>
                          ) : (
                            <p className="pp__chyba">{kt.terminBezVolneho}</p>
                          )}
                          {idealObsazen && ideal && r.primary !== primaryId ? (
                            <div className="pp__vysledek-obsazeno">
                              <p className="pp__maly-radek">{kt.veTerminuObsazeno}</p>
                              <h2 className="pp__nadpis-krok">{nazevApt(r.primary)}</h2>
                              <button
                                type="button"
                                className="pp__btn pp__btn--tlumeny"
                                onClick={() =>
                                  setTerminyProApt({
                                    apt: r.primary,
                                    terminy: kal.nejblizsi(prijezd, odjezd, r.primary),
                                  })
                                }
                              >
                                {kt.kdyJeVolny}
                              </button>
                              {terminyProApt?.apt === r.primary
                                ? terminyProApt.terminy.map((tr) => (
                                    <button
                                      key={`${tr.prijezd}-${tr.odjezd}`}
                                      type="button"
                                      className="pp__btn pp__btn--sms"
                                      onClick={() => {
                                        setPrijezd(tr.prijezd);
                                        setOdjezd(tr.odjezd);
                                        setTerminyProApt(null);
                                        pokracujSApartmanem(r.primary);
                                      }}
                                    >
                                      {formatRozsahPoptavky(tr.prijezd, tr.odjezd, lang)}
                                      {' · '}
                                      {tvarNoci(nociPobytu(tr.prijezd, tr.odjezd).length, lang)}
                                    </button>
                                  ))
                                : null}
                            </div>
                          ) : null}
                          <h2 className="pp__vysledek-dalsi">
                            {pruvodceText(lang, 'quiz.result.altsHeading')}
                          </h2>
                          <div className="pp__dlazdice">
                            {dalsi.map((id) => {
                              const a = POPTAVKA_APARTMANY.find((x) => x.id === id);
                              if (!a) return null;
                              const obs =
                                Boolean(prijezd && odjezd) &&
                                kal.aptObsazenyVeTerminu(id, prijezd, odjezd);
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  className={`pp__dlazdice-polozka${obs ? ' is-obsazeno' : ''}`}
                                  disabled={obs}
                                  onClick={() => {
                                    if (obs) return;
                                    setGalerie({ druh: 'apt', id, i: 0, zpetNa: 'pruvodce' });
                                  }}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={coverUrl(webLang, a)} alt="" width={400} height={260} />
                                  {obs ? (
                                    <span className="pp__dlazdice-stitok">{kt.obsazeno}</span>
                                  ) : null}
                                  <span className="pp__dlazdice-text">
                                    <span className="pp__dlazdice-nazev">{nazevNaDlazdici(id)}</span>
                                    {obs ? (
                                      <span className="pp__dlazdice-obsazeno">{kt.obsazeno}</span>
                                    ) : (
                                      <span className="pp__dlazdice-obsazeno" aria-hidden="true">
                                        &nbsp;
                                      </span>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
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
                                lang,
                                pruvodce.mainAnswers,
                                pruvodce.tieBoosts,
                                o.key as TieAnswerKey,
                              ),
                            );
                          } else {
                            setPruvodce(
                              odpovedHlavni(
                                lang,
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
                            pruvodceZpet(lang, pruvodce.mainAnswers, pruvodce.tieBoosts),
                          )
                        }
                      >
                        {pruvodceText(lang, 'quiz.ui.back')}
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
                    const obs = prijezd && odjezd ? kal.aptObsazenyVeTerminu(a.id, prijezd, odjezd) : false;
                    const cenaApt =
                      ukazCeny && prijezd && odjezd && !obs
                        ? kal.cenaProVyber(prijezd, odjezd, [a.id], false, slevaCesty)
                        : null;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className={`pp__dlazdice-polozka${on ? ' is-on' : ''}${obs ? ' is-obsazeno' : ''}`}
                        disabled={obs}
                        onClick={() => {
                          if (obs) return;
                          setGalerie({ druh: 'apt', id: a.id, i: 0, zpetNa: 'apartmany' });
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverUrl(webLang, a)} alt="" width={400} height={260} />
                        {obs ? <span className="pp__dlazdice-stitok">{kt.obsazeno}</span> : null}
                        <span className="pp__dlazdice-text">
                          <span className="pp__dlazdice-nazev">{nazevNaDlazdici(a.id)}</span>
                          {obs ? (
                            <span className="pp__dlazdice-obsazeno">{kt.obsazeno}</span>
                          ) : cenaApt ? (
                            <span className="pp__dlazdice-cena">
                              {formatKc(slevaCesty ? cenaApt.seSlevou : cenaApt.suma)} {kt.zaPobyt}
                              {slevaCesty ? (
                                <span className="pp__dlazdice-sleva"> · {kt.cenaSleva}</span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="pp__dlazdice-obsazeno" aria-hidden="true">
                              &nbsp;
                            </span>
                          )}
                        </span>
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
                    <span className="pp__dlazdice-text">
                      <span className="pp__dlazdice-nazev">{t.galerieKomplet}</span>
                      <span className="pp__dlazdice-obsazeno" aria-hidden="true">
                        &nbsp;
                      </span>
                    </span>
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
                    {souhrnTerminu ? (
                      <p className="pp__maly-radek pp__maly-radek--kontakt">
                        <span className="pp__maly-termin">{souhrnTerminu}</span>
                        {souhrnVyberu ? (
                          <span className="pp__maly-zbytek">{`\u00a0·\u00a0${souhrnVyberu}`}</span>
                        ) : null}
                        {ukazCeny && cenaVyberu ? (
                          <span className="pp__maly-zbytek">
                            {`\u00a0·\u00a0${formatKc(slevaCesty ? cenaVyberu.seSlevou : cenaVyberu.suma)}`}
                            {slevaCesty ? ` ${kt.cenaSleva}` : ''}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
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
                <TelefonPole
                  key={lang}
                  lang={lang}
                  label={t.telefon}
                  chybaText={t.chybaTelefon}
                  ukazujeChybu={telefonChyba}
                  onBlurValidace={() => setTelefonChyba(true)}
                  onChangeE164={(e164) => {
                    setTelefon(e164);
                    if (telefonChyba) setTelefonChyba(false);
                  }}
                />
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
                {volneNabidka.length > 0 ? (
                  <div className="pp__volne-nabidka">
                    {volneNabidka.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="pp__btn pp__btn--tlumeny"
                        onClick={() => {
                          setZpusob('vybrat');
                          setApts([id]);
                          setVolneNabidka([]);
                          setChyba(null);
                        }}
                      >
                        {nazevApt(id)}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="pp__btn pp__btn--sms"
                      onClick={() => {
                        const nab = kal.nejblizsi(prijezd, odjezd, apts[0] || null);
                        if (nab[0]) {
                          setPrijezd(nab[0].prijezd);
                          setOdjezd(nab[0].odjezd);
                          setVolneNabidka([]);
                          setChyba(null);
                        } else {
                          nastavNejblizsiTermin();
                          setVolneNabidka([]);
                        }
                      }}
                    >
                      {kt.ukazNejblizsi}
                    </button>
                  </div>
                ) : null}
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
                          className="pp__btn pp__btn--kanal pp__btn--mensi"
                          disabled={cekam}
                          onClick={() => void odeslat('whatsapp')}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                            <path
                              fill="currentColor"
                              d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.22 8.22 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24m4.52 10.4c-.25-.12-1.47-.72-1.7-.8-.23-.09-.39-.12-.56.12-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.09-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74 2.49 1.08 2.49.72 2.94.67.45-.05 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.17-.47-.29"
                            />
                          </svg>
                          <span>{t.whatsapp}</span>
                        </button>
                        <button
                          type="button"
                          className="pp__btn pp__btn--kanal pp__btn--mensi pp__sms-only"
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
                    className={vernost ? 'pp__odkaz-zpet' : 'pp__btn pp__btn--sms'}
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
