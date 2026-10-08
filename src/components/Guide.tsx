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
  wifiHesloProApt,
  wifiPayload,
} from '@/lib/i18n';
import type { GuideSecrets } from '@/lib/secrets';
import * as TX from '@/lib/texts';
import type { AptId, GuideLang, Prijezd, StayFacts } from '@/lib/types';
import './guide.scss';

export type GuideProps = {
  apt: AptId;
  lang: GuideLang;
  secrets: GuideSecrets;
  stay: StayFacts;
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

  const fill = (raw: string) =>
    fillPlaceholders(raw, {
      stani: aptRec.stani,
      kodZahrada: secrets.KOD_ZAHRADA,
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

  return (
    <div className="pv-root">
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
        <section className="pv-hub">
          <p className="pv-kicker">{TX.hubCs.kicker}</p>
          <h2 className="pv-hub__title">{TX.hubCs.title}</h2>
          <p className="pv-hub__lead">{TX.hubCs.lead}</p>
          <div className="pv-hub__choices">
            <button
              type="button"
              className={`pv-hub__choice${prijezd === 'auto' ? ' pv-hub__choice--on' : ''}`}
              onClick={() => choose('auto')}
            >
              <span className="pv-hub__choice-kicker">{TX.hubCs.autoKicker}</span>
              <span className="pv-hub__choice-title">{TX.hubCs.autoTitle}</span>
              <span className="pv-hub__choice-text">{TX.hubCs.autoText}</span>
            </button>
            <button
              type="button"
              className={`pv-hub__choice${prijezd === 'pesky' ? ' pv-hub__choice--on' : ''}`}
              onClick={() => choose('pesky')}
            >
              <span className="pv-hub__choice-kicker">{TX.hubCs.walkKicker}</span>
              <span className="pv-hub__choice-title">{TX.hubCs.walkTitle}</span>
              <span className="pv-hub__choice-text">{TX.hubCs.walkText}</span>
            </button>
          </div>
          {prijezd ? (
            <button type="button" className="pv-hub__reset" onClick={reset}>
              {TX.hubCs.reset}
            </button>
          ) : null}
        </section>

        {prijezd ? (
          <ol className="pv-flow pv-flow--axis" aria-label="Kroky průvodce">
            {sections.map((s, si) => {
              const kroky = visibleKroky(s, apt);
              const tone = (si % 4) + 1;
              return (
                <li
                  key={s.id}
                  id={`pv-${s.id}`}
                  className={`pv-flow__step pv-flow__step--${tone}`}
                >
                  <div className="pv-flow__marker" aria-hidden="true">
                    <span className="pv-flow__num">{si + 1}</span>
                  </div>
                  <div className="pv-flow__card">
                    {s.id === 'zadost-o-parkovani' ? (
                      <>
                        {kroky.map((k) => (
                          <article key={k.id} className="pv-step">
                            <p className="pv-kicker">{si + 1}. Parkování</p>
                            <h2>{tt(s.nadpis)}</h2>
                            <p>
                              {phoneParts(tt(k.text)).map((part, i) =>
                                part.bold ? (
                                  <strong key={i} className="pv-phone">
                                    {part.text}
                                  </strong>
                                ) : (
                                  <span key={i}>{part.text}</span>
                                ),
                              )}
                            </p>
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
                          <span className="pv-navcta__label">Trasa na parkování</span>
                          <span className="pv-navcta__addr">
                            {PARKING_ADDRESS}, České Budějovice
                          </span>
                          <span className="pv-navcta__hint">Otevřít navigaci v Mapy.cz</span>
                        </a>
                        <p className="pv-navcta__alt">
                          <a
                            className="pv-link"
                            href={PARKING_DRIVE_GOOGLE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Nebo Google Maps
                          </a>
                        </p>
                      </>
                    ) : s.id === 'prijezd-k-domu' ? (
                      <>
                        <div className="pv-flow__card-head">
                          <h2 className="pv-flow__title">
                            {si + 1}. {sectionNavLabel(s, lang)}
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
                              <span className="pv-navcta__label">Trasa k domu</span>
                              <span className="pv-navcta__addr">{HOUSE_ADDRESS}</span>
                              <span className="pv-navcta__hint">Otevřít navigaci v Mapy.cz</span>
                            </a>
                            <p className="pv-navcta__alt">
                              <a
                                className="pv-link"
                                href={HOUSE_GOOGLE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Nebo Google Maps
                              </a>
                            </p>
                          </>
                        ) : null}
                        <article className="pv-step">
                          <p className="pv-kicker">Dům</p>
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
                        <article className="pv-step pv-step--note">
                          <p className="pv-kicker">Poznámka</p>
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
                        <article className="pv-step pv-step--note">
                          <p className="pv-kicker">Vstup</p>
                          <h3>{tt(TX.vstupNadpis)}</h3>
                          <p>{tt(TX.vstupText)}</p>
                        </article>
                      </>
                    ) : s.id === 'brana-parkoviste' ? (
                      <>
                        <div className="pv-flow__card-head">
                          <h2 className="pv-flow__title">
                            {si + 1}. {sectionNavLabel(s, lang)}
                          </h2>
                        </div>
                        <div className={vikend ? 'pv-sec--weekend' : undefined}>
                          {kroky.map((k, i) => (
                            <article
                              key={k.id}
                              className={`pv-step${k.typ === 'upozorneni' ? ' pv-step--hi' : ''}`}
                            >
                              <p className="pv-kicker">Krok {stepLabel(i)}</p>
                              <h3>{tt(k.nadpis)}</h3>
                              {tt(k.text) ? (
                                <p>
                                  {phoneParts(tt(k.text)).map((part, pi) =>
                                    part.bold ? (
                                      <strong key={pi} className="pv-phone">
                                        {part.text}
                                      </strong>
                                    ) : (
                                      <span key={pi}>{part.text}</span>
                                    ),
                                  )}
                                </p>
                              ) : null}
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
                            {si + 1}. {sectionNavLabel(s, lang)}
                          </h2>
                        </div>
                        <a
                          className="pv-navcta"
                          href={WALK_BACK_MAPY_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="pv-navcta__label">Trasa k domu</span>
                          <span className="pv-navcta__addr">{HOUSE_ADDRESS}</span>
                          <span className="pv-navcta__hint">
                            {PARKING_DISTANCE.meters} m · {PARKING_DISTANCE.minutes} min pěšky ·
                            Mapy.cz
                          </span>
                        </a>
                        <p className="pv-navcta__alt">
                          <a
                            className="pv-link"
                            href={WALK_BACK_GOOGLE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Nebo Google Maps
                          </a>
                        </p>
                      </>
                    ) : s.id === 'parkovani' ? (
                      <>
                        <div className="pv-flow__card-head">
                          <h2 className="pv-flow__title">
                            {si + 1}. {sectionNavLabel(s, lang)}
                          </h2>
                        </div>
                        {kroky.map((k, i) => {
                          const src = photoSrc(k.foto);
                          return (
                            <article
                              key={k.id}
                              className={`pv-step${k.typ === 'upozorneni' ? ' pv-step--note' : ''}`}
                            >
                              <p className="pv-kicker">Krok {stepLabel(i)}</p>
                              <h3>{tt(k.nadpis)}</h3>
                              <div className="pv-step__row">
                                {src ? (
                                  <figure>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={src} width={800} height={600} alt={tt(k.nadpis)} />
                                  </figure>
                                ) : null}
                                <div>
                                  {tt(k.text) ? <p>{tt(k.text)}</p> : null}
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
                            {si + 1}. {sectionNavLabel(s, lang)}
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
                                      alt="QR kód WiFi apartmán"
                                    />
                                    <p className="pv-wifi__qrhint">{tt(popisky['qr'])}</p>
                                  </>
                                ) : (
                                  <p className="pv-wifi__qrmiss">
                                    QR kód se zobrazí, až bude doplněné heslo WiFi pro tento
                                    apartmán.
                                  </p>
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
                                      alt="QR kód WiFi zahrada"
                                    />
                                    <p className="pv-wifi__qrhint">{tt(popisky['qr'])}</p>
                                  </>
                                ) : (
                                  <p className="pv-wifi__qrmiss">
                                    QR kód se zobrazí, až bude doplněné heslo WiFi na zahradě.
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
                          {tt(TX.tvTexts.help)} {NIKOL_PHONE}
                        </p>
                      </>
                    ) : s.id === 'pravidla' ? (
                      <>
                        <div className="pv-flow__card-head">
                          <h2 className="pv-flow__title">Co u nás platí, jednoduše a napřímo</h2>
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
                            {si + 1}. {sectionNavLabel(s, lang)}
                          </h2>
                        </div>
                        <p>{tt(TX.odjezdTextL)}</p>
                      </>
                    ) : (
                      <>
                        <div className="pv-flow__card-head">
                          <h2 className="pv-flow__title">
                            {si + 1}. {sectionNavLabel(s, lang)}
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
                              <p className="pv-kicker">Krok {stepLabel(i)}</p>
                              <h3>{tt(k.nadpis)}</h3>
                              <div className="pv-step__row">
                                {src ? (
                                  <figure>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={src} width={800} height={600} alt={tt(k.nadpis)} />
                                  </figure>
                                ) : null}
                                <div>
                                  {tt(k.text) ? <p>{tt(k.text)}</p> : null}
                                  {k.id === 'z3' ? (
                                    <p
                                      className={`pv-step--note${secrets.KOD_ZAHRADA.trim() === 'DOPLNIT' ? ' pv-doplnit' : ''}`}
                                    >
                                      {secrets.KOD_ZAHRADA}
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
            })}
          </ol>
        ) : null}
      </main>
    </div>
  );
}
