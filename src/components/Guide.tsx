'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { DOTAZ_PREDANI_MS } from '@/lib/pruvodce-majitel';
import type { AptId, GuideLang, Prijezd, StayFacts } from '@/lib/types';
import { pruvodceRozbalen, urovenPruvodce, type UrovenPruvodce } from '@/lib/vstup-pruvodce';
import * as VT from '@/lib/vstup-texty';
import { textStavu, type OknoPohled } from '@/lib/okno-pobytu';
import { ukazatDokladyRamecek } from '@/lib/doklady-texty';
import { DokladyRamecek } from './DokladyRamecek';
import { OdjezdRamecek } from './OdjezdRamecek';
import { StavApartmanu } from './StavApartmanu';
import { VstupHosta, type VstupHodnoty } from './VstupHosta';
import './guide.scss';

const SBALENE = new Set([
  'parkovani',
  'pesky-parkoviste-dum',
  'prijezd-k-domu',
  'wifi',
  'zahrada',
  'posezeni-venku',
  'televize',
  'pravidla',
  'odjezd',
]);

/** Po Předáno se sbalí i Brána. Předtím zůstává otevřená (večer / víkend). */
const SBALENE_PO_PREDANI = new Set(['brana-parkoviste']);

function SbalenaSekce({
  ano,
  nadpis,
  veta,
  expandLabel,
  collapseLabel,
  children,
}: {
  ano: boolean;
  nadpis: string;
  veta: string;
  expandLabel: string;
  collapseLabel: string;
  children: ReactNode;
}) {
  if (!ano) return <>{children}</>;
  return (
    <details className="pv-sbal">
      <summary>
        <span className="pv-sbal__text">
          <span className="pv-sbal__nadpis">{nadpis}</span>
          {veta ? <span className="pv-sbal__veta">{veta}</span> : null}
        </span>
        <span className="pv-sbal__btn" aria-hidden="true">
          <span className="pv-sbal__btn-open">
            {expandLabel} ▾
          </span>
          <span className="pv-sbal__btn-close">
            {collapseLabel} ▴
          </span>
        </span>
      </summary>
      {children}
    </details>
  );
}

function renderPhoneText(raw: string, zari = false) {
  return phoneParts(raw).map((part, i) =>
    part.href ? (
      <a key={i} className={zari ? 'pv-phone pv-phone--zari' : 'pv-phone'} href={part.href}>
        {part.text.replace(/ /g, '\u00a0')}
      </a>
    ) : (
      <span key={i}>{part.text}</span>
    ),
  );
}

