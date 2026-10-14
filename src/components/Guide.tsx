'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  HOUSE_ADDRESS,
  HOUSE_GOOGLE_URL,
  HOUSE_MAPY_URL,
  NIKOL_PHONE,
  PARKING_ADDRESS,
  PARKING_DISTANCE,
  PARKING_DRIVE_GOOGLE_URL,
  PARKING_DRIVE_MAPY_URL,
  WALK_BACK_GOOGLE_URL,
  WALK_BACK_MAPY_URL,
  WIFI_GARDEN_SSID,
} from '@/lib/constants';
import { aptRecord, visibleKroky, visibleSekce, sectionNavLabel, stepLabel } from '@/lib/guide-data';
import {
  apartmentTitle,
  fillPlaceholders,
  phoneParts,
  photoSrc,
  t,
  toTelHref,
  wifiHesloProApt,
  wifiPayload,
} from '@/lib/i18n';
import type { KodRadek } from '@/lib/kody-pruvodce';
import type { GuideSecrets } from '@/lib/secrets';
import * as TX from '@/lib/texts';
import { ukazatPoplatek, type PoplatekStav } from '@/lib/poplatek';
import type { AptId, GuideLang, LText, Prijezd, StayFacts } from '@/lib/types';
import './guide.scss';

const KOD_TECKY = '••••';

/** Stejné pořadí jako codesOrder. Tady nesmí být čísla kódů. */
function poradiKodu(apt: AptId): Array<'dum' | 'apt' | 'zahrada'> {
  if (apt === 'V2' || apt === 'V3') return ['dum', 'zahrada', 'apt'];
  return ['dum', 'apt', 'zahrada'];
}

function stitekKodu(kind: 'dum' | 'apt' | 'zahrada'): LText {
  if (kind === 'dum') return TX.kodDumLabel;
  if (kind === 'apt') return TX.kodAptLabel;
  return TX.kodZahradaLabel;
}

function renderPhoneText(raw: string) {
  return phoneParts(raw).map((part, i) =>
    part.href ? (
      <a key={i} className="pv-phone" href={part.href}>
        {part.text.replace(/ /g, '\u00a0')}
      </a>
    ) : (
      <span key={i}>{part.text}</span>
    ),
  );
}

function Klic() {
  return (
    <svg className="pv-klic" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.5 2a6.5 6.5 0 0 0-6.3 8.1L2 16.3V20h3.7l1.2-1.2h2.2v-2.2l1.5-1.5A6.5 6.5 0 1 0 14.5 2zm1.2 6.4a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8z"
      />
    </svg>
  );
}

function Mrizka() {
  const klavesy = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  return (
    <div className="pv-mrizka" aria-hidden="true">
      {klavesy.map((klavesa) => (
        <span key={klavesa}>{klavesa}</span>
      ))}
    </div>
  );
}

export type GuideProps = {
  apt: AptId;
  lang: GuideLang;
  secrets: GuideSecrets;
  stay: StayFacts;
  /**
   * Řádky kódů složené na serveru. null = ještě nepředáno, čísla na stránce nejsou.
   * Po předání je u domu klíček a u apartmánu mřížka na konci kódu.
   * Tvar plny přidá navíc obrázek klávesnice, jen v náhledu.
   */
  kody?: KodRadek[] | null;
  tvar?: 'dnes' | 'plny';
  /** Chybí nebo neznámo = box se ukáže. Ne = schovaný. */
  poplatek?: PoplatekStav;
  vikend?: boolean;
  /** Výchozí příjezd (dev náhled); host na token stránce volí sám. */
  initialPrijezd?: Prijezd | null;
  showDevBar?: boolean;
  onDevChange?: (next: {
    apt: AptId;
    lang: GuideLang;
    vikend: boolean;
    prijezd: Prijezd | null;
  }) => void;
};