/** Adresa parkoviště + navigace. Jen pro příjezd autem. */
function NavParkovani({ label, hint, orGoogle }: { label: string; hint: string; orGoogle: string }) {
  return (
    <>
      <a
        className="pv-navcta"
        href={PARKING_DRIVE_MAPY_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="pv-navcta__label">{label}</span>
        <span className="pv-navcta__addr">
          {PARKING_ADDRESS}, České Budějovice
        </span>
        <span className="pv-navcta__hint">{hint}</span>
      </a>
      <p className="pv-navcta__alt">
        <a
          className="pv-link"
          href={PARKING_DRIVE_GOOGLE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {orGoogle}
        </a>
      </p>
    </>
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

function ZamekPinu() {
  return (
    <svg className="pv-ikona pv-ikona--zamek" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 10V7a5 5 0 0 1 10 0v3h1.2A1.8 1.8 0 0 1 20 11.8v8.4A1.8 1.8 0 0 1 18.2 22H5.8A1.8 1.8 0 0 1 4 20.2v-8.4A1.8 1.8 0 0 1 5.8 10H7zm2 0h6V7a3 3 0 0 0-6 0v3z"
      />
    </svg>
  );
}

function Fajfka() {
  return (
    <svg className="pv-ikona pv-ikona--fajfka" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2-3.5-3.5 1.4-1.4 2.1 2.1 4.5-4.5 1.4 1.4-5.9 5.9z"
      />
    </svg>
  );
}

function SipkaDolu() {
  return (
    <svg className="pv-piny__sipka-ikona" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path fill="currentColor" d="M12 16.5 5.5 10l1.4-1.4L12 13.7l5.1-5.1L18.5 10z" />
    </svg>
  );
}

function PinyNahore({
  lang,
  kody,
  hotovo,
  skrytVyzvu = false,
}: {
  lang: GuideLang;
  kody: KodRadek[] | null;
  hotovo: boolean;
  skrytVyzvu?: boolean;
}) {
  const tt = (map: Parameters<typeof t>[0]) => t(map, lang);
  if (kody && kody.length) {
    return (
      <section className="pv-piny pv-piny--predano" id="vase-piny" lang={lang}>
        <h2>
          <Fajfka />
          <span>{tt(VT.pinyNadpis)}</span>
        </h2>
        <dl className="pv-codes">
          {kody.map((radek) => {
            const missing = radek.value === 'DOPLNIT';
            return (
              <div className="pv-codes__row" key={radek.kind}>
                <dt>{radek.label}</dt>
                <dd className={missing ? 'pv-doplnit' : undefined}>
                  <strong className="pv-phone pv-kod-hodnota pv-piny__hodnota">
                    {!missing && radek.kind === 'dum' ? <Klic /> : null}
                    {radek.value}
                    {!missing && radek.kind === 'dum' ? <Klic /> : null}
                  </strong>
                </dd>
              </div>
            );
          })}
        </dl>
        <p className="pv-piny__navod">{tt(VT.pinyMrizka)}</p>
      </section>
    );
  }
  if (skrytVyzvu) return null;
  return (
    <>
      <section className={`pv-piny${hotovo ? ' pv-piny--hotovo' : ''}`} lang={lang}>
        <h2>
          {hotovo ? <Fajfka /> : <ZamekPinu />}
          <span>{tt(VT.pinyNadpis)}</span>
        </h2>
        <p>{hotovo ? tt(VT.pinyHotovo) : tt(VT.pinyCekaji)}</p>
      </section>
      {hotovo ? null : (
        <a className="pv-piny__sipka" href="#pv-vstup">
          <SipkaDolu />
        </a>
      )}
    </>
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
  /** Výchozí příjezd, jen když stránka údaje hosta nepředá. */
  initialPrijezd?: Prijezd | null;
  /** Národnost z BH (CZE → verze dokladů bez cizinecké policie). */
  narodnost?: string | null;
  /** Údaje z rezervace. Když jsou, klik v průvodci další kroky sám neotevře. */
  vstup?: {
    token: string | null;
    /** Náhled majitele. Políčka jen ke čtení, nic se neukládá. */
    cteni?: boolean;
    uroven: UrovenPruvodce;
    hodnoty: VstupHodnoty;
    predvyplneny: string;
    /** Apartmán už je předaný. Červený box s časem se neukáže. */
    ubytovan?: boolean;
  };
  /** Den odjezdu a uložený čas. Rámeček se sám schová mimo okno. */
  odjezd?: { den: string | null; cas: string | null; rucni?: boolean } | null;
  okno?: OknoPohled | null;
  onVstup?: (next: VstupHodnoty) => void;
  showDevBar?: boolean;
  onDevChange?: (next: { apt: AptId; lang: GuideLang; vikend: boolean; prijezd: Prijezd | null }) => void;
};

export function Guide({
  apt,
  lang,
  secrets,
  stay,
  kody = null,
  poplatek = 'neznamo',
  vikend = false,
  initialPrijezd = null,
  narodnost = null,
  vstup,
  odjezd = null,
  okno = null,
  onVstup,
  showDevBar = false,
  onDevChange,
}: GuideProps) {
  const [prijezd, setPrijezd] = useState<Prijezd | null>(initialPrijezd);
  const [lokalne, setLokalne] = useState<VstupHodnoty | null>(null);
  const [wifiQr, setWifiQr] = useState<string | null>(null);
  const [gardenQr, setGardenQr] = useState<string | null>(null);
  const [ziveKody, setZiveKody] = useState<KodRadek[] | null>(kody ?? null);
  const hodnoty = vstup?.hodnoty ?? lokalne ?? { cas: null, zpusob: null, telefon: '', spz: '', pujcene: false, souhlas: false };
  const ubytovan = Boolean(vstup?.ubytovan);
  const krokyHotove = pruvodceRozbalen({
    cas: hodnoty.cas,
    zpusob: hodnoty.zpusob,
    telefonBrana: hodnoty.telefon || null,
    spz: hodnoty.spz || null,
    spzPujcene: hodnoty.pujcene,
    souhlas: hodnoty.souhlas,
  });
  const uroven: UrovenPruvodce = vstup
    ? vstup.uroven
    : urovenPruvodce({
        cas: hodnoty.cas,
        zpusob: hodnoty.zpusob,
        telefonBrana: hodnoty.telefon || null,
        spz: hodnoty.spz || null,
        spzPujcene: hodnoty.pujcene,
        souhlas: hodnoty.souhlas,
        odemceno: false,
      });
  const zUrovne: Prijezd | null =
    uroven === 'pesky' ? 'pesky' : uroven === 'auto' || uroven === 'cele' ? 'auto' : null;
  const prijezdSekci = vstup ? zUrovne : zUrovne ?? prijezd;
  const aptRec = useMemo(() => aptRecord(apt), [apt]);
  const sections = useMemo(
    () => visibleSekce(apt, prijezdSekci).filter((s) => s.id !== 'zadost-o-parkovani'),
    [apt, prijezdSekci],
  );
  const kreslene = useMemo(() => (prijezdSekci ? sections : []), [prijezdSekci, sections]);
  const ukazWifi = kreslene.some((s) => s.id === 'wifi');

  const gardenCode = ziveKody?.find((radek) => radek.kind === 'zahrada')?.value ?? '';

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
    if (!ukazWifi) {
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
  }, [ukazWifi, apt, aptRec.wifi.ssid, secrets]);

  useEffect(() => {
    setZiveKody(kody ?? null);
  }, [kody]);

  useEffect(() => {
    const token = vstup?.token;
    if (!token || vstup?.cteni || ziveKody) return;
    let zruseno = false;
    const dotaz = () => {
      fetch('/api/pruvodce/stav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { predano?: boolean; kody?: KodRadek[] | null } | null) => {
          if (zruseno || !data?.predano || !Array.isArray(data.kody) || data.kody.length === 0) return;
          setZiveKody(data.kody);
        })
        .catch(() => undefined);
    };
    window.addEventListener('online', dotaz);
    const id = window.setInterval(dotaz, DOTAZ_PREDANI_MS);
    return () => {
      zruseno = true;
      window.clearInterval(id);
      window.removeEventListener('online', dotaz);
    };
  }, [vstup?.token, vstup?.cteni, ziveKody]);

  const wifiSekce = kreslene.find((s) => s.id === 'wifi');
  const popisky = wifiSekce?.popisky_wifi ?? {};

  const sitePath = (path: string) => {
    const p = path.startsWith('/') ? path : `/${path}`;
    if (lang === 'cs') return `https://vivienapartments.cz${p}`;
    if (lang === 'zh-Hant') return `https://vivienapartments.cz/zh${p}`;
    if (lang === 'sv' || lang === 'hu') return `https://vivienapartments.cz/en${p}`;
    return `https://vivienapartments.cz/${lang}${p}`;
  };
  const quizUrl = sitePath(TX.psApartmany.quizPath);
  const kontaktIndex = kreslene.findIndex((s) => s.id === 'kontakt');

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
        <details className="pv-sbal">
          <summary>
            <span className="pv-sbal__text">
              <span className="pv-sbal__nadpis">
                {num}. {tt(TX.tipyNaWebu.title)}
              </span>
              <span className="pv-sbal__veta">{tt(TX.tipyNaWebu.lead)}</span>
            </span>
          </summary>
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
        </details>
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
        <details className="pv-sbal">
          <summary>
            <span className="pv-sbal__text">
              <span className="pv-sbal__nadpis">{tt(TX.psApartmany.title)}</span>
              <span className="pv-sbal__veta">{tt(TX.psApartmany.text)}</span>
            </span>
          </summary>
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
        </details>
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
                <option value="es">Español</option>
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
        <PinyNahore lang={lang} kody={ziveKody} hotovo={krokyHotove} skrytVyzvu={ubytovan} />
        {ukazatDokladyRamecek({
          cas: hodnoty.cas,
          predano: ubytovan || Boolean(ziveKody),
          demo: showDevBar,
        }) ? (
          <DokladyRamecek lang={lang} narodnost={narodnost} />
        ) : null}
        {ubytovan || ziveKody ? (
          <OdjezdRamecek
            lang={lang}
            den={odjezd?.den ?? null}
            cas={odjezd?.cas ?? null}
            rucni={Boolean(odjezd?.rucni)}
            token={vstup?.cteni ? null : (vstup?.token ?? null)}
            cteni={Boolean(vstup?.cteni) || !vstup?.token}
            ubytovan={ubytovan || Boolean(ziveKody)}
            nejpozdeji={okno?.nejpozdeji}
            zadostOdjezd={okno?.zadostOdjezd ?? null}
          />
        ) : krokyHotove ? (
          <>
            <StavApartmanu lang={lang} stav={okno?.stavApartmanu} />
            <VstupHosta
              lang={lang}
              predano={Boolean(ziveKody)}
              token={vstup?.cteni ? null : (vstup?.token ?? null)}
              cteni={Boolean(vstup?.cteni)}
              hodnoty={hodnoty}
              predvyplneny={vstup?.predvyplneny ?? ''}
              nejdrive={okno?.slotyPrijezd[0]}
              stavZadosti={textStavu(lang, 'prijezd', okno?.zadostPrijezd ?? null)}
              onUlozeno={(next) => {
                if (vstup) onVstup?.(next);
                else setLokalne(next);
              }}
            />
          </>
        ) : (
          <>
            <VstupHosta
              lang={lang}
              predano={Boolean(ziveKody)}
              token={vstup?.cteni ? null : (vstup?.token ?? null)}
              cteni={Boolean(vstup?.cteni)}
              hodnoty={hodnoty}
              predvyplneny={vstup?.predvyplneny ?? ''}
              nejdrive={okno?.slotyPrijezd[0]}
              stavZadosti={textStavu(lang, 'prijezd', okno?.zadostPrijezd ?? null)}
              onUlozeno={(next) => {
                if (vstup) onVstup?.(next);
                else setLokalne(next);
              }}
            />
            <StavApartmanu lang={lang} stav={okno?.stavApartmanu} />
          </>
        )}

        {kreslene.length ? (
          <ol className="pv-flow pv-flow--axis" aria-label="Kroky průvodce">
            {kreslene.flatMap((s, si) => {
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
                    <SbalenaSekce
                      ano={SBALENE.has(s.id) || (ubytovan && SBALENE_PO_PREDANI.has(s.id))}
                      nadpis={`${displayNum}. ${sectionNavLabel(s, lang)}`}
                      expandLabel={tt(TX.ui.expandSection)}
                      collapseLabel={tt(TX.ui.collapseSection)}
                      veta={
                        s.id === 'wifi' && popisky['nad_nadpisem']
                          ? tt(popisky['nad_nadpisem'])
                          : (() => {
                              const prvni = kroky[0]?.text ? tt(kroky[0].text) : '';
                              const tecka = prvni.indexOf('.');
                              if (tecka > 0 && tecka < 180) return prvni.slice(0, tecka + 1);
                              return prvni.slice(0, 140);
                            })()
                      }
                    >
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
                        <NavParkovani
                          label={tt(TX.ui.routeParking)}
                          hint={tt(TX.ui.openMapy)}
                          orGoogle={tt(TX.ui.orGoogle)}
                        />
                      </>
                    ) : s.id === 'prijezd-k-domu' ? (
                      <>
                        <div className="pv-flow__card-head">
                          <h2 className="pv-flow__title">
                            {displayNum}. {sectionNavLabel(s, lang)}
                          </h2>
                        </div>
                        {prijezdSekci === 'pesky' ? (
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
                      </>
                    ) : s.id === 'brana-parkoviste' ? (
                      <>
                        <div className="pv-flow__card-head">
                          <h2 className="pv-flow__title">
                            {displayNum}. {sectionNavLabel(s, lang)}
                          </h2>
                        </div>
                        <NavParkovani
                          label={tt(TX.ui.routeParking)}
                          hint={tt(TX.ui.openMapy)}
                          orGoogle={tt(TX.ui.orGoogle)}
                        />
                        <div className={vikend ? 'pv-sec--weekend' : undefined}>
                          {kroky.map((k, i) => {
                            const clanek = (
                              <article
                                key={k.id}
                                className={`pv-step${k.typ === 'upozorneni' ? ' pv-step--hi' : ''}`}
                              >
                                <p className="pv-kicker">{tt(TX.ui.step)} {stepLabel(i)}</p>
                                <h3>{tt(k.nadpis)}</h3>
                                {tt(k.text) ? <p>{renderPhoneText(tt(k.text), k.id === 'brana-otevreno')}</p> : null}
                                {k.body?.length ? (
                                  <ul>
                                    {k.body.map((b, bi) => (
                                      <li key={bi}>{tt(b)}</li>
                                    ))}
                                  </ul>
                                ) : null}
                              </article>
                            );
                            if (k.id !== 'brana-problem') return clanek;
                            return (
                              <details key={k.id} className="pv-sbal">
                                <summary>
                                  <span className="pv-sbal__nadpis">{tt(k.nadpis)}</span>
                                </summary>
                                {clanek}
                              </details>
                            );
                          })}
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
                                  {tt(k.text) ? (
                                    k.id === 'casy' ? (
                                      <p className="pv-casy">
                                        {tt(k.text)
                                          .split('\n')
                                          .filter(Boolean)
                                          .map((radek) => (
                                            <span key={radek}>{radek}</span>
                                          ))}
                                      </p>
                                    ) : k.id === 'kontakt' ? (
                                      <p className="pv-kontakt">
                                        {renderPhoneText(tt(k.text).split(' · ')[0] || '')}
                                        {tt(k.text).includes(' · ') ? (
                                          <span className="pv-kontakt__mail">{tt(k.text).split(' · ')[1]}</span>
                                        ) : null}
                                      </p>
                                    ) : (
                                      <p>{renderPhoneText(tt(k.text))}</p>
                                    )
                                  ) : null}
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
                    </SbalenaSekce>
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