export function Guide({
  apt,
  lang,
  secrets,
  stay,
  kody = null,
  tvar = 'dnes',
  poplatek = 'neznamo',
  vikend = false,
  initialPrijezd = null,
  showDevBar = false,
  onDevChange,
}: GuideProps) {
  const [prijezd, setPrijezd] = useState<Prijezd | null>(initialPrijezd);
  const [wifiQr, setWifiQr] = useState<string | null>(null);
  const [gardenQr, setGardenQr] = useState<string | null>(null);
  const aptRec = useMemo(() => aptRecord(apt), [apt]);
  const sections = useMemo(() => visibleSekce(apt, prijezd), [apt, prijezd]);

  const gardenCode = kody?.find((radek) => radek.kind === 'zahrada')?.value ?? '';

  const fill = (raw: string) =>
    fillPlaceholders(raw, {
      stani: aptRec.stani,
      kodZahrada: gardenCode,
      branaTelefon: secrets.BRANA_TELEFON,
      stay,
    });

  const tt = (map: Parameters<typeof t>[0]) => fill(t(map, lang));

  const odhadLabel =
    stay.noci == null || stay.osob == null
      ? 'XXX'
      : String(stay.noci * stay.osob * 50);

  useEffect(() => {
    setPrijezd(initialPrijezd);
  }, [initialPrijezd]);

  useEffect(() => {
    if (!prijezd) {
      setWifiQr(null);
      setGardenQr(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const opts = {
          width: 280,
          margin: 2,
          errorCorrectionLevel: 'M' as const,
          color: { dark: '#1c1712', light: '#ffffff' },
        };
        const aptUrl = await QRCode.toDataURL(
          wifiPayload(aptRec.wifi.ssid, wifiHesloProApt(secrets, apt)),
          opts,
        );
        const gardenUrl = await QRCode.toDataURL(
          wifiPayload(WIFI_GARDEN_SSID, secrets.WIFI_HESLO_ZAHRADA),
          opts,
        );
        if (!cancelled) {
          setWifiQr(aptUrl);
          setGardenQr(gardenUrl);
        }
      } catch {
        if (!cancelled) {
          setWifiQr(null);
          setGardenQr(null);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [prijezd, apt, aptRec.wifi.ssid, secrets]);

  const choose = (mode: Prijezd) => {
    setPrijezd(mode);
    onDevChange?.({ apt, lang, vikend, prijezd: mode });
  };

  const reset = () => {
    setPrijezd(null);
    onDevChange?.({ apt, lang, vikend, prijezd: null });
  };

  const wifiSekce = sections.find((s) => s.id === 'wifi');
  const popisky = wifiSekce?.popisky_wifi ?? {};

  const sitePath = (path: string) => {
    const p = path.startsWith('/') ? path : `/${path}`;
    if (lang === 'cs') return `https://vivienapartments.cz${p}`;
    if (lang === 'zh-Hant') return `https://vivienapartments.cz/zh${p}`;
    if (lang === 'sv' || lang === 'hu') return `https://vivienapartments.cz/en${p}`;
    return `https://vivienapartments.cz/${lang}${p}`;
  };
  const quizUrl = sitePath(TX.psApartmany.quizPath);
  const kontaktIndex = sections.findIndex((s) => s.id === 'kontakt');

  const renderTipsSection = (num: number) => (
    <li
      key="tipy-na-webu"
      id="pv-tipy-na-webu"
      className={`pv-flow__step pv-flow__step--${((num - 1) % 4) + 1} pv-web-tip`}
    >
      <div className="pv-flow__marker" aria-hidden="true">
        <span className="pv-flow__num">{num}</span>
      </div>
      <div className="pv-flow__card">
        <div className="pv-flow__card-head">
          <h2 className="pv-flow__title">
            {num}. {tt(TX.tipyNaWebu.title)}
          </h2>
        </div>
        <p className="pv-hub__lead">{tt(TX.tipyNaWebu.lead)}</p>
        <ul className="pv-web-tip__list pv-web-tip__list--safe">
          {TX.tipyNaWebu.items.map((it) => (
            <li key={it.path}>
              <span className="pv-web-tip__item-label">{tt(it.label)}</span>
              <a
                className="pv-web-tip__item-open"
                href={sitePath(it.path)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {tt(TX.tipyNaWebu.open)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );

  const renderPsSection = (num: number) => (
    <li
      key="ps-apartmany"
      id="pv-ps-apartmany"
      className={`pv-flow__step pv-flow__step--${((num - 1) % 4) + 1} pv-ps`}
    >
      <div className="pv-flow__marker" aria-hidden="true">
        <span className="pv-flow__num">{num}</span>
      </div>
      <div className="pv-flow__card">
        <div className="pv-ps__box">
          <p className="pv-kicker">{tt(TX.psApartmany.kicker)}</p>
          <h2 className="pv-flow__title">{tt(TX.psApartmany.title)}</h2>
          <p>{tt(TX.psApartmany.text)}</p>
          <p className="pv-ps__cta">
            <a className="pv-link" href={quizUrl} target="_blank" rel="noopener noreferrer">
              {tt(TX.psApartmany.cta)}
            </a>
          </p>
        </div>
      </div>
    </li>
  );

  useEffect(() => {
    const prev = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = prev;
    };
  }, [lang]);

  return (
    <div className="pv-root" lang={lang}>
      {showDevBar ? (
        <details className="pv-dev">
          <summary className="pv-dev__summary">Nastavení náhledu (host neuvidí)</summary>
          <div className="pv-dev__inner" role="region" aria-label="Kontrola náhledu">
            <label className="pv-dev__field">
              <span>Apartmán</span>
              <select
                value={apt}
                onChange={(e) =>
                  onDevChange?.({
                    apt: e.target.value as AptId,
                    lang,
                    vikend,
                    prijezd,
                  })
                }
              >
                {(['V1', 'V2', 'V3', 'V4', 'V5'] as AptId[]).map((id) => (
                  <option key={id} value={id}>
                    {apartmentTitle(aptRecord(id).nazev, lang)}
                  </option>
                ))}
              </select>
            </label>
            <label className="pv-dev__field">
              <span>Jazyk</span>
              <select
                value={lang}
                onChange={(e) =>
                  onDevChange?.({
                    apt,
                    lang: e.target.value as GuideLang,
                    vikend,
                    prijezd,
                  })
                }
              >
                <option value="cs">Čeština</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="pl">Polski</option>
                <option value="uk">Українська</option>
                <option value="zh-Hant">繁體中文</option>
                <option value="sv">Svenska</option>
                <option value="hu">Magyar</option>
              </select>
            </label>
            <label className="pv-dev__check">
              <input
                type="checkbox"
                checked={vikend}
                onChange={(e) =>
                  onDevChange?.({ apt, lang, vikend: e.target.checked, prijezd })
                }
              />
              <span>Příjezd o víkendu</span>
            </label>
          </div>
        </details>
      ) : null}

      <main className="pv">
        <section className={`pv-predani${kody ? ' pv-predani--hotovo' : ''}`} lang={lang}>
          {kody ? (
            <p className="pv-predani__text">
              {tt(TX.predaniHotovo)} <a href="#vase-kody">{tt(TX.predaniHotovoOdkaz)}</a>
            </p>
          ) : (
            <>
              <h2>{tt(TX.predaniNadpis)}</h2>
              <p className="pv-predani__text">{tt(TX.predaniText)}</p>
            </>
          )}
        </section>
        <section className="pv-cas" lang={lang}>
          <h2>{tt(TX.casPrijezduNadpis)}</h2>
          <p className="pv-cas__text">{renderPhoneText(tt(TX.casPrijezduText))}</p>
          <p className="pv-cas__checkin">{tt(TX.casPrijezduCheckin)}</p>
          <div className="pv-cas__actions">
            <a className="pv-cas__btn" href="sms:+420604692573">
              {tt(TX.casPrijezduSms)}
            </a>
            <a
              className="pv-cas__btn"
              href="https://wa.me/420604692573"
              target="_blank"
              rel="noopener noreferrer"
            >
              {tt(TX.casPrijezduWhatsapp)}
            </a>
          </div>
        </section>
        <section className="pv-hub">
          <p className="pv-kicker">{tt(TX.hub.kicker)}</p>
          <h2 className="pv-hub__title">{tt(TX.hub.title)}</h2>
          <p className="pv-hub__lead">{tt(TX.hub.lead)}</p>
          <div className="pv-hub__choices">
            <button
              type="button"
              className={`pv-hub__choice${prijezd === 'auto' ? ' pv-hub__choice--on' : ''}`}
              onClick={() => choose('auto')}
            >
              <span className="pv-hub__choice-kicker">{tt(TX.hub.autoKicker)}</span>
              <span className="pv-hub__choice-title">{tt(TX.hub.autoTitle)}</span>
              <span className="pv-hub__choice-text">{tt(TX.hub.autoText)}</span>
            </button>
            <button
              type="button"
              className={`pv-hub__choice${prijezd === 'pesky' ? ' pv-hub__choice--on' : ''}`}
              onClick={() => choose('pesky')}
            >
              <span className="pv-hub__choice-kicker">{tt(TX.hub.walkKicker)}</span>
              <span className="pv-hub__choice-title">{tt(TX.hub.walkTitle)}</span>
              <span className="pv-hub__choice-text">{tt(TX.hub.walkText)}</span>
            </button>
          </div>
          {prijezd ? (
            <button type="button" className="pv-hub__reset" onClick={reset}>
              {tt(TX.hub.reset)}
            </button>
          ) : null}
        </section>

        {prijezd ? (
          <ol className="pv-flow pv-flow--axis" aria-label="Kroky průvodce">
            {sections.flatMap((s, si) => {
              const insertBefore =
                kontaktIndex >= 0 && s.id === 'kontakt'
                  ? [renderTipsSection(kontaktIndex + 1)]
                  : [];
              const displayNum =
                kontaktIndex >= 0 && si >= kontaktIndex ? si + 2 : si + 1;
              const insertAfter =
                kontaktIndex >= 0 && s.id === 'kontakt'
                  ? [renderPsSection(displayNum + 1)]
                  : [];
              const kroky = visibleKroky(s, apt);
              const tone = ((displayNum - 1) % 4) + 1;
              const sectionLi = (
                <li
                  key={s.id}
                  id={`pv-${s.id}`}
                  className={`pv-flow__step pv-flow__step--${tone}`}
                >
                  <div className="pv-flow__marker" aria-hidden="true">
                    <span className="pv-flow__num">{displayNum}</span>
                  </div>
                  <div className="pv-flow__card">
                    {s.id === 'zadost-o-parkovani' ? (
                      <>
                        {kroky.map((k) => (
                          <article key={k.id} className="pv-step">
                            <p className="pv-kicker">{displayNum}. {tt(TX.SECTION_NAV['zadost-o-parkovani'])}</p>
                            <h2>{tt(s.nadpis)}</h2>
                            <p>{renderPhoneText(tt(k.text))}</p>
                            {k.body?.length ? (
                              <ul className="pv-sms-list">
                                {k.body.map((b, i) => (
                                  <li key={i}>{tt(b)}</li>
                                ))}
                              </ul>
                            ) : null}
                            {k.zaver ? <p>{tt(k.zaver)}</p> : null}
                          </article>
                        ))}
                        <a
                          className="pv-navcta"
                          href={PARKING_DRIVE_MAPY_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="pv-navcta__label">{tt(TX.ui.routeParking)}</span>
                          <span className="pv-navcta__addr">
                            {PARKING_ADDRESS}, České Budějovice
                          </span>
                          <span className="pv-navcta__hint">{tt(TX.ui.openMapy)}</span>
                        </a>
                        <p className="pv-navcta__alt">
                          <a
                            className="pv-link"
                            href={PARKING_DRIVE_GOOGLE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {tt(TX.ui.orGoogle)}
                          </a>
                        </p>
                      </>
                    ) : s.id === 'prijezd-k-domu' ? (
                      <>
                        <div className="pv-flow__card-head">
                          <h2 className="pv-flow__title">
                            {displayNum}. {sectionNavLabel(s, lang)}
                          </h2>
                        </div>
                        {prijezd === 'pesky' ? (
                          <>
                            <a
                              className="pv-navcta"
                              href={HOUSE_MAPY_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <span className="pv-navcta__label">{tt(TX.ui.routeHouse)}</span>
                              <span className="pv-navcta__addr">{HOUSE_ADDRESS}</span>
                              <span className="pv-navcta__hint">{tt(TX.ui.openMapy)}</span>
                            </a>
                            <p className="pv-navcta__alt">
                              <a
                                className="pv-link"
                                href={HOUSE_GOOGLE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {tt(TX.ui.orGoogle)}
                              </a>
                            </p>
                          </>
                        ) : null}
                        <article className="pv-step">
                          <p className="pv-kicker">{tt(TX.ui.house)}</p>
                          <h3>{tt(TX.fasadaNadpis)}</h3>
                          <div className="pv-step__row">
                            <figure>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src="/pruvodce/fasada.jpg"
                                width={1024}
                                height={768}
                                alt={tt(TX.fasadaNadpis)}
                              />
                            </figure>
                            <p>{tt(TX.fasadaText)}</p>
                          </div>
                        </article>
                        <p className="pv-hub__lead">{tt(TX.predDomemText)}</p>
                        {ukazatPoplatek(poplatek) ? (
                        <article className="pv-step pv-step--note">
                          <p className="pv-kicker">{tt(TX.ui.note)}</p>
                          <h3>{tt(TX.poplatekNadpis)}</h3>
                          <p>{tt(TX.poplatekZaklad)}</p>
                          <p className="pv-poplatek__formula">
                            <span className="pv-poplatek__formula-label">
                              {tt(TX.poplatekFormulaStitek)}
                            </span>
                            <span className="pv-poplatek__formula-detail">
                              {fill(t(TX.poplatekFormulaDetail, lang))}
                            </span>
                            <span className="pv-poplatek__formula-sum">
                              <strong className="pv-phone">
                                {odhadLabel} {lang === 'cs' ? 'Kč' : 'CZK'}
                              </strong>
                            </span>
                          </p>
                        </article>
                        ) : null}
                        <article className="pv-step pv-step--note" id="vase-kody">
                          <p className="pv-kicker">{tt(TX.ui.entry)}</p>
                          <h3>{tt(TX.vstupNadpis)}</h3>
                          {kody ? (
                            <>
                              <p>{tt(TX.vstupText)}</p>
                              <dl className="pv-codes">
                                {kody.map((radek) => {
                                  const missing = radek.value === 'DOPLNIT';
                                  const plny = tvar === 'plny' && !missing;
                                  return (
                                    <div className="pv-codes__row" key={radek.kind}>
                                      <dt>{radek.label}</dt>
                                      <dd className={missing ? 'pv-doplnit' : undefined}>
                                        <strong className="pv-phone pv-kod-hodnota">
                                          {!missing && radek.kind === 'dum' ? <Klic /> : null}
                                          {radek.value}
                                          {!missing && radek.kind === 'dum' ? <Klic /> : null}
                                        </strong>
                                        {plny && radek.kind !== 'dum' ? <Mrizka /> : null}
                                      </dd>
                                    </div>
                                  );
                                })}
                              </dl>
                            </>
                          ) : (
                            <>
                              <dl className="pv-codes">
                                {poradiKodu(apt).map((kind) => (
                                  <div className="pv-codes__row" key={kind}>
                                    <dt>{tt(stitekKodu(kind))}</dt>
                                    <dd>
                                      <strong className="pv-phone pv-kod-hodnota pv-kod-tecky" aria-hidden="true">
                                        {KOD_TECKY}
                                      </strong>
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                              <div className="pv-kody-cekaji">{tt(TX.kodyCekaji)}</div>
                            </>
                          )}
                        </article>
                      </>
                    ) : s.id === 'brana-parkoviste' ? (
                      <>
                        <div className="pv-flow__card-head">
                          <h2 className="pv-flow__title">
                            {displayNum}. {sectionNavLabel(s, lang)}
                          </h2>
                        </div>
                        <div className={vikend ? 'pv-sec--weekend' : undefined}>
                          {kroky.map((k, i) => (
                            <article
                              key={k.id}
                              className={`pv-step${k.typ === 'upozorneni' ? ' pv-step--hi' : ''}`}
                            >
                              <p className="pv-kicker">{tt(TX.ui.step)} {stepLabel(i)}</p>
                              <h3>{tt(k.nadpis)}</h3>
                              {tt(k.text) ? <p>{renderPhoneText(tt(k.text))}</p> : null}
                              {k.body?.length ? (
                                <ul>
                                  {k.body.map((b, bi) => (
                                    <li key={bi}>{tt(b)}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </article>
                          ))}
                        </div>
                      </>
                    ) : s.id === 'pesky-parkoviste-dum' ? (
                      <>
                        <div className="pv-flow__card-head">
                          <h2 className="pv-flow__title">
                            {displayNum}. {sectionNavLabel(s, lang)}
                          </h2>
                        </div>
                        <a
                          className="pv-navcta"
                          href={WALK_BACK_MAPY_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="pv-navcta__label">{tt(TX.ui.routeHouse)}</span>
                          <span className="pv-navcta__addr">{HOUSE_ADDRESS}</span>
                          <span className="pv-navcta__hint">
                            {PARKING_DISTANCE.meters} m · {PARKING_DISTANCE.minutes} {tt(TX.ui.minWalk)}. {tt(TX.ui.openMapy)}
                          </span>
                        </a>
                        <p className="pv-navcta__alt">
                          <a
                            className="pv-link"
                            href={WALK_BACK_GOOGLE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {tt(TX.ui.orGoogle)}
                          </a>
                        </p>
                      </>
                    ) : s.id === 'parkovani' ? (
                      <>
                        <div className="pv-flow__card-head">
                          <h2 className="pv-flow__title">
                            {displayNum}. {sectionNavLabel(s, lang)}
                          </h2>
                        </div>
                        {kroky.map((k, i) => {
                          const src = photoSrc(k.foto);
                          return (
                            <article
                              key={k.id}
                              className={`pv-step${k.typ === 'upozorneni' ? ' pv-step--note' : ''}`}
                            >
                              <p className="pv-kicker">{tt(TX.ui.step)} {stepLabel(i)}</p>
                              <h3>{tt(k.nadpis)}</h3>
                              <div className="pv-step__row">
                                {src ? (
                                  <figure>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={src} width={800} height={600} alt={tt(k.nadpis)} />
                                  </figure>
                                ) : null}
                                <div>
                                  {tt(k.text) ? <p>{renderPhoneText(tt(k.text))}</p> : null}
                                  {k.body?.length ? (
                                    <ul>
                                      {k.body.map((b, bi) => (
                                        <li key={bi}>{tt(b)}</li>
                                      ))}
                                    </ul>
                                  ) : null}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </>
                    ) : s.id === 'wifi' ? (
                      <>
                        <div className="pv-flow__card-head">
                          <h2 className="pv-flow__title">
                            {displayNum}. {sectionNavLabel(s, lang)}
                          </h2>
                        </div>
                        <p className="pv-hub__lead">{tt(popisky['nad_nadpisem'])}</p>
                        <div className="pv-wifis pv-wifis--side pv-wifis--hi4">
                          <article className="pv-wifi pv-wifi--apt">
                            <h3 className="pv-wifi__place">{tt(TX.wifiLabelApt)}</h3>
                            <div className="pv-wifi__body">
                              <div className="pv-wifi__qrbox">
                                {wifiQr ? (
                                  <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      className="pv-wifi__qrimg"
                                      src={wifiQr}
                                      width={280}
                                      height={280}
                                      alt={tt(TX.ui.qrApt)}
                                    />
                                    <p className="pv-wifi__qrhint">{tt(popisky['qr'])}</p>
                                  </>
                                ) : (
                                  <p className="pv-wifi__qrmiss">{tt(TX.ui.qrMissApt)}</p>
                                )}
                              </div>
                              <dl className="pv-wifi__creds">
                                <dt>{tt(popisky['ssid'])}</dt>
                                <dd>{aptRec.wifi.ssid}</dd>
                                <dt>{tt(popisky['heslo'])}</dt>
                                <dd
                                  className={
                                    wifiHesloProApt(secrets, apt).trim() === 'DOPLNIT'
                                      ? 'pv-doplnit'
                                      : undefined
                                  }
                                >
                                  {wifiHesloProApt(secrets, apt)}
                                </dd>
                              </dl>
                            </div>
                          </article>
                          <article className="pv-wifi pv-wifi--garden">
                            <h3 className="pv-wifi__place">{tt(TX.wifiLabelGarden)}</h3>
                            <div className="pv-wifi__body">
                              <div className="pv-wifi__qrbox">
                                {gardenQr ? (
                                  <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      className="pv-wifi__qrimg"
                                      src={gardenQr}
                                      width={280}
                                      height={280}
                                      alt={tt(TX.ui.qrGarden)}
                                    />
                                    <p className="pv-wifi__qrhint">{tt(popisky['qr'])}</p>
                                  </>
                                ) : (
                                  <p className="pv-wifi__qrmiss">
                                    {tt(TX.ui.qrMissGarden)}
                                  </p>
                                )}
                              </div>
                              <dl className="pv-wifi__creds">
                                <dt>{tt(popisky['ssid'])}</dt>
                                <dd>{WIFI_GARDEN_SSID}</dd>
                                <dt>{tt(popisky['heslo'])}</dt>
                                <dd
                                  className={
                                    secrets.WIFI_HESLO_ZAHRADA.trim() === 'DOPLNIT'
                                      ? 'pv-doplnit'
                                      : undefined
                                  }
                                >
                                  {secrets.WIFI_HESLO_ZAHRADA}
                                </dd>
                              </dl>
                            </div>
                          </article>
                        </div>
                      </>
                    ) : s.id === 'televize' ? (
                      <>
                        <div className="pv-flow__card-head">
                          <h2 className="pv-flow__title">{tt(TX.tvTexts.heading)}</h2>
                        </div>
                        <p className="pv-kicker">{tt(TX.tvTexts.eyebrow)}</p>
                        <p>{tt(TX.tvTexts.lead)}</p>
                        <ol>
                          <li>{tt(TX.tvTexts.step1)}</li>
                          <li>{tt(TX.tvTexts.step2)}</li>
                          <li>{tt(TX.tvTexts.step3)}</li>
                        </ol>
                        <p>{tt(TX.tvTexts.langs)}</p>
                        <p>
                          {tt(TX.tvTexts.help)}{' '}
                          <a className="pv-phone" href={toTelHref(NIKOL_PHONE)}>
                            {NIKOL_PHONE.replace(/ /g, '\u00a0')}
                          </a>
                        </p>
                      </>
                    ) : s.id === 'pravidla' ? (
                      <>
                        <div className="pv-flow__card-head">
                          <h2 className="pv-flow__title">{tt(TX.ui.rulesHeading)}</h2>
                        </div>
                        {TX.stayRules.map((rule) => (
                          <article key={rule.title.cs} className="pv-rule">
                            <h3>{tt(rule.title)}</h3>
                            <p>{tt(rule.text)}</p>
                          </article>
                        ))}
                      </>
                    ) : s.id === 'odjezd' ? (
                      <>
                        <div className="pv-flow__card-head">
                          <h2 className="pv-flow__title">
                            {displayNum}. {sectionNavLabel(s, lang)}
                          </h2>
                        </div>
                        <p>{tt(TX.odjezdTextL)}</p>
                      </>
                    ) : (
                      <>
                        <div className="pv-flow__card-head">
                          <h2 className="pv-flow__title">
                            {displayNum}. {sectionNavLabel(s, lang)}
                          </h2>
                        </div>
                        {kroky.map((k, i) => {
                          if (k.id === 'z4') {
                            const info = kroky.find(
                              (x) => x.id === 'z-info' || x.typ === 'zahrada_info',
                            );
                            const foto = photoSrc(k.foto);
                            const infoFoto = photoSrc(info?.foto);
                            return (
                              <div key={k.id} className="pv-zcmp" id="pv-zahrada-cmp">
                                <section className="pv-zcmp__blok">
                                  <h3>{tt(k.nadpis)}</h3>
                                  <div className="pv-zrow">
                                    {foto ? (
                                      <figure className="pv-zrow__foto">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={foto}
                                          width={1000}
                                          height={1200}
                                          alt={tt(k.nadpis)}
                                        />
                                      </figure>
                                    ) : null}
                                    <div className="pv-zrow__side">
                                      {TX.zahradaUzitek.map((box, bi) => (
                                        <article key={bi} className="pv-zrow__card">
                                          <p className="pv-kicker">{tt(box.stitek)}</p>
                                          <h4>{tt(box.nadpis)}</h4>
                                          <p>{tt(box.text)}</p>
                                        </article>
                                      ))}
                                    </div>
                                  </div>
                                </section>
                                {info ? (
                                  <section className="pv-zcmp__blok">
                                    <h3>{tt(TX.zahradaPravidlaNadpis)}</h3>
                                    <div className="pv-zrow">
                                      {infoFoto ? (
                                        <figure className="pv-zrow__foto">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={infoFoto}
                                            width={1000}
                                            height={1200}
                                            alt={tt(TX.zahradaPravidlaNadpis)}
                                          />
                                        </figure>
                                      ) : null}
                                      <div className="pv-zrow__side">
                                        {TX.zahradaPravidla.map((box, bi) => (
                                          <article
                                            key={bi}
                                            className={`pv-zrow__card${box.highlight ? ' pv-zrow__card--hi' : ''}`}
                                          >
                                            <p className="pv-kicker">{tt(box.stitek)}</p>
                                            <h4>{tt(box.nadpis)}</h4>
                                            <p>{tt(box.text)}</p>
                                          </article>
                                        ))}
                                      </div>
                                    </div>
                                  </section>
                                ) : null}
                              </div>
                            );
                          }
                          if (k.id === 'z-info' || k.typ === 'zahrada_info') return null;
                          const src = photoSrc(k.foto);
                          return (
                            <article
                              key={k.id}
                              className={`pv-step${k.typ === 'upozorneni' ? ' pv-step--note' : ''}`}
                            >
                              <p className="pv-kicker">{tt(TX.ui.step)} {stepLabel(i)}</p>
                              <h3>{tt(k.nadpis)}</h3>
                              <div className="pv-step__row">
                                {src ? (
                                  <figure>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={src} width={800} height={600} alt={tt(k.nadpis)} />
                                  </figure>
                                ) : null}
                                <div>
                                  {tt(k.text) ? <p>{renderPhoneText(tt(k.text))}</p> : null}
                                  {k.id === 'z3' && gardenCode ? (
                                    <p
                                      className={`pv-step--note${gardenCode.trim() === 'DOPLNIT' ? ' pv-doplnit' : ''}`}
                                    >
                                      {gardenCode}
                                    </p>
                                  ) : null}
                                  {k.body?.length ? (
                                    <ul>
                                      {k.body.map((b, bi) => (
                                        <li key={bi}>{tt(b)}</li>
                                      ))}
                                    </ul>
                                  ) : null}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </>
                    )}
                  </div>
                </li>
              );
              return [...insertBefore, sectionLi, ...insertAfter];
            })}
          </ol>
        ) : null}
      </main>
    </div>
  );
}
