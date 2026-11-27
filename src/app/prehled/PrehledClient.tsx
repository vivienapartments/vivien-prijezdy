'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apartmanyJson from '@/data/apartmany.json';
import {
  casPraha,
  hodinaPraha,
  isoPrahaZCasu,
  nabidnoutOdeslani,
  dotazPredOdeslanimZnovu,
  textTlacitkaOdeslani,
  souhrnDne,
  dnyVyberu,
  nahledDne,
  nadpisSouhrnuDne,
  posunDen,
  cekajiciUkon,
  rozpisPlateb,
  STARY_ZAZNAM,
  terminKratky,
  terminText,
  pobytText,
  textAutomatNebezi,
  textPoplatku,
  vetaChyby,
  zavaznostProblemuPrijezdu,
  type PrehledRadek,
} from '@/lib/prehled';
import { normalizujCasPrijezdu } from '@/lib/cas-prijezdu';
import { ukolZUpozorneniUrl, zpravaZUpozorneniUrl, type UkolUpozorneni } from '@/lib/prehled-odkaz';
import { PoptavkaDetail } from './PoptavkaDetail';
import { cekaWhatsAppPoPruvodci } from '@/lib/pruvodce-wa-stav';
import { textSchvaleniOdjezduOdeslat } from '@/lib/odjezd-souhlas';
import { odkazWhatsAppPrehled, zpravyMenu } from '@/lib/whatsapp-zprava';
import { textKartaPoslana } from '@/lib/klub-karta-predana';
import { chybejiciKroky } from '@/lib/vstup-pruvodce';
import {
  CAS_PO_23,
  popisekCasu,
  novyVyjezd,
  priplatekProCas,
  dotazPriplatkuPriPredani,
  vratPosledniVyjezd,
  VYJEZD_CASTKA,
  CEKANI_MINUT,
  type VyjezdPolozka,
} from '@/lib/priplatek-prijezd';
import { CASY_VYBERU } from '@/lib/vstup-pruvodce';
import { normalizujTelefon, textTelefonu } from '@/lib/telefon';
import { langFromNarodnost } from '@/lib/vivien-data';
import {
  castkaPozdejsihoOdjezdu,
  jeHodina,
  nazevDluhu,
  polozkyDluhu,
  seradOdjezdy,
  textRozpisu,
  zobrazCas,
  zpravaOdjezdu,
  type DruhDluhu,
} from '@/lib/odjezd';
import { cekaPotvrzeniRozlouceni, ROZLOUCENI_ZPET_DNY } from '@/lib/odjezd-potvrzeni';
import { jeProPohodu, textPohody } from '@/lib/pohoda';
import {
  chybiSkutecnyEmailPodekovani,
  hledejProPodekovani,
  hosteProPodekovani,
  odkazSmsPodekovani,
  skutecnyEmailProPodekovani,
  stitekPodekovaniKanalu,
  textPodekovani,
  type PodekovaniKanal,
} from '@/lib/podekovani';
import {
  cekaShrnuti,
  hosteCekajiciShrnuti,
  hosteHotoveShrnuti,
  odkazSmsShrnuti,
  otiskShrnuti,
  stitekShrnutiKanalu,
  textShrnuti,
  zmenaPoShrnuti,
  type ShrnutiKanal,
  type ShrnutiVstup,
} from '@/lib/shrnuti';
import { odkazPruvodceMajitele } from '@/lib/pruvodce-majitel';
import { TlacitkoWhatsApp } from '@/components/TlacitkoWhatsApp';
import { druhZpravyNaOdchozi, pripravTextSmsWa } from '@/lib/odchozi-host';
import { BranaTabulka, ParkovaniRadek } from './BranaPrehled';
import { KalendarPrehled } from './KalendarPrehled';
import { CoDoplnit, StitkyDoplnit14 } from './CoDoplnit';
import { Dnesek } from './Dnesek';
import { FakturaDetail, FakturaStitek, FakturyDomu } from './FakturaAdmin';
import { PraniDetail, PraniRamecekDomu, PraniStitek } from './PraniAdmin';
import { fakturaProNovyPobyt, type FakturaUdaje } from '@/lib/faktura';
import { Hledani, Nedoplatky, RadaZalozek } from './ZalozkyPrehledu';
import { poctyStitkuDoplnit, type FiltrDoplnit } from '@/lib/co-doplnit';
import type { PraniRadekPrehled, PraniStitekKarty } from '@/lib/prani';
import type { JakPlatby, PlatbaPolozky } from '@/lib/store';
import {
  casPrevzetiText,
  formatCastka,
  formatKc,
  jeBezDalsichAkci,
  jeHostOdjetly,
  jeNove,
  jeVNedoplatcich,
  KURZ_EUR_KC,
  nahledPlateb,
  otisk,
  vychoziZalozka,
  type MenaPlateb,
  type Zalozka,
} from '@/lib/zalozky';
import { jeIos, nactiBranu, smsOdkaz, stavParkovani, type BranaSlot } from '@/lib/brana';
import { jeBookingZdroj } from '@/lib/klub-karta-predana';
import { APT_IDS, GUIDE_LANGS, LANG_LABELS, type AptId, type GuideLang } from '@/lib/types';
import {
  jmenoKdoZavad,
  stavZavadPoOdjezdu,
  stavZavadText,
  type KdoZavad,
} from '@/lib/zavady-predani';
import { textStalehoHosta } from '@/lib/staly-host';
import {
  dalsiCasovaZprava,
  pocetBranaPripoinek,
  pocetCasovychPripoinek,
  pocetCheckinPripoinek,
  popisekStupneBrany,
  popisekStupneCasu,
  popisekStupneCheckinu,
  stupenBrany,
  stupenCheckinu,
  textVyzvyHosta,
  ukazatCheckinNedojezd,
  type CasovaZpravaId,
} from '@/lib/pripominky-stupne';
function stitekDneKarty(prijezd: string | null, dnesDen: string): string {
  if (!prijezd) return 'Bez data';
  if (prijezd === dnesDen) return 'Dnes';
  const casti = prijezd.split('-');
  if (casti.length !== 3) return prijezd;
  return `${Number(casti[2])}.\u00A0${Number(casti[1])}.`;
}

/** Dlaždice Průvodce: krátký stav otevření do předání. */
function textOtevreniDlazdice(row: PrehledRadek): string {
  const n = row.otevrenoPocet;
  if (n == null || n <= 0) return 'zatím neotevřel';
  const m = /^Otevřel\s+(.+?)\s+\((\d+)×\)$/i.exec((row.otevreniText || '').trim());
  if (m) return `otevřel ${m[2]}× · naposledy ${m[1]}`;
  return `otevřel ${n}×`;
}

type DetailSekceId =
  | 'zmeny'
  | 'kontakt'
  | 'casy'
  | 'predani'
  | 'prani'
  | 'faktura'
  | 'parkovani'
  | 'pruvodce'
  | 'penize'
  | 'rezervace'
  | 'historie';

const DETAIL_SEKCE_VSE: DetailSekceId[] = [
  'zmeny',
  'kontakt',
  'casy',
  'predani',
  'prani',
  'faktura',
  'parkovani',
  'pruvodce',
  'penize',
  'rezervace',
  'historie',
];

function DetailSekce({
  nazev,
  drobek,
  otevreno,
  onToggle,
  children,
}: {
  nazev: string;
  drobek?: string | null;
  otevreno: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`ph-sekce${otevreno ? ' is-open' : ''}`}>
      <button type="button" className="ph-sekce__hlava" aria-expanded={otevreno} onClick={onToggle}>
        <span className="ph-sekce__leva">
          <span className="ph-sekce__nazev">{nazev}</span>
          {drobek ? <span className="ph-sekce__drobek">{drobek}</span> : null}
        </span>
        <span className="ph-sekce__sipka" aria-hidden="true">
          {otevreno ? '▴' : '▾'}
        </span>
      </button>
      {otevreno ? <div className="ph-sekce__telo">{children}</div> : null}
    </div>
  );
}

type Stav = PrehledRadek['stav'];

type AptRow = { id: AptId; nazev: { cs: string } };
const apartmany = (apartmanyJson as { apartmany: AptRow[] }).apartmany;

const JAKY: { id: JakPlatby; text: string }[] = [
  { id: 'hotove', text: 'hotově' },
  { id: 'karta', text: 'kartou' },
  { id: 'prevod', text: 'převodem' },
  { id: 'cena', text: 'v ceně rezervace' },
];

const STAVY: { id: '' | Stav; text: string }[] = [
  { id: '', text: 'Všechny stavy' },
  { id: 'odeslano', text: 'Odesláno' },
  { id: 'odeslano_s_vyhradou', text: 'Odesláno s výhradou' },
  { id: 'neodeslano', text: 'Neodesláno' },
  { id: 'vraceno', text: 'Vráceno' },
  { id: 'bez_checkinu', text: 'Čeká na check-in' },
  { id: 'zruseno', text: 'Zrušeno' },
];

type ZpetKam = { zalozka: Zalozka; y: number };

/** Vrstvy historie, ať šipka Zpět v telefonu nejde rovnou z aplikace. */
type HistVivien = { vivien?: 'base' | 'karta' | 'sekce' | 'poptavka'; id?: string };

type Props = {
  rows: PrehledRadek[];
  dnes: string;
  zitra: string;
  chybiWifi: string[];
  /** ISO času posledního běhu automatu. Pro varování nahoře. */
  posledniBehCas?: string | null;
  /** Nepřečtená přání pro rámeček Domů. */
  praniRadky?: PraniRadekPrehled[];
  /** Štítky přání na kartách. */
  praniStitky?: Record<string, PraniStitekKarty>;
  /** Místní náhled. Číslo se zapíše jen na obrazovce, ne do ostrých rezervací. */
  ukazka?: boolean;
  /** User-Agent prohlížeče. Na Androidu z něj vznikne odkaz na WhatsApp Business. */
  userAgent?: string;
  brana?: BranaSlot[];
  branaPotvrzena?: boolean;
  branaPripravena?: boolean;
};

function vetaZadosti(row: PrehledRadek, druh: 'prijezd' | 'odjezd'): string {
  const z = druh === 'prijezd' ? row.zadostPrijezd : row.zadostOdjezd;
  if (!z) return '';
  const casti = (row.jmeno || '').trim().split(/\s+/).filter(Boolean);
  const kdo = casti.length ? casti[casti.length - 1] : row.rezervace;
  const cas = z.cas.replace(/^0(\d:)/, '$1');
  const sloveso = druh === 'prijezd' ? 'přijet' : 'odjet';
  return `${row.apartman || 'Apartmán'} ${kdo} chce ${sloveso} ve ${cas} (+${z.kc} Kč)`;
}

function vetaPozdnihoPrijezdu(row: PrehledRadek): string {
  const z = row.zadostPozdniPrijezd;
  if (!z || z.stav !== 'ceka') return '';
  const casti = (row.jmeno || '').trim().split(/\s+/).filter(Boolean);
  const kdo = casti.length ? casti[casti.length - 1] : row.rezervace;
  const cas = z.cas.replace(/^0(\d:)/, '$1');
  return `${row.apartman || 'Apartmán'} ${kdo} chce přijet ve ${cas} (+${z.kc} Kč) · pozdní příjezd`;
}

function Pole({ text }: { text: string }) {
  if (!text) return null;
  if (text === STARY_ZAZNAM) return <span className="ph-stary">{text}</span>;
  return <>{text}</>;
}

function PoznamkaUklidPole({
  hodnota,
  disabled,
  onUloz,
}: {
  hodnota: string;
  disabled?: boolean;
  onUloz: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState(hodnota);
  const [cekam, setCekam] = useState(false);
  return (
    <label className="ph-poznamka-uklid">
      Poznámka pro úklid
      <textarea
        value={text}
        disabled={disabled || cekam}
        rows={2}
        maxLength={500}
        placeholder="postýlka, přistýlka, dřívější příjezd…"
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="button"
        className="ph-ulozit"
        disabled={disabled || cekam || text.trim() === (hodnota || '').trim()}
        onClick={() => {
          setCekam(true);
          void onUloz(text.trim()).finally(() => setCekam(false));
        }}
      >
        {cekam ? 'Ukládám…' : 'Uložit poznámku'}
      </button>
    </label>
  );
}

function UlozitKontakt({
  row,
  onUlozeno,
}: {
  row: PrehledRadek;
  onUlozeno?: () => void;
}) {
  if (!row.telefonText && !row.jinyTelefonText) return null;
  return (
    <a
      className="ph-kontakt"
      href={`/api/prehled/vizitka?rezervace=${encodeURIComponent(row.rezervace)}`}
      onClick={() => onUlozeno?.()}
    >
      Uložit kontakt
    </a>
  );
}

function TelefonNahore({
  hodnota,
  onUloz,
}: {
  hodnota: string;
  onUloz: (text: string) => Promise<{ ok: boolean; hodnota?: string }>;
}) {
  const [text, setText] = useState(hodnota);
  const [cekam, setCekam] = useState(false);
  return (
    <div className="ph-nova-kontakt ph-nova-kontakt--zadat">
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+420 …"
        aria-label="Telefon hosta"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="button"
        className="ph-nova-kontakt__ulozit"
        disabled={cekam}
        onClick={() => {
          setCekam(true);
          void onUloz(text).finally(() => setCekam(false));
        }}
      >
        Uložit
      </button>
    </div>
  );
}

/** Číslo z minulého pobytu. Majitel klepne Akceptovat (ne Uložit). */
function TelefonZMinulaNahore({
  cislo,
  onAkceptovat,
}: {
  cislo: string;
  onAkceptovat: () => Promise<{ ok: boolean; hodnota?: string }>;
}) {
  const [cekam, setCekam] = useState(false);
  return (
    <div className="ph-nova-kontakt ph-nova-kontakt--z-minula">
      <div className="ph-nova-kontakt__z-minula-text">
        <span className="ph-nova-kontakt__z-minula-popis">Telefon z minulého pobytu</span>
        <span className="ph-tel">{cislo}</span>
      </div>
      <button
        type="button"
        className="ph-nova-kontakt__ulozit"
        disabled={cekam}
        onClick={() => {
          setCekam(true);
          void onAkceptovat().finally(() => setCekam(false));
        }}
      >
        Akceptovat
      </button>
    </div>
  );
}

/** Club karta nahoře u hosta: ano / ne + Založit nebo Otevřít. */
function ClubKartaNahore({
  rezervace,
  ukazka,
  onHlaska,
}: {
  rezervace: string;
  ukazka: boolean;
  onHlaska: (t: string) => void;
}) {
  const [stav, setStav] = useState<'nacitam' | 'ano' | 'ne' | 'vypnuto'>('nacitam');
  const [odkaz, setOdkaz] = useState<string | null>(null);
  const [cekam, setCekam] = useState(false);

  useEffect(() => {
    let zruseno = false;
    if (ukazka) {
      const ma = /[02468]$/.test(rezervace);
      setStav(ma ? 'ano' : 'ne');
      setOdkaz(ma ? `/klub?k=ukazka-${encodeURIComponent(rezervace)}` : null);
      return;
    }
    setStav('nacitam');
    void (async () => {
      try {
        const res = await fetch('/api/prehled/akce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: rezervace, akce: 'klub-karta-stav' }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          ma?: boolean;
          odkaz?: string | null;
          vypnuto?: boolean;
        };
        if (zruseno) return;
        if (data.ok && data.ma && data.odkaz) {
          setOdkaz(data.odkaz);
          setStav('ano');
          return;
        }
        if (data.vypnuto) {
          setOdkaz(null);
          setStav('vypnuto');
          return;
        }
        setOdkaz(null);
        setStav('ne');
      } catch {
        if (!zruseno) setStav('ne');
      }
    })();
    return () => {
      zruseno = true;
    };
  }, [rezervace, ukazka]);

  async function zalozit() {
    if (cekam || ukazka) {
      if (ukazka) {
        setOdkaz(`/klub?k=ukazka-${encodeURIComponent(rezervace)}`);
        setStav('ano');
        onHlaska('Ukázka: Club karta založena.');
      }
      return;
    }
    setCekam(true);
    try {
      const res = await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rezervace, akce: 'klub-karta-pripravit' }),
      });
      const data = (await res.json()) as { ok?: boolean; odkaz?: string; chyba?: string };
      if (!res.ok || !data.ok || !data.odkaz) {
        onHlaska(data.chyba || 'Kartu se nepodařilo založit.');
        return;
      }
      setOdkaz(data.odkaz);
      setStav('ano');
      onHlaska('Club karta je založená.');
    } catch {
      onHlaska('Kartu se nepodařilo založit.');
    } finally {
      setCekam(false);
    }
  }

  return (
    <div className="ph-club-pravy" aria-live="polite">
      {stav === 'nacitam' ? (
        <b>Club karta</b>
      ) : stav === 'ano' ? (
        <b className="is-ano">Club karta · ano</b>
      ) : stav === 'vypnuto' ? (
        <b className="is-ne">Club vypnutý</b>
      ) : (
        <b className="is-ne">Club karta · ne</b>
      )}
      {stav === 'ano' && odkaz ? (
        <a className="ph-club-pravy__btn is-line" href={odkaz} target="_blank" rel="noopener noreferrer">
          Otevřít
        </a>
      ) : stav === 'ne' ? (
        <button type="button" className="ph-club-pravy__btn" disabled={cekam} onClick={() => void zalozit()}>
          {cekam ? '…' : 'Založit'}
        </button>
      ) : null}
    </div>
  );
}

export function PrehledClient({
  rows,
  dnes,
  zitra,
  chybiWifi,
  posledniBehCas = null,
  praniRadky: praniRadkyVstup = [],
  praniStitky: praniStitkyVstup = {},
  ukazka = false,
  userAgent = '',
  brana = [],
  branaPotvrzena = false,
  branaPripravena = false,
}: Props) {
  const router = useRouter();
  const [radky, setRadky] = useState(rows);
  const [sloty, setSloty] = useState<BranaSlot[]>(() => nactiBranu(brana));
  const [branaOk, setBranaOk] = useState(branaPotvrzena);
  const [telefony, setTelefony] = useState<Record<string, string>>({});
  const [rozbalene, setRozbalene] = useState<Record<string, boolean>>({});
  const [stav, setStav] = useState<'' | Stav>('');
  const [zpetKam, setZpetKam] = useState<ZpetKam | null>(null);
  const [praniRadky, setPraniRadky] = useState(praniRadkyVstup);
  const [praniStitky, setPraniStitky] = useState(praniStitkyVstup);
  const [praniFocus, setPraniFocus] = useState<Record<string, string>>({});
  /** Vybraný den nahoře (YYYY-MM-DD). Jen v paměti stránky, výchozí dnes. */
  const [vybranyDen, setVybranyDen] = useState(dnes);
  /** Domů = provoz (záložky, hledat). Den = jen karty vybraného dne. */
  const [pohledDomu, setPohledDomu] = useState(true);
  const [pohodaOtevreno, setPohodaOtevreno] = useState(false);
  const [podekovaniOtevreno, setPodekovaniOtevreno] = useState(false);
  const [dotazPodekovani, setDotazPodekovani] = useState<string | null>(null);
  const [hledaniPodekovani, setHledaniPodekovani] = useState('');
  const [hledaniPodekovaniRez, setHledaniPodekovaniRez] = useState('');
  const [hledaniPodekovaniTel, setHledaniPodekovaniTel] = useState('');
  const [hledaniPodekovaniVic, setHledaniPodekovaniVic] = useState(false);
  const [shrnutiOtevreno, setShrnutiOtevreno] = useState(false);
  const [shrnutiHotoveOtevreno, setShrnutiHotoveOtevreno] = useState(false);
  const [dotazShrnuti, setDotazShrnuti] = useState<string | null>(null);
  const [panelShrnutiKarty, setPanelShrnutiKarty] = useState<string | null>(null);
  const [zitraOtevreno, setZitraOtevreno] = useState(false);
  const [casySchvaleniOtevreno, setCasySchvaleniOtevreno] = useState(false);
  const [odjezdySchvaleniOtevreno, setOdjezdySchvaleniOtevreno] = useState(true);
  const [zalozka, setZalozka] = useState<Zalozka>('prijezdy');
  const [fakturyFocus, setFakturyFocus] = useState(false);
  const [kdoKouka, setKdoKouka] = useState<'pravoslav' | 'nikol'>('pravoslav');
  const [videne, setVidene] = useState<Record<string, Record<string, string>> | null>(null);
  const [vybrana, setVybrana] = useState<string | null>(null);
  const [dotazVratitOdjezd, setDotazVratitOdjezd] = useState<string | null>(null);
  const zalozkaNactena = useRef(false);
  const vybranaRef = useRef<string | null>(null);
  const detailSekceRef = useRef<Record<string, DetailSekceId[]>>({});
  const zpetKamRef = useRef<ZpetKam | null>(null);
  const histHloubkaRef = useRef(0);
  const zpetPresHistoriiRef = useRef(false);
  const poptavkaIdRef = useRef<string | null>(null);
  const [filtrDoplnit, setFiltrDoplnit] = useState<FiltrDoplnit>('vse');
  const [otevriDoplnitSignal, setOtevriDoplnitSignal] = useState(0);
  const [odjeliOtevreno, setOdjeliOtevreno] = useState(false);
  /** Po výběru Osobně/Sami je blok sbalený. Klepnutí na stav ho znovu rozbalí. */
  const [potvrzeniRozbal, setPotvrzeniRozbal] = useState<Record<string, boolean>>({});
  const [otevreno, setOtevreno] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState('');
  const [nacitamSchranku, setNacitamSchranku] = useState(false);
  const [cekam, setCekam] = useState<string | null>(null);
  const [oknoHotovo, setOknoHotovo] = useState<Record<string, true>>({});
  /** Text odmítnutí pozdního příjezdu (vlastní zpráva hostiteli). */
  const [pozniOdmitnuti, setPozniOdmitnuti] = useState<Record<string, string>>({});
  const [pozniOdmitnoutOtevreno, setPozniOdmitnoutOtevreno] = useState<string | null>(null);
  /** Individuální výjimka po 21:00. */
  const [pozniIndividualni, setPozniIndividualni] = useState<Record<string, { cas: string; kc: string }>>({});
  const [casy, setCasy] = useState<Record<string, string>>({});
  const [casyOdjezdu, setCasyOdjezdu] = useState<Record<string, string>>({});
  const [volba, setVolba] = useState<Record<string, string>>({});
  const [panelZpravy, setPanelZpravy] = useState<Record<string, boolean>>({});
  const [kanalZpravy, setKanalZpravy] = useState<Record<string, 'whatsapp' | 'sms' | 'email'>>({});
  /** Klik na dlaždici Autem, když údaje jsou: otevři SMS registraci brány. */
  const [branaVyzva, setBranaVyzva] = useState<Record<string, number>>({});
  const [branaZTile, setBranaZTile] = useState<Record<string, boolean>>({});
  const [odkazy, setOdkazy] = useState<Record<string, string>>({});
  const [novaRezervace, setNovaRezervace] = useState<{
    jmeno: string;
    telefon: string;
    email: string;
    narodnost: string;
    jazyk: GuideLang;
  } | null>(null);
  const [potvrdPrekryv, setPotvrdPrekryv] = useState(false);
  const [rozbalPredano, setRozbalPredano] = useState<Record<string, true>>({});
  const [predani, setPredani] = useState<Record<string, string | null>>({});
  const [naMisteStav, setNaMisteStav] = useState<Record<string, string | null>>({});
  const [priplatekStav, setPriplatekStav] = useState<Record<string, number | null>>({});
  const [dotazPredani, setDotazPredani] = useState<{
    id: string;
    druh: 'predano' | 'predano-priplatek' | 'vratit' | 'nedojezd' | 'vratit-nedojezd';
    cas?: string;
    navrhKc?: number | null;
    stavPriplatku?: 'castka' | 'domluva';
    krok?: 'volba' | 'vlastni';
    vlastni?: string;
  } | null>(null);
  const [dotazZavady, setDotazZavady] = useState<string | null>(null);
  const [textZavad, setTextZavad] = useState('');
  const [zavadyStav, setZavadyStav] = useState<Record<string, PrehledRadek['zavadyPredani']>>({});
  const [zavadyPoOdjezduStav, setZavadyPoOdjezduStav] = useState<
    Record<string, PrehledRadek['zavadyPoOdjezdu']>
  >({});
  const [dotazOdeslatZavady, setDotazOdeslatZavady] = useState<string | null>(null);
  const [dotazOdeslatPoOdjezdu, setDotazOdeslatPoOdjezdu] = useState<string | null>(null);
  const [platby, setPlatby] = useState<Record<string, { kdy: string | null; kdo: 'ja' | 'nikol' | null }>>({});
  const [vyjezdy, setVyjezdy] = useState<Record<string, VyjezdPolozka[]>>({});
  const [dotazVyjezdu, setDotazVyjezdu] = useState<{ id: string; druh: 'pridat' | 'vratit' } | null>(null);
  const [volbaPlatby, setVolbaPlatby] = useState<{
    id: string;
    druh: DruhDluhu | 'vse';
    krok: 'kdo' | 'jak';
    kdo: 'pravoslav' | 'nikol' | null;
  } | null>(null);
  const [editPlatby, setEditPlatby] = useState<{ id: string; druh: DruhDluhu; text: string } | null>(null);
  const [jazyky, setJazyky] = useState<Record<string, GuideLang>>({});
  const [dotazZnovu, setDotazZnovu] = useState<string | null>(null);
  const [dotazDalsi, setDotazDalsi] = useState<{ id: string; druh: 'brana' | 'odemknout' } | null>(null);
  const [dotazEmail, setDotazEmail] = useState<{ id: string; email: string } | null>(null);
  const [dotazOdjezd, setDotazOdjezd] = useState<string | null>(null);
  const [dotazPohoda, setDotazPohoda] = useState<string | null>(null);
  const [dotazPrestoPrijezd, setDotazPrestoPrijezd] = useState<string | null>(null);
  /** Okno „Ubytováno – poslat kartu“ (PROMPT 5b). Příjezd, ne odjezd. */
  const [oknoKarty, setOknoKarty] = useState<{
    rezervace: string;
    jmeno: string;
    odkaz: string;
    zprava: string;
    email: string | null;
    emailRelay: boolean;
    emailPoznamka: string | null;
    telefonWa: string | null;
    emailOdeslan: boolean;
    predana: { kdy: string; kanaly: ('email' | 'whatsapp' | 'sms' | 'kopie')[] } | null;
    testRezim?: boolean;
  } | null>(null);
  /** Po Zavřít: „Předat bez karty?“ když ještě není ubytováno. */
  const [dotazBezKarty, setDotazBezKarty] = useState<string | null>(null);
  const [poplatekOtevren, setPoplatekOtevren] = useState<Record<string, boolean>>({});
  /** V detailu karty: které skupiny jsou rozbalené (může jich být víc, včetně všech). */
  const [detailSekce, setDetailSekce] = useState<Record<string, DetailSekceId[]>>({});
  const [hledatDotaz, setHledatDotaz] = useState('');
  const [kontaktUlozen, setKontaktUlozen] = useState<Record<string, string>>({});
  const [poptavkaId, setPoptavkaId] = useState<string | null>(null);
  /** Nevyřízené poptávky / doporučitelé ke schválení → červené tlačítko nahoře. */
  const [poptavkyDotazy, setPoptavkyDotazy] = useState(0);
  const [doporucitelDotazy, setDoporucitelDotazy] = useState(0);

  useEffect(() => {
    let zrus = false;
    async function nactiDotazy() {
      try {
        const [pRes, dRes] = await Promise.all([
          fetch('/api/prehled/poptavka', { cache: 'no-store' }),
          fetch('/api/prehled/doporucitele', { cache: 'no-store' }),
        ]);
        const pJson = (await pRes.json()) as {
          ok?: boolean;
          poptavky?: { vyrizena?: boolean }[];
        };
        const dJson = (await dRes.json()) as {
          ok?: boolean;
          pocetKeSchvaleni?: number;
          pozvanky?: { stav?: string }[];
        };
        if (zrus) return;
        if (pJson.ok && Array.isArray(pJson.poptavky)) {
          setPoptavkyDotazy(pJson.poptavky.filter((x) => !x.vyrizena).length);
        }
        if (dJson.ok) {
          const n =
            typeof dJson.pocetKeSchvaleni === 'number'
              ? dJson.pocetKeSchvaleni
              : (dJson.pozvanky || []).filter((x) => x.stav === 'ke_schvaleni').length;
          setDoporucitelDotazy(n);
        }
      } catch {
        /* přehled funguje i bez počtů */
      }
    }
    void nactiDotazy();
    const t = window.setInterval(() => void nactiDotazy(), 60_000);
    return () => {
      zrus = true;
      window.clearInterval(t);
    };
  }, []);

  useEffect(() => {
    vybranaRef.current = vybrana;
  }, [vybrana]);
  useEffect(() => {
    detailSekceRef.current = detailSekce;
  }, [detailSekce]);
  useEffect(() => {
    zpetKamRef.current = zpetKam;
  }, [zpetKam]);
  useEffect(() => {
    poptavkaIdRef.current = poptavkaId;
  }, [poptavkaId]);

  useEffect(() => {
    setRadky(rows);
    setSloty(nactiBranu(brana));
    setBranaOk(branaPotvrzena);
  }, [rows, brana, branaPotvrzena]);

  function nactiPoptavkuZUrl() {
    try {
      const q = new URLSearchParams(window.location.search);
      const id = (q.get('poptavka') || '').trim();
      setPoptavkaId(id || null);
    } catch {
      setPoptavkaId(null);
    }
  }

  function zavriKartuBezHistorie() {
    const kam = zpetKamRef.current;
    const id = vybranaRef.current;
    setZpetKam(null);
    setVybrana(null);
    histHloubkaRef.current = 0;
    if (id) {
      setDetailSekce((prev) => ({ ...prev, [id]: [] }));
    }
    if (kam) {
      setZalozka(kam.zalozka);
      requestAnimationFrame(() => {
        try {
          window.scrollTo(0, kam.y);
        } catch {
          /* scroll */
        }
      });
    }
  }

  function hashRezervace(): string {
    try {
      return window.location.hash.replace(/^#/, '').trim().split(/[?&]/)[0].trim();
    } catch {
      return '';
    }
  }

  function histStav(): HistVivien | null {
    try {
      return (window.history.state as HistVivien | null) || null;
    } catch {
      return null;
    }
  }

  /** Sekce na kartě: při otevření přidá vrstvu historie, při sbalení ji sundá. */
  function nastavSekceKarty(cislo: string, dalsi: DetailSekceId[]) {
    setDetailSekce((prev) => ({ ...prev, [cislo]: dalsi }));
    try {
      const st = histStav();
      if (dalsi.length > 0) {
        if (st?.vivien !== 'sekce' || st?.id !== cislo) {
          window.history.pushState({ vivien: 'sekce', id: cislo }, '', `#${cislo}`);
          histHloubkaRef.current = Math.max(2, histHloubkaRef.current + 1);
        }
      } else if (st?.vivien === 'sekce' && st?.id === cislo) {
        window.history.replaceState({ vivien: 'karta', id: cislo }, '', `#${cislo}`);
        histHloubkaRef.current = 1;
      }
    } catch {
      /* historie */
    }
  }

  useEffect(() => {
    nactiPoptavkuZUrl();
    function onPopstate() {
      nactiPoptavkuZUrl();
      if (zpetPresHistoriiRef.current) {
        zpetPresHistoriiRef.current = false;
        zavriKartuBezHistorie();
        return;
      }
      const st = histStav();
      const hashId = hashRezervace();
      const id = vybranaRef.current;
      const sekce = id ? detailSekceRef.current[id] || [] : [];

      if (poptavkaIdRef.current && st?.vivien !== 'poptavka') {
        const q = new URLSearchParams(window.location.search);
        if (!(q.get('poptavka') || '').trim()) {
          setPoptavkaId(null);
        }
      }

      if (id && sekce.length > 0 && (st?.vivien === 'karta' || hashId === id)) {
        setDetailSekce((prev) => ({ ...prev, [id]: [] }));
        histHloubkaRef.current = 1;
        return;
      }

      if (id && (!hashId || hashId !== id || !st?.vivien || st.vivien === 'base')) {
        zavriKartuBezHistorie();
      }
    }
    window.addEventListener('popstate', onPopstate);
    return () => window.removeEventListener('popstate', onPopstate);
  }, []);

  function rozbalDetailKarty(cislo: string) {
    setRozbalene((prev) => ({ ...prev, [cislo]: true }));
    /** Skupiny (Změny, Kontakt, …) zůstanou sbalené. Majitel si je otevře sám. */
    setDetailSekce((prev) => ({ ...prev, [cislo]: prev[cislo] ?? [] }));
  }

  function otevriKartu(id: string) {
    const cislo = id.trim();
    if (
      !cislo ||
      cislo === 'pohoda' ||
      cislo === 'podekovani' ||
      cislo === 'vse-pripraveno' ||
      cislo.startsWith('odjezdy')
    )
      return;
    const uzNaKarte = vybrana === cislo;
    setZpetKam((prev) => {
      if (zalozka === 'hledat' && vybrana === cislo) return prev;
      try {
        return { zalozka, y: typeof window !== 'undefined' ? window.scrollY : 0 };
      } catch {
        return { zalozka, y: 0 };
      }
    });
    setVybrana(cislo);
    rozbalDetailKarty(cislo);
    setZalozka('hledat');
    try {
      if (typeof window !== 'undefined') {
        if (!uzNaKarte) {
          window.history.pushState({ vivien: 'karta', id: cislo }, '', `#${cislo}`);
          histHloubkaRef.current = 1;
        } else if (window.location.hash !== `#${cislo}`) {
          window.history.replaceState({ vivien: 'karta', id: cislo }, '', `#${cislo}`);
          histHloubkaRef.current = Math.max(1, histHloubkaRef.current);
        }
      }
    } catch {
      /* hash */
    }
    requestAnimationFrame(() => {
      try {
        window.scrollTo(0, 0);
      } catch {
        /* scroll */
      }
    });
  }

  function zpetZKarty() {
    const n = histHloubkaRef.current;
    if (n > 0 && typeof window !== 'undefined') {
      zpetPresHistoriiRef.current = true;
      histHloubkaRef.current = 0;
      try {
        window.history.go(-n);
        return;
      } catch {
        zpetPresHistoriiRef.current = false;
      }
    }
    try {
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState({ vivien: 'base' }, '', window.location.pathname + window.location.search);
      }
    } catch {
      /* hash */
    }
    zavriKartuBezHistorie();
  }

  function praniZUrl(url: string): string | null {
    const m = (url || '').match(/[?#&]prani=([^&#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function zmenFakturu(
    rezervace: string,
    faktura: FakturaUdaje | null,
    opts?: { fakturaNeprebirat?: boolean },
  ) {
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === rezervace
          ? {
              ...r,
              faktura,
              ...(opts?.fakturaNeprebirat != null ? { fakturaNeprebirat: opts.fakturaNeprebirat } : {}),
            }
          : r,
      ),
    );
  }

  function zmenCenuPobytu(rezervace: string, cenaPobytu: number) {
    setRadky((prev) => prev.map((r) => (r.rezervace === rezervace ? { ...r, cenaPobytu } : r)));
  }

  function otevriFakturu(rezervace: string) {
    otevriKartu(rezervace);
    const cur = detailSekceRef.current[rezervace] || [];
    nastavSekceKarty(rezervace, cur.includes('faktura') ? cur : [...cur, 'faktura']);
  }

  function otevriPrani(rezervace: string, vlakno?: string | null) {
    if (!radky.some((r) => r.rezervace === rezervace && !r.nelzeNacist)) {
      setHlaska(`Kartu ${rezervace} teď v přehledu nevidím. Zkuste Hledat.`);
      otevriZalozku('hledat');
      setHledatDotaz(rezervace);
      return;
    }
    otevriKartu(rezervace);
    const cur = detailSekceRef.current[rezervace] || [];
    nastavSekceKarty(rezervace, cur.includes('prani') ? cur : [...cur, 'prani']);
    if (vlakno) {
      setPraniFocus((prev) => ({ ...prev, [rezervace]: vlakno }));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            document.getElementById(`ph-prani-${vlakno}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch {
            /* scroll */
          }
        });
      });
    }
  }

  async function prectenoPraniRadek(rezervace: string, vlakno: string) {
    if (ukazka) return;
    try {
      await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace, akce: 'prani-precteno', vlakno, kdo: kdoKouka }),
      });
      setPraniRadky((prev) => prev.filter((r) => !(r.rezervace === rezervace && r.vlakno === vlakno)));
      setPraniStitky((prev) => {
        const st = prev[rezervace];
        if (!st) return prev;
        const nove = Math.max(0, st.nove - 1);
        return { ...prev, [rezervace]: { ...st, nove, pocet: Math.max(st.pocet, nove) } };
      });
      router.refresh();
    } catch {
      setHlaska('Přečtení přání se neuložilo.');
    }
  }

  function scrollPoOtevreni(elId: string) {
    window.setTimeout(() => {
      try {
        document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch {
        /* scroll */
      }
    }, 180);
  }

  function otevriOdjezdyKeSchvaleni() {
    setPohledDomu(true);
    setZalozka('prijezdy');
    setOdjezdySchvaleniOtevreno(true);
    setVybrana(null);
    requestAnimationFrame(() => {
      try {
        document.getElementById('odsouhlasit-odjezdy')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      } catch {
        /* scroll */
      }
    });
  }

  function otevriUkolNaKarte(id: string, ukol: UkolUpozorneni | null) {
    if (!ukol) return;
    if (ukol === 'odjezd') {
      otevriOdjezdyKeSchvaleni();
      return;
    }
    if (ukol === 'doklady') {
      setVolba((prev) => ({ ...prev, [id]: 'doklady' }));
      setPanelZpravy((prev) => ({ ...prev, [id]: true }));
      scrollPoOtevreni(`zprava-${id}`);
      return;
    }
    if (ukol === 'brana') {
      setBranaZTile((prev) => ({ ...prev, [id]: true }));
      setBranaVyzva((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
      scrollPoOtevreni(`brana-${id}`);
      return;
    }
    if (ukol === 'potvrzeni') {
      scrollPoOtevreni(`ph-potvrzeni-${id}`);
    }
  }

  useEffect(() => {
    setPraniRadky(praniRadkyVstup);
    setPraniStitky(praniStitkyVstup);
  }, [praniRadkyVstup, praniStitkyVstup]);

  useEffect(() => {
    function zHash() {
      const raw = window.location.hash.replace(/^#/, '').trim();
      const id = raw.split(/[?&]/)[0].trim();
      if (!id) return;
      if (id === 'pohoda') {
        otevriPohodu();
        return;
      }
      if (id === 'podekovani') {
        otevriPodekovani();
        return;
      }
      if (id === 'vse-pripraveno') {
        otevriShrnuti();
        return;
      }
      if (id === 'odsouhlasit-odjezdy') {
        otevriOdjezdyKeSchvaleni();
        return;
      }
      if (id === 'odjezdy-zitra' || id.startsWith('odjezdy')) {
        otevriZitraOdjezdy();
        return;
      }
      if (id === 'faktury' || id === 'faktury-pozdeji') {
        setPohledDomu(true);
        setZalozka('prijezdy');
        setFakturyFocus(true);
        requestAnimationFrame(() => {
          try {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch {
            /* scroll */
          }
        });
        return;
      }
      if (id === 'brana') return;
      setZpetKam((prev) => {
        if (prev) return prev;
        try {
          return { zalozka, y: window.scrollY };
        } catch {
          return { zalozka, y: 0 };
        }
      });
      setVybrana(id);
      rozbalDetailKarty(id);
      setZalozka('hledat');
      try {
        const st = histStav();
        if (!st?.vivien) {
          const zaklad = window.location.pathname + window.location.search;
          const plna = `${zaklad}#${raw}`;
          window.history.replaceState({ vivien: 'base' }, '', zaklad);
          window.history.pushState({ vivien: 'karta', id }, '', plna);
          histHloubkaRef.current = 1;
        } else if (st.vivien !== 'karta' && st.vivien !== 'sekce') {
          window.history.replaceState({ vivien: 'karta', id }, '', `#${id}`);
          histHloubkaRef.current = Math.max(1, histHloubkaRef.current);
        }
      } catch {
        /* historie */
      }
      const prani = praniZUrl(window.location.href) || praniZUrl(`#${raw}`);
      if (prani) {
        nastavSekceKarty(id, ['prani']);
        setPraniFocus((prev) => ({ ...prev, [id]: prani }));
        requestAnimationFrame(() => {
          try {
            document.getElementById(`ph-prani-${prani}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch {
            /* scroll */
          }
        });
        return;
      }
      const zprava = zpravaZUpozorneniUrl(window.location.href) || zpravaZUpozorneniUrl(`#${raw}`);
      if (zprava) {
        setVolba((prev) => ({ ...prev, [id]: zprava }));
        setPanelZpravy((prev) => ({ ...prev, [id]: true }));
      }
      otevriUkolNaKarte(id, ukolZUpozorneniUrl(window.location.href) || ukolZUpozorneniUrl(`#${raw}`));
    }
    zHash();
    window.addEventListener('hashchange', zHash);
    return () => window.removeEventListener('hashchange', zHash);
    // jen při mountu; zalozka v closure je výchozí
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Obnova jen když je přehled otevřený. Na pozadí nic nenačítá (šetří Upstash). */
  useEffect(() => {
    if (ukazka) return;
    const OBNOVA_MS = 60_000;
    let naposled = Date.now();
    function obnov() {
      if (document.visibilityState !== 'visible') return;
      const ted = Date.now();
      if (ted - naposled < 15_000) return;
      naposled = ted;
      router.refresh();
    }
    function priNavratu() {
      if (document.visibilityState === 'visible') obnov();
    }
    document.addEventListener('visibilitychange', priNavratu);
    const id = window.setInterval(obnov, OBNOVA_MS);
    return () => {
      document.removeEventListener('visibilitychange', priNavratu);
      window.clearInterval(id);
    };
  }, [router, ukazka]);

  /** Stálý host: firmu z minulého pobytu přilepí samo (IČO, e-mail účetní…). */
  const firmaPrebirani = useRef(new Set<string>());
  useEffect(() => {
    const kandidati = radky.filter(
      (r) =>
        !r.nelzeNacist &&
        !r.faktura &&
        !r.fakturaNeprebirat &&
        r.stalyHost?.fakturaZMinula &&
        !firmaPrebirani.current.has(r.rezervace),
    );
    if (!kandidati.length) return;
    for (const r of kandidati) {
      firmaPrebirani.current.add(r.rezervace);
      const zMinula = r.stalyHost!.fakturaZMinula!;
      if (ukazka) {
        zmenFakturu(r.rezervace, fakturaProNovyPobyt(zMinula, new Date().toISOString()), {
          fakturaNeprebirat: false,
        });
        continue;
      }
      void fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rezervace: r.rezervace,
          akce: 'faktura-prebirat',
          faktura: zMinula,
        }),
      })
        .then(async (res) => {
          const json = (await res.json().catch(() => null)) as {
            ok?: boolean;
            faktura?: FakturaUdaje | null;
          } | null;
          if (res.ok && json?.ok && json.faktura) {
            zmenFakturu(r.rezervace, json.faktura, { fakturaNeprebirat: false });
          } else {
            firmaPrebirani.current.delete(r.rezervace);
          }
        })
        .catch(() => {
          firmaPrebirani.current.delete(r.rezervace);
        });
    }
  }, [radky, ukazka]);

  function maJazykRadku(row: PrehledRadek): boolean {
    if (jazyky[row.rezervace]) return true;
    if (row.jazyk) return true;
    if (row.narodnost?.trim()) return true;
    return false;
  }

  function jazykRadku(row: PrehledRadek): GuideLang {
    return jazyky[row.rezervace] || (row.narodnost?.trim() ? langFromNarodnost(row.narodnost) : row.jazyk || 'cs');
  }

  function casRadku(row: PrehledRadek): string {
    if (casy[row.rezervace] != null) return casy[row.rezervace];
    if (row.casPrijezdu === 'po20' || row.casPrijezdu === 'po23') return popisekCasu(row.casPrijezdu);
    return row.casPrijezdu ?? '';
  }

  function casOdjezduRadku(row: PrehledRadek): string {
    if (casyOdjezdu[row.rezervace] != null) return casyOdjezdu[row.rezervace];
    return jeHodina(row.casOdjezdu) ? row.casOdjezdu : '';
  }

  function telefonRadku(row: PrehledRadek): string {
    return telefony[row.rezervace] ?? row.telefonText ?? '';
  }

  function predanoRadku(row: PrehledRadek): string | null {
    if (Object.prototype.hasOwnProperty.call(predani, row.rezervace)) return predani[row.rezervace];
    return row.predano;
  }

  function vyberPoplatku(row: PrehledRadek): { kdy: string | null; kdo: 'ja' | 'nikol' | null } {
    if (Object.prototype.hasOwnProperty.call(platby, row.rezervace)) return platby[row.rezervace];
    return { kdy: row.zaplaceno, kdo: row.poplatekVybral };
  }

  function polozkyKarty(row: PrehledRadek) {
    const casSoucet = Object.prototype.hasOwnProperty.call(casy, row.rezervace)
      ? casy[row.rezervace].trim() || null
      : row.casPrijezdu;
    const polozky = polozkyDluhu({
      zaplaceno: null,
      stav: row.stav,
      poplatek: row.poplatek,
      noci: row.noci,
      osob: row.osob,
      priplatekRucni: priplatekRadku(row),
      dohodaKc: row.dohodaKc,
      dohodaPoznamka: row.dohodaPoznamka,
      casPrijezdu: casSoucet,
      naMiste: naMisteRadku(row),
      predano: predanoRadku(row),
      vyjezdy: vyjezdyRadku(row),
      priplatekDrive: row.zadostPrijezd?.stav === 'potvrzeno' ? row.zadostPrijezd.kc : null,
      priplatekPozde: castkaPozdejsihoOdjezdu(row),
    });
    return polozky.map((p) => ({ ...p, nazev: nazevDluhu(p.druh, 'cs', p.popis) }));
  }

  async function ulozPlatbu(row: PrehledRadek, druh: DruhDluhu | 'vse', jak: JakPlatby, kdo: 'pravoslav' | 'nikol') {
    setVolbaPlatby(null);
    const zive = polozkyKarty(row);
    if (ukazka) {
      const nove = zive.filter((p) => (druh === 'vse' || p.druh === druh) && !(row.platby || []).some((x) => x.druh === p.druh));
      const platbyRadku = [
        ...(row.platby || []),
        ...nove.map((p) => ({ druh: p.druh, kc: p.kc, jak, kdo, kdy: new Date().toISOString() })),
      ];
      const zbyva = zive.filter((p) => !platbyRadku.some((x) => x.druh === p.druh));
      zapisPlatbyRadku(row.rezervace, platbyRadku, zbyva.length ? row.zaplaceno : new Date().toISOString(), textRozpisu(zbyva), zive);
      return;
    }
    setCekam(`${row.rezervace}:platba`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'platba', druh, jak, kdo }),
    });
    const json = (await res.json().catch(() => null)) as {
      platby?: PlatbaPolozky[];
      zaplaceno?: string | null;
      dluh?: string;
      error?: string;
    } | null;
    setCekam(null);
    if (!res.ok || !json) {
      setHlaska(json?.error || 'Platbu se nepodařilo zapsat.');
      return;
    }
    zapisPlatbyRadku(row.rezervace, json.platby || [], json.zaplaceno ?? null, json.dluh || '', zive);
  }

  async function vratPlatbuKarty(row: PrehledRadek, druh: DruhDluhu | 'vse') {
    const zive = polozkyKarty(row);
    if (ukazka) {
      const platbyRadku = druh === 'vse' ? [] : (row.platby || []).filter((p) => p.druh !== druh);
      const zbyva = zive.filter((p) => !platbyRadku.some((x) => x.druh === p.druh));
      zapisPlatbyRadku(row.rezervace, platbyRadku, zbyva.length ? null : row.zaplaceno, textRozpisu(zbyva), zive);
      return;
    }
    setCekam(`${row.rezervace}:platba`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'vratit-platbu', druh }),
    });
    const json = (await res.json().catch(() => null)) as {
      platby?: PlatbaPolozky[];
      zaplaceno?: string | null;
      dluh?: string;
    } | null;
    setCekam(null);
    if (!res.ok || !json) {
      setHlaska('Platbu se nepodařilo vrátit.');
      return;
    }
    zapisPlatbyRadku(row.rezervace, json.platby || [], json.zaplaceno ?? null, json.dluh || '', zive);
  }

  async function upravPlatbuKarty(row: PrehledRadek, druh: DruhDluhu, castka: string) {
    const surovy = castka.trim().replace(',', '.');
    const kc = Math.round(Number(surovy));
    if (!Number.isFinite(kc) || kc < 0) return;
    const zive = polozkyKarty(row);
    if (ukazka) {
      const plna = zive.find((p) => p.druh === druh)?.kc ?? kc;
      const cil = Math.min(kc, plna);
      const stare = (row.platby || []).filter((p) => p.druh === druh);
      let platbyRadku = (row.platby || []).filter((p) => p.druh !== druh);
      if (cil > 0) {
        platbyRadku = [
          ...platbyRadku,
          {
            druh,
            kc: cil,
            jak: stare[0]?.jak || 'prevod',
            kdo: stare[0]?.kdo || 'pravoslav',
            kdy: new Date().toISOString(),
          },
        ];
      }
      const zbyva = zive
        .map((p) => {
          const uz = platbyRadku.filter((x) => x.druh === p.druh).reduce((s, x) => s + x.kc, 0);
          return { ...p, kc: Math.max(0, p.kc - uz) };
        })
        .filter((p) => p.kc > 0);
      zapisPlatbyRadku(
        row.rezervace,
        platbyRadku,
        zbyva.length ? null : row.zaplaceno || new Date().toISOString(),
        textRozpisu(zbyva),
        zive,
      );
      setEditPlatby(null);
      return;
    }
    setCekam(`${row.rezervace}:platba`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rezervace: row.rezervace,
        akce: 'upravit-platbu',
        druh,
        castka: String(kc),
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      platby?: PlatbaPolozky[];
      zaplaceno?: string | null;
      dluh?: string;
      error?: string;
    } | null;
    setCekam(null);
    if (!res.ok || !json) {
      setHlaska(json?.error || 'Platbu se nepodařilo upravit.');
      return;
    }
    setEditPlatby(null);
    zapisPlatbyRadku(row.rezervace, json.platby || [], json.zaplaceno ?? null, json.dluh || '', zive);
  }

  function vyjezdyRadku(row: PrehledRadek): VyjezdPolozka[] {
    if (Object.prototype.hasOwnProperty.call(vyjezdy, row.rezervace)) return vyjezdy[row.rezervace];
    return row.vyjezdy || [];
  }

  async function ulozVyjezd(row: PrehledRadek, pridatVyjezd: boolean) {
    setDotazVyjezdu(null);
    const stavajici = vyjezdyRadku(row);
    if (!pridatVyjezd && stavajici.length === 0) return;
    if (ukazka) {
      const dalsi = pridatVyjezd
        ? [...stavajici, novyVyjezd(new Date().toISOString())]
        : vratPosledniVyjezd(stavajici);
      setVyjezdy((prev) => ({ ...prev, [row.rezervace]: dalsi }));
      return;
    }
    setCekam(`${row.rezervace}:vyjezd`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: pridatVyjezd ? 'vyjezd' : 'vratit-vyjezd' }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; vyjezdy?: VyjezdPolozka[] } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Výjezd se neuložil.');
      return;
    }
    setVyjezdy((prev) => ({ ...prev, [row.rezervace]: json.vyjezdy || [] }));
  }

  /** Uloží předání. Neotevírá okno s kartou. Vrací true při úspěchu. */
  async function ulozPredani(
    row: PrehledRadek,
    zapnout: boolean,
    priplatekCastka?: number | null,
  ): Promise<boolean> {
    if (zapnout && typeof priplatekCastka === 'number' && Number.isFinite(priplatekCastka) && priplatekCastka >= 0) {
      const uloz = await ulozPriplatek(row, String(Math.round(priplatekCastka)));
      if (!uloz.ok) {
        setHlaska('Příplatek se neuložil.');
        return false;
      }
    }
    if (ukazka) {
      setPredani((prev) => ({ ...prev, [row.rezervace]: zapnout ? new Date().toISOString() : null }));
      setDotazPredani(null);
      return true;
    }
    setCekam(`${row.rezervace}:predani`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: zapnout ? 'predano' : 'zrusit-predani' }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; predano?: string | null } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Předání se neuložilo.');
      return false;
    }
    setPredani((prev) => ({ ...prev, [row.rezervace]: json.predano ?? null }));
    setDotazPredani(null);
    return true;
  }

  /** Příplatek (když je) a hned okno kam poslat. Předání se zapíše až volbou kanálu. */
  async function poPriplatkuOtevriKartu(row: PrehledRadek, priplatekCastka: number) {
    if (Number.isFinite(priplatekCastka) && priplatekCastka >= 0) {
      const uloz = await ulozPriplatek(row, String(Math.round(priplatekCastka)));
      if (!uloz.ok) {
        setHlaska('Příplatek se neuložil.');
        return;
      }
    }
    setDotazPredani(null);
    void otevriOknoKarty(row);
  }

  /** Okno: kam poslat kartu. Volba kanálu = předání + odkaz. Text zprávy uvidíte až ve WhatsAppu. */
  async function otevriOknoKarty(row: PrehledRadek) {
    setHlaska('');
    setDotazBezKarty(null);
    setCekam(`${row.rezervace}:klub-karta`);
    try {
      if (ukazka) {
        /**
         * Zkouška Poslat kartu: Booking/Airbnb → karta po ubytování (Host 5 %),
         * přímý → Karel Věrný. Odkaz na stejný origin (localhost:3001).
         */
        const booking = jeBookingZdroj(row.zdroj, row.email);
        const base = window.location.origin.replace(/\/$/, '');
        const odkaz = booking
          ? `${base}/klub?k=test-anna-booking-po-ubytovani`
          : `${base}/klub?k=test-karel-verny`;
        const jmeno = (row.jmeno || '').trim() || (booking ? 'Anna Svobodová' : 'Karel Věrný');
        const krestni = jmeno.split(/\s+/)[0] || (booking ? 'Anna' : 'Karel');
        const text = booking
          ? `Dobrý den, ${krestni}, vítejte u nás. Tady je vaše karta VIVIEN Clubu – najdete v ní průvodce a slevu 5 % na příští pobyt, když rezervujete napřímo: ${odkaz}`
          : `Dobrý den, ${krestni}, vítejte u nás. Tady je karta VIVIEN Clubu s průvodcem: ${odkaz}`;
        setOknoKarty({
          rezervace: row.rezervace,
          jmeno,
          odkaz,
          zprava: text,
          email: 'info@vivienapartments.cz',
          emailRelay: false,
          emailPoznamka: booking ? 'zkouška Booking' : 'zkouška',
          telefonWa: '420777702272',
          emailOdeslan: false,
          predana: row.kartaPredana,
          testRezim: true,
        });
        return;
      }
      const res = await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace: row.rezervace, akce: 'klub-karta-pripravit' }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        jmeno?: string;
        odkaz?: string;
        zprava?: string;
        email?: string | null;
        emailRelay?: boolean;
        emailPoznamka?: string | null;
        telefonWa?: string | null;
        kartaPredana?: { kdy: string; kanaly: ('email' | 'whatsapp' | 'sms' | 'kopie')[] } | null;
        testRezim?: boolean;
      } | null;
      if (!res.ok || !json?.ok || !json.odkaz || !json.zprava) {
        setHlaska(json?.error || 'Kartu se nepodařilo připravit.');
        return;
      }
      setOknoKarty({
        rezervace: row.rezervace,
        jmeno: json.jmeno || row.jmeno || 'Host',
        odkaz: json.odkaz,
        zprava: json.zprava,
        email: json.email || null,
        emailRelay: Boolean(json.emailRelay),
        emailPoznamka: json.emailPoznamka || null,
        telefonWa: json.telefonWa || null,
        emailOdeslan: false,
        predana: json.kartaPredana || row.kartaPredana,
        testRezim: Boolean(json.testRezim),
      });
    } finally {
      setCekam(null);
    }
  }

  /** Ubytovat bez poslání karty (příjezd). */
  async function predaniBezKarty(row: PrehledRadek) {
    if (!predanoRadku(row)) {
      const ok = await ulozPredani(row, true);
      if (!ok) return;
      otevriKartu(row.rezervace);
    }
    setOknoKarty(null);
    setDotazBezKarty(null);
  }

  function zavriOknoKarty(row: PrehledRadek) {
    if (!predanoRadku(row) && !row.kartaPredana) {
      setOknoKarty(null);
      setDotazBezKarty(row.rezervace);
      return;
    }
    setOknoKarty(null);
  }

  async function kanalKarty(
    row: PrehledRadek,
    kanal: 'email' | 'whatsapp' | 'sms' | 'kopie',
    hotove?: { odkaz: string; zprava: string; telefonWa: string | null },
  ) {
    const odkaz = hotove?.odkaz || oknoKarty?.odkaz || '';
    const zprava = hotove?.zprava || oknoKarty?.zprava || '';
    const telefonWa = hotove?.telefonWa ?? oknoKarty?.telefonWa ?? null;

    /** Volba kanálu = Ano, předat (když ještě není předáno). */
    if (!predanoRadku(row)) {
      const ok = await ulozPredani(row, true);
      if (!ok) return;
      otevriKartu(row.rezervace);
    }

    if (ukazka) {
      const telZkouska = '420777702272';
      const emailZkouska = 'info@vivienapartments.cz';
      if (kanal === 'whatsapp') {
        window.open(odkazWhatsAppPrehled(telZkouska, zprava, navigator.userAgent), '_blank');
      } else if (kanal === 'sms') {
        window.location.href = smsOdkaz(`+${telZkouska}`, zprava, jeIos(navigator.userAgent));
      } else if (kanal === 'kopie' && odkaz) {
        try {
          await navigator.clipboard.writeText(odkaz);
        } catch {
          /* ignore */
        }
      } else if (kanal === 'email') {
        const mailto = `mailto:${encodeURIComponent(emailZkouska)}?subject=${encodeURIComponent('VIVIEN Club')}&body=${encodeURIComponent(zprava)}`;
        window.location.href = mailto;
      }
      const kdy = new Date().toISOString();
      setRadky((prev) =>
        prev.map((r) =>
          r.rezervace === row.rezervace
            ? {
                ...r,
                kartaPredana: {
                  kdy,
                  kanaly: [...new Set([...(r.kartaPredana?.kanaly || []), kanal])],
                },
              }
            : r,
        ),
      );
      setOknoKarty(null);
      return;
    }

    setCekam(`${row.rezervace}:klub-${kanal}`);
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'klub-poslat-kartu', kanal }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      mailto?: string | null;
      emailOdeslan?: boolean;
      telefonWa?: string | null;
      zprava?: string;
      odkaz?: string;
      kartaPredana?: { kdy: string; kanaly: ('email' | 'whatsapp' | 'sms' | 'kopie')[] };
    } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Odeslání karty se nepovedlo.');
      return;
    }
    if (kanal === 'whatsapp' && (json.telefonWa || telefonWa)) {
      window.open(
        odkazWhatsAppPrehled(json.telefonWa || telefonWa!, json.zprava || zprava, navigator.userAgent),
        '_blank',
      );
    } else if (kanal === 'sms' && (json.telefonWa || telefonWa)) {
      window.location.href = smsOdkaz(
        `+${json.telefonWa || telefonWa}`,
        json.zprava || zprava,
        jeIos(navigator.userAgent),
      );
    } else if (kanal === 'kopie' && (json.odkaz || odkaz)) {
      try {
        await navigator.clipboard.writeText(json.odkaz || odkaz);
      } catch {
        /* ignore */
      }
    } else if (kanal === 'email' && json.mailto) {
      window.location.href = json.mailto;
    }
    if (json.kartaPredana) {
      setRadky((prev) =>
        prev.map((r) =>
          r.rezervace === row.rezervace ? { ...r, kartaPredana: json.kartaPredana! } : r,
        ),
      );
    }
    setOknoKarty(null);
  }

  function otevriDotazPredani(row: PrehledRadek) {
    /** Ukázka: rovnou Poslat kartu (bez večerního příplatku), ať jde vyzkoušet Booking. */
    if (ukazka) {
      void otevriOknoKarty(row);
      return;
    }
    const casNaMiste = naMisteRadku(row) ? hodinaPraha(naMisteRadku(row)!) : null;
    const casTed = hodinaPraha(new Date().toISOString());
    const dotaz = dotazPriplatkuPriPredani({
      casTed,
      casNaMiste,
      rucni: priplatekRadku(row),
    });
    if (!dotaz.ptat) {
      /** Rovnou kam poslat. Volba kanálu = Ano, předat. */
      void otevriOknoKarty(row);
      return;
    }
    setDotazPredani({
      id: row.rezervace,
      druh: 'predano-priplatek',
      cas: dotaz.cas,
      navrhKc: dotaz.kc,
      stavPriplatku: dotaz.stav,
      krok: 'volba',
      vlastni: '',
    });
  }

  async function ulozCheckinNeni(row: PrehledRadek, zapnout: boolean) {
    if (ukazka) {
      setRadky((prev) =>
        prev.map((r) => (r.rezervace === row.rezervace ? { ...r, checkinNeniPotreba: zapnout } : r)),
      );
      return;
    }
    setCekam(`${row.rezervace}:checkin-neni`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rezervace: row.rezervace,
        akce: 'checkin-neni',
        stav: zapnout ? 'ano' : 'ne',
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      checkinNeniPotreba?: boolean;
      stav?: PrehledRadek['stav'];
    } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Neuložilo se.');
      return;
    }
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              checkinNeniPotreba: json.checkinNeniPotreba === true,
              ...(json.stav ? { stav: json.stav } : {}),
            }
          : r,
      ),
    );
  }

  async function ulozBezMarketingu(row: PrehledRadek, zapnout: boolean) {
    if (ukazka) {
      setRadky((prev) =>
        prev.map((r) => (r.rezervace === row.rezervace ? { ...r, bezMarketingu: zapnout } : r)),
      );
      return;
    }
    setCekam(`${row.rezervace}:bez-marketingu`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rezervace: row.rezervace,
        akce: 'bez-marketingu',
        stav: zapnout ? 'ano' : 'ne',
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      bezMarketingu?: boolean;
    } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Neuložilo se.');
      return;
    }
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? { ...r, bezMarketingu: json.bezMarketingu === true }
          : r,
      ),
    );
  }

  async function ulozNedojezd(row: PrehledRadek, zapnout: boolean) {
    setDotazPredani(null);
    if (ukazka) {
      setRadky((prev) =>
        prev.map((r) =>
          r.rezervace === row.rezervace
            ? { ...r, nedojezdKdy: zapnout ? new Date().toISOString() : null }
            : r,
        ),
      );
      return;
    }
    setCekam(`${row.rezervace}:nedojezd`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rezervace: row.rezervace,
        akce: zapnout ? 'nedojezd' : 'zrusit-nedojezd',
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      nedojezdKdy?: string | null;
    } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Neuložilo se.');
      return;
    }
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace ? { ...r, nedojezdKdy: json.nedojezdKdy || null } : r,
      ),
    );
  }

  async function ulozMena(row: PrehledRadek, mena: MenaPlateb) {
    if (ukazka) {
      setRadky((prev) => prev.map((r) => (r.rezervace === row.rezervace ? { ...r, mena } : r)));
      return;
    }
    setCekam(`${row.rezervace}:mena`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'mena', stav: mena }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      mena?: MenaPlateb;
    } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Měna se neuložila.');
      return;
    }
    setRadky((prev) =>
      prev.map((r) => (r.rezervace === row.rezervace ? { ...r, mena: json.mena || mena } : r)),
    );
  }

  async function ulozPotvrzeniPrijezdu(row: PrehledRadek, druh: 'osobne' | 'telefon') {
    if (ukazka) {
      const ted = new Date().toISOString();
      setPotvrzeniRozbal((prev) => ({ ...prev, [`${row.rezervace}:prijezd`]: false }));
      setRadky((prev) =>
        prev.map((r) =>
          r.rezervace === row.rezervace
            ? { ...r, potvrzeniPrijezdu: druh, potvrzeniPrijezduKdy: ted, zpravaCasPrectena: null }
            : r,
        ),
      );
      return;
    }
    setCekam(`${row.rezervace}:potvrzeni-prijezdu`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'potvrzeni-prijezdu', druh }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      potvrzeniPrijezdu?: 'osobne' | 'telefon';
      potvrzeniPrijezduKdy?: string;
    } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Potvrzení se neuložilo.');
      return;
    }
    setPotvrzeniRozbal((prev) => ({ ...prev, [`${row.rezervace}:prijezd`]: false }));
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              potvrzeniPrijezdu: json.potvrzeniPrijezdu || druh,
              potvrzeniPrijezduKdy: json.potvrzeniPrijezduKdy || new Date().toISOString(),
              zpravaCasPrectena: null,
            }
          : r,
      ),
    );
  }

  async function ulozPotvrzeniOdjezdu(row: PrehledRadek, druh: 'osobne' | 'telefon') {
    if (ukazka) {
      const ted = new Date().toISOString();
      setPotvrzeniRozbal((prev) => ({ ...prev, [`${row.rezervace}:odjezd`]: false }));
      setRadky((prev) =>
        prev.map((r) =>
          r.rezervace === row.rezervace
            ? {
                ...r,
                potvrzeniOdjezdu: druh,
                potvrzeniOdjezduKdy: ted,
                zpravaOdjezdPrectena: null,
                zpravaOdjezdPrijatiPrectena: r.zpravaOdjezdPrijatiPrectena || ted,
              }
            : r,
        ),
      );
      return;
    }
    setCekam(`${row.rezervace}:potvrzeni-odjezdu`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'potvrzeni-odjezdu', druh }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      potvrzeniOdjezdu?: 'osobne' | 'telefon';
      potvrzeniOdjezduKdy?: string;
    } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Potvrzení odjezdu se neuložilo.');
      return;
    }
    setPotvrzeniRozbal((prev) => ({ ...prev, [`${row.rezervace}:odjezd`]: false }));
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              potvrzeniOdjezdu: json.potvrzeniOdjezdu || druh,
              potvrzeniOdjezduKdy: json.potvrzeniOdjezduKdy || new Date().toISOString(),
              zpravaOdjezdPrectena: null,
            }
          : r,
      ),
    );
  }

  async function ulozBranaOkKarty(row: PrehledRadek) {
    if (ukazka) {
      const ted = new Date().toISOString();
      setRadky((prev) =>
        prev.map((r) =>
          r.rezervace === row.rezervace
            ? {
                ...r,
                branaRegistrovano: ted,
                zpravaBranaOdeslana: ted,
                zpravaBranaPrectena: null,
              }
            : r,
        ),
      );
      return;
    }
    setCekam(`${row.rezervace}:brana`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'brana' }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      branaRegistrovano?: string;
      zpravaBranaOdeslana?: string;
    } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Brána se neuložila.');
      return;
    }
    const ted = json.branaRegistrovano || new Date().toISOString();
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              branaRegistrovano: ted,
              zpravaBranaOdeslana: json.zpravaBranaOdeslana || ted,
              zpravaBranaPrectena: null,
            }
          : r,
      ),
    );
  }

  function zavadyRadku(row: PrehledRadek): PrehledRadek['zavadyPredani'] {
    return Object.prototype.hasOwnProperty.call(zavadyStav, row.rezervace)
      ? zavadyStav[row.rezervace]
      : row.zavadyPredani;
  }

  function zavadyPoOdjezduRadku(row: PrehledRadek): PrehledRadek['zavadyPoOdjezdu'] {
    return Object.prototype.hasOwnProperty.call(zavadyPoOdjezduStav, row.rezervace)
      ? zavadyPoOdjezduStav[row.rezervace]
      : row.zavadyPoOdjezdu;
  }

  async function ulozZavadyPredani(row: PrehledRadek) {
    const text = textZavad.trim();
    if (!text) {
      setHlaska('Napište, co není v pořádku.');
      return;
    }
    const kdo: KdoZavad = kdoZNazvuTelefonu(nactiNazevPush() || kdoKouka);
    if (ukazka) {
      const kdy = new Date().toISOString();
      setZavadyStav((prev) => ({
        ...prev,
        [row.rezervace]: { text, kdy, kdo, odeslanoKdy: null, potvrzenoKdy: null },
      }));
      setDotazZavady(null);
      setTextZavad('');
      return;
    }
    setCekam(`${row.rezervace}:zavady`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'zavady', text, kdo }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      zavadyPredani?: PrehledRadek['zavadyPredani'];
    } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Závady se neuložily.');
      return;
    }
    setZavadyStav((prev) => ({ ...prev, [row.rezervace]: json.zavadyPredani ?? null }));
    setDotazZavady(null);
    setTextZavad('');
  }

  async function posliZavadyPredani(row: PrehledRadek) {
    setDotazOdeslatZavady(null);
    if (ukazka) {
      const z = zavadyRadku(row);
      if (z) {
        setZavadyStav((prev) => ({
          ...prev,
          [row.rezervace]: { ...z, odeslanoKdy: new Date().toISOString() },
        }));
      }
      setHlaska('V náhledu se e-mail neposílá.');
      return;
    }
    setCekam(`${row.rezervace}:zavady-odeslat`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'zavady-odeslat' }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      zavadyPredani?: PrehledRadek['zavadyPredani'];
    } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'E-mail se nepodařilo odeslat.');
      return;
    }
    setZavadyStav((prev) => ({ ...prev, [row.rezervace]: json.zavadyPredani ?? null }));
  }

  async function posliZavadyPoOdjezdu(row: PrehledRadek) {
    setDotazOdeslatPoOdjezdu(null);
    if (ukazka) {
      const z = zavadyPoOdjezduRadku(row);
      if (z) {
        setZavadyPoOdjezduStav((prev) => ({
          ...prev,
          [row.rezervace]: { ...z, odeslanoKdy: new Date().toISOString() },
        }));
      }
      setHlaska('V náhledu se e-mail neposílá.');
      return;
    }
    setCekam(`${row.rezervace}:zavady-po-odjezdu-odeslat`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'zavady-po-odjezdu-odeslat' }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      zavadyPoOdjezdu?: PrehledRadek['zavadyPoOdjezdu'];
    } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'E-mail se nepodařilo odeslat.');
      return;
    }
    setZavadyPoOdjezduStav((prev) => ({ ...prev, [row.rezervace]: json.zavadyPoOdjezdu ?? null }));
  }

  function otevriNovouRezervaci(zHosta?: PrehledRadek | null) {
    setPotvrdPrekryv(false);
    setNovaRezervace({
      jmeno: zHosta?.jmeno && zHosta.jmeno !== STARY_ZAZNAM ? zHosta.jmeno : '',
      telefon: zHosta?.telefonText || '',
      email: zHosta?.email?.includes('@') ? zHosta.email : '',
      narodnost: zHosta?.narodnost || '',
      jazyk: (zHosta?.jazyk as GuideLang) || 'cs',
    });
    otevriZalozku('hledat');
  }

  async function ulozNovouRezervaci(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ukazka) {
      setHlaska('V náhledu se rezervace neukládá.');
      return;
    }
    const data = new FormData(event.currentTarget);
    setCekam('pridat');
    setHlaska('');
    const res = await fetch('/api/prehled/pridat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jmeno: String(data.get('jmeno') || ''),
        telefon: String(data.get('telefon') || ''),
        email: String(data.get('email') || ''),
        apartman: String(data.get('apartman') || ''),
        prijezd: String(data.get('prijezd') || ''),
        odjezd: String(data.get('odjezd') || ''),
        osob: String(data.get('osob') || ''),
        pin: String(data.get('pin') || ''),
        narodnost: String(data.get('narodnost') || ''),
        jazyk: String(data.get('jazyk') || ''),
        potvrdPrekryv,
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      rezervace?: string;
      prekryv?: { apartman: string; jmeno: string } | null;
    } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      if (json?.prekryv && !potvrdPrekryv) {
        setPotvrdPrekryv(true);
        setHlaska(json.error || 'Apartmán je v tomto termínu obsazený.');
        return;
      }
      setHlaska(json?.error || 'Rezervace se nepřidala.');
      return;
    }
    setNovaRezervace(null);
    setPotvrdPrekryv(false);
    if (json.rezervace) {
      window.location.href = `/prehled#${json.rezervace}`;
      window.location.reload();
      return;
    }
    window.location.reload();
  }

  function telefonPole(row: PrehledRadek) {
    return (
      <>
        <PoleSUlozenim
          key={`${row.rezervace}-telefon`}
          label="Telefon"
          hodnota={telefonRadku(row)}
          vstup={{ type: 'tel', inputMode: 'tel', autoComplete: 'tel' }}
          onUloz={(text) => ulozTelefon(row, row.telefonKtery || 'rezervace', text)}
        />
        {row.telefonNejisty ? (
          <div className="ph-predvolba">
            Doplňte předvolbu, např. <span className="ph-tel">+34&nbsp;612&nbsp;345&nbsp;678</span>
          </div>
        ) : null}
      </>
    );
  }

  function kontaktUlozenKdy(row: PrehledRadek): string | null {
    if (Object.prototype.hasOwnProperty.call(kontaktUlozen, row.rezervace)) {
      return kontaktUlozen[row.rezervace] || null;
    }
    return row.kontaktUlozenKdy || null;
  }

  function oznacKontaktUlozen(row: PrehledRadek) {
    if (kontaktUlozenKdy(row)) return;
    const cas = new Date().toISOString();
    setKontaktUlozen((prev) => ({ ...prev, [row.rezervace]: cas }));
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              kontaktUlozenKdy: cas,
              historie: [...r.historie, { cas, co: 'Kontakt uložen do telefonu' }],
            }
          : r,
      ),
    );
  }

  function jeRozbaleno(row: PrehledRadek): boolean {
    return rozbalene[row.rezervace] === true;
  }

  useEffect(() => {
    const max = posunDen(dnes, 7);
    setVybranyDen((prev) => (prev < dnes || prev > max ? dnes : prev));
  }, [dnes]);

  const dnyNahled = useMemo(
    () => dnyVyberu(dnes).map((d) => nahledDne(radky, d, dnes, casy)),
    [radky, dnes, casy],
  );
  const vybranySouhrn = useMemo(
    () => souhrnDne(radky, vybranyDen, casy),
    [radky, vybranyDen, casy],
  );
  const automatVarovani = useMemo(
    () => textAutomatNebezi(posledniBehCas),
    [posledniBehCas],
  );

  const viditelne = useMemo(() => {
    return radky.filter((row) => {
      if (row.nelzeNacist) return false;
      if (row.prijezd !== vybranyDen) return false;
      if (jeBezDalsichAkci(row) && stav !== 'zruseno') return false;
      if (stav && row.stav !== stav) return false;
      return true;
    });
  }, [radky, stav, vybranyDen]);

  const poctyDoplnit = useMemo(() => {
    const sUrl = radky.map((r) => ({
      ...r,
      checkinUrl: (odkazy[r.rezervace] ?? r.checkinUrl ?? '').trim() || null,
    }));
    return poctyStitkuDoplnit(sUrl, dnes);
  }, [radky, odkazy, dnes]);

  function otevriStitekDoplnit(f: FiltrDoplnit) {
    setFiltrDoplnit(f);
    setOtevriDoplnitSignal((n) => n + 1);
    requestAnimationFrame(() => {
      document.getElementById('ph-co-doplnit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function otevriZpravuHosta(id: string, prefer?: string) {
    const row = radky.find((r) => r.rezervace === id);
    if (!row) return;
    const menu = zpravyRadku(row);
    const zvol =
      (prefer && menu.some((z) => z.id === prefer) ? prefer : null) ||
      menu.find((z) => z.vychozi)?.id ||
      menu[0]?.id ||
      prefer ||
      'checkin';
    otevriKartu(id);
    setVolba((prev) => ({ ...prev, [id]: zvol }));
    setPanelZpravy((prev) => ({ ...prev, [id]: true }));
  }

  function otevriDen(den: string) {
    setPohledDomu(false);
    setVybranyDen(den);
    otevriZalozku('prijezdy');
  }

  function otevriPohodu() {
    setPohledDomu(true);
    setPohodaOtevreno(true);
    otevriZalozku('prijezdy');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          document.getElementById('pohoda')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          /* scroll */
        }
      });
    });
  }

  function otevriPodekovani() {
    setPohledDomu(true);
    setPodekovaniOtevreno(true);
    otevriZalozku('prijezdy');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          document.getElementById('podekovani')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          /* scroll */
        }
      });
    });
  }

  function otevriShrnuti() {
    setPohledDomu(true);
    setShrnutiOtevreno(true);
    otevriZalozku('prijezdy');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          document.getElementById('vse-pripraveno')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          /* scroll */
        }
      });
    });
  }

  function shrnutiVstupRadku(row: PrehledRadek): ShrnutiVstup {
    return {
      stav: row.stav,
      nedojezdKdy: row.nedojezdKdy,
      predano: row.predano,
      prijezd: row.prijezd,
      checkinNeniPotreba: row.checkinNeniPotreba,
      casPrijezdu: row.casPrijezdu,
      zpusobPrijezdu: row.zpusobPrijezdu,
      souhlasPravidel: row.souhlas,
      zadostPrijezd: row.zadostPrijezd,
      zadostPozdniPrijezd: row.zadostPozdniPrijezd,
      telefonBrana: row.telefonBrana,
      branaRegistrovano: row.branaRegistrovano,
      apartman: row.apartman as ShrnutiVstup['apartman'],
      shrnutiKdy: row.shrnutiKdy,
      shrnutiOtisk: row.shrnutiOtisk,
      jazyk: jazykRadku(row),
    };
  }

  function otevriZitraOdjezdy() {
    setPohledDomu(true);
    setZitraOtevreno(true);
    otevriZalozku('prijezdy');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          document.getElementById('odjezdy-zitra')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          /* scroll */
        }
      });
    });
  }

  function hostOdjezdu(row: PrehledRadek) {
    return {
      odjezd: row.odjezd,
      casOdjezdu: casOdjezduRadku(row),
      prevzatoKdy: row.prevzatoKdy || null,
      stav: row.stav,
      nedojezdKdy: row.nedojezdKdy || null,
    };
  }

  function kcDluhu(row: PrehledRadek): number {
    const platbyRadku = row.platby || [];
    if (row.zaplaceno && platbyRadku.length === 0) return 0;
    return (row.dluhPolozky || []).filter((p) => !platbyRadku.some((x) => x.druh === p.druh)).reduce((s, p) => s + p.kc, 0);
  }

  function patriDoDluhu(row: PrehledRadek): boolean {
    return !row.nelzeNacist && jeVNedoplatcich({ prijezd: row.prijezd, odjezd: row.odjezd, stav: row.stav }, dnes) && kcDluhu(row) > 0;
  }

  function otiskZalozky(z: Zalozka): string {
    const ted = new Date();
    if (z === 'dluhy') {
      return otisk(radky.filter((r) => patriDoDluhu(r)).map((r) => ({ id: r.rezervace, kc: kcDluhu(r) })));
    }
    if (z === 'prijezdy') {
      return otisk(
        radky
          .filter(
            (r) =>
              r.prijezd === dnes &&
              !jeBezDalsichAkci(r) &&
              !jeHostOdjetly(hostOdjezdu(r), dnes, ted),
          )
          .map((r) => ({ id: r.rezervace, kc: 0 })),
      );
    }
    return '';
  }

  function otevriZalozku(z: Zalozka, ulozene = videne) {
    setZalozka(z);
    const dalsi = { ...(ulozene || {}), [kdoKouka]: { ...(ulozene?.[kdoKouka] || {}), [z]: otiskZalozky(z) } };
    setVidene(dalsi);
    try {
      localStorage.setItem('vivien-zalozka', JSON.stringify({ den: dnes, zalozka: z }));
      localStorage.setItem('vivien-videno', JSON.stringify(dalsi));
    } catch {
      /* prohlížeč paměť nemá */
    }
  }

  useEffect(() => {
    if (zalozkaNactena.current) return;
    zalozkaNactena.current = true;
    let ulozena: { den: string; zalozka: string } | null = null;
    let nactene: Record<string, Record<string, string>> = {};
    let kdo: 'pravoslav' | 'nikol' = 'pravoslav';
    try {
      const raw = localStorage.getItem('vivien-zalozka');
      if (raw) ulozena = JSON.parse(raw) as { den: string; zalozka: string };
      const pushNazev = nactiNazevPush();
      if (pushNazev) kdo = pushNazev.toLowerCase().includes('nikol') ? 'nikol' : 'pravoslav';
      else {
        const ulozenyKdo = localStorage.getItem('vivien-kdo');
        if (ulozenyKdo === 'nikol' || ulozenyKdo === 'pravoslav') kdo = ulozenyKdo;
      }
      const v = localStorage.getItem('vivien-videno');
      if (v) nactene = JSON.parse(v) as Record<string, Record<string, string>>;
    } catch {
      nactene = {};
    }
    setKdoKouka(kdo);
    const z = vychoziZalozka(ulozena, dnes, new URLSearchParams(window.location.search).get('zalozka'));
    setVidene(nactene);
    setZalozka(z);
    const dalsi = { ...nactene, [kdo]: { ...(nactene[kdo] || {}), [z]: otiskZalozky(z) } };
    setVidene(dalsi);
    try {
      localStorage.setItem('vivien-videno', JSON.stringify(dalsi));
    } catch {
      /* prohlížeč paměť nemá */
    }
    // Jednou při otevření. Otisk se pak mění sám, ať číslo zčervená až u nové položky.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dnes]);

  function zapisPlatbyRadku(
    id: string,
    platbyRadku: PlatbaPolozky[],
    zaplaceno: string | null,
    dluh: string,
    polozky?: { druh: DruhDluhu; kc: number; nazev: string }[],
  ) {
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === id
          ? { ...r, platby: platbyRadku, zaplaceno, dluhText: dluh, dluhPolozky: polozky || r.dluhPolozky }
          : r,
      ),
    );
    setPlatby((prev) => ({ ...prev, [id]: { kdy: zaplaceno, kdo: prev[id]?.kdo ?? null } }));
  }

  function poPrevzeti(id: string, kdy: string | null) {
    setRadky((prev) =>
      prev.map((r) => {
        if (r.rezervace !== id) return r;
        const cas = casPrevzetiText(kdy);
        return {
          ...r,
          prevzatoKdy: kdy,
          fazeText: kdy ? `Odjel ${cas || ''}`.trim() : r.fazeText,
          fazeTon: kdy ? 'seda' : r.fazeTon,
        };
      }),
    );
  }

  async function posliEmail(row: PrehledRadek, druh?: string) {
    const zprava = druh ?? volba[row.rezervace] ?? row.zpravy.find((z) => z.vychozi)?.id;
    if (!zprava) return;
    if (ukazka) {
      setDotazEmail(null);
      setDotazOdjezd(null);
      setDotazPohoda(null);
      setDotazPodekovani(null);
      setDotazShrnuti(null);
      if (zprava === 'shrnuti') setPanelShrnutiKarty(null);
      if (zprava === 'odjezd' || zprava === 'pohoda' || zprava === 'podekovani' || zprava === 'shrnuti') {
        const ted = new Date().toISOString();
        setRadky((prev) =>
          prev.map((r) =>
            r.rezervace === row.rezervace
              ? {
                  ...r,
                  odjezdDotaz: zprava === 'odjezd' ? ted : r.odjezdDotaz,
                  pohodaDotaz: zprava === 'pohoda' ? ted : r.pohodaDotaz,
                  podekovaniKdy: zprava === 'podekovani' ? ted : r.podekovaniKdy,
                  podekovaniKanal: zprava === 'podekovani' ? 'email' : r.podekovaniKanal,
                  shrnutiKdy: zprava === 'shrnuti' ? ted : r.shrnutiKdy,
                  shrnutiKanal: zprava === 'shrnuti' ? 'email' : r.shrnutiKanal,
                  shrnutiOtisk: zprava === 'shrnuti' ? otiskShrnuti(r) : r.shrnutiOtisk,
                }
              : r,
          ),
        );
      }
      setHlaska('V náhledu se e-mail neodešle.');
      return;
    }
    setCekam(`${row.rezervace}:email`);
    setHlaska(zprava === 'shrnuti' ? 'Odesílám e-mail se shrnutím…' : 'Odesílám e-mail…');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'email', zprava, jazyk: jazykRadku(row) }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      nazev?: string;
      email?: string;
    } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'E-mail se nepodařilo odeslat.');
      requestAnimationFrame(() => {
        document.getElementById('ph-domu-hlaska')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      return;
    }
    setDotazEmail(null);
    setDotazPohoda(null);
    setDotazPodekovani(null);
    setDotazShrnuti(null);
    const nazev = json.nazev || 'zpráva';
    const kam = (json.email || row.email || '').trim();
    const ted = new Date().toISOString();
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              odjezdDotaz: zprava === 'odjezd' ? ted : r.odjezdDotaz,
              pohodaDotaz: zprava === 'pohoda' ? ted : r.pohodaDotaz,
              podekovaniKdy: zprava === 'podekovani' ? ted : r.podekovaniKdy,
              podekovaniKanal: zprava === 'podekovani' ? 'email' : r.podekovaniKanal,
              shrnutiKdy: zprava === 'shrnuti' ? ted : r.shrnutiKdy,
              shrnutiKanal: zprava === 'shrnuti' ? 'email' : r.shrnutiKanal,
              shrnutiOtisk: zprava === 'shrnuti' ? otiskShrnuti(r) : r.shrnutiOtisk,
              historie: [
                ...r.historie,
                { cas: ted, co: kam ? `E-mailem: ${nazev} → ${kam}` : `E-mailem: ${nazev}` },
              ].slice(-40),
            }
          : r,
      ),
    );
    if (zprava === 'shrnuti') setPanelShrnutiKarty(null);
    setHlaska(
      kam
        ? `E-mail „${nazev}“ je odeslaný na ${kam}. Kopie na info@vivienapartments.cz.`
        : `E-mail „${nazev}“ je odeslaný. Kopie na info@vivienapartments.cz.`,
    );
    requestAnimationFrame(() => {
      document.getElementById('ph-domu-hlaska')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  async function volat(
    row: PrehledRadek,
    akce: 'znovu' | 'odkaz' | 'opravit' | 'brana' | 'odemknout',
    extra?: Record<string, string>,
  ) {
    setCekam(`${row.rezervace}:${akce}`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce, ...extra }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; url?: string } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Akce se nepovedla.');
      return;
    }
    if (akce === 'odkaz' && json.url) {
      try {
        await navigator.clipboard.writeText(json.url);
        setHlaska(`Odkaz pro #${row.rezervace} je ve schránce.`);
      } catch {
        setHlaska(json.url);
      }
      return;
    }
    window.location.reload();
  }

  async function oknoAkce(
    row: PrehledRadek,
    akce: 'potvrdit-prijezd' | 'nelze-prijezd' | 'potvrdit-odjezd' | 'nelze-odjezd',
    presto = false,
    rozlouceni?: 'osobne' | 'telefon',
  ) {
    const klic = `${row.rezervace}:${akce}`;
    if (ukazka) {
      const ted = new Date().toISOString();
      setOknoHotovo((stav) => ({ ...stav, [klic]: true }));
      setDotazPrestoPrijezd(null);
      if (akce === 'potvrdit-odjezd') {
        const casZadost = row.zadostOdjezd?.cas || casOdjezduRadku(row);
        setRadky((prev) =>
          prev.map((r) =>
            r.rezervace === row.rezervace
              ? {
                  ...r,
                  zadostOdjezd: r.zadostOdjezd
                    ? { ...r.zadostOdjezd, stav: 'potvrzeno', kdy: ted, drziPotvrzeni: null }
                    : r.zadostOdjezd,
                  casOdjezdu: casZadost || r.casOdjezdu,
                  ...(rozlouceni
                    ? {
                        potvrzeniOdjezdu: rozlouceni,
                        potvrzeniOdjezduKdy: ted,
                        zpravaOdjezdPrectena: null,
                        zpravaOdjezdPrijatiPrectena: r.zpravaOdjezdPrijatiPrectena || ted,
                      }
                    : {
                        potvrzeniOdjezdu: null,
                        potvrzeniOdjezduKdy: null,
                      }),
                }
              : r,
          ),
        );
      } else if (akce === 'nelze-odjezd' && row.zadostOdjezd) {
        setRadky((prev) =>
          prev.map((r) =>
            r.rezervace === row.rezervace && r.zadostOdjezd
              ? { ...r, zadostOdjezd: { ...r.zadostOdjezd, stav: 'nelze', kdy: ted } }
              : r,
          ),
        );
      }
      return;
    }
    setCekam(klic);
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rezervace: row.rezervace,
        akce,
        ...(presto ? { presto: true } : {}),
        ...(akce === 'potvrdit-odjezd' && rozlouceni ? { druh: rozlouceni } : {}),
      }),
    });
    setCekam(null);
    if (res.status === 409 && akce === 'potvrdit-prijezd') {
      setDotazPrestoPrijezd(row.rezervace);
      return;
    }
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      setHlaska(json?.error || 'Akce se nepovedla.');
      return;
    }
    setDotazPrestoPrijezd(null);
    if (akce === 'potvrdit-odjezd') {
      const json = (await res.json().catch(() => null)) as {
        odjezdSchvaleno?: {
          cas: string;
          kc: number;
          kanal: 'whatsapp' | 'pruvodce' | 'sms' | null;
          jazyk: GuideLang | null;
          telefonWa: string | null;
          telefon: string | null;
        } | null;
      } | null;
      const schv = json?.odjezdSchvaleno;
      if (schv?.kanal === 'whatsapp' && schv.telefonWa) {
        const text = textSchvaleniOdjezduOdeslat(schv.cas, schv.kc, schv.jazyk);
        window.open(odkazWhatsAppPrehled(schv.telefonWa, text, navigator.userAgent), '_blank');
      } else if (schv?.kanal === 'sms' && schv.telefon) {
        const text = textSchvaleniOdjezduOdeslat(schv.cas, schv.kc, schv.jazyk);
        window.location.href = smsOdkaz(schv.telefon, text, jeIos(navigator.userAgent));
      }
    }
    window.location.reload();
  }

  /** Domů: Osobně / Sami / Nelze bez otevírání karty. */
  async function schvalOdjezdZDomu(row: PrehledRadek, volba: 'osobne' | 'telefon' | 'nelze') {
    if (row.zadostOdjezd?.stav === 'ceka') {
      if (volba === 'nelze') {
        await oknoAkce(row, 'nelze-odjezd');
        return;
      }
      await oknoAkce(row, 'potvrdit-odjezd', false, volba);
      return;
    }
    if (volba === 'nelze') return;
    await ulozPotvrzeniOdjezdu(row, volba);
  }

  async function potvrdPozniPrijezd(row: PrehledRadek) {
    const klic = `${row.rezervace}:potvrdit-pozni-prijezd`;
    if (ukazka) {
      setOknoHotovo((stav) => ({ ...stav, [klic]: true }));
      return;
    }
    setCekam(klic);
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'potvrdit-pozni-prijezd' }),
    });
    setCekam(null);
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      setHlaska(json?.error || 'Potvrzení se nepovedlo.');
      return;
    }
    window.location.reload();
  }

  async function odmitniPozniPrijezd(row: PrehledRadek) {
    const zprava = (pozniOdmitnuti[row.rezervace] || '').trim();
    if (!zprava) {
      setHlaska('Napište hostovi, proč to nejde nebo jaký čas nabízíte.');
      return;
    }
    const klic = `${row.rezervace}:nelze-pozni-prijezd`;
    if (ukazka) {
      setOknoHotovo((stav) => ({ ...stav, [klic]: true }));
      setPozniOdmitnoutOtevreno(null);
      return;
    }
    setCekam(klic);
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'nelze-pozni-prijezd', zprava }),
    });
    setCekam(null);
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      setHlaska(json?.error || 'Odmítnutí se nepovedlo.');
      return;
    }
    setPozniOdmitnoutOtevreno(null);
    window.location.reload();
  }

  async function ulozIndividualniPozni(row: PrehledRadek) {
    const formular = pozniIndividualni[row.rezervace] || { cas: '', kc: '0' };
    const cas = formular.cas.trim();
    const kc = formular.kc.trim();
    if (!cas) {
      setHlaska('Zadejte čas individuálního příjezdu.');
      return;
    }
    const klic = `${row.rezervace}:individualni-pozni-prijezd`;
    if (ukazka) {
      setOknoHotovo((stav) => ({ ...stav, [klic]: true }));
      return;
    }
    setCekam(klic);
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'individualni-pozni-prijezd', cas, kc }),
    });
    setCekam(null);
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      setHlaska(json?.error || 'Individuální příjezd se neuložil.');
      return;
    }
    window.location.reload();
  }

  async function ulozCas(row: PrehledRadek, hodnota: string): Promise<{ ok: boolean; hodnota?: string }> {
    const surovy = hodnota.trim();
    const poDvacate = surovy === 'po20' || /^po\s*20/i.test(surovy);
    const vysledek = poDvacate ? { ok: true as const, cas: 'po20' } : normalizujCasPrijezdu(hodnota);
    if (!vysledek.ok) return { ok: false };
    const cas = vysledek.cas === 'po20' ? 'po 20:00' : vysledek.cas ?? '';
    const odeslat = vysledek.cas === 'po20' ? 'po20' : cas;
    if (ukazka) {
      setCasy((prev) => ({ ...prev, [row.rezervace]: cas }));
      return { ok: true, hodnota: cas };
    }
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'cas', cas: odeslat }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; hodnota?: string } | null;
    if (!res.ok || !json?.ok) return { ok: false };
    const hotovo = json.hodnota ?? cas;
    setCasy((prev) => ({ ...prev, [row.rezervace]: hotovo }));
    return { ok: true, hodnota: hotovo };
  }

  async function ulozOdjezd(row: PrehledRadek, hodnota: string): Promise<{ ok: boolean; hodnota?: string }> {
    const vysledek = normalizujCasPrijezdu(hodnota);
    if (!vysledek.ok) return { ok: false };
    const cas = vysledek.cas ?? '';
    if (ukazka) {
      setCasyOdjezdu((prev) => ({ ...prev, [row.rezervace]: cas }));
      return { ok: true, hodnota: cas };
    }
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'cas-odjezdu', cas }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; hodnota?: string } | null;
    if (!res.ok || !json?.ok) return { ok: false };
    const hotovo = json.hodnota ?? cas;
    setCasyOdjezdu((prev) => ({ ...prev, [row.rezervace]: hotovo }));
    return { ok: true, hodnota: hotovo };
  }

  async function ulozDenOdjezdu(
    row: PrehledRadek,
    hodnota: string,
  ): Promise<{ ok: boolean; hodnota?: string }> {
    const odjezd = hodnota.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(odjezd)) return { ok: false };
    if (ukazka) {
      setRadky((prev) =>
        prev.map((r) =>
          r.rezervace === row.rezervace
            ? {
                ...r,
                odjezd,
                termin: terminText(r.prijezd, odjezd),
                pobytText: pobytText(r.noci, r.osob),
              }
            : r,
        ),
      );
      return { ok: true, hodnota: odjezd };
    }
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'den-odjezdu', odjezd }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      odjezd?: string;
      noci?: number | null;
      error?: string;
    } | null;
    if (!res.ok || !json?.ok || !json.odjezd) {
      if (json?.error) setHlaska(json.error);
      return { ok: false };
    }
    const noci = json.noci ?? null;
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              odjezd: json.odjezd!,
              noci,
              termin: terminText(r.prijezd, json.odjezd!),
              pobytText: pobytText(noci, r.osob),
              poplatekText: textPoplatku(r.poplatek, noci, r.osob),
            }
          : r,
      ),
    );
    return { ok: true, hodnota: json.odjezd };
  }

  async function ulozDenPrijezdu(
    row: PrehledRadek,
    hodnota: string,
  ): Promise<{ ok: boolean; hodnota?: string }> {
    const prijezd = hodnota.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(prijezd)) return { ok: false };
    if (ukazka) {
      setRadky((prev) =>
        prev.map((r) =>
          r.rezervace === row.rezervace
            ? {
                ...r,
                prijezd,
                termin: terminText(prijezd, r.odjezd),
                pobytText: pobytText(r.noci, r.osob),
              }
            : r,
        ),
      );
      return { ok: true, hodnota: prijezd };
    }
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'den-prijezdu', prijezd }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      prijezd?: string;
      noci?: number | null;
      error?: string;
    } | null;
    if (!res.ok || !json?.ok || !json.prijezd) {
      if (json?.error) setHlaska(json.error);
      return { ok: false };
    }
    const noci = json.noci ?? null;
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              prijezd: json.prijezd!,
              noci,
              termin: terminText(json.prijezd!, r.odjezd),
              pobytText: pobytText(noci, r.osob),
              poplatekText: textPoplatku(r.poplatek, noci, r.osob),
            }
          : r,
      ),
    );
    return { ok: true, hodnota: json.prijezd };
  }

  async function ulozPin(row: PrehledRadek, hodnota: string): Promise<{ ok: boolean; hodnota?: string }> {
    const pin = hodnota.trim();
    if (!pin) return { ok: false };
    if (ukazka) {
      setRadky((prev) =>
        prev.map((r) => (r.rezervace === row.rezervace ? { ...r, accessPin: pin } : r)),
      );
      return { ok: true, hodnota: pin };
    }
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'pin', pin }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      pin?: string;
      error?: string;
    } | null;
    if (!res.ok || !json?.ok || !json.pin) {
      if (json?.error) setHlaska(json.error);
      return { ok: false };
    }
    setRadky((prev) =>
      prev.map((r) => (r.rezervace === row.rezervace ? { ...r, accessPin: json.pin! } : r)),
    );
    return { ok: true, hodnota: json.pin };
  }

  async function ulozUzZaplaceno(
    row: PrehledRadek,
    castka: string,
    text: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const surovy = castka.trim().replace(/\s+/g, '').replace(',', '.');
    let kc = Math.round(Number(surovy));
    if (!Number.isFinite(kc) || kc < 1) {
      return { ok: false, error: 'Napište částku bez mezer (např. 1034 nebo 1034,46).' };
    }
    if (row.mena === 'EUR') {
      kc = Math.round(kc * KURZ_EUR_KC);
    }
    if (ukazka) {
      const zive = polozkyKarty(row);
      let zbyva = kc;
      const nove: PlatbaPolozky[] = [];
      const nezap = zive
        .map((p) => {
          const uz = (row.platby || []).filter((x) => x.druh === p.druh).reduce((s, x) => s + x.kc, 0);
          return { ...p, kc: Math.max(0, p.kc - uz) };
        })
        .filter((p) => p.kc > 0);
      const kdy = new Date().toISOString();
      for (const p of nezap) {
        if (zbyva <= 0) break;
        const cast = Math.min(p.kc, zbyva);
        nove.push({ druh: p.druh, kc: cast, jak: 'prevod', kdo: 'pravoslav', kdy });
        zbyva -= cast;
      }
      if (!nove.length) {
        return {
          ok: false,
          error: 'Na kartě už není otevřený dluh. Cenu na doklad změňte u Faktury (Uložit cenu).',
        };
      }
      const platbyRadku = [...(row.platby || []), ...nove];
      const po = zive
        .map((p) => {
          const uz = platbyRadku.filter((x) => x.druh === p.druh).reduce((s, x) => s + x.kc, 0);
          return { ...p, kc: Math.max(0, p.kc - uz) };
        })
        .filter((p) => p.kc > 0);
      zapisPlatbyRadku(
        row.rezervace,
        platbyRadku,
        po.length ? row.zaplaceno : kdy,
        textRozpisu(po),
        zive,
      );
      return { ok: true };
    }
    setCekam(`${row.rezervace}:uz-zaplaceno`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rezervace: row.rezervace,
        akce: 'uz-zaplaceno',
        castka: String(kc),
        text,
        jak: 'prevod',
        kdo: 'pravoslav',
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      platby?: PlatbaPolozky[];
      zaplaceno?: string | null;
      dluh?: string;
      error?: string;
    } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      const error = json?.error || 'Částku se nepodařilo zapsat.';
      setHlaska(error);
      return { ok: false, error };
    }
    zapisPlatbyRadku(row.rezervace, json.platby || [], json.zaplaceno ?? null, json.dluh || '', polozkyKarty(row));
    return { ok: true };
  }

  async function ulozDohodu(
    row: PrehledRadek,
    castka: string,
    text: string,
  ): Promise<{ ok: boolean; dohodaKc?: number | null; dohodaPoznamka?: string | null }> {
    if (ukazka) {
      const surovy = castka.trim().replace(',', '.');
      const kc = surovy ? Math.round(Number(surovy)) : null;
      const poznamka = text.trim().slice(0, 200) || null;
      if (surovy && (!kc || kc < 1)) return { ok: false };
      setRadky((prev) =>
        prev.map((r) =>
          r.rezervace === row.rezervace
            ? {
                ...r,
                dohodaKc: kc && kc > 0 ? kc : null,
                dohodaPoznamka: kc && kc > 0 ? poznamka : null,
              }
            : r,
        ),
      );
      return {
        ok: true,
        dohodaKc: kc && kc > 0 ? kc : null,
        dohodaPoznamka: kc && kc > 0 ? poznamka : null,
      };
    }
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rezervace: row.rezervace,
        akce: 'dohoda',
        castka,
        text,
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      dohodaKc?: number | null;
      dohodaPoznamka?: string | null;
      error?: string;
    } | null;
    if (!res.ok || !json?.ok) {
      if (json?.error) setHlaska(json.error);
      return { ok: false };
    }
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              dohodaKc: json.dohodaKc ?? null,
              dohodaPoznamka: json.dohodaPoznamka ?? null,
              platby:
                json.dohodaKc == null
                  ? (r.platby || []).filter((p) => p.druh !== 'dohoda')
                  : r.platby,
            }
          : r,
      ),
    );
    return {
      ok: true,
      dohodaKc: json.dohodaKc ?? null,
      dohodaPoznamka: json.dohodaPoznamka ?? null,
    };
  }

  async function oznacDotaz(row: PrehledRadek) {
    const ted = new Date().toISOString();
    if (!ukazka) {
      const res = await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace: row.rezervace, akce: 'odjezd-dotaz' }),
      });
      if (!res.ok) {
        setHlaska('Dotaz se nepodařilo označit.');
        return;
      }
    }
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              odjezdDotaz: ted,
              historie: [...r.historie, { cas: ted, co: 'Dotaz na odjezd na WhatsApp' }].slice(-40),
            }
          : r,
      ),
    );
  }

  async function nactiSchrankuTed() {
    if (nacitamSchranku) return;
    if (ukazka) {
      setHlaska('V ukázce se schránka nečte. Po nasazení to v ostrém přehledu načte maily.');
      return;
    }
    setNacitamSchranku(true);
    setHlaska('Čtu schránku…');
    try {
      const res = await fetch('/api/prehled/nacti-schranku', { method: 'POST' });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; scanned?: number; sent?: number; errors?: number }
        | null;
      if (!res.ok || !json?.ok) {
        setHlaska(json?.error || 'Schránku se nepodařilo načíst.');
        return;
      }
      const casti = [`Hotovo. Nových mailů: ${json.scanned ?? 0}`];
      if (json.sent) casti.push(`odesláno ${json.sent}`);
      if (json.errors) casti.push(`chyb ${json.errors}`);
      setHlaska(casti.join(' · '));
      router.refresh();
    } catch {
      setHlaska('Schránku se nepodařilo načíst.');
    } finally {
      setNacitamSchranku(false);
    }
  }

  async function oznacPohodu(row: PrehledRadek) {
    const ted = new Date().toISOString();
    const znovu = Boolean(row.pohodaDotaz);
    const co = znovu ? 'Je vše v pořádku? znovu na WhatsApp' : 'Je vše v pořádku? na WhatsApp';
    if (!ukazka) {
      const res = await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace: row.rezervace, akce: 'pohoda-dotaz' }),
      });
      if (!res.ok) {
        setHlaska('Dotaz se nepodařilo označit.');
        return;
      }
    }
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              pohodaDotaz: ted,
              historie: [...r.historie, { cas: ted, co }].slice(-40),
            }
          : r,
      ),
    );
  }

  async function oznacPodekovani(row: PrehledRadek, kanal: PodekovaniKanal) {
    const ted = new Date().toISOString();
    const stitek = stitekPodekovaniKanalu(kanal);
    const co = row.podekovaniKdy
      ? `Poděkování odesláno znovu · ${stitek}`
      : `Poděkování odesláno · ${stitek}`;
    if (!ukazka) {
      const res = await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace: row.rezervace, akce: 'podekovani-odeslat', kanal }),
      });
      if (!res.ok) {
        setHlaska('Poděkování se nepodařilo označit.');
        return;
      }
    }
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              podekovaniKdy: ted,
              podekovaniKanal: kanal,
              historie: [...r.historie, { cas: ted, co }].slice(-40),
            }
          : r,
      ),
    );
  }

  async function vratPodekovani(row: PrehledRadek) {
    if (!ukazka) {
      const res = await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace: row.rezervace, akce: 'podekovani-vratit' }),
      });
      if (!res.ok) {
        setHlaska('Vrácení se nepovedlo.');
        return;
      }
    }
    const ted = new Date().toISOString();
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              podekovaniKdy: null,
              podekovaniKanal: null,
              historie: [...r.historie, { cas: ted, co: 'Poděkování vráceno' }].slice(-40),
            }
          : r,
      ),
    );
  }

  function otevriDotazShrnutiEmail(rezervace: string) {
    setDotazShrnuti(rezervace);
    requestAnimationFrame(() => {
      document
        .getElementById(`shrnuti-email-${rezervace}`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  async function oznacShrnuti(row: PrehledRadek, kanal: ShrnutiKanal | 'rucne') {
    const ted = new Date().toISOString();
    const neposilat = kanal === 'neposilat';
    const stitek = kanal === 'rucne' ? 'ručně' : stitekShrnutiKanalu(kanal);
    const co = neposilat
      ? row.shrnutiKdy
        ? 'Shrnutí neposílat (znovu)'
        : 'Shrnutí neposílat'
      : row.shrnutiKdy
        ? `Shrnutí odesláno znovu · ${stitek}`
        : `Shrnutí odesláno · ${stitek}`;
    const akce =
      kanal === 'rucne' ? 'shrnuti-rucne' : neposilat ? 'shrnuti-neposilat' : 'shrnuti-odeslat';
    if (!ukazka) {
      const res = await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rezervace: row.rezervace,
          akce,
          ...(kanal === 'rucne' || neposilat ? {} : { kanal }),
        }),
      });
      if (!res.ok) {
        setHlaska('Shrnutí se nepodařilo označit.');
        return;
      }
    }
    setPanelShrnutiKarty(null);
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              shrnutiKdy: ted,
              shrnutiKanal: kanal === 'rucne' ? null : kanal,
              shrnutiOtisk: otiskShrnuti(r),
              historie: [...r.historie, { cas: ted, co }].slice(-40),
            }
          : r,
      ),
    );
  }

  async function vratShrnuti(row: PrehledRadek) {
    if (!ukazka) {
      const res = await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace: row.rezervace, akce: 'shrnuti-vratit' }),
      });
      if (!res.ok) {
        setHlaska('Vrácení se nepovedlo.');
        return;
      }
    }
    const ted = new Date().toISOString();
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              shrnutiKdy: null,
              shrnutiKanal: null,
              shrnutiOtisk: null,
              historie: [...r.historie, { cas: ted, co: 'Shrnutí vráceno' }].slice(-40),
            }
          : r,
      ),
    );
  }

  function textSmsWaHostovi(
    row: PrehledRadek,
    text: string,
    druhZpravy?: string,
    telefonCil?: string | null,
  ): { ok: true; text: string } | { ok: false; duvod: string } {
    const email = row.email.includes('@') ? row.email : '';
    const id = druhZpravy ?? volba[row.rezervace] ?? '';
    const checkinTel =
      row.telefonKtery === 'checkin' || row.telefonWa
        ? row.telefonWa || row.telefonText
        : null;
    const rezervaceTel =
      row.jinyTelefonKtery === 'rezervace'
        ? row.jinyTelefonWa || row.jinyTelefonText
        : row.telefonKtery === 'rezervace'
          ? row.telefonWa || row.telefonText
          : null;
    return pripravTextSmsWa(text, email, druhZpravyNaOdchozi(id), {
      telefonCil: telefonCil || row.telefonWa || null,
      rezervaceRec: {
        zdroj: row.zdroj,
        zdrojCeka: Boolean(row.zdrojCeka),
        telefon: checkinTel,
        telefonWa: row.telefonKtery === 'checkin' ? row.telefonWa : checkinTel,
        telefonRezervace: rezervaceTel,
        telefonRezervaceWa: row.jinyTelefonWa,
      },
    });
  }

  async function oznacKanal(
    row: PrehledRadek,
    kanal: 'whatsapp' | 'sms',
    druhZpravy?: string,
  ): Promise<string | null> {
    const seznam = zpravyRadku(row);
    const zprava = druhZpravy ?? volba[row.rezervace] ?? seznam.find((z) => z.vychozi)?.id;
    if (!zprava) return null;
    const nazev = seznam.find((z) => z.id === zprava)?.nazev || 'zpráva';
    const surovy = seznam.find((z) => z.id === zprava)?.text || row.zprava;
    const lokalni = textSmsWaHostovi(row, surovy, zprava);
    if (!lokalni.ok) {
      setHlaska(lokalni.duvod);
      return null;
    }
    const ted = new Date().toISOString();
    const prefix = kanal === 'sms' ? 'SMS' : 'WhatsApp';
    let textVen = lokalni.text;
    if (!ukazka) {
      const res = await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rezervace: row.rezervace,
          akce: kanal,
          zprava,
          jazyk: jazykRadku(row),
        }),
      });
      let j: { error?: string; duvod?: string; text?: string } = {};
      try {
        j = (await res.json()) as typeof j;
      } catch {
        /* tělo nemusí být JSON */
      }
      if (!res.ok) {
        setHlaska(j.error || j.duvod || `${prefix} se nepodařilo zapsat.`);
        return null;
      }
      if (j.text) textVen = j.text;
    }
    setVolba((prev) => ({ ...prev, [row.rezervace]: zprava }));
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              odjezdDotaz: zprava === 'odjezd' ? ted : r.odjezdDotaz,
              pohodaDotaz: zprava === 'pohoda' ? ted : r.pohodaDotaz,
              shrnutiKdy: zprava === 'shrnuti' ? ted : r.shrnutiKdy,
              shrnutiKanal:
                zprava === 'shrnuti' ? (kanal === 'whatsapp' ? 'whatsapp' : 'sms') : r.shrnutiKanal,
              shrnutiOtisk: zprava === 'shrnuti' ? otiskShrnuti(r) : r.shrnutiOtisk,
              historie: [...r.historie, { cas: ted, co: `${prefix}: ${nazev}` }].slice(-40),
            }
          : r,
      ),
    );
    return textVen;
  }

  async function oznacWhatsApp(row: PrehledRadek, druhZpravy?: string) {
    await oznacKanal(row, 'whatsapp', druhZpravy);
  }

  function naMisteRadku(row: PrehledRadek): string | null {
    if (Object.prototype.hasOwnProperty.call(naMisteStav, row.rezervace)) return naMisteStav[row.rezervace];
    return row.naMiste;
  }

  function priplatekRadku(row: PrehledRadek): number | null {
    if (Object.prototype.hasOwnProperty.call(priplatekStav, row.rezervace)) return priplatekStav[row.rezervace];
    return row.priplatekRucni;
  }

  async function ulozNaMiste(row: PrehledRadek, zapnout: boolean, cas?: string) {
    if (ukazka) {
      if (!zapnout) {
        setNaMisteStav((prev) => ({ ...prev, [row.rezervace]: null }));
        return;
      }
      const den = row.prijezd && /^\d{4}-\d{2}-\d{2}$/.test(row.prijezd) ? row.prijezd : dnes;
      const hhmm =
        cas === CAS_PO_23 || (cas && /^po\s*23/i.test(cas))
          ? '23:30'
          : cas && /^\d{2}:\d{2}$/.test(cas)
            ? cas
            : null;
      if (hhmm) {
        const iso = isoPrahaZCasu(den, hhmm);
        setNaMisteStav((prev) => ({ ...prev, [row.rezervace]: iso || new Date().toISOString() }));
      } else {
        setNaMisteStav((prev) => ({ ...prev, [row.rezervace]: new Date().toISOString() }));
      }
      return;
    }
    setCekam(`${row.rezervace}:miste`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rezervace: row.rezervace,
        akce: zapnout ? 'na-miste' : 'zrusit-na-miste',
        ...(zapnout && cas ? { cas } : {}),
      }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; naMiste?: string | null } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Skutečný příjezd se neuložil.');
      return;
    }
    setNaMisteStav((prev) => ({ ...prev, [row.rezervace]: json.naMiste ?? null }));
  }

  async function ulozPriplatek(row: PrehledRadek, hodnota: string): Promise<{ ok: boolean; hodnota?: string }> {
    const surovy = hodnota.trim();
    if (surovy && !/^\d{1,5}$/.test(surovy)) return { ok: false };
    const kc = surovy ? Number(surovy) : null;
    if (ukazka) {
      setPriplatekStav((prev) => ({ ...prev, [row.rezervace]: kc }));
      return { ok: true, hodnota: surovy };
    }
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'priplatek', castka: surovy }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; priplatekRucni?: number | null } | null;
    if (!res.ok || !json?.ok) return { ok: false };
    const ulozeno = json.priplatekRucni ?? null;
    setPriplatekStav((prev) => ({ ...prev, [row.rezervace]: ulozeno }));
    return { ok: true, hodnota: ulozeno == null ? '' : String(ulozeno) };
  }

  function textDotazuOdjezdu(row: PrehledRadek): string {
    if (vyberPoplatku(row).kdy) return zpravaOdjezdu(jazykRadku(row), [], row.odkaz);
    return row.zpravy.find((z) => z.id === 'odjezd')?.text || zpravaOdjezdu(jazykRadku(row), [], row.odkaz);
  }

  function zpravyRadku(row: PrehledRadek) {
    const lang = jazykRadku(row);
    const uklizeno = radky.some(
      (r) => r.apartman && r.apartman === row.apartman && r.odjezd === dnes && r.uklizenoKdy && r.rezervace !== row.rezervace,
    );
    const cas = row.casPrijezdu;
    const po = !cas || cas > '14:00';
    const pripraveno = Boolean(uklizeno && !predanoRadku(row) && row.prijezd === dnes && po);
    const chybi = chybejiciKroky({
      cas: row.casPrijezdu,
      zpusob: row.zpusobPrijezdu,
      telefonBrana: row.telefonBrana,
      spz: row.spz,
      spzPujcene: row.spzPujcene,
      souhlas: Boolean(row.souhlas),
    });
    const krestni = (row.jmeno || '').trim().split(/\s+/).filter(Boolean)[0] || null;
    return zpravyMenu({
      stav: row.stav,
      lang,
      zdroj: row.zdroj,
      pruvodce: row.odkaz,
      checkinUrl: odkazy[row.rezervace] ?? row.checkinUrl,
      otevrenoPocet: row.otevrenoPocet,
      casPrijezdu: row.casPrijezdu,
      prijezd: row.prijezd,
      dnes,
      chybi,
      zpusob: row.zpusobPrijezdu,
      souhlas: Boolean(row.souhlas),
      naMiste: Boolean(naMisteRadku(row)),
      predano: predanoRadku(row) || '',
      odjezd: row.odjezd,
      casOdjezdu: casOdjezduRadku(row) || null,
      dluh: row.dluhPolozky.map((p) => ({ druh: p.druh, kc: p.kc })),
      branaChybi: row.zpusobPrijezdu === 'auto' && (!row.telefonBrana || (!row.spz && !row.spzPujcene)),
      pripraveno,
      historie: row.historie,
      narodnost: row.narodnost,
      krestni,
      telefonBrana: row.telefonBrana,
      apartman: row.apartman,
      shrnutiKdy: row.shrnutiKdy,
      shrnutiOtisk: row.shrnutiOtisk,
      branaRegistrovano: row.branaRegistrovano,
      nedojezdKdy: row.nedojezdKdy,
      checkinNeniPotreba: row.checkinNeniPotreba === true,
      zadostPrijezd: row.zadostPrijezd,
      zadostPozdniPrijezd: row.zadostPozdniPrijezd,
    });
  }

  function zpravaRadku(row: PrehledRadek): string {
    const seznam = zpravyRadku(row);
    const id = volba[row.rezervace] ?? seznam.find((z) => z.vychozi)?.id;
    const surovy =
      id === 'odjezd' ? textDotazuOdjezdu(row) : seznam.find((z) => z.id === id)?.text || row.zprava;
    const cisty = textSmsWaHostovi(row, surovy, id);
    return cisty.ok ? cisty.text : surovy;
  }

  async function ulozJazyk(row: PrehledRadek, jazyk: GuideLang) {
    setJazyky((prev) => ({ ...prev, [row.rezervace]: jazyk }));
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace ? { ...r, jazyk, jazykText: LANG_LABELS[jazyk] } : r,
      ),
    );
    if (ukazka) return;
    await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'jazyk', jazyk }),
    });
  }

  async function ulozOdkaz(row: PrehledRadek, hodnota: string): Promise<{ ok: boolean; hodnota?: string }> {
    const url = hodnota.trim();
    if (ukazka) {
      setOdkazy((prev) => ({ ...prev, [row.rezervace]: url }));
      setRadky((prev) =>
        prev.map((r) => (r.rezervace === row.rezervace ? { ...r, checkinUrl: url } : r)),
      );
      return { ok: true, hodnota: url };
    }
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'checkin', url }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; hodnota?: string } | null;
    if (!res.ok || !json?.ok) return { ok: false };
    const hotovo = json.hodnota ?? url;
    setOdkazy((prev) => ({ ...prev, [row.rezervace]: hotovo }));
    setRadky((prev) =>
      prev.map((r) => (r.rezervace === row.rezervace ? { ...r, checkinUrl: hotovo } : r)),
    );
    return { ok: true, hodnota: hotovo };
  }

  async function pouzijEmailZMinula(row: PrehledRadek, email: string) {
    const hodnota = email.trim();
    if (!hodnota.includes('@')) return;
    setCekam(`${row.rezervace}:email-minula`);
    if (!ukazka) {
      const res = await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace: row.rezervace, akce: 'email-hosta', email: hodnota }),
      });
      if (!res.ok) {
        setCekam(null);
        setHlaska('E-mail se neuložil.');
        return;
      }
    }
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? { ...r, email: hodnota, stalyHost: r.stalyHost ? { ...r.stalyHost, emailZMinula: null } : null }
          : r,
      ),
    );
    setCekam(null);
  }

  async function ulozTelefon(
    row: PrehledRadek,
    ktery: 'checkin' | 'rezervace',
    hodnota: string,
  ): Promise<{ ok: boolean; hodnota?: string }> {
    const cislo = hodnota.trim();
    if (!cislo) return { ok: false };
    const tel = normalizujTelefon(cislo, row.narodnost);
    if (!tel) return { ok: false };
    if (ukazka) {
      const text = textTelefonu(tel.ulozeny);
      setRadky((prev) =>
        prev.map((r) => {
          if (r.rezervace !== row.rezervace) return r;
          if (ktery === r.jinyTelefonKtery && ktery !== r.telefonKtery) {
            return {
              ...r,
              jinyTelefonText: text,
              jinyTelefonWa: tel.wa,
              jinyTelefonNejisty: tel.nejisty,
            };
          }
          return {
            ...r,
            telefonText: text,
            telefonWa: tel.wa,
            telefonNejisty: tel.nejisty,
            telefonKtery: ktery,
            stalyHost: r.stalyHost ? { ...r.stalyHost, telefonZMinula: null } : r.stalyHost,
          };
        }),
      );
      if (ktery !== row.jinyTelefonKtery || ktery === row.telefonKtery) {
        setTelefony((prev) => ({ ...prev, [row.rezervace]: text }));
      }
      return { ok: true, hodnota: text };
    }
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'telefon', ktery, cislo }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; hodnota?: string } | null;
    if (!res.ok || !json?.ok) return { ok: false };
    const hotovo = json.hodnota || textTelefonu(tel.ulozeny);
    const hlavni = ktery === (row.telefonKtery || 'rezervace');
    setRadky((prev) =>
      prev.map((r) => {
        if (r.rezervace !== row.rezervace) return r;
        if (hlavni) {
          return {
            ...r,
            telefonText: hotovo,
            telefonWa: tel.wa,
            telefonNejisty: tel.nejisty,
            stalyHost: r.stalyHost ? { ...r.stalyHost, telefonZMinula: null } : r.stalyHost,
          };
        }
        return { ...r, jinyTelefonText: hotovo, jinyTelefonWa: tel.wa, jinyTelefonNejisty: tel.nejisty };
      }),
    );
    if (hlavni) setTelefony((prev) => ({ ...prev, [row.rezervace]: hotovo }));
    return { ok: true, hodnota: hotovo };
  }

  async function zvolPoplatek(row: PrehledRadek, stav: 'ano' | 'ne') {
    const text = textPoplatku(stav, row.noci, row.osob);
    const hotovo = {
      poplatek: stav,
      poplatekText: text,
      poplatekZdroj: 'zvolil majitel',
      poplatekOdhad: false,
    };
    if (ukazka) {
      setRadky((prev) => prev.map((r) => (r.rezervace === row.rezervace ? { ...r, ...hotovo } : r)));
      return;
    }
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'poplatek', stav }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    if (!res.ok || !json?.ok) {
      setHlaska('Poplatek se neuložil.');
      return;
    }
    setRadky((prev) => prev.map((r) => (r.rezervace === row.rezervace ? { ...r, ...hotovo } : r)));
  }

  async function prevzit(row: PrehledRadek, pole: PrehledRadek['navrhy'][number]['pole'], hodnota: string) {
    if (!ukazka) {
      const res = await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace: row.rezervace, akce: 'prevzit', pole }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!res.ok || !json?.ok) {
        setHlaska('Neuloženo, zkuste znovu');
        return;
      }
    }
    setRadky((prev) =>
      prev.map((r) => (r.rezervace === row.rezervace ? { ...r, navrhy: r.navrhy.filter((n) => n.pole !== pole) } : r)),
    );
    if (pole === 'casPrijezdu') {
      const cas = hodnota === 'po20' ? 'po 20:00' : hodnota;
      setCasy((prev) => ({ ...prev, [row.rezervace]: cas }));
    }
    if (pole === 'telefon' || pole === 'telefonRezervace') {
      setTelefony((prev) => ({ ...prev, [row.rezervace]: textTelefonu(hodnota) }));
    }
  }

  async function kopirovatZpravu(row: PrehledRadek) {
    const seznam = zpravyRadku(row);
    const id = volba[row.rezervace] ?? seznam.find((z) => z.vychozi)?.id;
    const surovy =
      id === 'odjezd' ? textDotazuOdjezdu(row) : seznam.find((z) => z.id === id)?.text || row.zprava;
    const cisty = textSmsWaHostovi(row, surovy, id);
    if (!cisty.ok) {
      setHlaska(cisty.duvod);
      return;
    }
    const text = cisty.text;
    try {
      await navigator.clipboard.writeText(text);
      setHlaska(`Zpráva pro #${row.rezervace} je ve schránce.`);
    } catch {
      setHlaska(text);
    }
  }

  function kartaHosta(row: PrehledRadek) {
    const rozbaleno = jeRozbaleno(row);
    const kdo = row.jmeno && row.jmeno !== STARY_ZAZNAM ? row.jmeno : row.rezervace;
    const termin = terminKratky(row.prijezd, row.odjezd);
    const apartman = row.apartmanNazev || row.apartman;
    const chyba = vetaChyby(row);
    const wa = row.telefonWa || row.jinyTelefonWa;
    const predanoKdy = predanoRadku(row);
    const vyber = vyberPoplatku(row);
    const jizdy = vyjezdyRadku(row);
    const casSoucet = Object.prototype.hasOwnProperty.call(casy, row.rezervace)
      ? casy[row.rezervace].trim() || null
      : row.casPrijezdu;
    const naMisteKdy = naMisteRadku(row);
    const skutecnyCas = (naMisteKdy && hodinaPraha(naMisteKdy)) || (predanoKdy && hodinaPraha(predanoKdy)) || null;
    const rucniCastka = priplatekRadku(row);
    const rozpis = rozpisPlateb({
      poplatek: row.poplatek,
      noci: row.noci,
      osob: row.osob,
      cas: casSoucet,
      skutecny: skutecnyCas,
      rucni: rucniCastka,
      vyjezdy: jizdy,
    });
    const polozky = polozkyKarty(row);
    const nahled = nahledPlateb({
      poplatek: row.poplatek,
      noci: row.noci,
      osob: row.osob,
      polozky,
      platby: row.platby || [],
      zaplaceno: row.platby?.length ? row.zaplaceno : vyber.kdy,
      poplatekVybral: vyber.kdo,
    });
    const poplatekRozbalen = Boolean(poplatekOtevren[row.rezervace]);
    const nezaplacene = nahled.radky.filter((r) => !r.zaplacena);
    const zaplacene = nahled.radky.filter((r) => r.zaplacena);
    const sumaNezap = nezaplacene.reduce((s, r) => s + r.kc, 0);
    const sumaZap = zaplacene.reduce((s, r) => s + r.kc, 0);
    const platbaHotovo = nahled.radky.length > 0 && nezaplacene.length === 0;
    const otevirat = nahled.radky.length > 0 || Boolean(nahled.poznamka);
    const casText = casRadku(row);
    const ukazatPrijezd = !predanoKdy && !naMisteKdy && Boolean(casText);
    const parkAkce = stavParkovani(
      {
        rezervace: row.rezervace,
        apartman: row.apartman,
        prijezd: row.prijezd,
        odjezd: row.odjezd,
        zpusob: row.zpusobPrijezdu,
        telefonBrana: row.telefonBrana,
        branaRegistrovano: row.branaRegistrovano,
        zruseno: row.stav === 'zruseno' || Boolean(row.nedojezdKdy),
      },
      sloty,
      new Date(),
    ).akce;
    const nedojezd = Boolean(row.nedojezdKdy);
    const odjel = jeHostOdjetly(hostOdjezdu(row), dnes, new Date());
    const mimoAkce = odjel || nedojezd;
    const fazeText = nedojezd
      ? 'Nedojezd'
      : odjel && row.stav !== 'zruseno' && !row.fazeText.startsWith('Odjel') && row.fazeText !== 'Zrušeno'
        ? `Odjel ${casPrevzetiText(row.prevzatoKdy) || ''}`.trim()
        : row.fazeText;
    const cekajici = cekajiciUkon({
      predano: Boolean(predanoKdy),
      naMiste: Boolean(naMisteKdy),
      denPrijezdu: row.prijezd === dnes,
      parkovani: parkAkce,
      odjel: mimoAkce,
    });
    const casAktualni = Object.prototype.hasOwnProperty.call(casy, row.rezervace)
      ? casy[row.rezervace].trim() || null
      : row.casPrijezdu;
    const zpravyNahore =
      !mimoAkce &&
      (row.stav === 'bez_checkinu' ||
        (row.otevrenoPocet ?? 0) === 0 ||
        !row.rozbalen ||
        !casAktualni ||
        (row.zpusobPrijezdu === 'auto' && (!row.telefonBrana || (!row.spz && !row.spzPujcene))));
    const telefonNahore = !row.telefonText;
    const jazykZnamy = maJazykRadku(row);
    const jazykNahore = !jazykZnamy;
    const staly = row.stalyHost || null;
    const kontaktUlozenCas = kontaktUlozenKdy(row) || staly?.kontaktZMinula || null;
    const muzeKontakt = Boolean(wa || row.telefonText || row.jinyTelefonText);
    const kontaktNahore = !kontaktUlozenCas && !staly?.kontaktZMinula && !mimoAkce;
    /** Nahoře jen Předat. Po předání je Vrátit v Detailu. Nedojezd je ve Změnách. */
    const predaniNahore = !nedojezd && !odjel && !predanoKdy;
    const tlacitkoKontakt = muzeKontakt ? (
      <UlozitKontakt row={row} onUlozeno={() => oznacKontaktUlozen(row)} />
    ) : null;
    const telefonZMinula = staly?.telefonZMinula || null;
    const telefonZMinulaBlok =
      telefonNahore && telefonZMinula ? (
        <TelefonZMinulaNahore
          key={`${row.rezervace}-telefon-z-minula`}
          cislo={telefonZMinula}
          onAkceptovat={() => ulozTelefon(row, 'rezervace', telefonZMinula)}
        />
      ) : null;
    const kontaktNahoreBlok = kontaktNahore ? (
      telefonNahore && !telefonZMinula ? (
        <TelefonNahore
          key={`${row.rezervace}-telefon-nahore`}
          hodnota={telefonRadku(row)}
          onUloz={(text) => ulozTelefon(row, row.telefonKtery || 'rezervace', text)}
        />
      ) : !telefonNahore ? (
        <a
          className="ph-nova-kontakt"
          href={`/api/prehled/vizitka?rezervace=${encodeURIComponent(row.rezervace)}`}
          onClick={() => oznacKontaktUlozen(row)}
        >
          Uložit kontakt
        </a>
      ) : null
    ) : null;
    const casPole = (
      <PoleSUlozenim
        key={`${row.rezervace}-cas`}
        label="Čas příjezdu"
        hodnota={casRadku(row)}
        poznamka={row.casZadalHost ? <span className="ph-od-hosta"> zadal host</span> : null}
        vstup={{ inputMode: 'numeric', autoComplete: 'off' }}
        onUloz={(text) => ulozCas(row, text)}
      />
    );
    const odjezdCas = casOdjezduRadku(row);
    const odjezdPole = (
      <PoleSUlozenim
        key={`${row.rezervace}-odjezd`}
        label="Odjezd"
        hodnota={odjezdCas}
        poznamka={row.casOdjezduZadalHost && !casyOdjezdu[row.rezervace] ? <span className="ph-od-hosta"> zadal host</span> : null}
        vstup={{ inputMode: 'numeric', autoComplete: 'off' }}
        onUloz={(text) => ulozOdjezd(row, text)}
      />
    );
    const soucetPole = (
      <div className="ph-soucet">
        {rozpis.radky.map((radek) => (
          <div key={radek.nazev}>
            {radek.nazev} <span className="ph-soucet__kc">{radek.text}</span>
            {radek.dovetek ? <span className="ph-soucet__dovetek">{radek.dovetek}</span> : null}
          </div>
        ))}
        <div className="ph-soucet__celkem">
          {rozpis.uplny ? 'Součet' : 'Součet zatím'}{' '}
          <span className="ph-soucet__kc">{`${rozpis.soucet}\u00A0Kč`}</span>
        </div>
        {rozpis.navrhKc != null ? (
          <div>
            Podle času by to bylo <span className="ph-soucet__kc">{`${rozpis.navrhKc}\u00A0Kč`}</span>
            {' · '}
            <button type="button" onClick={() => void ulozPriplatek(row, String(rozpis.navrhKc))}>
              Použít
            </button>
          </div>
        ) : null}
        <div className="ph-pole-rada" aria-label="Rychlý příplatek">
          {[0, 100, 200].map((kc) => (
            <button
              key={kc}
              type="button"
              className={`ph-predano${rucniCastka === kc ? ' is-on' : ''}`}
              disabled={cekam !== null}
              onClick={() => void ulozPriplatek(row, String(kc))}
            >
              {kc}&nbsp;Kč
            </button>
          ))}
          <button
            type="button"
            className={`ph-predano${rucniCastka == null ? ' is-on' : ''}`}
            disabled={cekam !== null}
            onClick={() => void ulozPriplatek(row, '')}
          >
            Auto
          </button>
        </div>
        <PoleSUlozenim
          key={`${row.rezervace}-priplatek`}
          label="Příplatek za čas ručně"
          hodnota={rucniCastka == null ? '' : String(rucniCastka)}
          vstup={{ inputMode: 'numeric', autoComplete: 'off', placeholder: 'nechat výpočet' }}
          onUloz={(text) => ulozPriplatek(row, text)}
        />
      </div>
    );
    const emailHosta = row.email.includes('@') ? row.email : '';
    const zpravyHosta = zpravyRadku(row);
    const maMenuZprav = zpravyHosta.length > 0;
    const muzePoslat = nabidnoutOdeslani(row.stav) && !nedojezd;
    const jazykText = LANG_LABELS[jazykRadku(row)];
    const uzMelPruvodce = Boolean(dotazPredOdeslanimZnovu(row.stav));
    const dotazZnovuText = uzMelPruvodce
      ? `${dotazPredOdeslanimZnovu(row.stav)} Jazyk: ${jazykText}.`
      : `Poslat průvodce v jazyce ${jazykText}? Host dostane e-mail.`;
    const ukazBlokOdeslani =
      !nedojezd && (muzePoslat || row.stav === 'bez_checkinu' || maMenuZprav);
    const jazykSelect = (
      <label>
        Jazyk
        <select
          value={jazykZnamy ? jazykRadku(row) : ''}
          onChange={(e) => {
            const v = e.target.value as GuideLang;
            if (!GUIDE_LANGS.includes(v)) return;
            void ulozJazyk(row, v);
          }}
        >
          {jazykZnamy ? null : <option value="">Zvolte jazyk</option>}
          {GUIDE_LANGS.map((lang) => (
            <option key={lang} value={lang}>
              {LANG_LABELS[lang]}
            </option>
          ))}
        </select>
      </label>
    );
    const blokOdeslani = ukazBlokOdeslani ? (
      <div className="ph-znovu">
        {jazykSelect}
        {muzePoslat && jazykZnamy ? (
          <>
            <button
              type="button"
              disabled={cekam !== null}
              onClick={() => setDotazZnovu(row.rezervace)}
            >
              {textTlacitkaOdeslani(row.stav)}
            </button>
            {dotazZnovu === row.rezervace ? (
              <div className="ph-predano-dotaz">
                <p>{dotazZnovuText}</p>
                <button
                  type="button"
                  disabled={cekam !== null}
                  onClick={() => {
                    setDotazZnovu(null);
                    volat(row, 'znovu', { jazyk: jazykRadku(row) });
                  }}
                >
                  Ano, poslat
                </button>
                <button type="button" onClick={() => setDotazZnovu(null)}>
                  Zrušit
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    ) : null;
    const zpravaRamecek = maMenuZprav ? (
      <fieldset className="ph-menu">
        <legend>Zpráva</legend>
        {zpravyHosta.map((z) => {
          const vybrano = (volba[row.rezervace] ?? zpravyHosta.find((polozka) => polozka.vychozi)?.id) === z.id;
          const trida = [vybrano ? 'is-on' : '', z.vystraha ? 'is-vystraha' : ''].filter(Boolean).join(' ');
          return (
            <label key={z.id} className={trida}>
              <input
                type="radio"
                name={`zprava-${row.rezervace}`}
                checked={vybrano}
                onChange={() => setVolba((prev) => ({ ...prev, [row.rezervace]: z.id }))}
              />
              {z.nazev}
            </label>
          );
        })}
      </fieldset>
    ) : null;
    const emailTlacitko = emailHosta ? (
      <button type="button" className="ph-wa" onClick={() => setDotazEmail({ id: row.rezervace, email: emailHosta })}>
        Poslat e-mailem
      </button>
    ) : null;
    const akceZpravy = maMenuZprav ? (
      <div className="ph-zpravy-akce">
        <TlacitkoWhatsApp
          wa={wa}
          zprava={zpravaRadku(row)}
          userAgent={userAgent}
          onPredOtevrenim={() => oznacWhatsApp(row)}
        />
        {emailTlacitko}
        <button type="button" className="ph-kopie" onClick={() => void kopirovatZpravu(row)}>
          Zkopírovat zprávu
        </button>
        {dotazEmail?.id === row.rezervace ? (
          <div className="ph-predano-dotaz">
            <p>
              Poslat e-mail na <span className="ph-tel">{dotazEmail.email}</span>?
            </p>
            <button type="button" disabled={cekam !== null} onClick={() => void posliEmail(row)}>
              Ano
            </button>
            <button type="button" onClick={() => setDotazEmail(null)}>
              Zrušit
            </button>
          </div>
        ) : null}
      </div>
    ) : null;
    const zavady = zavadyRadku(row);
    const zavadyPo = zavadyPoOdjezduRadku(row);
    const ukazZavady =
      (!odjel && (!predanoKdy || zavady || zavadyPo || dotazZavady === row.rezervace)) ||
      (odjel && Boolean(zavady || zavadyPo));
    const zavadyStavText = stavZavadText(zavady);
    const zavadyPoStavText = stavZavadPoOdjezdu(zavadyPo);
    const zavadyBlok = (
      <div className="ph-zavady">
        {zavady ? (
          <div className="ph-zavady__zapis">
            <p className="ph-zavady__stav">
              Z předání · {casPraha(zavady.kdy) || zavady.kdy} · {jmenoKdoZavad(zavady.kdo)}
              {zavadyStavText ? ` · ${zavadyStavText}` : ''}
            </p>
            <p>{zavady.text}</p>
            {!zavady.odeslanoKdy ? (
              <button
                type="button"
                className="ph-predano"
                disabled={cekam !== null}
                onClick={() => setDotazOdeslatZavady(row.rezervace)}
              >
                Poslat hostovi e-mail
              </button>
            ) : null}
            {dotazOdeslatZavady === row.rezervace ? (
              <div className="ph-predano-dotaz">
                <p>Opravdu odeslat?</p>
                <button type="button" disabled={cekam !== null} onClick={() => void posliZavadyPredani(row)}>
                  Ano, odeslat
                </button>
                <button type="button" onClick={() => setDotazOdeslatZavady(null)}>
                  Zrušit
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {zavadyPo ? (
          <div className="ph-zavady__zapis">
            <p className="ph-zavady__stav">
              Po odjezdu · {casPraha(zavadyPo.kdy) || zavadyPo.kdy} · {jmenoKdoZavad(zavadyPo.kdo)}
              {zavadyPoStavText ? ` · ${zavadyPoStavText}` : ''}
            </p>
            <p>{zavadyPo.text}</p>
            {!zavadyPo.odeslanoKdy ? (
              <button
                type="button"
                className="ph-predano"
                disabled={cekam !== null}
                onClick={() => setDotazOdeslatPoOdjezdu(row.rezervace)}
              >
                Poslat hostovi e-mail
              </button>
            ) : null}
            {dotazOdeslatPoOdjezdu === row.rezervace ? (
              <div className="ph-predano-dotaz">
                <p>Opravdu odeslat?</p>
                <button type="button" disabled={cekam !== null} onClick={() => void posliZavadyPoOdjezdu(row)}>
                  Ano, odeslat
                </button>
                <button type="button" onClick={() => setDotazOdeslatPoOdjezdu(null)}>
                  Zrušit
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {!zavady && !predanoKdy ? (
          <button
            type="button"
            className="ph-predano"
            disabled={cekam !== null}
            onClick={() => {
              setDotazZavady(row.rezervace);
              setTextZavad('');
              setDotazPredani(null);
            }}
          >
            Závady při předání
          </button>
        ) : null}
        {dotazZavady === row.rezervace ? (
          <div className="ph-predano-dotaz">
            <p>Co není v pořádku?</p>
            <textarea
              value={textZavad}
              onChange={(e) => setTextZavad(e.target.value)}
              rows={4}
              maxLength={2000}
              aria-label="Závady při předání"
            />
            <button type="button" disabled={cekam !== null} onClick={() => void ulozZavadyPredani(row)}>
              Uložit
            </button>
            <button
              type="button"
              onClick={() => {
                setDotazZavady(null);
                setTextZavad('');
              }}
            >
              Zrušit
            </button>
          </div>
        ) : null}
      </div>
    );
    const predaniTlacitko = predanoKdy ? (
      <button
        type="button"
        className="ph-predano"
        disabled={cekam !== null}
        onClick={() => setDotazPredani({ id: row.rezervace, druh: 'vratit' })}
      >
        Vrátit předání
      </button>
    ) : (
      <button
        type="button"
        className="ph-nova-predani"
        disabled={cekam !== null}
        onClick={() => otevriDotazPredani(row)}
      >
        Předat apartmán
      </button>
    );
    /** Kam poslat kartu: hned pod tlačítkem (ne až po odchodu z karty). */
    const kanalKartyPodTlacitkem =
      oknoKarty?.rezervace === row.rezervace ? (
        <div className="ph-predano-dotaz ph-predano-dotaz--karta">
          <p>
            <strong>Předat · {oknoKarty.jmeno}</strong>
          </p>
          <p>Kam poslat odkaz na kartu s průvodcem. Po odeslání uvidí host kódy.</p>
          {oknoKarty.testRezim && oknoKarty.odkaz ? (
            <p>
              <a href={oknoKarty.odkaz} target="_blank" rel="noopener noreferrer">
                Otevřít kartu, kterou host uvidí
              </a>
            </p>
          ) : null}
          <div className="ph-predano-dotaz__ctyrka" role="group" aria-label="Kam poslat kartu">
            <div className="ph-potvrzeni__akce">
              <button
                type="button"
                disabled={cekam !== null || !oknoKarty.telefonWa}
                title={!oknoKarty.telefonWa ? 'Chybí telefon z check-inu' : undefined}
                onClick={() => void kanalKarty(row, 'whatsapp')}
              >
                WhatsApp
              </button>
              <button
                type="button"
                disabled={cekam !== null || !oknoKarty.telefonWa}
                title={!oknoKarty.telefonWa ? 'Chybí telefon z check-inu' : undefined}
                onClick={() => void kanalKarty(row, 'sms')}
              >
                SMS
              </button>
            </div>
            <div className="ph-potvrzeni__akce">
              <button
                type="button"
                disabled={
                  cekam !== null || !oknoKarty.email || oknoKarty.emailRelay || oknoKarty.emailOdeslan
                }
                title={
                  oknoKarty.emailRelay
                    ? 'adresa z Bookingu'
                    : !oknoKarty.email
                      ? 'Chybí e-mail z check-inu'
                      : undefined
                }
                onClick={() => void kanalKarty(row, 'email')}
              >
                E-mail
              </button>
              {!predanoRadku(row) ? (
                <button type="button" disabled={cekam !== null} onClick={() => void predaniBezKarty(row)}>
                  Předat bez karty
                </button>
              ) : (
                <button type="button" onClick={() => zavriOknoKarty(row)}>
                  Zavřít
                </button>
              )}
            </div>
            {!predanoRadku(row) ? (
              <div className="ph-potvrzeni__akce">
                <button type="button" className="ph-predano-dotaz__zrusit" onClick={() => zavriOknoKarty(row)}>
                  Zavřít
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : cekam === `${row.rezervace}:klub-karta` ? (
        <p className="ph-karta-poslana">Připravuji kartu…</p>
      ) : dotazBezKarty === row.rezervace ? (
        <div className="ph-predano-dotaz">
          <p>
            <strong>Předat bez karty?</strong>
          </p>
          <p>
            Host uvidí kódy v průvodci. Kartu mu teď nepošlete. Útrata se započítá až při předání zpět.
          </p>
          <div className="ph-potvrzeni__akce">
            <button type="button" disabled={cekam !== null} onClick={() => void predaniBezKarty(row)}>
              Ano, předat bez karty
            </button>
            <button type="button" className="ph-predano-dotaz__zrusit" onClick={() => setDotazBezKarty(null)}>
              Ne, jen zavřít
            </button>
          </div>
        </div>
      ) : null;
    const predaniDotazDruh = dotazPredani?.id === row.rezervace ? dotazPredani.druh : null;
    const predaniDotazJeNedojezd =
      predaniDotazDruh === 'nedojezd' || predaniDotazDruh === 'vratit-nedojezd';
    const predaniPriplatekDotaz =
      predaniDotazDruh === 'predano-priplatek' && dotazPredani ? (
        <div className="ph-predano-dotaz">
          {dotazPredani.krok === 'vlastni' ? (
            <>
              <p>
                Vlastní příplatek za příjezd{dotazPredani.cas ? ` ${dotazPredani.cas}` : ''}
                {dotazPredani.navrhKc != null
                  ? ` (kotva ze sazby ${dotazPredani.navrhKc}\u00A0Kč)`
                  : ''}
                . Upravte a předáme apartmán.
              </p>
              <label className="ph-predano-dotaz__castka">
                Částka v Kč
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  placeholder={
                    dotazPredani.navrhKc != null ? String(dotazPredani.navrhKc) : 'Kč'
                  }
                  value={dotazPredani.vlastni || ''}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    setDotazPredani({
                      ...dotazPredani,
                      vlastni: e.target.value.replace(/\D/g, '').slice(0, 5),
                    })
                  }
                />
              </label>
              <div className="ph-potvrzeni__akce ph-predano-dotaz__tri">
                <button
                  type="button"
                  disabled={cekam !== null || !/^\d{1,5}$/.test((dotazPredani.vlastni || '').trim())}
                  onClick={() => {
                    const kc = Number((dotazPredani.vlastni || '').trim());
                    if (!Number.isFinite(kc) || kc < 0) return;
                    void poPriplatkuOtevriKartu(row, kc);
                  }}
                >
                  Uložit a zvolit kanál
                </button>
                <button
                  type="button"
                  onClick={() => setDotazPredani({ ...dotazPredani, krok: 'volba', vlastni: '' })}
                >
                  Zpět
                </button>
                <button type="button" className="ph-predano-dotaz__zrusit" onClick={() => setDotazPredani(null)}>
                  Zrušit
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                {dotazPredani.stavPriplatku === 'domluva'
                  ? `Příjezd${dotazPredani.cas ? ` ${dotazPredani.cas}` : ''} je po 21:00. Podle sazby by to bylo ${dotazPredani.navrhKc}\u00A0Kč (kotva, po domluvě). Co zapsat a předat?`
                  : `Příjezd${dotazPredani.cas ? ` ${dotazPredani.cas}` : ''} má příplatek ${dotazPredani.navrhKc}\u00A0Kč. Co zapsat a předat?`}
              </p>
              <div className="ph-predano-dotaz__ctyrka" role="group" aria-label="Příplatek při předání">
                <div className="ph-potvrzeni__akce">
                  <button
                    type="button"
                    disabled={cekam !== null || dotazPredani.navrhKc == null}
                    onClick={() => {
                      if (dotazPredani.navrhKc == null) return;
                      void poPriplatkuOtevriKartu(row, dotazPredani.navrhKc);
                    }}
                  >
                    Účtovat {dotazPredani.navrhKc != null ? `${dotazPredani.navrhKc}\u00A0Kč` : ''}
                  </button>
                  <button
                    type="button"
                    disabled={cekam !== null}
                    onClick={() => setDotazPredani({ ...dotazPredani, krok: 'vlastni', vlastni: '' })}
                  >
                    Vlastní částka
                  </button>
                </div>
                <div className="ph-potvrzeni__akce">
                  <button
                    type="button"
                    disabled={cekam !== null}
                    onClick={() => void poPriplatkuOtevriKartu(row, 0)}
                  >
                    Odpustit 0&nbsp;Kč
                  </button>
                  <button type="button" className="ph-predano-dotaz__zrusit" onClick={() => setDotazPredani(null)}>
                    Zrušit
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null;
    const predaniDotaz = predaniPriplatekDotaz
      ? predaniPriplatekDotaz
      : predaniDotazDruh ? (
      <div className="ph-predano-dotaz">
        <p>
          {predaniDotazDruh === 'predano'
            ? 'Ubytovat hosta? V průvodci se zobrazí vstupní kódy. Hned potom zvolíte, kam poslat kartu (WhatsApp, SMS nebo e-mail). Útrata se započítá až při předání zpět (odjezd).'
            : predaniDotazDruh === 'nedojezd'
              ? 'Označit jako nedojezd? Zmizí z dalších akcí. V dluzích zůstane, jen když něco dluží.'
              : predaniDotazDruh === 'vratit-nedojezd'
                ? 'Vrátit nedojezd? Host se zase objeví v denních akcích.'
                : 'Opravdu vrátit předání? Host v průvodci kódy neuvidí.'}
        </p>
        <button
          type="button"
          disabled={cekam !== null}
          onClick={() => {
            if (predaniDotazDruh === 'nedojezd') void ulozNedojezd(row, true);
            else if (predaniDotazDruh === 'vratit-nedojezd') void ulozNedojezd(row, false);
            else void ulozPredani(row, predaniDotazDruh === 'predano');
          }}
        >
          {predaniDotazDruh === 'predano'
            ? 'Ano, předat'
            : predaniDotazDruh === 'nedojezd'
              ? 'Ano, nedojezd'
              : 'Ano, vrátit'}
        </button>
        <button type="button" onClick={() => setDotazPredani(null)}>
          Zrušit
        </button>
      </div>
    ) : null;
    const skutecnyVolba = naMisteKdy
      ? (() => {
          const h = hodinaPraha(naMisteKdy);
          if (!h) return '';
          const [hh, mm] = h.split(':').map(Number);
          if (hh > 23 || (hh === 23 && mm > 0)) return CAS_PO_23;
          return h;
        })()
      : '';
    const skutecnyPrijezdPole = (
      <label className="ph-skutecny">
        Skutečný příjezd
        <select
          value={skutecnyVolba}
          disabled={cekam !== null}
          aria-label="Skutečný příjezd pro příplatek"
          onChange={(e) => {
            const v = e.target.value;
            if (!v) void ulozNaMiste(row, false);
            else void ulozNaMiste(row, true, v);
          }}
        >
          <option value="">Zvolte čas</option>
          {CASY_VYBERU.map((hodina) => {
            const kc = priplatekProCas(hodina);
            return (
              <option key={hodina} value={hodina}>
                {kc ? `${hodina} · +${kc} Kč` : `${hodina} · bez příplatku`}
              </option>
            );
          })}
          <option value={CAS_PO_23}>po 23:00 · po domluvě</option>
        </select>
        <span className="ph-skutecny__hint">Pro příplatek. Domluvený čas zůstává u Časů.</span>
      </label>
    );
    const menaKarty: MenaPlateb = row.mena === 'EUR' ? 'EUR' : 'CZK';
    const castka = (kc: number) => formatCastka(kc, menaKarty);
    const platbaCastkaText =
      sumaNezap > 0 ? castka(sumaNezap) : sumaZap > 0 ? castka(sumaZap) : null;
    const platbaHint = platbaHotovo
      ? `Uhrazeno · klik pro rozpis ${poplatekRozbalen ? '▴' : '▾'}`
      : sumaNezap > 0
        ? `K vybrání · klik pro rozpis ${poplatekRozbalen ? '▴' : '▾'}`
        : nahled.poznamka || nahled.text;
    const platbaPotvrzeni =
      volbaPlatby?.id === row.rezervace ? (
        <div className="ph-predano-dotaz">
          {volbaPlatby.krok === 'kdo' ? (
            <>
              <p>Kdo zapsal platbu?</p>
              <button type="button" onClick={() => setVolbaPlatby({ ...volbaPlatby, krok: 'jak', kdo: 'pravoslav' })}>
                Pravoslav
              </button>
              <button type="button" onClick={() => setVolbaPlatby({ ...volbaPlatby, krok: 'jak', kdo: 'nikol' })}>
                Nikol
              </button>
            </>
          ) : (
            <>
              <p>Jak host zaplatil?</p>
              {JAKY.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  disabled={cekam !== null}
                  onClick={() => void ulozPlatbu(row, volbaPlatby.druh, j.id, volbaPlatby.kdo || 'pravoslav')}
                >
                  {j.text}
                </button>
              ))}
            </>
          )}
          <button type="button" onClick={() => setVolbaPlatby(null)}>
            Zrušit
          </button>
        </div>
      ) : null;
    const poplatekRadek = (
      <div
        className={`ph-nova-platba-vnitr${platbaHotovo ? ' is-hotovo' : ''}${nahled.ton === 'seda' ? ' is-seda' : ''}${poplatekRozbalen ? ' is-open' : ''}`}
      >
        {otevirat ? (
          <button
            type="button"
            className="ph-nova-platba-castka"
            aria-expanded={poplatekRozbalen}
            onClick={() => setPoplatekOtevren((prev) => ({ ...prev, [row.rezervace]: !prev[row.rezervace] }))}
          >
            <span className="ph-nova-platba-kc">
              {platbaCastkaText ? `Platby ${platbaCastkaText}` : nahled.text}
            </span>
            <span className="ph-nova-platba-hint">{platbaHint}</span>
          </button>
        ) : (
          <span className="ph-nova-platba-castka">
            <span className="ph-nova-platba-kc">{nahled.text}</span>
          </span>
        )}
        {sumaNezap > 0 ? (
          <button
            type="button"
            className="ph-nova-platba-btn ph-nova-platba-btn--zaplatit"
            disabled={cekam !== null}
            onClick={() =>
              setVolbaPlatby({
                id: row.rezervace,
                druh: nezaplacene.length === 1 ? nezaplacene[0].druh : 'vse',
                krok: 'kdo',
                kdo: null,
              })
            }
          >
            Zaplatit
          </button>
        ) : platbaHotovo ? (
          <span className="ph-nova-platba-btn ph-nova-platba-btn--uhrazeno">Uhrazeno</span>
        ) : null}
        {platbaPotvrzeni}
        {poplatekRozbalen && otevirat ? (
          <div className="ph-poplatek-rozpis">
            {nahled.poznamka ? <p>{nahled.poznamka}</p> : null}
            {nahled.radky.map((polozka) => (
              <div key={polozka.druh} className="ph-poplatek-radek">
                <p>
                  {polozka.nazev}{' '}
                  {polozka.zaplacena
                    ? castka(polozka.plnaKc)
                    : polozka.zaplacenoKc > 0
                      ? `${castka(polozka.kc)} zbývá (z ${castka(polozka.plnaKc)}, už ${castka(polozka.zaplacenoKc)})`
                      : castka(polozka.kc)}
                  {polozka.vypocet ? ` (${polozka.vypocet})` : ''}
                  {polozka.zaplacena || polozka.zaplacenoKc > 0
                    ? ` · ${[polozka.kdo, polozka.kdy, polozka.jak].filter(Boolean).join(', ')}`
                    : null}
                  {polozka.zaplacena || polozka.zaplacenoKc > 0 ? (
                    <>
                      <button
                        type="button"
                        className="ph-predano"
                        disabled={cekam !== null}
                        onClick={() =>
                          setEditPlatby({
                            id: row.rezervace,
                            druh: polozka.druh,
                            text: String(polozka.zaplacenoKc || 0),
                          })
                        }
                      >
                        Upravit
                      </button>
                      <button
                        type="button"
                        className="ph-predano"
                        onClick={() => void vratPlatbuKarty(row, polozka.druh)}
                      >
                        Vrátit platbu
                      </button>
                    </>
                  ) : null}
                  {!polozka.zaplacena ? (
                    <button
                      type="button"
                      className="ph-zaplatit"
                      disabled={cekam !== null}
                      onClick={() =>
                        setVolbaPlatby({ id: row.rezervace, druh: polozka.druh, krok: 'kdo', kdo: null })
                      }
                    >
                      Zaplatit
                    </button>
                  ) : null}
                </p>
                {editPlatby?.id === row.rezervace && editPlatby.druh === polozka.druh ? (
                  <div className="ph-predano-dotaz">
                    <p>Už zaplaceno (z {castka(polozka.plnaKc)})</p>
                    <span className="ph-pole-rada">
                      <input
                        inputMode="numeric"
                        autoComplete="off"
                        value={editPlatby.text}
                        onChange={(e) => setEditPlatby({ ...editPlatby, text: e.target.value })}
                        aria-label="Upravit zaplacenou částku"
                      />
                      <button
                        type="button"
                        className="ph-ulozit"
                        disabled={cekam !== null}
                        onClick={() => void upravPlatbuKarty(row, polozka.druh, editPlatby.text)}
                      >
                        Uložit
                      </button>
                      <button type="button" onClick={() => setEditPlatby(null)}>
                        Zrušit
                      </button>
                    </span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
    return (
      <ParkovaniRadek
        key={row.rezervace}
        row={row}
        sloty={sloty}
        pripravena={branaPripravena}
        potvrzena={branaOk}
        ukazka={ukazka}
        cekam={cekam !== null}
        vyzvaRegistrace={branaVyzva[row.rezervace] || 0}
        onSloty={setSloty}
        onHlaska={setHlaska}
        onBranaHotovo={() => {
          const ted = new Date().toISOString();
          setRadky((prev) =>
            prev.map((r) =>
              r.rezervace === row.rezervace
                ? {
                    ...r,
                    branaRegistrovano: ted,
                    zpravaBranaOdeslana: ted,
                    zpravaBranaPrectena: null,
                  }
                : r,
            ),
          );
          setBranaZTile((prev) => ({ ...prev, [row.rezervace]: false }));
        }}
        deti={(dil) => (
      <article key={row.rezervace} className={rozbaleno ? 'ph-row' : 'ph-row is-shut'} id={row.rezervace}>
        {(() => {
          const checkinOk = row.stav !== 'bez_checkinu' || row.checkinNeniPotreba;
          const casOk = Boolean(casAktualni);
          const pruvodceOk = checkinOk && (row.otevrenoPocet ?? 0) > 0 && casOk && Boolean(row.souhlas);
          const branaChybiUdaje =
            row.zpusobPrijezdu === 'auto' && (!row.telefonBrana || (!row.spz && !row.spzPujcene));
          const branaOk = row.zpusobPrijezdu === 'auto' && Boolean(row.branaRegistrovano);
          const branaHlavni = branaOk ? 'Brána OK' : branaChybiUdaje ? 'Údaje chybí' : 'Nezapsáno';
          const branaDrobek = branaOk
            ? 'stání ano'
            : branaChybiUdaje
              ? 'klik → WhatsApp'
              : 'klik → SMS do brány';
          const pruvodcePocet = pocetCasovychPripoinek(row.historie);
          const denPredNeboDenCi =
            Boolean(row.prijezd) && (dnes === row.prijezd || dnes === posunDen(row.prijezd!, -1));
          let casZpravaId: CasovaZpravaId = dalsiCasovaZprava(
            pruvodcePocet,
            denPredNeboDenCi,
            row.historie,
          );
          if (
            casZpravaId === 'nedojezd' &&
            !(denPredNeboDenCi && row.stav !== 'zruseno' && !predanoRadku(row))
          ) {
            casZpravaId = 'pruvodce3';
          }
          const checkinStupen = stupenCheckinu(pocetCheckinPripoinek(row.historie), denPredNeboDenCi);
          const branaStupenVal = stupenBrany(pocetBranaPripoinek(row.historie), denPredNeboDenCi);
          const vyzvaCheckin = textVyzvyHosta('checkin', {
            historie: row.historie,
            prijezd: row.prijezd,
            dnes,
          });
          const vyzvaPruvodce = textVyzvyHosta('pruvodce', {
            historie: row.historie,
            prijezd: row.prijezd,
            dnes,
          });
          const vyzvaBrana = textVyzvyHosta('brana', {
            historie: row.historie,
            prijezd: row.prijezd,
            dnes,
          });
          /** Jen krátký štítek. Dlouhý text fáze (čas, brána, průvodce) je v dlaždicích. */
          const pillText = (() => {
            if (row.stav === 'zruseno') return 'Zrušeno';
            if (nedojezd) return 'Nedojezd';
            if (odjel || fazeText.startsWith('Odjel')) {
              const casOdjel = casPrevzetiText(row.prevzatoKdy);
              return casOdjel ? `Odjel ${casOdjel}` : 'Odjel';
            }
            if (predanoKdy) {
              const casPred = hodinaPraha(predanoKdy);
              return casPred ? `Předáno ${casPred}` : 'Předáno';
            }
            if (!checkinOk) return 'Čeká check-in';
            if ((row.otevrenoPocet ?? 0) === 0) return 'Čeká průvodce';
            if (!casOk) return 'Čeká čas';
            if (!row.souhlas) return 'Čeká průvodce';
            if (branaChybiUdaje) return 'Čeká údaje';
            if (row.zpusobPrijezdu === 'auto' && !branaOk) return 'Čeká brána';
            if (!pruvodceOk) return 'Čeká průvodce';
            return 'Připraven';
          })();
          const pillTon =
            pillText === 'Připraven' || pillText.startsWith('Předáno')
              ? 'ok'
              : pillText === 'Odjel' ||
                  pillText.startsWith('Odjel') ||
                  pillText === 'Zrušeno' ||
                  pillText === 'Nedojezd'
                ? 'seda'
                : 'wait';
          const osobText =
            row.osob == null ? null : row.osob === 1 ? '1 dospělý' : `${row.osob} dospělí`;
          return (
            <>
              <div className="ph-nova-hlava">
                <div className="ph-nova-hlava__levy">
                  <div className="ph-nova-top">
                    <span>
                      {stitekDneKarty(row.prijezd, dnes)}
                      {row.apartman ? ` · ${row.apartman}` : ''}
                      {row.stitek === 'rucne' ? ' · Ruční' : ''}
                    </span>
                  </div>
                  <div className="ph-nova-jmeno">{kdo}</div>
                  <p className="ph-nova-sub">
                    {[apartman, osobText, termin].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="ph-nova-hlava__pravy">
                  <span className={`ph-nova-pill ph-nova-pill--${pillTon}`}>{pillText}</span>
                  <ClubKartaNahore
                    rezervace={row.rezervace}
                    ukazka={ukazka}
                    onHlaska={setHlaska}
                  />
                </div>
              </div>
              {staly ? (
                <p className={staly.shoda === 'slaba' ? 'ph-staly is-slaba' : 'ph-staly'}>{textStalehoHosta(staly)}</p>
              ) : null}
              {praniStitky[row.rezervace] ? (
                <PraniStitek
                  pocet={praniStitky[row.rezervace].pocet}
                  nove={praniStitky[row.rezervace].nove}
                  onClick={() => otevriPrani(row.rezervace)}
                />
              ) : null}
              <FakturaStitek
                faktura={row.faktura}
                zruseno={row.stav === 'zruseno'}
                onClick={() => otevriFakturu(row.rezervace)}
              />
              {row.shrnutiKdy ? (
                <p className="ph-staly">
                  {zmenaPoShrnuti(shrnutiVstupRadku(row), dnes)
                    ? 'Změna po odeslání shrnutí'
                    : 'Shrnutí ✓'}
                </p>
              ) : null}
              {telefonZMinulaBlok}
              {kontaktNahoreBlok}
              <div className="ph-nova-dlazdice">
                {nedojezd ? null : predanoKdy ? (
                  <button
                    type="button"
                    className={`ph-nova-tile${
                      jeHodina(odjezdCas) ? ' ph-nova-tile--ok' : ' ph-nova-tile--chybi'
                    }`}
                    disabled={jeHodina(odjezdCas) || odjel}
                    onClick={() => {
                      if (jeHodina(odjezdCas) || odjel) return;
                      setVolba((prev) => ({ ...prev, [row.rezervace]: 'odjezd' }));
                      setKanalZpravy((prev) => ({
                        ...prev,
                        [row.rezervace]: prev[row.rezervace] || 'whatsapp',
                      }));
                      setPanelZpravy((prev) => ({ ...prev, [row.rezervace]: true }));
                    }}
                  >
                    <span className="ph-nova-tile__radek">
                      <span className="ph-nova-tile__ico" aria-hidden="true">
                        ⏱
                      </span>
                      <span className="ph-nova-tile__telo">
                        <span className="ph-nova-tile__nadpis">Odjezd</span>
                        <span className="ph-nova-tile__hlavni">
                          {jeHodina(odjezdCas) ? zobrazCas(odjezdCas) : 'Čas chybí'}
                        </span>
                        <span className="ph-nova-tile__drobek">
                          {jeHodina(odjezdCas)
                            ? row.casOdjezduZadalHost && !casyOdjezdu[row.rezervace]
                              ? 'Čas zadal host'
                              : 'Čas máme'
                            : row.odjezdDotaz
                              ? 'Dotaz poslán · napsat znovu'
                              : 'Napsat o čas'}
                        </span>
                      </span>
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`ph-nova-tile${casOk ? ' ph-nova-tile--ok' : ' ph-nova-tile--chybi'}`}
                    disabled={casOk || odjel}
                    onClick={() => {
                      if (casOk || odjel) return;
                      setVolba((prev) => ({ ...prev, [row.rezervace]: casZpravaId }));
                      setKanalZpravy((prev) => ({
                        ...prev,
                        [row.rezervace]: prev[row.rezervace] || 'whatsapp',
                      }));
                      setPanelZpravy((prev) => ({ ...prev, [row.rezervace]: true }));
                    }}
                  >
                    <span className="ph-nova-tile__radek">
                      <span className="ph-nova-tile__ico" aria-hidden="true">
                        ⏱
                      </span>
                      <span className="ph-nova-tile__telo">
                        <span className="ph-nova-tile__nadpis">Příjezd</span>
                        <span className="ph-nova-tile__hlavni">{casOk ? casText : 'Čas chybí'}</span>
                        <span className="ph-nova-tile__drobek">
                          {casOk
                            ? row.casZadalHost
                              ? 'Čas zadal host'
                              : 'Čas máme'
                            : `${popisekStupneCasu(casZpravaId)} · napsat`}
                        </span>
                      </span>
                    </span>
                  </button>
                )}
                {row.zpusobPrijezdu === 'pesky' ? (
                  <button type="button" className="ph-nova-tile ph-nova-tile--ok" disabled>
                    <span className="ph-nova-tile__radek">
                      <span className="ph-nova-tile__ico" aria-hidden="true">
                        🚶
                      </span>
                      <span className="ph-nova-tile__telo">
                        <span className="ph-nova-tile__nadpis">Způsob</span>
                        <span className="ph-nova-tile__hlavni">Pěšky</span>
                        <span className="ph-nova-tile__drobek">bez brány</span>
                      </span>
                    </span>
                  </button>
                ) : row.zpusobPrijezdu === 'auto' ? (
                  <button
                    type="button"
                    className={`ph-nova-tile${
                      branaOk
                        ? ' ph-nova-tile--ok'
                        : branaChybiUdaje && vyzvaBrana.naRade
                          ? ' ph-nova-tile--chybi'
                          : branaChybiUdaje
                            ? ' ph-nova-tile--cek'
                            : ' ph-nova-tile--ne'
                    }`}
                    disabled={branaOk || odjel}
                    onClick={() => {
                      if (branaOk || odjel) return;
                      if (branaChybiUdaje) {
                        setVolba((prev) => ({ ...prev, [row.rezervace]: 'brana' }));
                        setKanalZpravy((prev) => ({ ...prev, [row.rezervace]: prev[row.rezervace] || 'whatsapp' }));
                        setPanelZpravy((prev) => ({ ...prev, [row.rezervace]: true }));
                        requestAnimationFrame(() => {
                          document.getElementById(`zprava-${row.rezervace}`)?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest',
                          });
                        });
                        return;
                      }
                      setBranaZTile((prev) => ({ ...prev, [row.rezervace]: true }));
                      setBranaVyzva((prev) => ({
                        ...prev,
                        [row.rezervace]: (prev[row.rezervace] || 0) + 1,
                      }));
                      requestAnimationFrame(() => {
                        document.getElementById(`brana-${row.rezervace}`)?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'nearest',
                        });
                      });
                    }}
                  >
                    <span className="ph-nova-tile__radek">
                      <span className="ph-nova-tile__ico" aria-hidden="true">
                        🚗
                      </span>
                      <span className="ph-nova-tile__telo">
                        <span className="ph-nova-tile__nadpis">Autem</span>
                        <span className="ph-nova-tile__hlavni">{branaHlavni}</span>
                        <span className="ph-nova-tile__drobek">
                          {branaOk
                            ? branaDrobek
                            : branaChybiUdaje
                              ? `${popisekStupneBrany(branaStupenVal)} · napsat`
                              : branaDrobek}
                        </span>
                        {!branaOk && branaChybiUdaje ? (
                          <span className="ph-nova-tile__vyzva">{vyzvaBrana.plny}</span>
                        ) : null}
                      </span>
                      {branaOk ? (
                        <span className="ph-nova-tile__znacka" aria-hidden="true">
                          ✓
                        </span>
                      ) : null}
                    </span>
                  </button>
                ) : (
                  <button type="button" className="ph-nova-tile ph-nova-tile--chybi" disabled>
                    <span className="ph-nova-tile__radek">
                      <span className="ph-nova-tile__ico" aria-hidden="true">
                        ?
                      </span>
                      <span className="ph-nova-tile__telo">
                        <span className="ph-nova-tile__nadpis">Způsob</span>
                        <span className="ph-nova-tile__hlavni">Neznámý</span>
                        <span className="ph-nova-tile__drobek">host ještě nevybral</span>
                      </span>
                    </span>
                  </button>
                )}
              </div>
              <div className="ph-nova-stavy">
                <button
                  type="button"
                  className={`ph-nova-stav${
                    checkinOk
                      ? ' ph-nova-stav--ok'
                      : vyzvaCheckin.naRade
                        ? ' ph-nova-stav--ne'
                        : ' ph-nova-stav--cek'
                  }`}
                  disabled={checkinOk || odjel}
                  onClick={() => {
                    if (checkinOk || odjel) return;
                    setVolba((prev) => ({ ...prev, [row.rezervace]: 'checkin' }));
                    setKanalZpravy((prev) => ({ ...prev, [row.rezervace]: prev[row.rezervace] || 'whatsapp' }));
                    setPanelZpravy((prev) => ({ ...prev, [row.rezervace]: true }));
                  }}
                >
                  <span className="ph-nova-stav__znacka" aria-hidden="true">
                    {checkinOk ? '✓' : '!'}
                  </span>
                  <span className="ph-nova-stav__titulek">Check-in</span>
                  <span className="ph-nova-stav__popis">
                    {checkinOk
                      ? row.checkinNeniPotreba && row.stav === 'bez_checkinu'
                        ? 'Bez check-inu'
                        : 'Hotovo'
                      : ukazatCheckinNedojezd({
                            stav: row.stav,
                            prijezd: row.prijezd,
                            dnes,
                            predano: predanoRadku(row) || '',
                            historie: row.historie,
                          })
                        ? popisekStupneCheckinu('nedojezd')
                        : popisekStupneCheckinu(checkinStupen)}
                  </span>
                  {!checkinOk ? <span className="ph-nova-stav__vyzva">{vyzvaCheckin.plny}</span> : null}
                </button>
                <button
                  type="button"
                  className={`ph-nova-stav${
                    pruvodceOk
                      ? ' ph-nova-stav--ok'
                      : cekaWhatsAppPoPruvodci(row.historie) || vyzvaPruvodce.naRade
                        ? ' ph-nova-stav--ne'
                        : ' ph-nova-stav--cek'
                  }`}
                  disabled={pruvodceOk || odjel || !checkinOk}
                  onClick={() => {
                    if (pruvodceOk || odjel || !checkinOk) return;
                    if (cekaWhatsAppPoPruvodci(row.historie) && (row.otevrenoPocet ?? 0) === 0) {
                      setVolba((prev) => ({ ...prev, [row.rezervace]: 'pruvodceEmail' }));
                      setKanalZpravy((prev) => ({ ...prev, [row.rezervace]: 'whatsapp' }));
                      setPanelZpravy((prev) => ({ ...prev, [row.rezervace]: true }));
                      return;
                    }
                    if (!casOk) {
                      setVolba((prev) => ({ ...prev, [row.rezervace]: casZpravaId }));
                      setKanalZpravy((prev) => ({ ...prev, [row.rezervace]: prev[row.rezervace] || 'whatsapp' }));
                      setPanelZpravy((prev) => ({ ...prev, [row.rezervace]: true }));
                    }
                  }}
                >
                  <span className="ph-nova-stav__znacka" aria-hidden="true">
                    {pruvodceOk ? '✓' : '!'}
                  </span>
                  <span className="ph-nova-stav__titulek">Průvodce</span>
                  <span className="ph-nova-stav__popis">
                    {pruvodceOk
                      ? 'Hotovo'
                      : cekaWhatsAppPoPruvodci(row.historie) && (row.otevrenoPocet ?? 0) === 0
                        ? row.telefonWa
                          ? 'Pošlete WhatsApp'
                          : 'Doplňte telefon'
                        : !casOk
                          ? 'čeká na čas'
                          : (row.otevrenoPocet ?? 0) === 0
                            ? 'neotevřen'
                            : 'dokončit'}
                  </span>
                  {!predanoRadku(row) ? (
                    <span className="ph-nova-stav__otevreni" title={row.otevreniTitle || undefined}>
                      {textOtevreniDlazdice(row)}
                    </span>
                  ) : null}
                  {!pruvodceOk ? (
                    <span className="ph-nova-stav__vyzva">
                      {cekaWhatsAppPoPruvodci(row.historie) && (row.otevrenoPocet ?? 0) === 0
                        ? row.telefonWa
                          ? 'Průvodce odešel e-mailem. Pošlete WhatsApp.'
                          : 'Průvodce odešel e-mailem. Nejdřív doplňte telefon.'
                        : vyzvaPruvodce.plny}
                    </span>
                  ) : null}
                </button>
              </div>
            </>
          );
        })()}
        {(() => {
          if (nedojezd || odjel) return null;
          const vstupShrnuti = shrnutiVstupRadku(row);
          if (!cekaShrnuti(vstupShrnuti, dnes)) return null;
          const textShrnutiKarty =
            zpravyRadku(row).find((z) => z.id === 'shrnuti')?.text ||
            textShrnuti(
              {
                casPrijezdu: row.casPrijezdu,
                zpusobPrijezdu: row.zpusobPrijezdu,
                telefonBrana: row.telefonBrana,
                apartman: row.apartman,
                jazyk: jazykRadku(row),
              },
              jazykRadku(row),
              row.odkaz,
            );
          const waShrnuti = row.telefonWa;
          const telefonSmsShrnuti = row.telefonText || (waShrnuti ? `+${waShrnuti}` : '');
          const emailShrnuti = row.email.includes('@') ? row.email : '';
          const panelOtevren = panelShrnutiKarty === row.rezervace;
          return (
            <div className="ph-karta-shrnuti">
              <button
                type="button"
                className="ph-nova-shrnuti"
                aria-expanded={panelOtevren}
                onClick={() =>
                  setPanelShrnutiKarty((prev) => (prev === row.rezervace ? null : row.rezervace))
                }
              >
                Vše připraveno
              </button>
              {panelOtevren ? (
                <div className="ph-odjezdy__akce ph-karta-shrnuti__akce">
                  {waShrnuti ? (
                    <TlacitkoWhatsApp
                      wa={waShrnuti}
                      zprava={textShrnutiKarty}
                      userAgent={userAgent}
                      onPredOtevrenim={() => oznacShrnuti(row, 'whatsapp')}
                    >
                      WhatsApp
                    </TlacitkoWhatsApp>
                  ) : null}
                  {telefonSmsShrnuti ? (
                    <a
                      className="ph-wa"
                      href={odkazSmsShrnuti(telefonSmsShrnuti, textShrnutiKarty, jeIos(userAgent))}
                      onClick={() => void oznacShrnuti(row, 'sms')}
                    >
                      SMS
                    </a>
                  ) : null}
                  {emailShrnuti ? (
                    <button
                      type="button"
                      className="ph-wa"
                      onClick={() => otevriDotazShrnutiEmail(row.rezervace)}
                    >
                      E-mail
                    </button>
                  ) : null}
                  <button type="button" className="ph-kopie" onClick={() => void oznacShrnuti(row, 'rucne')}>
                    Odesláno ručně
                  </button>
                  <button
                    type="button"
                    className="ph-kopie"
                    onClick={() => void oznacShrnuti(row, 'neposilat')}
                  >
                    Neposílat
                  </button>
                  {dotazShrnuti === row.rezervace ? (
                    <div
                      id={`shrnuti-email-${row.rezervace}`}
                      className="ph-predano-dotaz ph-predano-dotaz--email"
                    >
                      <p>
                        Pošleme e-mail ze systému VIVIEN na <span className="ph-tel">{emailShrnuti}</span>
                        {row.shrnutiKdy ? ' znovu' : ''}. Není to WhatsApp ani SMS.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setDotazShrnuti(null);
                          void posliEmail(row, 'shrnuti');
                        }}
                      >
                        Ano, poslat e-mail
                      </button>
                      <button type="button" onClick={() => setDotazShrnuti(null)}>
                        Zrušit
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })()}
        {panelZpravy[row.rezervace] ? (
          <div className="ph-nova-panel" id={`zprava-${row.rezervace}`}>
            <h3>Napsat zprávu</h3>
            <div className="ph-nova-kanaly">
              <button
                type="button"
                className={`ph-nova-kanal${(kanalZpravy[row.rezervace] || 'whatsapp') === 'whatsapp' ? ' is-on' : ''}`}
                disabled={!wa}
                onClick={() => setKanalZpravy((prev) => ({ ...prev, [row.rezervace]: 'whatsapp' }))}
              >
                WhatsApp
              </button>
              <button
                type="button"
                className={`ph-nova-kanal${kanalZpravy[row.rezervace] === 'sms' ? ' is-on' : ''}`}
                disabled={!wa}
                onClick={() => setKanalZpravy((prev) => ({ ...prev, [row.rezervace]: 'sms' }))}
              >
                SMS
              </button>
              <button
                type="button"
                className={`ph-nova-kanal${kanalZpravy[row.rezervace] === 'email' ? ' is-on' : ''}`}
                disabled={!emailHosta}
                onClick={() => setKanalZpravy((prev) => ({ ...prev, [row.rezervace]: 'email' }))}
              >
                E-mail
              </button>
            </div>
            {maMenuZprav ? (
              <select
                value={volba[row.rezervace] ?? zpravyHosta.find((z) => z.vychozi)?.id ?? ''}
                onChange={(e) => setVolba((prev) => ({ ...prev, [row.rezervace]: e.target.value }))}
                aria-label="Šablona zprávy"
              >
                {zpravyHosta.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.nazev}
                    {z.vychozi ? ' · podle fáze' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="ph-hlaska">Teď není co poslat.</p>
            )}
            {(() => {
              const idZpravy = volba[row.rezervace] ?? zpravyHosta.find((z) => z.vychozi)?.id;
              const denOk =
                Boolean(row.prijezd) && (dnes === row.prijezd || dnes === posunDen(row.prijezd!, -1));
              if (
                idZpravy === 'nerozbalen' ||
                idZpravy === 'denNerozbalen' ||
                idZpravy === 'pruvodce3' ||
                idZpravy === 'nedojezd' ||
                idZpravy === 'neotevrel'
              ) {
                const uz = pocetCasovychPripoinek(row.historie);
                const dalsi = dalsiCasovaZprava(uz, denOk, row.historie);
                const pop =
                  idZpravy === 'neotevrel'
                    ? popisekStupneCasu(dalsi === 'nedojezd' ? 'pruvodce3' : dalsi)
                    : popisekStupneCasu(idZpravy as CasovaZpravaId);
                return (
                  <p className="ph-nova-panel__stupen">
                    {pop}
                    {uz ? ` · už odesláno ${uz}×` : ' · ještě neodesláno'}
                  </p>
                );
              }
              if (
                idZpravy === 'checkin' ||
                idZpravy === 'checkin2' ||
                idZpravy === 'checkin3' ||
                idZpravy === 'checkinNedojezd'
              ) {
                const uz = pocetCheckinPripoinek(row.historie);
                const pop =
                  idZpravy === 'checkinNedojezd'
                    ? popisekStupneCheckinu('nedojezd')
                    : popisekStupneCheckinu(
                        idZpravy === 'checkin2' ? 2 : idZpravy === 'checkin3' ? 3 : 1,
                      );
                return (
                  <p className="ph-nova-panel__stupen">
                    {pop}
                    {uz ? ` · už odesláno ${uz}×` : ' · ještě neodesláno'}
                  </p>
                );
              }
              if (idZpravy === 'brana' || idZpravy === 'brana2' || idZpravy === 'brana3') {
                const uz = pocetBranaPripoinek(row.historie);
                const stupen = idZpravy === 'brana2' ? 2 : idZpravy === 'brana3' ? 3 : 1;
                return (
                  <p className="ph-nova-panel__stupen">
                    {popisekStupneBrany(stupen)}
                    {uz ? ` · už odesláno ${uz}×` : ' · ještě neodesláno'}
                  </p>
                );
              }
              return null;
            })()}
            <div className="ph-nova-nahled">{zpravaRadku(row)}</div>
            <div className="ph-nova-rada">
              <button type="button" onClick={() => setPanelZpravy((prev) => ({ ...prev, [row.rezervace]: false }))}>
                Zavřít
              </button>
              {(kanalZpravy[row.rezervace] || 'whatsapp') === 'whatsapp' ? (
                <TlacitkoWhatsApp
                  wa={wa}
                  zprava={zpravaRadku(row)}
                  userAgent={userAgent}
                  onPredOtevrenim={() => oznacWhatsApp(row)}
                >
                  OK
                </TlacitkoWhatsApp>
              ) : null}
              {kanalZpravy[row.rezervace] === 'sms' ? (
                <button
                  type="button"
                  disabled={!wa || cekam !== null}
                  onClick={() => {
                    const druh = volba[row.rezervace] ?? zpravyHosta.find((z) => z.vychozi)?.id;
                    if (!wa || !druh) return;
                    void oznacKanal(row, 'sms', druh).then((text) => {
                      if (text == null) return;
                      window.location.href = smsOdkaz(`+${wa}`, text, jeIos(userAgent));
                    });
                  }}
                >
                  OK
                </button>
              ) : null}
              {kanalZpravy[row.rezervace] === 'email' && emailHosta ? (
                <button
                  type="button"
                  className="ph-wa"
                  onClick={() => setDotazEmail({ id: row.rezervace, email: emailHosta })}
                >
                  OK
                </button>
              ) : null}
              <button type="button" className="ph-kopie" onClick={() => void kopirovatZpravu(row)}>
                Zkopírovat
              </button>
            </div>
          </div>
        ) : null}
        {branaZTile[row.rezervace] || cekajici === 'registrace' || cekajici === 'odpoved'
          ? dil.panelBrany
          : null}
        {staly?.emailZMinula ? (
          <p className="ph-dnesek__akce">
            <button
              type="button"
              disabled={cekam !== null}
              onClick={() => void pouzijEmailZMinula(row, staly.emailZMinula!)}
            >
              Použít e-mail z minula: {staly.emailZMinula}
            </button>
          </p>
        ) : null}
        {staly?.kontaktZMinula ? (
          <p className="ph-staly">
            kontakt už máte z{' '}
            {(() => {
              const t = casPraha(staly.kontaktZMinula);
              const m = t.match(/(\d+)\.\s*(\d+)\.\s*(\d{4})/);
              return m ? `${m[2]}/${m[3]}` : t;
            })()}
          </p>
        ) : null}
        {row.zadostPrijezd?.stav === 'ceka' &&
        !oknoHotovo[`${row.rezervace}:potvrdit-prijezd`] &&
        !oknoHotovo[`${row.rezervace}:nelze-prijezd`] ? (
          <div className="ph-okno">
            <p>{vetaZadosti(row, 'prijezd')}</p>
            <button type="button" onClick={() => void oknoAkce(row, 'potvrdit-prijezd')}>
              Potvrdit
            </button>
            <button type="button" onClick={() => void oknoAkce(row, 'nelze-prijezd')}>
              Nelze
            </button>
            {dotazPrestoPrijezd === row.rezervace ? (
              <div className="ph-predano-dotaz">
                <p>Apartmán ještě není uklizený. Přesto potvrdit?</p>
                <button type="button" disabled={cekam !== null} onClick={() => void oknoAkce(row, 'potvrdit-prijezd', true)}>
                  Ano, potvrdit
                </button>
                <button type="button" onClick={() => setDotazPrestoPrijezd(null)}>
                  Zrušit
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {row.zadostOdjezd?.stav === 'ceka' &&
        !oknoHotovo[`${row.rezervace}:potvrdit-odjezd`] &&
        !oknoHotovo[`${row.rezervace}:nelze-odjezd`] ? (
          <div className="ph-okno">
            <p>{vetaZadosti(row, 'odjezd')}</p>
            <p className="ph-potvrzeni__nadpis">Jak se rozloučíme?</p>
            <div className="ph-potvrzeni__akce">
              <button
                type="button"
                disabled={cekam !== null}
                onClick={() => void oknoAkce(row, 'potvrdit-odjezd', false, 'osobne')}
              >
                Osobně
              </button>
              <button
                type="button"
                disabled={cekam !== null}
                onClick={() => void oknoAkce(row, 'potvrdit-odjezd', false, 'telefon')}
              >
                Sami
              </button>
              <button type="button" disabled={cekam !== null} onClick={() => void oknoAkce(row, 'nelze-odjezd')}>
                Nelze
              </button>
            </div>
          </div>
        ) : null}
        {row.zadostPozdniPrijezd?.stav === 'ceka' &&
        !oknoHotovo[`${row.rezervace}:potvrdit-pozni-prijezd`] &&
        !oknoHotovo[`${row.rezervace}:nelze-pozni-prijezd`] ? (
          <div className="ph-okno">
            <p>{vetaPozdnihoPrijezdu(row)}</p>
            <button type="button" disabled={cekam !== null} onClick={() => void potvrdPozniPrijezd(row)}>
              Potvrdit
            </button>
            <button
              type="button"
              disabled={cekam !== null}
              onClick={() =>
                setPozniOdmitnoutOtevreno((prev) => (prev === row.rezervace ? null : row.rezervace))
              }
            >
              Nelze
            </button>
            {pozniOdmitnoutOtevreno === row.rezervace ? (
              <div className="ph-predano-dotaz">
                <label>
                  Zpráva hostovi
                  <textarea
                    rows={3}
                    value={pozniOdmitnuti[row.rezervace] || ''}
                    onChange={(e) =>
                      setPozniOdmitnuti((prev) => ({ ...prev, [row.rezervace]: e.target.value }))
                    }
                    placeholder="Napište vlastní text: jiný čas, nebo že to nejde."
                  />
                </label>
                <button type="button" disabled={cekam !== null} onClick={() => void odmitniPozniPrijezd(row)}>
                  Odeslat hostovi
                </button>
                <button type="button" onClick={() => setPozniOdmitnoutOtevreno(null)}>
                  Zrušit
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {jeHodina(odjezdCas) &&
        row.odjezd &&
        row.odjezd >= posunDen(dnes, -ROZLOUCENI_ZPET_DNY) ? (
          <div className="ph-prijezd-cas">Odjezd {zobrazCas(odjezdCas)}</div>
        ) : null}
        {(() => {
          const casOkFaze = Boolean(casAktualni);
          /** Osobně/Sami hned po čase (i dopředu), ne u odjezdu staršího než 2 dny. */
          const odjezdOkFaze =
            jeHodina(odjezdCas) &&
            Boolean(row.odjezd) &&
            row.odjezd! >= posunDen(dnes, -ROZLOUCENI_ZPET_DNY);
          const branaOkFaze = row.zpusobPrijezdu === 'auto' && Boolean(row.branaRegistrovano);
          const branaPripravenaFaze =
            row.zpusobPrijezdu === 'auto' &&
            Boolean(row.telefonBrana) &&
            Boolean(row.spz || row.spzPujcene) &&
            !branaOkFaze;
          const potvrzeni = row.potvrzeniPrijezdu;
          const potvrzeniOd = row.potvrzeniOdjezdu;
          const klicPrijezd = `${row.rezervace}:prijezd`;
          const klicOdjezd = `${row.rezervace}:odjezd`;
          const rozbalPrijezd = Boolean(potvrzeniRozbal[klicPrijezd]);
          const rozbalOdjezd = Boolean(potvrzeniRozbal[klicOdjezd]);
          const cekaPrijezd = casOkFaze && !potvrzeni;
          const cekaOdjezd = odjezdOkFaze && !potvrzeniOd;
          const cekaBrana = branaPripravenaFaze;
          const jenHotovo =
            !cekaPrijezd &&
            !cekaOdjezd &&
            !cekaBrana &&
            !rozbalPrijezd &&
            !rozbalOdjezd &&
            (Boolean(potvrzeni) || Boolean(potvrzeniOd) || branaOkFaze);
          const ukazFaze =
            !mimoAkce &&
            row.stav !== 'zruseno' &&
            (casOkFaze || odjezdOkFaze || branaPripravenaFaze || branaOkFaze);
          if (!ukazFaze) return null;
          const stitekPrijezdu =
            potvrzeni === 'osobne'
              ? 'Osobně ubytujeme · zpráva hostovi'
              : potvrzeni === 'telefon'
                ? 'Jsme na telefonu'
                : '';
          const stitekOdjezdu =
            potvrzeniOd === 'osobne'
              ? 'Osobně se rozloučíme · zpráva hostovi'
              : potvrzeniOd === 'telefon'
                ? 'Sami · jsme na telefonu'
                : '';
          return (
            <div
              className={`ph-potvrzeni${jenHotovo ? ' ph-potvrzeni--sbaleno' : ''}`}
              id={`ph-potvrzeni-${row.rezervace}`}
            >
              {casOkFaze ? (
                potvrzeni && !rozbalPrijezd ? (
                  <button
                    type="button"
                    className="ph-potvrzeni__radek"
                    disabled={cekam !== null}
                    aria-expanded={false}
                    onClick={() =>
                      setPotvrzeniRozbal((prev) => ({ ...prev, [klicPrijezd]: true }))
                    }
                  >
                    <span>{stitekPrijezdu}</span>
                    <span aria-hidden="true">▾</span>
                  </button>
                ) : (
                  <div className="ph-potvrzeni__blok">
                    {potvrzeni ? (
                      <button
                        type="button"
                        className="ph-potvrzeni__radek"
                        disabled={cekam !== null}
                        aria-expanded={true}
                        onClick={() =>
                          setPotvrzeniRozbal((prev) => ({ ...prev, [klicPrijezd]: false }))
                        }
                      >
                        <span>{stitekPrijezdu}</span>
                        <span aria-hidden="true">▴</span>
                      </button>
                    ) : (
                      <p className="ph-potvrzeni__nadpis">
                        Čas {casText || casAktualni}. Jak ubytujeme?
                      </p>
                    )}
                    <div className="ph-potvrzeni__akce">
                      <button
                        type="button"
                        className={potvrzeni === 'osobne' ? 'is-on' : ''}
                        disabled={cekam !== null}
                        onClick={() => void ulozPotvrzeniPrijezdu(row, 'osobne')}
                      >
                        Osobně
                      </button>
                      <button
                        type="button"
                        className={potvrzeni === 'telefon' ? 'is-on' : ''}
                        disabled={cekam !== null}
                        onClick={() => void ulozPotvrzeniPrijezdu(row, 'telefon')}
                      >
                        Na telefonu
                      </button>
                    </div>
                  </div>
                )
              ) : null}
              {odjezdOkFaze ? (
                potvrzeniOd && !rozbalOdjezd ? (
                  <button
                    type="button"
                    className="ph-potvrzeni__radek"
                    disabled={cekam !== null}
                    aria-expanded={false}
                    onClick={() =>
                      setPotvrzeniRozbal((prev) => ({ ...prev, [klicOdjezd]: true }))
                    }
                  >
                    <span>{stitekOdjezdu}</span>
                    <span aria-hidden="true">▾</span>
                  </button>
                ) : (
                  <div className="ph-potvrzeni__blok">
                    {potvrzeniOd ? (
                      <button
                        type="button"
                        className="ph-potvrzeni__radek"
                        disabled={cekam !== null}
                        aria-expanded={true}
                        onClick={() =>
                          setPotvrzeniRozbal((prev) => ({ ...prev, [klicOdjezd]: false }))
                        }
                      >
                        <span>{stitekOdjezdu}</span>
                        <span aria-hidden="true">▴</span>
                      </button>
                    ) : (
                      <p className="ph-potvrzeni__nadpis">
                        Odjezd {zobrazCas(odjezdCas)}. Jak se rozloučíme?
                      </p>
                    )}
                    <div className="ph-potvrzeni__akce">
                      <button
                        type="button"
                        className={potvrzeniOd === 'osobne' ? 'is-on' : ''}
                        disabled={cekam !== null}
                        onClick={() => void ulozPotvrzeniOdjezdu(row, 'osobne')}
                      >
                        Osobně
                      </button>
                      <button
                        type="button"
                        className={potvrzeniOd === 'telefon' ? 'is-on' : ''}
                        disabled={cekam !== null}
                        onClick={() => void ulozPotvrzeniOdjezdu(row, 'telefon')}
                      >
                        Sami
                      </button>
                    </div>
                  </div>
                )
              ) : null}
              {branaPripravenaFaze ? (
                <div className="ph-potvrzeni__blok">
                  <p className="ph-potvrzeni__nadpis">Brána. Číslo máme, zapsat?</p>
                  <div className="ph-potvrzeni__akce">
                    <button
                      type="button"
                      disabled={cekam !== null}
                      onClick={() => void ulozBranaOkKarty(row)}
                    >
                      Brána OK
                    </button>
                  </div>
                </div>
              ) : null}
              {branaOkFaze ? (
                <p className="ph-potvrzeni__stav ph-potvrzeni__stav--tichy">
                  Brána OK
                  {row.zpravaBranaOdeslana ? ' · zpráva hostovi' : ''}
                  {row.telefonBrana ? ` · ${row.telefonBrana}` : ''}
                </p>
              ) : null}
            </div>
          );
        })()}
        <div className="ph-nova-platba">{poplatekRadek}</div>
        {chyba ? <div className="ph-chyba-kratka">{chyba}</div> : null}
        {predaniNahore ? (
          <>
            {predaniTlacitko}
            {!predaniDotazJeNedojezd ? predaniDotaz : null}
            {kanalKartyPodTlacitkem}
          </>
        ) : null}
        {predanoKdy ? (
          <>
            <button
              type="button"
              className="ph-nova-predani"
              disabled={cekam !== null}
              onClick={() => void otevriOknoKarty(row)}
            >
              {row.kartaPredana ? 'Poslat kartu znovu' : 'Poslat kartu'}
            </button>
            {kanalKartyPodTlacitkem}
            {row.kartaPredana
              ? (() => {
                  const stitek = textKartaPoslana(
                    row.kartaPredana,
                    hodinaPraha(row.kartaPredana.kdy),
                  );
                  return stitek ? <p className="ph-karta-poslana">{stitek}</p> : null;
                })()
              : null}
          </>
        ) : null}
        {jazykNahore ? <div className="ph-znovu">{jazykSelect}</div> : null}
        <div className="ph-nova-rada">
          {row.telefonText || row.jinyTelefonText ? (
            <a
              className="ph-wa"
              href={`tel:${String(row.telefonText || row.jinyTelefonText).replace(/\s+/g, '')}`}
            >
              Zavolat
            </a>
          ) : (
            <button type="button" className="ph-predano" disabled>
              Zavolat
            </button>
          )}
          <button
            type="button"
            className="ph-nova-zprava"
            onClick={() => setPanelZpravy((prev) => ({ ...prev, [row.rezervace]: !prev[row.rezervace] }))}
          >
            Napsat zprávu
          </button>
        </div>
        <button
          type="button"
          className="ph-nova-more"
          aria-expanded={rozbaleno}
          onClick={() => {
            if (rozbaleno) {
              setRozbalene((prev) => ({ ...prev, [row.rezervace]: false }));
            } else {
              rozbalDetailKarty(row.rezervace);
            }
          }}
        >
          <span>{rozbaleno ? 'Skrýt další údaje' : 'Další údaje'}</span>
          <span aria-hidden="true">{rozbaleno ? '▴' : '▾'}</span>
        </button>
        <div className="ph-detail">
          {row.navrhy.map((n) => (
            <p key={n.pole} className="ph-navrh">
              {n.veta}
              {' · '}
              <button type="button" onClick={() => prevzit(row, n.pole, n.hodnota)}>
                Použít
              </button>
            </p>
          ))}
          {(() => {
            const otevrene = detailSekce[row.rezervace] || [];
            const jeOtevrena = (id: DetailSekceId) => otevrene.includes(id);
            const vseOtevrene = DETAIL_SEKCE_VSE.every((id) => otevrene.includes(id));
            const prepni = (id: DetailSekceId) => {
              const cur = detailSekce[row.rezervace] || [];
              const dalsi = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
              nastavSekceKarty(row.rezervace, dalsi);
            };
            const telDrobek = row.telefonText || row.jinyTelefonText || 'bez čísla';
            const pobytDrobek = staly && staly.poradi > 1 ? `${staly.poradi}. pobyt` : null;
            const kontaktDrobek = [
              telDrobek,
              pobytDrobek,
              row.bezMarketingu ? 'Nechce e-maily' : '',
            ]
              .filter(Boolean)
              .join(' · ');
            const casDrobek = [
              casAktualni ? `příjezd ${casAktualni}` : 'bez času',
              odjezdCas ? `odjezd ${odjezdCas}` : null,
            ]
              .filter(Boolean)
              .join(' · ');
            const parkDrobek =
              row.zpusobPrijezdu === 'pesky'
                ? 'pěšky'
                : row.zpusobPrijezdu === 'auto'
                  ? row.branaRegistrovano
                    ? 'brána zapsaná'
                    : 'brána nehotová'
                  : 'způsob neznámý';
            const pruvodceDrobek = jazykZnamy ? jazykText : 'jazyk chybí';
            const penizeDrobek = platbaHotovo
              ? 'uhrazeno'
              : sumaNezap
                ? `${sumaNezap}\u00A0Kč`
                : 'bez dluhu';
            const historieDrobek = row.historie.length
              ? `${row.historie.length} záznam${row.historie.length === 1 ? '' : row.historie.length < 5 ? 'y' : 'ů'}`
              : 'prázdná';
            const predaniDrobek = predanoKdy
              ? `předáno${hodinaPraha(predanoKdy) ? ` ${hodinaPraha(predanoKdy)}` : ''}`
              : 'ještě nepředáno';
            const zavadyDrobek = zavady || zavadyPo ? 'jsou závady' : 'bez závad';
            const individualniCas =
              row.zadostPozdniPrijezd?.stav === 'potvrzeno' &&
              row.zadostPozdniPrijezd.cas > '21:00'
                ? row.zadostPozdniPrijezd.cas
                : null;
            const zmenyDrobek = [
              row.odjezd ? `odjezd ${row.odjezd}` : 'bez odjezdu',
              row.accessPin ? 'PIN ano' : 'bez PINu',
              row.dohodaKc ? `${row.dohodaKc} Kč` : null,
              individualniCas ? `individuální ${individualniCas}` : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <>
                <button
                  type="button"
                  className="ph-sekce-vse"
                  onClick={() =>
                    nastavSekceKarty(row.rezervace, vseOtevrene ? [] : [...DETAIL_SEKCE_VSE])
                  }
                >
                  {vseOtevrene ? 'Sbalit vše' : 'Rozbalit vše'}
                </button>
                <DetailSekce
                  nazev="Změny"
                  drobek={zmenyDrobek}
                  otevreno={jeOtevrena('zmeny')}
                  onToggle={() => prepni('zmeny')}
                >
                  <PoleSUlozenim
                    key={`${row.rezervace}-den-prijezdu:${row.prijezd || ''}`}
                    label="Den příjezdu"
                    hodnota={row.prijezd || ''}
                    vstup={{ type: 'date' }}
                    onUloz={(text) => ulozDenPrijezdu(row, text)}
                  />
                  <PoleSUlozenim
                    key={`${row.rezervace}-den-odjezdu:${row.odjezd || ''}`}
                    label="Den odjezdu"
                    hodnota={row.odjezd || ''}
                    vstup={{ type: 'date' }}
                    onUloz={(text) => ulozDenOdjezdu(row, text)}
                  />
                  <PoleSUlozenim
                    key={`${row.rezervace}-pin:${row.accessPin || ''}`}
                    label="PIN apartmánu"
                    hodnota={row.accessPin || ''}
                    vstup={{ inputMode: 'numeric', autoComplete: 'off' }}
                    onUloz={(text) => ulozPin(row, text)}
                  />
                  <DohodaPole
                    key={`${row.rezervace}-dohoda:${row.dohodaKc || 0}:${row.dohodaPoznamka || ''}`}
                    kc={row.dohodaKc}
                    poznamka={row.dohodaPoznamka}
                    onUloz={(castka, text) => ulozDohodu(row, castka, text)}
                  />
                  <HostUzZaplatilPole
                    key={`${row.rezervace}-uz-zaplaceno`}
                    disabled={cekam !== null}
                    mena={row.mena === 'EUR' ? 'EUR' : 'CZK'}
                    onUloz={(castka, text) => ulozUzZaplaceno(row, castka, text)}
                  />
                  <div className="ph-pole-rada">
                    <button
                      type="button"
                      className={`ph-predano${row.checkinNeniPotreba ? ' is-on' : ''}`}
                      disabled={cekam !== null}
                      onClick={() => void ulozCheckinNeni(row, !row.checkinNeniPotreba)}
                    >
                      {row.checkinNeniPotreba ? 'Bez check-inu · zapnuto' : 'Bez check-inu'}
                    </button>
                    {nedojezd ? (
                      <button
                        type="button"
                        className="ph-predano is-on"
                        disabled={cekam !== null}
                        onClick={() => setDotazPredani({ id: row.rezervace, druh: 'vratit-nedojezd' })}
                      >
                        Vrátit nedojezd
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="ph-predano"
                        disabled={cekam !== null || Boolean(predanoKdy)}
                        onClick={() => setDotazPredani({ id: row.rezervace, druh: 'nedojezd' })}
                      >
                        Nedojezd
                      </button>
                    )}
                  </div>
                  {predaniDotazJeNedojezd ? predaniDotaz : null}
                  {!oknoHotovo[`${row.rezervace}:individualni-pozni-prijezd`] ? (
                    <div className="ph-okno">
                      <p className="ph-hlaska">Individuální příjezd po 21:00 (výjimka)</p>
                      <label>
                        Čas
                        <input
                          type="time"
                          value={(pozniIndividualni[row.rezervace] || { cas: '', kc: '0' }).cas}
                          onChange={(e) =>
                            setPozniIndividualni((prev) => ({
                              ...prev,
                              [row.rezervace]: {
                                cas: e.target.value,
                                kc: (prev[row.rezervace] || { cas: '', kc: '0' }).kc,
                              },
                            }))
                          }
                        />
                      </label>
                      <label>
                        Příplatek Kč
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={(pozniIndividualni[row.rezervace] || { cas: '', kc: '0' }).kc}
                          onChange={(e) =>
                            setPozniIndividualni((prev) => ({
                              ...prev,
                              [row.rezervace]: {
                                cas: (prev[row.rezervace] || { cas: '', kc: '0' }).cas,
                                kc: e.target.value,
                              },
                            }))
                          }
                        />
                      </label>
                      <button
                        type="button"
                        disabled={cekam !== null}
                        onClick={() => void ulozIndividualniPozni(row)}
                      >
                        Uložit výjimku
                      </button>
                    </div>
                  ) : null}
                  <p className="ph-hlaska">
                    Den příjezdu a odjezdu drží kartu i kontrolu obsazenosti. PIN se ukáže v průvodci
                    (na Klice ručně). Domluvená částka i „Host už zaplatil“ jdou do Plateb. Bez
                    nového e-mailu hostovi. Co tu uložíte ručně, Better Hotel nepřepíše. „Bez
                    check-inu“ vypne červené čekání na online check-in. Nedojezd hosta schová
                    z denních akcí. Individuální příjezd po 21:00 sem patří, na kartě nahoře ho
                    neukazujeme.
                  </p>
                </DetailSekce>
                <DetailSekce
                  nazev="Kontakt"
                  drobek={kontaktDrobek}
                  otevreno={jeOtevrena('kontakt')}
                  onToggle={() => prepni('kontakt')}
                >
                  {!telefonNahore ? telefonPole(row) : null}
                  {row.jinyTelefonKtery ? (
                    <PoleSUlozenim
                      key={`${row.rezervace}-druhe`}
                      label="Druhé číslo"
                      hodnota={row.jinyTelefonText || ''}
                      vstup={{ type: 'tel', inputMode: 'tel', autoComplete: 'tel' }}
                      onUloz={(text) => ulozTelefon(row, row.jinyTelefonKtery || 'rezervace', text)}
                    />
                  ) : null}
                  {row.jinyTelefonKtery && row.jinyTelefonNejisty ? (
                    <div className="ph-predvolba">
                      Doplňte předvolbu, např. <span className="ph-tel">+34&nbsp;612&nbsp;345&nbsp;678</span>
                    </div>
                  ) : null}
                  {row.telefonPuvodni ? <div className="ph-puvodni">napsáno {row.telefonPuvodni}</div> : null}
                  {row.telefonNejisty ? (
                    <div className="ph-predvolba">
                      Doplňte předvolbu, např. <span className="ph-tel">+34&nbsp;612&nbsp;345&nbsp;678</span>
                    </div>
                  ) : null}
                  {row.jinyTelefonText && !row.jinyTelefonKtery ? (
                    <div className="ph-tel-jiny">
                      jiné číslo z rezervace: <span className="ph-tel">{row.jinyTelefonText}</span>
                      {row.jinyTelefonPuvodni ? (
                        <span className="ph-puvodni"> napsáno {row.jinyTelefonPuvodni}</span>
                      ) : null}
                      {row.jinyTelefonNejisty ? (
                        <div className="ph-predvolba">
                          Doplňte předvolbu, např. <span className="ph-tel">+34&nbsp;612&nbsp;345&nbsp;678</span>
                        </div>
                      ) : null}
                      {row.jinyTelefonWa && row.telefonWa && row.jinyTelefonWa !== row.telefonWa ? (
                        <TlacitkoWhatsApp
                          className="ph-wa--maly"
                          wa={row.jinyTelefonWa}
                          zprava={zpravaRadku(row)}
                          userAgent={userAgent}
                        />
                      ) : null}
                    </div>
                  ) : null}
                  <div className="ph-mail">
                    <Pole text={row.email} />
                  </div>
                  <div className="ph-pole-rada">
                    <button
                      type="button"
                      className={`ph-predano${row.bezMarketingu ? ' is-on' : ''}`}
                      disabled={cekam !== null}
                      onClick={() => void ulozBezMarketingu(row, !row.bezMarketingu)}
                    >
                      {row.bezMarketingu ? 'Nechce e-maily · zapnuto' : 'Nechce e-maily'}
                    </button>
                  </div>
                  {staly && staly.poradi > 1 ? (
                    <p className="ph-staly">
                      U nás {staly.poradi}. pobyt
                      {staly.predchozi.length
                        ? ` · předtím ${staly.predchozi.length}×`
                        : null}
                    </p>
                  ) : null}
                  {row.telefonText || row.jinyTelefonText ? (
                    <a
                      className="ph-wa"
                      href={`tel:${String(row.telefonText || row.jinyTelefonText).replace(/\s+/g, '')}`}
                    >
                      Zavolat
                    </a>
                  ) : null}
                  {kontaktNahore ? null : tlacitkoKontakt}
                </DetailSekce>

                <DetailSekce
                  nazev="Časy"
                  drobek={casDrobek}
                  otevreno={jeOtevrena('casy')}
                  onToggle={() => prepni('casy')}
                >
                  {casPole}
                  {odjezdPole}
                  <div className="ph-cell" data-label="Termín">
                    <Pole text={row.termin} />
                  </div>
                  {row.prevzatoKdy ? (
                    <button
                      type="button"
                      className="ph-predano"
                      onClick={() => setDotazVratitOdjezd(row.rezervace)}
                    >
                      Vrátit odjezd
                    </button>
                  ) : null}
                  {dotazVratitOdjezd === row.rezervace ? (
                    <div className="ph-predano-dotaz">
                      <p>Vrátit hosta mezi odjezdy?</p>
                      <button
                        type="button"
                        onClick={() => {
                          setDotazVratitOdjezd(null);
                          if (ukazka) {
                            poPrevzeti(row.rezervace, null);
                            return;
                          }
                          void fetch('/api/prehled/akce', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ rezervace: row.rezervace, akce: 'vratit-odjezd' }),
                          }).then((res) => {
                            if (res.ok) poPrevzeti(row.rezervace, null);
                          });
                        }}
                      >
                        Ano, vrátit
                      </button>
                      <button type="button" onClick={() => setDotazVratitOdjezd(null)}>
                        Zrušit
                      </button>
                    </div>
                  ) : null}
                  <p className="ph-hlaska">Skutečný příjezd pro příplatek je u Peněz.</p>
                </DetailSekce>

                <DetailSekce
                  nazev="Předání"
                  drobek={`${predaniDrobek} · ${zavadyDrobek}`}
                  otevreno={jeOtevrena('predani')}
                  onToggle={() => prepni('predani')}
                >
                  {nedojezd ? (
                    <p className="ph-hlaska">Nedojezd je ve Změnách. Odtud ho jde vrátit.</p>
                  ) : predaniNahore ? (
                    <p className="ph-hlaska">Předat apartmán je nahoře na kartě.</p>
                  ) : (
                    <>
                      {predaniTlacitko}
                      {!predaniDotazJeNedojezd ? predaniDotaz : null}
                      {kanalKartyPodTlacitkem}
                    </>
                  )}
                  {ukazZavady ? zavadyBlok : <p className="ph-hlaska">Zatím bez závad.</p>}
                  <PoznamkaUklidPole
                    key={`${row.rezervace}:${row.poznamkaUklid || ''}`}
                    hodnota={row.poznamkaUklid || ''}
                    disabled={ukazka || cekam !== null}
                    onUloz={async (text) => {
                      if (ukazka) {
                        setRadky((prev) =>
                          prev.map((r) =>
                            r.rezervace === row.rezervace ? { ...r, poznamkaUklid: text || null } : r,
                          ),
                        );
                        return;
                      }
                      setCekam(`${row.rezervace}:poznamka-uklid`);
                      try {
                        const res = await fetch('/api/prehled/akce', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            rezervace: row.rezervace,
                            akce: 'poznamka-uklid',
                            text,
                          }),
                        });
                        const json = (await res.json().catch(() => null)) as {
                          ok?: boolean;
                          poznamkaUklid?: string | null;
                          error?: string;
                        } | null;
                        if (!res.ok || !json?.ok) {
                          setHlaska(json?.error || 'Poznámka se neuložila.');
                          return;
                        }
                        setRadky((prev) =>
                          prev.map((r) =>
                            r.rezervace === row.rezervace
                              ? { ...r, poznamkaUklid: json.poznamkaUklid ?? null }
                              : r,
                          ),
                        );
                      } finally {
                        setCekam(null);
                      }
                    }}
                  />
                </DetailSekce>

                <DetailSekce
                  nazev="Přání hosta"
                  drobek={
                    praniStitky[row.rezervace]
                      ? `${praniStitky[row.rezervace].pocet} otevřená${
                          praniStitky[row.rezervace].nove
                            ? ` · ${praniStitky[row.rezervace].nove} nové`
                            : ''
                        }`
                      : null
                  }
                  otevreno={jeOtevrena('prani')}
                  onToggle={() => prepni('prani')}
                >
                  <PraniDetail
                    rezervace={row.rezervace}
                    kdo={kdoKouka}
                    focusVlakno={praniFocus[row.rezervace] || null}
                    ukazka={ukazka}
                    wa={row.telefonWa || row.jinyTelefonWa}
                    userAgent={userAgent}
                    jazyk={jazykRadku(row)}
                    fakturaZadana={Boolean(row.faktura)}
                  />
                </DetailSekce>

                <DetailSekce
                  nazev="Faktura"
                  drobek={
                    row.faktura
                      ? row.stav === 'zruseno'
                        ? 'zrušeno'
                        : row.faktura.hotovo
                          ? 'vyřízeno'
                          : 'čeká na vystavení'
                      : null
                  }
                  otevreno={jeOtevrena('faktura')}
                  onToggle={() => prepni('faktura')}
                >
                  <FakturaDetail
                    row={row}
                    checkinUrl={odkazy[row.rezervace] ?? row.checkinUrl}
                    ukazka={ukazka}
                    userAgent={userAgent}
                    onZmena={zmenFakturu}
                    onCenaPobytu={zmenCenuPobytu}
                    onMena={(rezervace, mena) => {
                      const r = radky.find((x) => x.rezervace === rezervace);
                      if (r) void ulozMena(r, mena);
                    }}
                    onHlaska={setHlaska}
                  />
                </DetailSekce>

                <DetailSekce
                  nazev="Parkování"
                  drobek={parkDrobek}
                  otevreno={jeOtevrena('parkovani')}
                  onToggle={() => prepni('parkovani')}
                >
                  {row.zpusobPrijezdu === 'auto' && (row.telefonBrana || row.spz || row.spzPujcene) ? (
                    <div className={`ph-brana${row.branaRegistrovano ? ' ph-brana--ano' : ' ph-brana--ne'}`}>
                      Brána {row.telefonBrana ? textTelefonu(row.telefonBrana) : 'bez telefonu'}
                      {' · '}
                      {row.spzPujcene
                        ? 'SPZ později'
                        : row.spz
                          ? `SPZ ${row.spz.length > 4 ? `${row.spz.slice(0, -4)} ${row.spz.slice(-4)}` : row.spz}`
                          : 'bez SPZ'}
                    </div>
                  ) : null}
                  {dil.radek}
                  {branaZTile[row.rezervace] || cekajici === 'registrace' || cekajici === 'odpoved'
                    ? null
                    : dil.registrace}
                  {branaZTile[row.rezervace] || cekajici === 'registrace' || cekajici === 'odpoved'
                    ? null
                    : dil.odpoved}
                  {dil.detail}
                </DetailSekce>

                <DetailSekce
                  nazev="Průvodce"
                  drobek={pruvodceDrobek}
                  otevreno={jeOtevrena('pruvodce')}
                  onToggle={() => prepni('pruvodce')}
                >
                  {!jazykNahore ? blokOdeslani : null}
                  {!row.pruvodceOdemcen ? (
                    <button
                      type="button"
                      className="ph-predano"
                      disabled={cekam !== null}
                      onClick={() => setDotazDalsi({ id: row.rezervace, druh: 'odemknout' })}
                    >
                      Odemknout průvodce
                    </button>
                  ) : (
                    <div className="ph-pruvodce ph-pruvodce--ano">Průvodce je odemčený</div>
                  )}
                  <p className="ph-pruvodce-otevreni" title={row.otevreniTitle || undefined}>
                    {row.otevreniText}
                    {row.otevreniTitle ? ` · ${row.otevreniTitle}` : ''}
                  </p>
                  {row.plochaOd ? (
                    <p className="ph-pruvodce-otevreni">
                      Na ploše ✓ {casPraha(row.plochaOd) || hodinaPraha(row.plochaOd) || ''}
                    </p>
                  ) : null}
                  {dotazDalsi?.id === row.rezervace ? (
                    <div className="ph-predano-dotaz">
                      <p>Opravdu odemknout celý průvodce? Kódy se tím neotevřou.</p>
                      <button
                        type="button"
                        disabled={cekam !== null}
                        onClick={() => {
                          const druh = dotazDalsi.druh;
                          setDotazDalsi(null);
                          if (ukazka) {
                            setRadky((prev) =>
                              prev.map((r) =>
                                r.rezervace === row.rezervace
                                  ? { ...r, pruvodceOdemcen: new Date().toISOString() }
                                  : r,
                              ),
                            );
                            return;
                          }
                          void volat(row, druh);
                        }}
                      >
                        Ano
                      </button>
                      <button type="button" onClick={() => setDotazDalsi(null)}>
                        Zrušit
                      </button>
                    </div>
                  ) : null}
                  <PoleSUlozenim
                    key={`${row.rezervace}-checkin`}
                    label="Odkaz na check-in"
                    hodnota={odkazy[row.rezervace] ?? row.checkinUrl ?? ''}
                    vstup={{ autoComplete: 'off', placeholder: 'https://' }}
                    onUloz={(text) => ulozOdkaz(row, text)}
                  />
                  {odkazy[row.rezervace] || row.checkinUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        const url = odkazy[row.rezervace] || row.checkinUrl || '';
                        if (url) void navigator.clipboard.writeText(url);
                      }}
                    >
                      Zkopírovat odkaz
                    </button>
                  ) : null}
                  <a className="ph-hostuv-pruvodce" href={odkazPruvodceMajitele(row.rezervace, ukazka)}>
                    Průvodce hosta
                  </a>
                  {zpravyNahore ? null : (
                    <>
                      {zpravaRamecek}
                      {akceZpravy}
                    </>
                  )}
                  <button type="button" disabled={cekam !== null} onClick={() => volat(row, 'odkaz')}>
                    Zkopírovat odkaz na průvodce
                  </button>
                </DetailSekce>

                <DetailSekce
                  nazev="Peníze"
                  drobek={
                    skutecnyVolba
                      ? `${penizeDrobek} · skutečný ${skutecnyVolba === CAS_PO_23 ? 'po 23:00' : skutecnyVolba}`
                      : `${penizeDrobek} · skutečný čas chybí`
                  }
                  otevreno={jeOtevrena('penize')}
                  onToggle={() => prepni('penize')}
                >
                  <div className="ph-pole-rada">
                    <button
                      type="button"
                      className={`ph-predano${menaKarty === 'CZK' ? ' is-on' : ''}`}
                      disabled={cekam !== null}
                      onClick={() => void ulozMena(row, 'CZK')}
                    >
                      Kč
                    </button>
                    <button
                      type="button"
                      className={`ph-predano${menaKarty === 'EUR' ? ' is-on' : ''}`}
                      disabled={cekam !== null}
                      onClick={() => void ulozMena(row, 'EUR')}
                    >
                      €
                    </button>
                    <span className="ph-hlaska">
                      {menaKarty === 'EUR' ? `1 € = ${KURZ_EUR_KC} Kč` : 'Částky v korunách'}
                    </span>
                  </div>
                  <HostUzZaplatilPole
                    key={`${row.rezervace}-uz-zaplaceno-penize`}
                    disabled={cekam !== null}
                    mena={menaKarty}
                    onUloz={(castka, text) => ulozUzZaplaceno(row, castka, text)}
                  />
                  {skutecnyPrijezdPole}
                  {row.poplatek === 'neznamo' && !row.poplatekOdhad ? (
                    <span className="ph-poplatek-volba">
                      <span className="ph-hlaska">Městský poplatek ověřit</span>
                      <button type="button" disabled={cekam !== null} onClick={() => zvolPoplatek(row, 'ano')}>
                        Vybírat
                      </button>
                      <button type="button" disabled={cekam !== null} onClick={() => zvolPoplatek(row, 'ne')}>
                        V ceně
                      </button>
                    </span>
                  ) : null}
                  {soucetPole}
                  <button
                    type="button"
                    className="ph-predano"
                    disabled={cekam !== null}
                    onClick={() => setDotazVyjezdu({ id: row.rezervace, druh: 'pridat' })}
                  >
                    Opakovaný výjezd
                  </button>
                  {jizdy.length ? (
                    <button
                      type="button"
                      className="ph-predano"
                      disabled={cekam !== null}
                      onClick={() => setDotazVyjezdu({ id: row.rezervace, druh: 'vratit' })}
                    >
                      Vrátit výjezd
                    </button>
                  ) : null}
                  {dotazVyjezdu?.id === row.rezervace ? (
                    <div className="ph-predano-dotaz">
                      <p>
                        {dotazVyjezdu.druh === 'pridat'
                          ? `Host nedorazil do ${CEKANI_MINUT} minut po domluveném čase. Započítat ${VYJEZD_CASTKA} Kč?`
                          : `Opravdu vrátit poslední výjezd? Částka ${jizdy[jizdy.length - 1]?.castka ?? VYJEZD_CASTKA} Kč se odečte.`}
                      </p>
                      <button
                        type="button"
                        disabled={cekam !== null}
                        onClick={() => ulozVyjezd(row, dotazVyjezdu.druh === 'pridat')}
                      >
                        {dotazVyjezdu.druh === 'pridat' ? 'Ano, započítat' : 'Ano, vrátit'}
                      </button>
                      <button type="button" onClick={() => setDotazVyjezdu(null)}>
                        Zrušit
                      </button>
                    </div>
                  ) : null}
                </DetailSekce>

                <DetailSekce
                  nazev="Rezervace"
                  drobek={row.rezervace}
                  otevreno={jeOtevrena('rezervace')}
                  onToggle={() => prepni('rezervace')}
                >
                  {staly?.predchozi?.length ? (
                    <div className="ph-staly-predchozi">
                      <p>Předchozí pobyty</p>
                      <ul>
                        {staly.predchozi.map((p) => (
                          <li key={p.rezervace}>
                            <button
                              type="button"
                              className="ph-dnesek__odkaz"
                              onClick={() => otevriKartu(p.rezervace)}
                            >
                              {(p.apartman || 'Apartmán') +
                                ' · ' +
                                (p.prijezd || '?') +
                                (p.odjezd ? `–${p.odjezd}` : '')}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {row.vlajka || row.jazykText ? (
                    <div className="ph-jazyk">
                      {row.vlajka ? <span className="ph-vlajka">{row.vlajka}</span> : null}
                      <Pole text={row.jazykText} />
                    </div>
                  ) : null}
                  {row.zdrojText || row.zdrojCeka ? (
                    <div className="ph-zdroj">
                      <Pole text={row.zdrojText || 'Zdroj neznámý'} />
                      <div className="ph-zdroj-volba" style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                        {(['přímá', 'Booking', 'Airbnb'] as const).map((z) => (
                          <button
                            key={z}
                            type="button"
                            className="ph-btn ph-btn--maly"
                            disabled={cekam === `${row.rezervace}:zdroj`}
                            onClick={async () => {
                              setCekam(`${row.rezervace}:zdroj`);
                              setHlaska('');
                              const res = await fetch('/api/prehled/akce', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  rezervace: row.rezervace,
                                  akce: 'zdroj',
                                  zdroj: z,
                                }),
                              });
                              const json = (await res.json().catch(() => null)) as {
                                ok?: boolean;
                                error?: string;
                                zdroj?: string;
                              } | null;
                              setCekam(null);
                              if (!res.ok || !json?.ok) {
                                setHlaska(json?.error || 'Zdroj se neuložil.');
                                return;
                              }
                              setRadky((prev) =>
                                prev.map((r) =>
                                  r.rezervace === row.rezervace
                                    ? {
                                        ...r,
                                        zdroj: json.zdroj || z,
                                        zdrojText: json.zdroj || z,
                                        zdrojCeka: false,
                                      }
                                    : r,
                                ),
                              );
                            }}
                          >
                            {z === 'přímá' ? 'Přímá' : z}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {row.doporucilJmeno ? (
                    <div className="ph-cell" data-label="Doporučil">
                      <Pole text={`Doporučil: ${row.doporucilJmeno}`} />
                    </div>
                  ) : null}
                  {row.privedlText ? (
                    <div className="ph-cell" data-label="Přivedl">
                      <Pole text={row.privedlText} />
                    </div>
                  ) : null}
                  <div className="ph-akce ph-akce--doporuceni">
                    <button
                      type="button"
                      onClick={async () => {
                        const jine = window.prompt('Číslo rezervace druhého hosta (stejná osoba):');
                        if (!jine?.trim()) return;
                        setCekam(`${row.rezervace}:doporuceni-spojit`);
                        setHlaska('');
                        const res = await fetch('/api/prehled/akce', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            rezervace: row.rezervace,
                            akce: 'doporuceni-spojit',
                            dalsiRezervace: jine.trim(),
                          }),
                        });
                        const json = (await res.json().catch(() => null)) as {
                          ok?: boolean;
                          error?: string;
                          kod?: string;
                        } | null;
                        setCekam(null);
                        if (!res.ok || !json?.ok) {
                          setHlaska(json?.error || 'Spojení se nepovedlo.');
                          return;
                        }
                        setHlaska(json.kod ? `Spojeno. Kód odkazu: ${json.kod}` : 'Spojeno.');
                        window.location.reload();
                      }}
                    >
                      Spojit s jiným hostem
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setCekam(`${row.rezervace}:doporuceni-seznam`);
                        const res = await fetch('/api/prehled/akce', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ rezervace: row.rezervace, akce: 'doporuceni-seznam' }),
                        });
                        const json = (await res.json().catch(() => null)) as {
                          ok?: boolean;
                          error?: string;
                          polozky?: { id: string; jmeno: string; termin: string; doporucil: string }[];
                        } | null;
                        setCekam(null);
                        if (!res.ok || !json?.ok) {
                          setHlaska(json?.error || 'Seznam se nenačetl.');
                          return;
                        }
                        const polozky = json.polozky || [];
                        if (!polozky.length) {
                          setHlaska('Žádné otevřené doporučení za 90 dní.');
                          return;
                        }
                        const vypis = polozky
                          .slice(0, 20)
                          .map((p, i) => `${i + 1}. ${p.jmeno} · ${p.termin} · od ${p.doporucil} · ${p.id}`)
                          .join('\n');
                        const volba = window.prompt(`Zadejte ID doporučení:\n${vypis}`);
                        if (!volba?.trim()) return;
                        setCekam(`${row.rezervace}:doporuceni-priradit`);
                        const res2 = await fetch('/api/prehled/akce', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            rezervace: row.rezervace,
                            akce: 'doporuceni-priradit',
                            id: volba.trim(),
                          }),
                        });
                        const json2 = (await res2.json().catch(() => null)) as {
                          ok?: boolean;
                          error?: string;
                        } | null;
                        setCekam(null);
                        if (!res2.ok || !json2?.ok) {
                          setHlaska(json2?.error || 'Přiřazení se nepovedlo.');
                          return;
                        }
                        window.location.reload();
                      }}
                    >
                      Přiřadit doporučení
                    </button>
                  </div>
                  <div className="ph-cell" data-label="Vytvořeno">
                    <Pole text={row.vytvorenoText} />
                  </div>
                  <div className="ph-cell" data-label="Rezervace">
                    <div>{row.rezervace}</div>
                  </div>
                </DetailSekce>

                <DetailSekce
                  nazev="Historie"
                  drobek={historieDrobek}
                  otevreno={jeOtevrena('historie')}
                  onToggle={() => prepni('historie')}
                >
                  <div className="ph-cell" data-label="Co se stalo">
                    <Pole text={row.coSeStalo} />
                  </div>
                  <div className="ph-cell" data-label="Poslední pokus">
                    <Pole text={row.posledniPokusText} />
                  </div>
                  <div className="ph-akce">
                    {nabidnoutOdeslani(row.stav) ? (
                      <button
                        type="button"
                        onClick={() => setOtevreno(otevreno === row.rezervace ? null : row.rezervace)}
                      >
                        Opravit a odeslat
                      </button>
                    ) : null}
                  </div>
                  {nabidnoutOdeslani(row.stav) && otevreno === row.rezervace ? (
                    <OpravitForm
                      row={row}
                      cekam={cekam !== null}
                      onSubmit={(extra) => volat(row, 'opravit', extra)}
                    />
                  ) : null}
                  {row.historie.length ? (
                    <ul className="ph-historie">
                      {row.historie.map((h, i) => (
                        <li key={`${h.cas}-${i}`}>
                          {casPraha(h.cas) ? `${casPraha(h.cas)} ${h.co}` : h.co}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="ph-hlaska">Zatím bez záznamů.</p>
                  )}
                </DetailSekce>
              </>
            );
          })()}
        </div>
      </article>
        )}
      />
    );
  }

  const ted = new Date();
  const aktivni = [...viditelne.filter((row) => !jeHostOdjetly(hostOdjezdu(row), dnes, ted))].sort((a, b) => {
    const predA = predanoRadku(a) ? 1 : 0;
    const predB = predanoRadku(b) ? 1 : 0;
    if (predA !== predB) return predA - predB;
    const za = zavaznostProblemuPrijezdu(a, casy);
    const zb = zavaznostProblemuPrijezdu(b, casy);
    if (za !== zb) return za - zb;
    const ca = (Object.prototype.hasOwnProperty.call(casy, a.rezervace) ? casy[a.rezervace] : a.casPrijezdu) || '';
    const cb = (Object.prototype.hasOwnProperty.call(casy, b.rezervace) ? casy[b.rezervace] : b.casPrijezdu) || '';
    if (ca !== cb) {
      if (ca && !cb) return -1;
      if (!ca && cb) return 1;
      return ca < cb ? -1 : 1;
    }
    const pa = a.apartman ? APT_IDS.indexOf(a.apartman as AptId) : 99;
    const pb = b.apartman ? APT_IDS.indexOf(b.apartman as AptId) : 99;
    if (pa !== pb) return pa - pb;
    return a.rezervace < b.rezervace ? -1 : 1;
  });
  const odjeli = viditelne.filter((row) => jeHostOdjetly(hostOdjezdu(row), dnes, ted));
  const pocty: Record<Zalozka, number> = {
    prijezdy: radky.filter(
      (r) => r.prijezd === dnes && !jeBezDalsichAkci(r) && !jeHostOdjetly(hostOdjezdu(r), dnes, ted),
    ).length,
    dluhy: radky.filter((r) => patriDoDluhu(r)).length,
    hledat: 0,
  };
  const nove: Record<Zalozka, boolean> = {
    prijezdy: jeNove(otiskZalozky('prijezdy'), videne?.[kdoKouka]?.prijezdy || null),
    dluhy: jeNove(otiskZalozky('dluhy'), videne?.[kdoKouka]?.dluhy || null),
    hledat: false,
  };
  const hostePohoda = seradOdjezdy(radky.filter((r) => jeProPohodu(r, dnes)));
  const hostePohodaCekaji = hostePohoda.filter((r) => !r.pohodaDotaz);
  const hostePohodaHotove = hostePohoda.filter((r) => Boolean(r.pohodaDotaz));
  const hostePodekovaniSeznam = hosteProPodekovani(radky, dnes, ted);
  const hostePodekovaniHledani = useMemo(
    () =>
      hledejProPodekovani(
        radky,
        {
          jmeno: hledaniPodekovani,
          rezervace: hledaniPodekovaniVic ? hledaniPodekovaniRez : '',
          telefon: hledaniPodekovaniVic ? hledaniPodekovaniTel : '',
        },
        dnes,
        ted,
      ),
    [
      radky,
      hledaniPodekovani,
      hledaniPodekovaniRez,
      hledaniPodekovaniTel,
      hledaniPodekovaniVic,
      dnes,
      ted,
    ],
  );
  const hosteShrnutiVstupy = radky.map((r) => ({ ...r, ...shrnutiVstupRadku(r) }));
  const hosteShrnutiCekaji = hosteCekajiciShrnuti(hosteShrnutiVstupy, dnes);
  const hosteShrnutiHotove = hosteHotoveShrnuti(hosteShrnutiVstupy, dnes);
  const hosteZitraOdjezd = seradOdjezdy(radky.filter((r) => !jeBezDalsichAkci(r) && r.odjezd === zitra));
  const zitraVyrizeno = hosteZitraOdjezd.filter(
    (r) => jeHodina(casOdjezduRadku(r)) || Boolean(r.odjezdDotaz),
  ).length;
  const zitraCekaAkce = hosteZitraOdjezd.some(
    (r) => !jeHodina(casOdjezduRadku(r)) && !r.odjezdDotaz,
  );
  const pohodaCekaAkce = hostePohodaCekaji.length > 0;
  const podekovaniCekaAkce = hostePodekovaniSeznam.some((r) => !r.podekovaniKdy);
  const shrnutiCekaAkce = hosteShrnutiCekaji.length > 0;
  type CasKeSchvaleni = {
    row: PrehledRadek;
    druh: 'drive' | 'pozni';
    popisek: string;
    cas: string;
    kc: number;
  };
  const casyKeSchvaleni: CasKeSchvaleni[] = [];
  for (const row of radky) {
    if (jeBezDalsichAkci(row) || row.nelzeNacist) continue;
    if (row.zadostPrijezd?.stav === 'ceka') {
      casyKeSchvaleni.push({
        row,
        druh: 'drive',
        popisek: 'dřívější příjezd',
        cas: row.zadostPrijezd.cas,
        kc: row.zadostPrijezd.kc,
      });
    }
    if (row.zadostPozdniPrijezd?.stav === 'ceka') {
      casyKeSchvaleni.push({
        row,
        druh: 'pozni',
        popisek: 'pozdní příjezd',
        cas: row.zadostPozdniPrijezd.cas,
        kc: row.zadostPozdniPrijezd.kc,
      });
    }
  }
  casyKeSchvaleni.sort((a, b) => {
    const apt = (a.row.apartman || '').localeCompare(b.row.apartman || '', 'cs');
    if (apt) return apt;
    return a.cas.localeCompare(b.cas);
  });
  type OdjezdKeSchvaleni = {
    row: PrehledRadek;
    cas: string;
    kc: number;
    pozdejsi: boolean;
  };
  const odjezdyKeSchvaleni: OdjezdKeSchvaleni[] = [];
  for (const row of radky) {
    if (jeBezDalsichAkci(row) || row.nelzeNacist) continue;
    if (!cekaPotvrzeniRozlouceni(row, dnes)) continue;
    if (row.zadostOdjezd?.stav === 'ceka') {
      if (oknoHotovo[`${row.rezervace}:potvrdit-odjezd`] || oknoHotovo[`${row.rezervace}:nelze-odjezd`]) {
        continue;
      }
      odjezdyKeSchvaleni.push({
        row,
        cas: row.zadostOdjezd.cas,
        kc: row.zadostOdjezd.kc,
        pozdejsi: true,
      });
      continue;
    }
    const casOd = casOdjezduRadku(row);
    if (!casOd) continue;
    odjezdyKeSchvaleni.push({
      row,
      cas: casOd,
      kc: castkaPozdejsihoOdjezdu({ casOdjezdu: casOd, zadostOdjezd: row.zadostOdjezd }) || 0,
      pozdejsi: false,
    });
  }
  odjezdyKeSchvaleni.sort((a, b) => {
    const den = (a.row.odjezd || '').localeCompare(b.row.odjezd || '');
    if (den) return den;
    const apt = (a.row.apartman || '').localeCompare(b.row.apartman || '', 'cs');
    if (apt) return apt;
    return a.cas.localeCompare(b.cas);
  });
  const odjezdySchvaleniCeka = odjezdyKeSchvaleni.length > 0;
  const vybrany = vybrana ? radky.find((r) => r.rezervace === vybrana) : undefined;

  /** Samostatný náhled karty: nic jiného, jen ← Zpět a karta. */
  if (vybrany) {
    return (
      <main className="ph ph-karta-nahled">
        {hlaska ? <p className="ph-ok">{hlaska}</p> : null}
        <p className="ph-dnesek__akce ph-karta-nahled__zpet">
          <button type="button" className="ph-dnesek__odkaz" onClick={zpetZKarty}>
            ← Zpět na přehled
          </button>
        </p>
        {kartaHosta(vybrany)}
      </main>
    );
  }

  return (
    <main className="ph">
      {poptavkaId ? (
        <PoptavkaDetail
          id={poptavkaId}
          onZavrit={() => {
            setPoptavkaId(null);
            try {
              const u = new URL(window.location.href);
              u.searchParams.delete('poptavka');
              const st = histStav();
              if (st?.vivien === 'poptavka') {
                window.history.back();
              } else {
                window.history.replaceState(
                  { vivien: 'base' },
                  '',
                  u.pathname + u.search + u.hash,
                );
              }
            } catch {
              /* */
            }
          }}
        />
      ) : null}
      {radky
        .filter((row) => row.nelzeNacist)
        .map((row) => (
          <p key={row.rezervace} className="ph-chyba">
            Kartu {row.rezervace} se nepodařilo načíst
          </p>
        ))}
      <header className="ph-top">
        <div className="ph-top__hlava">
          <button
            type="button"
            className={pohledDomu ? 'ph-domu is-on' : 'ph-domu'}
            aria-pressed={pohledDomu}
            onClick={() => {
              setPohledDomu(true);
              setVybranyDen(dnes);
              otevriZalozku('prijezdy');
            }}
          >
            Domů
          </button>
          <h1>Přehled rezervací</h1>
        </div>
        <nav className="ph-nav2" aria-label="Poptávky a doporučitelé">
          <Link
            className={poptavkyDotazy > 0 ? 'ph-nav2__odkaz is-dotaz' : 'ph-nav2__odkaz'}
            href="/prehled/poptavky"
          >
            Poptávky
            {poptavkyDotazy > 0 ? <span className="ph-nav2__pocet">{poptavkyDotazy}</span> : null}
          </Link>
          <Link
            className={doporucitelDotazy > 0 ? 'ph-nav2__odkaz is-dotaz' : 'ph-nav2__odkaz'}
            href="/prehled/doporucitele"
          >
            Doporučitelé
            {doporucitelDotazy > 0 ? <span className="ph-nav2__pocet">{doporucitelDotazy}</span> : null}
          </Link>
        </nav>
        <div className="ph-dny" role="tablist" aria-label="Výběr dne">
          {dnyNahled.map((d) => {
            const on = !pohledDomu && d.den === vybranyDen;
            return (
              <button
                key={d.den}
                type="button"
                role="tab"
                aria-selected={on}
                className={on ? 'ph-dny__den is-on' : 'ph-dny__den'}
                onClick={() => {
                  setPohledDomu(false);
                  setVybranyDen(d.den);
                  otevriZalozku('prijezdy');
                }}
              >
                <span className="ph-dny__stitek">
                  {d.stitek}
                  {d.problemy.map((p) => (
                    <span
                      key={p}
                      className={`ph-dny__tecka ph-dny__tecka--${p}`}
                      aria-label={
                        p === 'checkin' ? 'Bez check-inu' : p === 'cas' ? 'Chybí čas' : 'Chybí brána'
                      }
                    />
                  ))}
                </span>
                <span className="ph-dny__tri">
                  ↓{d.prijezdy} ↑{d.odjezdy}{' '}
                  <span className="ph-dny__vol">
                    <span className="ph-dny__nula">0</span>
                    {d.volne}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {(pohledDomu && zalozka === 'prijezdy') || !pohledDomu ? (
          <div className={zalozka === 'prijezdy' || !pohledDomu ? 'ph-den is-on' : 'ph-den'}>
            <div className="ph-den__radek">
              <p className="ph-den__nadpis">
                {nadpisSouhrnuDne(vybranyDen, dnes)}: {vybranySouhrn.pocet} · průvodce otevřelo {vybranySouhrn.otevrelo} ·
                neodesláno {vybranySouhrn.neodeslano} · bez check-inu: {vybranySouhrn.bezCheckinu}
              </p>
              <button
                type="button"
                className="ph-schranka-ted__btn"
                disabled={nacitamSchranku}
                onClick={() => void nactiSchrankuTed()}
              >
                {nacitamSchranku ? 'Čtu…' : 'Schránka'}
              </button>
            </div>
            {vybranySouhrn.plan.length ? (
              <p className="ph-plan">
                {vybranySouhrn.plan.map((h, i) => (
                  <span key={h.rezervace}>
                    {i > 0 ? ' · ' : null}
                    <button
                      type="button"
                      className={h.cas ? 'ph-plan__host' : 'ph-plan__host is-chybi'}
                      onClick={() => otevriKartu(h.rezervace)}
                    >
                      {h.cas ? `${h.cas} ${h.jmeno}` : `bez času ${h.jmeno}`}
                      <span className="ph-plan__hint" aria-hidden="true">
                        {' '}
                        ▸
                      </span>
                    </button>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="ph-den__radek ph-den__radek--samo">
            <button
              type="button"
              className="ph-schranka-ted__btn"
              disabled={nacitamSchranku}
              onClick={() => void nactiSchrankuTed()}
            >
              {nacitamSchranku ? 'Čtu…' : 'Schránka'}
            </button>
          </div>
        )}
        {chybiWifi.length ? (
          <p className="ph-wifi">V nastavení chybí heslo WiFi pro {chybiWifi.join(', ')}.</p>
        ) : null}
      </header>
      {automatVarovani ? <p className="ph-automat">{automatVarovani}</p> : null}
      {pohledDomu ? (
        <PraniRamecekDomu
          radky={praniRadky}
          onOtevri={(rez, vlakno) => otevriPrani(rez, vlakno)}
          onPrecteno={prectenoPraniRadek}
        />
      ) : null}
      {pohledDomu ? (
        <RadaZalozek
          zalozka={zalozka}
          pocty={pocty}
          nove={nove}
          onZmena={otevriZalozku}
          onNovaRezervace={() => otevriNovouRezervaci(null)}
        />
      ) : null}
      {pohledDomu && hlaska ? (
        <p className="ph-domu-hlaska" id="ph-domu-hlaska" role="status">
          {hlaska}
        </p>
      ) : null}
      {pohledDomu ? (
        <StitkyDoplnit14
          pocty={poctyDoplnit}
          aktivni={filtrDoplnit === 'vse' ? null : filtrDoplnit}
          onKlep={otevriStitekDoplnit}
        />
      ) : null}

      {pohledDomu && zalozka === 'prijezdy' && odjezdySchvaleniCeka ? (
        <section id="odsouhlasit-odjezdy" className="ph-domu-radek">
          <button
            type="button"
            className="ph-domu-radek__souhrn is-akce"
            aria-expanded={odjezdySchvaleniOtevreno}
            onClick={() => setOdjezdySchvaleniOtevreno((v) => !v)}
          >
            Odsouhlasit časy odjezdů · {odjezdyKeSchvaleni.length}{' '}
            {odjezdySchvaleniOtevreno ? '▴' : '▸'}
          </button>
          {odjezdySchvaleniOtevreno ? (
            <ul className="ph-odjezdy ph-odjezdy--vnorene">
              {odjezdyKeSchvaleni.map((polozka) => {
                const cas = polozka.cas.replace(/^0(\d:)/, '$1');
                const denOd =
                  polozka.row.odjezd === dnes
                    ? 'dnes'
                    : polozka.row.odjezd === zitra
                      ? 'zítra'
                      : polozka.row.odjezd || '';
                return (
                  <li key={polozka.row.rezervace} className="is-akce">
                    <button
                      type="button"
                      className="ph-dnesek__odkaz"
                      onClick={() => otevriKartu(polozka.row.rezervace)}
                    >
                      {polozka.row.apartman || '—'} · {polozka.row.jmeno || 'Host'}
                    </button>
                    {' · '}
                    {denOd} {cas}
                    {polozka.kc ? ` (+${polozka.kc} Kč)` : ''}
                    {polozka.pozdejsi ? ' · pozdější' : ''}
                    <span className="ph-odjezdy__akce">
                      <button
                        type="button"
                        className="ph-wa"
                        disabled={cekam !== null}
                        onClick={() => void schvalOdjezdZDomu(polozka.row, 'osobne')}
                      >
                        Osobně
                      </button>
                      <button
                        type="button"
                        className="ph-wa"
                        disabled={cekam !== null}
                        onClick={() => void schvalOdjezdZDomu(polozka.row, 'telefon')}
                      >
                        Sami
                      </button>
                      {polozka.pozdejsi ? (
                        <button
                          type="button"
                          className="ph-wa"
                          disabled={cekam !== null}
                          onClick={() => void schvalOdjezdZDomu(polozka.row, 'nelze')}
                        >
                          Nelze
                        </button>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}
      {pohledDomu && zalozka === 'prijezdy' && casyKeSchvaleni.length ? (
        <section id="casy-ke-schvaleni" className="ph-domu-radek">
          <button
            type="button"
            className="ph-domu-radek__souhrn is-akce"
            aria-expanded={casySchvaleniOtevreno}
            onClick={() => setCasySchvaleniOtevreno((v) => !v)}
          >
            Časy ke schválení · {casyKeSchvaleni.length} {casySchvaleniOtevreno ? '▴' : '▸'}
          </button>
          {casySchvaleniOtevreno ? (
            <ul className="ph-odjezdy ph-odjezdy--vnorene">
              {casyKeSchvaleni.map((polozka) => {
                const cas = polozka.cas.replace(/^0(\d:)/, '$1');
                return (
                  <li key={`${polozka.row.rezervace}:${polozka.druh}`} className="is-akce">
                    <button
                      type="button"
                      className="ph-dnesek__odkaz"
                      onClick={() => otevriKartu(polozka.row.rezervace)}
                    >
                      {polozka.row.apartman || '—'} · {polozka.row.jmeno || 'Host'}
                    </button>
                    {' · '}
                    {polozka.popisek} {cas}
                    {polozka.kc ? ` (+${polozka.kc} Kč)` : ''}
                    {' · '}
                    <button
                      type="button"
                      className="ph-dnesek__odkaz"
                      onClick={() => otevriKartu(polozka.row.rezervace)}
                    >
                      Otevřít kartu ▸
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}
      {pohledDomu && zalozka === 'prijezdy' ? (
        <FakturyDomu
          radky={radky}
          dnes={dnes}
          ukazka={ukazka}
          userAgent={userAgent}
          onZmena={zmenFakturu}
          onCenaPobytu={zmenCenuPobytu}
          onMena={(rezervace, mena) => {
            const r = radky.find((x) => x.rezervace === rezervace);
            if (r) void ulozMena(r, mena);
          }}
          onHlaska={setHlaska}
          onOtevriKartu={otevriKartu}
          vychoziOtevreno={fakturyFocus}
          jen="aktualni"
        />
      ) : null}
      {pohledDomu && zalozka === 'prijezdy' && hostePohodaCekaji.length ? (
        <section id="pohoda" className="ph-domu-radek">
          <button
            type="button"
            className="ph-domu-radek__souhrn is-akce"
            aria-expanded={pohodaOtevreno}
            onClick={() => setPohodaOtevreno((v) => !v)}
          >
            Je vše v pořádku? · {hostePohodaCekaji.length} {pohodaOtevreno ? '▴' : '▸'}
          </button>
          {pohodaOtevreno ? (
            <ul className="ph-odjezdy ph-odjezdy--vnorene">
              {hostePohodaCekaji.map((row) => {
                const text = textPohody(jazykRadku(row));
                const wa = row.telefonWa;
                const email = row.email.includes('@') ? row.email : '';
                return (
                  <li key={row.rezervace}>
                    <button type="button" className="ph-dnesek__odkaz" onClick={() => otevriKartu(row.rezervace)}>
                      {row.jmeno || 'Host'}
                    </button>
                    {' · '}
                    {row.apartman || 'bez apartmánu'}
                    <span className="ph-odjezdy__akce">
                      <TlacitkoWhatsApp
                        wa={wa}
                        zprava={text}
                        userAgent={userAgent}
                        onPredOtevrenim={() => oznacPohodu(row)}
                      />
                      {email ? (
                        <button type="button" className="ph-wa" onClick={() => setDotazPohoda(row.rezervace)}>
                          Poslat e-mailem
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="ph-kopie"
                        onClick={() => {
                          void navigator.clipboard.writeText(text).then(
                            () => setHlaska(`Zpráva pro #${row.rezervace} je ve schránce.`),
                            () => setHlaska(text),
                          );
                        }}
                      >
                        Zkopírovat zprávu
                      </button>
                      <details>
                        <summary>Text zprávy</summary>
                        <p>{text}</p>
                      </details>
                    </span>
                    {dotazPohoda === row.rezervace ? (
                      <div className="ph-predano-dotaz">
                        <p>
                          Poslat e-mail na <span className="ph-tel">{email}</span>?
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setDotazPohoda(null);
                            void posliEmail(row, 'pohoda');
                          }}
                        >
                          Ano
                        </button>
                        <button type="button" onClick={() => setDotazPohoda(null)}>
                          Zrušit
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}
      {pohledDomu && zalozka === 'prijezdy' && hosteShrnutiCekaji.length ? (
        <section id="vse-pripraveno" className="ph-domu-radek">
          <button
            type="button"
            className="ph-domu-radek__souhrn is-akce"
            aria-expanded={shrnutiOtevreno}
            onClick={() => setShrnutiOtevreno((v) => !v)}
          >
            Vše připraveno · {hosteShrnutiCekaji.length} {shrnutiOtevreno ? '▴' : '▸'}
          </button>
          {shrnutiOtevreno ? (
            <ul className="ph-odjezdy ph-odjezdy--vnorene">
              {hosteShrnutiCekaji.map((row) => {
                const vstup = shrnutiVstupRadku(row);
                const zmena = zmenaPoShrnuti(vstup, dnes);
                const text =
                  zpravyRadku(row).find((z) => z.id === 'shrnuti')?.text ||
                  textShrnuti(
                    {
                      casPrijezdu: row.casPrijezdu,
                      zpusobPrijezdu: row.zpusobPrijezdu,
                      telefonBrana: row.telefonBrana,
                      apartman: row.apartman,
                      jazyk: jazykRadku(row),
                    },
                    jazykRadku(row),
                    row.odkaz,
                  );
                const wa = row.telefonWa;
                const telefonSms = row.telefonText || (wa ? `+${wa}` : '');
                const email = row.email.includes('@') ? row.email : '';
                const prijezdText = row.prijezd
                  ? `${Number(row.prijezd.slice(8, 10))}. ${Number(row.prijezd.slice(5, 7))}.`
                  : '';
                return (
                  <li key={row.rezervace} className="is-akce">
                    <button type="button" className="ph-dnesek__odkaz" onClick={() => otevriKartu(row.rezervace)}>
                      {row.jmeno || 'Host'}
                    </button>
                    {' · '}
                    {row.apartman || 'bez apartmánu'}
                    {prijezdText ? ` · příjezd ${prijezdText}` : null}
                    {zmena ? <span>{' · Změna po odeslání'}</span> : null}
                    <span className="ph-odjezdy__akce">
                      {wa ? (
                        <TlacitkoWhatsApp
                          wa={wa}
                          zprava={text}
                          userAgent={userAgent}
                          onPredOtevrenim={() => oznacShrnuti(row, 'whatsapp')}
                        >
                          WhatsApp
                        </TlacitkoWhatsApp>
                      ) : null}
                      {telefonSms ? (
                        <a
                          className="ph-wa"
                          href={odkazSmsShrnuti(telefonSms, text, jeIos(userAgent))}
                          onClick={() => void oznacShrnuti(row, 'sms')}
                        >
                          SMS
                        </a>
                      ) : null}
                      {email ? (
                        <button
                          type="button"
                          className="ph-wa"
                          onClick={() => otevriDotazShrnutiEmail(row.rezervace)}
                        >
                          E-mail
                        </button>
                      ) : null}
                      <button type="button" className="ph-kopie" onClick={() => void oznacShrnuti(row, 'rucne')}>
                        Odesláno ručně
                      </button>
                      <button type="button" className="ph-kopie" onClick={() => void oznacShrnuti(row, 'neposilat')}>
                        Neposílat
                      </button>
                      {row.shrnutiKdy ? (
                        <button type="button" className="ph-kopie" onClick={() => void vratShrnuti(row)}>
                          Vrátit
                        </button>
                      ) : null}
                      {dotazShrnuti === row.rezervace ? (
                        <div
                          id={`shrnuti-email-${row.rezervace}`}
                          className="ph-predano-dotaz ph-predano-dotaz--email"
                        >
                          <p>
                            Pošleme e-mail ze systému VIVIEN na <span className="ph-tel">{email}</span>
                            {row.shrnutiKdy ? ' znovu' : ''}. Není to WhatsApp ani SMS.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setDotazShrnuti(null);
                              void posliEmail(row, 'shrnuti');
                            }}
                          >
                            Ano, poslat e-mail
                          </button>
                          <button type="button" onClick={() => setDotazShrnuti(null)}>
                            Zrušit
                          </button>
                        </div>
                      ) : null}
                    </span>
                  </li>
                );
              })}
              {hosteShrnutiHotove.length ? (
                <li className="ph-shrnuti-hotove">
                  <button
                    type="button"
                    className="ph-domu-radek__souhrn"
                    aria-expanded={shrnutiHotoveOtevreno}
                    onClick={() => setShrnutiHotoveOtevreno((v) => !v)}
                  >
                    Hotové · {hosteShrnutiHotove.length} {shrnutiHotoveOtevreno ? '▴' : '▸'}
                  </button>
                  {shrnutiHotoveOtevreno ? (
                    <ul className="ph-odjezdy ph-odjezdy--vnorene">
                      {hosteShrnutiHotove.map((row) => {
                        const odeslano = row.shrnutiKdy ? hodinaPraha(row.shrnutiKdy) : '';
                        const kanalStitek = stitekShrnutiKanalu(row.shrnutiKanal);
                        const neposlato = row.shrnutiKanal === 'neposilat';
                        const text =
                          zpravyRadku(row).find((z) => z.id === 'shrnuti')?.text ||
                          textShrnuti(
                            {
                              casPrijezdu: row.casPrijezdu,
                              zpusobPrijezdu: row.zpusobPrijezdu,
                              telefonBrana: row.telefonBrana,
                              apartman: row.apartman,
                              jazyk: jazykRadku(row),
                            },
                            jazykRadku(row),
                            row.odkaz,
                          );
                        const wa = row.telefonWa;
                        const telefonSms = row.telefonText || (wa ? `+${wa}` : '');
                        const email = row.email.includes('@') ? row.email : '';
                        const prijezdText = row.prijezd
                          ? `${Number(row.prijezd.slice(8, 10))}. ${Number(row.prijezd.slice(5, 7))}.`
                          : '';
                        return (
                          <li key={row.rezervace} className="is-hotovo">
                            <button
                              type="button"
                              className="ph-dnesek__odkaz"
                              onClick={() => otevriKartu(row.rezervace)}
                            >
                              {row.jmeno || 'Host'}
                            </button>
                            {' · '}
                            {row.apartman || 'bez apartmánu'}
                            {prijezdText ? ` · příjezd ${prijezdText}` : null}
                            {odeslano ? (
                              <span>
                                {neposlato
                                  ? ` · Neposláno ${odeslano}`
                                  : ` · Shrnutí odesláno ${odeslano}${kanalStitek ? ` · ${kanalStitek}` : ''}`}
                              </span>
                            ) : null}
                            <span className="ph-odjezdy__akce">
                              {wa ? (
                                <TlacitkoWhatsApp
                                  wa={wa}
                                  zprava={text}
                                  userAgent={userAgent}
                                  onPredOtevrenim={() => oznacShrnuti(row, 'whatsapp')}
                                >
                                  WhatsApp
                                </TlacitkoWhatsApp>
                              ) : null}
                              {telefonSms ? (
                                <a
                                  className="ph-wa"
                                  href={odkazSmsShrnuti(telefonSms, text, jeIos(userAgent))}
                                  onClick={() => void oznacShrnuti(row, 'sms')}
                                >
                                  SMS
                                </a>
                              ) : null}
                              {email ? (
                                <button
                                  type="button"
                                  className="ph-wa"
                                  onClick={() => otevriDotazShrnutiEmail(row.rezervace)}
                                >
                                  E-mail
                                </button>
                              ) : null}
                              <button type="button" className="ph-kopie" onClick={() => void vratShrnuti(row)}>
                                Vrátit
                              </button>
                              {dotazShrnuti === row.rezervace ? (
                                <div
                                  id={`shrnuti-email-${row.rezervace}`}
                                  className="ph-predano-dotaz ph-predano-dotaz--email"
                                >
                                  <p>
                                    Pošleme e-mail ze systému VIVIEN na <span className="ph-tel">{email}</span>{' '}
                                    znovu. Není to WhatsApp ani SMS.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDotazShrnuti(null);
                                      void posliEmail(row, 'shrnuti');
                                    }}
                                  >
                                    Ano, poslat e-mail
                                  </button>
                                  <button type="button" onClick={() => setDotazShrnuti(null)}>
                                    Zrušit
                                  </button>
                                </div>
                              ) : null}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              ) : null}
            </ul>
          ) : null}
        </section>
      ) : null}
      {pohledDomu && zalozka === 'prijezdy' ? (
        <section id="podekovani-hledat" className="ph-domu-radek">
          <button
            type="button"
            className="ph-domu-radek__souhrn"
            aria-expanded={hledaniPodekovaniVic}
            onClick={() => setHledaniPodekovaniVic((v) => !v)}
          >
            Najít hosta na poděkování {hledaniPodekovaniVic ? '▴' : '▸'}
          </button>
          <div className="ph-podekovani-hledat">
            <label>
              <span className="ph-skryty">Jméno</span>
              <input
                className="ph-podekovani-hledat__pole"
                type="search"
                value={hledaniPodekovani}
                onChange={(e) => setHledaniPodekovani(e.target.value)}
                placeholder="Jméno"
                autoComplete="off"
              />
            </label>
            {hledaniPodekovaniVic ? (
              <div className="ph-podekovani-hledat__vic">
                <label>
                  <span className="ph-skryty">Telefon</span>
                  <input
                    className="ph-podekovani-hledat__pole"
                    type="search"
                    inputMode="tel"
                    value={hledaniPodekovaniTel}
                    onChange={(e) => setHledaniPodekovaniTel(e.target.value)}
                    placeholder="Telefon"
                    autoComplete="off"
                  />
                </label>
                <label>
                  <span className="ph-skryty">Číslo rezervace</span>
                  <input
                    className="ph-podekovani-hledat__pole"
                    type="search"
                    value={hledaniPodekovaniRez}
                    onChange={(e) => setHledaniPodekovaniRez(e.target.value)}
                    placeholder="Číslo rezervace"
                    autoComplete="off"
                  />
                </label>
              </div>
            ) : null}
            {(hledaniPodekovani.trim().length >= 2 ||
              (hledaniPodekovaniVic &&
                (hledaniPodekovaniRez.trim().length >= 1 ||
                  hledaniPodekovaniTel.replace(/\D/g, '').length >= 3))) &&
            !hostePodekovaniHledani.length ? (
              <p className="ph-podekovani-hledat__prazdne">
                Nikdo se nenašel (musí mít předání a odjezd).
              </p>
            ) : null}
          </div>
          {hostePodekovaniHledani.length ? (
            <ul className="ph-odjezdy ph-odjezdy--vnorene">
              {hostePodekovaniHledani.map((row) => {
                const odeslano = row.podekovaniKdy ? hodinaPraha(row.podekovaniKdy) : '';
                const kanalStitek = stitekPodekovaniKanalu(row.podekovaniKanal);
                const text =
                  zpravyRadku(row).find((z) => z.id === 'podekovani')?.text ||
                  textPodekovani(jazykRadku(row), row.odkaz, row.odjezd, dnes);
                const wa = row.telefonWa;
                const telefonSms = row.telefonText || (wa ? `+${wa}` : '');
                const emailSkutecny = skutecnyEmailProPodekovani(row);
                const jenRelayEmail = chybiSkutecnyEmailPodekovani(row);
                const odjezdText = row.odjezd
                  ? `${Number(row.odjezd.slice(8, 10))}. ${Number(row.odjezd.slice(5, 7))}.`
                  : '';
                return (
                  <li key={`hledani-${row.rezervace}`} className={odeslano ? 'is-hotovo' : 'is-akce'}>
                    <button type="button" className="ph-dnesek__odkaz" onClick={() => otevriKartu(row.rezervace)}>
                      {row.jmeno || 'Host'}
                    </button>
                    {' · '}
                    {row.apartman || 'bez apartmánu'}
                    {odjezdText ? ` · odjezd ${odjezdText}` : null}
                    {odeslano ? (
                      <span>{` · Poděkování odesláno ${odeslano}${kanalStitek ? ` · ${kanalStitek}` : ''}`}</span>
                    ) : null}
                    <span className="ph-podekovani-email-radek">
                      {emailSkutecny ? (
                        <>
                          E-mail hosta: <span className="ph-tel">{emailSkutecny}</span>
                        </>
                      ) : jenRelayEmail ? (
                        'Chybí skutečný e-mail (Booking/Airbnb)'
                      ) : (
                        'Bez e-mailu'
                      )}
                    </span>
                    <span className="ph-odjezdy__akce">
                      {wa ? (
                        <TlacitkoWhatsApp
                          wa={wa}
                          zprava={text}
                          userAgent={userAgent}
                          onPredOtevrenim={() => oznacPodekovani(row, 'whatsapp')}
                        >
                          WhatsApp
                        </TlacitkoWhatsApp>
                      ) : null}
                      {telefonSms ? (
                        <a
                          className="ph-wa"
                          href={odkazSmsPodekovani(telefonSms, text, jeIos(userAgent))}
                          onClick={() => void oznacPodekovani(row, 'sms')}
                        >
                          SMS
                        </a>
                      ) : null}
                      {emailSkutecny ? (
                        <button
                          type="button"
                          className="ph-wa"
                          onClick={() => {
                            setDotazPodekovani(row.rezervace);
                            requestAnimationFrame(() => {
                              document
                                .getElementById(`podekovani-email-${row.rezervace}`)
                                ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                            });
                          }}
                        >
                          E-mail
                        </button>
                      ) : null}
                      {odeslano ? (
                        <button type="button" className="ph-kopie" onClick={() => void vratPodekovani(row)}>
                          Vrátit
                        </button>
                      ) : null}
                    </span>
                    {dotazPodekovani === row.rezervace && emailSkutecny ? (
                      <div
                        id={`podekovani-email-${row.rezervace}`}
                        className="ph-predano-dotaz ph-predano-dotaz--email"
                      >
                        <p>E-mail půjde na</p>
                        <p className="ph-podekovani-email-cil">
                          <span className="ph-tel">{emailSkutecny}</span>
                        </p>
                        <p>
                          Kopie na <span className="ph-tel">info@vivienapartments.cz</span>
                          {odeslano ? '. Poslat znovu?' : '.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setDotazPodekovani(null);
                            void posliEmail(row, 'podekovani');
                          }}
                        >
                          Ano, poslat
                        </button>
                        <button type="button" onClick={() => setDotazPodekovani(null)}>
                          Zrušit
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}
      {pohledDomu && zalozka === 'prijezdy' && hostePodekovaniSeznam.length && podekovaniCekaAkce ? (
        <section id="podekovani" className="ph-domu-radek">
          <button
            type="button"
            className="ph-domu-radek__souhrn is-akce"
            aria-expanded={podekovaniOtevreno}
            onClick={() => setPodekovaniOtevreno((v) => !v)}
          >
            Odeslat poděkování · {hostePodekovaniSeznam.length} {podekovaniOtevreno ? '▴' : '▸'}
          </button>
          {podekovaniOtevreno ? (
            <ul className="ph-odjezdy ph-odjezdy--vnorene">
              {hostePodekovaniSeznam.map((row) => {
                const odeslano = row.podekovaniKdy ? hodinaPraha(row.podekovaniKdy) : '';
                const kanalStitek = stitekPodekovaniKanalu(row.podekovaniKanal);
                const text =
                  zpravyRadku(row).find((z) => z.id === 'podekovani')?.text ||
                  textPodekovani(jazykRadku(row), row.odkaz, row.odjezd, dnes);
                const wa = row.telefonWa;
                const telefonSms = row.telefonText || (wa ? `+${wa}` : '');
                const emailSkutecny = skutecnyEmailProPodekovani(row);
                const jenRelayEmail = chybiSkutecnyEmailPodekovani(row);
                const odjezdText = row.odjezd
                  ? `${Number(row.odjezd.slice(8, 10))}. ${Number(row.odjezd.slice(5, 7))}.`
                  : '';
                return (
                  <li key={row.rezervace} className={odeslano ? 'is-hotovo' : 'is-akce'}>
                    <button type="button" className="ph-dnesek__odkaz" onClick={() => otevriKartu(row.rezervace)}>
                      {row.jmeno || 'Host'}
                    </button>
                    {' · '}
                    {row.apartman || 'bez apartmánu'}
                    {odjezdText ? ` · odjezd ${odjezdText}` : null}
                    {odeslano ? (
                      <span>{` · Poděkování odesláno ${odeslano}${kanalStitek ? ` · ${kanalStitek}` : ''}`}</span>
                    ) : null}
                    <span className="ph-podekovani-email-radek">
                      {emailSkutecny ? (
                        <>
                          E-mail hosta: <span className="ph-tel">{emailSkutecny}</span>
                        </>
                      ) : jenRelayEmail ? (
                        'Chybí skutečný e-mail (Booking/Airbnb)'
                      ) : (
                        'Bez e-mailu'
                      )}
                    </span>
                    <span className="ph-odjezdy__akce">
                      {wa ? (
                        <TlacitkoWhatsApp
                          wa={wa}
                          zprava={text}
                          userAgent={userAgent}
                          onPredOtevrenim={() => oznacPodekovani(row, 'whatsapp')}
                        >
                          WhatsApp
                        </TlacitkoWhatsApp>
                      ) : null}
                      {telefonSms ? (
                        <a
                          className="ph-wa"
                          href={odkazSmsPodekovani(telefonSms, text, jeIos(userAgent))}
                          onClick={() => void oznacPodekovani(row, 'sms')}
                        >
                          SMS
                        </a>
                      ) : null}
                      {emailSkutecny ? (
                        <button
                          type="button"
                          className="ph-wa"
                          onClick={() => {
                            setDotazPodekovani(row.rezervace);
                            requestAnimationFrame(() => {
                              document
                                .getElementById(`podekovani-email-${row.rezervace}`)
                                ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                            });
                          }}
                        >
                          E-mail
                        </button>
                      ) : null}
                      {odeslano ? (
                        <button type="button" className="ph-kopie" onClick={() => void vratPodekovani(row)}>
                          Vrátit
                        </button>
                      ) : null}
                    </span>
                    {dotazPodekovani === row.rezervace && emailSkutecny ? (
                      <div
                        id={`podekovani-email-${row.rezervace}`}
                        className="ph-predano-dotaz ph-predano-dotaz--email"
                      >
                        <p>E-mail půjde na</p>
                        <p className="ph-podekovani-email-cil">
                          <span className="ph-tel">{emailSkutecny}</span>
                        </p>
                        <p>
                          Kopie na <span className="ph-tel">info@vivienapartments.cz</span>
                          {odeslano ? '. Poslat znovu?' : '.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setDotazPodekovani(null);
                            void posliEmail(row, 'podekovani');
                          }}
                        >
                          Ano, poslat
                        </button>
                        <button type="button" onClick={() => setDotazPodekovani(null)}>
                          Zrušit
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}
      {pohledDomu && zalozka === 'prijezdy' && hosteZitraOdjezd.length && zitraCekaAkce ? (
        <section id="odjezdy-zitra" className="ph-domu-radek">
          <button
            type="button"
            className="ph-domu-radek__souhrn is-akce"
            aria-expanded={zitraOtevreno}
            onClick={() => setZitraOtevreno((v) => !v)}
          >
            Zítra odjíždí {hosteZitraOdjezd.length} · vyřízeno {zitraVyrizeno} z{' '}
            {hosteZitraOdjezd.length} {zitraOtevreno ? '▴' : '▸'}
          </button>
          {zitraOtevreno ? (
            <ul className="ph-odjezdy ph-odjezdy--vnorene">
              {hosteZitraOdjezd.map((row) => {
                const cas = casOdjezduRadku(row);
                const znamy = jeHodina(cas);
                const naRade = !znamy && !row.odjezdDotaz;
                const stavText = znamy
                  ? `odjezd ${zobrazCas(cas)} ✓`
                  : row.odjezdDotaz
                    ? `dotaz poslán ${casPraha(row.odjezdDotaz) || hodinaPraha(row.odjezdDotaz)}`
                    : 'dotaz neposlán';
                return (
                  <li key={row.rezervace} className={naRade ? 'is-akce' : znamy ? 'is-hotovo' : undefined}>
                    <button type="button" className="ph-dnesek__odkaz" onClick={() => otevriKartu(row.rezervace)}>
                      {row.apartman || '—'} · {row.jmeno || 'Host'}
                    </button>
                    {' · '}
                    {stavText}
                    {naRade ? (
                      <>
                        {' · '}
                        <button
                          type="button"
                          className="ph-dnesek__odkaz"
                          onClick={() => otevriZpravuHosta(row.rezervace, 'odjezd')}
                        >
                          Napsat zprávu
                        </button>
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}
      {pohledDomu && zalozka === 'dluhy' ? (
        <Nedoplatky
          radky={radky}
          dnes={dnes}
          ukazka={ukazka}
          onOtevri={otevriKartu}
          onPlatby={zapisPlatbyRadku}
        />
      ) : null}
      {pohledDomu && zalozka === 'hledat' ? (
        <>
          <Hledani
            radky={radky}
            dnes={dnes}
            zitra={zitra}
            dotaz={hledatDotaz}
            onDotaz={setHledatDotaz}
            autofokus
            onOtevri={otevriKartu}
            onNovaRezervace={otevriNovouRezervaci}
          />
          {novaRezervace ? (
            <form className="ph-pridani" onSubmit={(e) => void ulozNovouRezervaci(e)}>
              <h2>{novaRezervace.jmeno ? 'Nová rezervace pro hosta' : 'Nová rezervace – nový host'}</h2>
              <label>
                Jméno a příjmení
                <input name="jmeno" defaultValue={novaRezervace.jmeno} autoComplete="name" />
              </label>
              <label>
                Telefon
                <input name="telefon" type="tel" defaultValue={novaRezervace.telefon} autoComplete="tel" />
              </label>
              <label className="ph-siroke">
                E-mail
                <input name="email" type="email" defaultValue={novaRezervace.email} autoComplete="email" />
              </label>
              <label>
                Apartmán
                <select name="apartman" defaultValue="" required>
                  <option value="">vyberte</option>
                  {apartmany.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} {a.nazev.cs}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Příjezd
                <input name="prijezd" type="date" required />
              </label>
              <label>
                Odjezd
                <input name="odjezd" type="date" required />
              </label>
              <label>
                Počet osob
                <input name="osob" type="number" min={1} defaultValue={2} required />
              </label>
              <label>
                PIN do apartmánu
                <input name="pin" inputMode="numeric" pattern="[0-9]*" autoComplete="off" required />
              </label>
              <label>
                Národnost
                <input name="narodnost" defaultValue={novaRezervace.narodnost} autoComplete="off" />
              </label>
              <label>
                Jazyk průvodce
                <select name="jazyk" defaultValue={novaRezervace.jazyk}>
                  {GUIDE_LANGS.map((lang) => (
                    <option key={lang} value={lang}>
                      {LANG_LABELS[lang]}
                    </option>
                  ))}
                </select>
              </label>
              {potvrdPrekryv ? (
                <p className="ph-chyba">Apartmán je v termínu obsazený. Uložením potvrdíte překryv.</p>
              ) : null}
              <div className="ph-akce-spodek">
                <button type="submit" disabled={cekam !== null}>
                  {potvrdPrekryv ? 'Přesto uložit' : 'Uložit'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNovaRezervace(null);
                    setPotvrdPrekryv(false);
                  }}
                >
                  Zrušit
                </button>
              </div>
            </form>
          ) : null}
        </>
      ) : null}

      {(pohledDomu && zalozka === 'prijezdy') || !pohledDomu ? (
      <>
      {!pohledDomu ? (
        <div className="ph-filtry">
          <label>
            Stav
            <select value={stav} onChange={(e) => setStav(e.target.value as '' | Stav)}>
              {STAVY.map((s) => (
                <option key={s.id || 'all'} value={s.id}>
                  {s.text}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {hlaska ? <p className="ph-hlaska">{hlaska}</p> : null}

      <div className="ph-head" aria-hidden="true">
        <span>Stav</span>
        <span>Host</span>
        <span>Apartmán</span>
        <span>Příjezd</span>
        <span>Vytvořeno</span>
        <span>Co se stalo</span>
        <span>Poslední pokus</span>
      </div>

      {aktivni.length === 0 && odjeli.length === 0 ? <p className="ph-prazdno">Nic tu není.</p> : null}
      </>
      ) : null}

      {(pohledDomu && zalozka === 'prijezdy') || !pohledDomu
        ? aktivni.map((row) => {
            const pred = predanoRadku(row);
            if (pred && !rozbalPredano[row.rezervace]) {
              const cas = casPrevzetiText(pred);
              return (
                <button
                  key={row.rezervace}
                  type="button"
                  className="ph-dnesek__radek is-uklizeno is-sbaleno ph-predano-sbal"
                  onClick={() => {
                    setRozbalPredano((s) => ({ ...s, [row.rezervace]: true }));
                    rozbalDetailKarty(row.rezervace);
                  }}
                >
                  <strong>{row.apartman || 'Apartmán'}</strong>
                  {' · '}
                  {row.jmeno || row.rezervace}
                  {cas ? ` · předáno ${cas}` : ' · předáno'}
                </button>
              );
            }
            return kartaHosta(row);
          })
        : null}

      {(pohledDomu && zalozka === 'prijezdy') || !pohledDomu ? (
        <Dnesek
          radky={radky}
          dnes={pohledDomu ? dnes : vybranyDen}
          operacePovolene={pohledDomu || vybranyDen === dnes}
          jenUklid
          ukazka={ukazka}
          brana={brana}
          vPrehledu
          onPrevzato={poPrevzeti}
          onOtevri={otevriKartu}
          onNapsatOdjezd={(id) => otevriZpravuHosta(id, 'odjezd')}
          onZavadyZapsany={() => {
            setHlaska('Závady po odjezdu uloženy.');
            router.refresh();
          }}
        />
      ) : null}

      {((pohledDomu && zalozka === 'prijezdy') || !pohledDomu) && odjeli.length ? (
        <section className="ph-odjeli">
          <h2>Odjeli</h2>
          <button
            type="button"
            className="ph-rozbal"
            aria-expanded={odjeliOtevreno}
            onClick={() => setOdjeliOtevreno((v) => !v)}
          >
            {odjeliOtevreno ? 'Skrýt detail ▴' : 'Detail ▾'}
          </button>
          {odjeliOtevreno ? odjeli.map((row) => kartaHosta(row)) : null}
        </section>
      ) : null}

      {pohledDomu && !ukazka ? (
        <section className="ph-doplnit-zdroj" style={{ margin: '1rem 0' }}>
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>
            Doplnit zdroj
            {radky.filter((r) => r.stav !== 'zruseno' && (r.zdrojCeka || !r.zdroj)).length
              ? ` · ${radky.filter((r) => r.stav !== 'zruseno' && (r.zdrojCeka || !r.zdroj)).length}`
              : ''}
          </h2>
          {radky.filter((r) => r.stav !== 'zruseno' && (r.zdrojCeka || !r.zdroj)).length === 0 ? (
            <p className="ph-muted">Nic nečeká.</p>
          ) : (
            <ul className="ph-odjezdy">
              {radky
                .filter((r) => r.stav !== 'zruseno' && (r.zdrojCeka || !r.zdroj))
                .map((row) => (
                  <li key={`zdroj-${row.rezervace}`}>
                    <button
                      type="button"
                      className="ph-dnesek__odkaz"
                      onClick={() => otevriKartu(row.rezervace)}
                    >
                      {row.jmeno || 'Host'}
                    </button>
                    {' · '}
                    {row.termin || 'termín?'}
                    {row.emailDomena ? ` · ${row.emailDomena}` : ' · bez e-mailu'}
                    <span className="ph-odjezdy__akce" style={{ display: 'inline-flex', gap: '0.35rem', flexWrap: 'wrap', marginLeft: '0.5rem' }}>
                      {(['přímá', 'Booking', 'Airbnb'] as const).map((z) => (
                        <button
                          key={z}
                          type="button"
                          className="ph-btn ph-btn--maly"
                          disabled={cekam === `${row.rezervace}:zdroj`}
                          onClick={async () => {
                            setCekam(`${row.rezervace}:zdroj`);
                            setHlaska('');
                            const res = await fetch('/api/prehled/akce', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                rezervace: row.rezervace,
                                akce: 'zdroj',
                                zdroj: z,
                              }),
                            });
                            const json = (await res.json().catch(() => null)) as {
                              ok?: boolean;
                              error?: string;
                              zdroj?: string;
                            } | null;
                            setCekam(null);
                            if (!res.ok || !json?.ok) {
                              setHlaska(json?.error || 'Zdroj se neuložil.');
                              return;
                            }
                            setRadky((prev) =>
                              prev.map((r) =>
                                r.rezervace === row.rezervace
                                  ? {
                                      ...r,
                                      zdroj: json.zdroj || z,
                                      zdrojText: json.zdroj || z,
                                      zdrojCeka: false,
                                    }
                                  : r,
                              ),
                            );
                          }}
                        >
                          {z === 'přímá' ? 'Přímá' : z}
                        </button>
                      ))}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      ) : null}

      {pohledDomu && !ukazka ? (
        <CoDoplnit
          radky={radky}
          dnes={dnes}
          odkazy={odkazy}
          filtr={filtrDoplnit}
          onFiltr={setFiltrDoplnit}
          otevrenoVenku={otevriDoplnitSignal}
          onOtevri={(id) => otevriKartu(id)}
          onNapsat={otevriZpravuHosta}
          onUlozOdkaz={(row, text) => ulozOdkaz(row, text)}
          onUlozTelefon={(row, text) => ulozTelefon(row, row.telefonKtery || 'rezervace', text)}
        />
      ) : null}

      {pohledDomu && zalozka === 'prijezdy' ? (
        <FakturyDomu
          radky={radky}
          dnes={dnes}
          ukazka={ukazka}
          userAgent={userAgent}
          onZmena={zmenFakturu}
          onCenaPobytu={zmenCenuPobytu}
          onMena={(rezervace, mena) => {
            const r = radky.find((x) => x.rezervace === rezervace);
            if (r) void ulozMena(r, mena);
          }}
          onHlaska={setHlaska}
          onOtevriKartu={otevriKartu}
          jen="pozdeji"
        />
      ) : null}
      {pohledDomu && zalozka === 'prijezdy' && hostePohodaHotove.length && !pohodaCekaAkce ? (
        <section id="pohoda" className="ph-domu-radek">
          <button
            type="button"
            className="ph-domu-radek__souhrn"
            aria-expanded={pohodaOtevreno}
            onClick={() => setPohodaOtevreno((v) => !v)}
          >
            Je vše v pořádku? · Hotové · {hostePohodaHotove.length} {pohodaOtevreno ? '▴' : '▸'}
          </button>
          {pohodaOtevreno ? (
            <ul className="ph-odjezdy ph-odjezdy--vnorene">
              {hostePohodaHotove.map((row) => {
                const odeslano = row.pohodaDotaz ? hodinaPraha(row.pohodaDotaz) : '';
                const text = textPohody(jazykRadku(row));
                const wa = row.telefonWa;
                const email = row.email.includes('@') ? row.email : '';
                return (
                  <li key={row.rezervace} className="is-hotovo">
                    <button type="button" className="ph-dnesek__odkaz" onClick={() => otevriKartu(row.rezervace)}>
                      {row.jmeno || 'Host'}
                    </button>
                    {' · '}
                    {row.apartman || 'bez apartmánu'}
                    {odeslano ? <span>{` · Odesláno ${odeslano}`}</span> : null}
                    <span className="ph-odjezdy__akce">
                      <TlacitkoWhatsApp
                        wa={wa}
                        zprava={text}
                        userAgent={userAgent}
                        onPredOtevrenim={() => oznacPohodu(row)}
                      />
                      {email ? (
                        <button type="button" className="ph-wa" onClick={() => setDotazPohoda(row.rezervace)}>
                          Poslat e-mailem znovu
                        </button>
                      ) : null}
                    </span>
                    {dotazPohoda === row.rezervace ? (
                      <div className="ph-predano-dotaz">
                        <p>
                          Poslat e-mail na <span className="ph-tel">{email}</span> znovu?
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setDotazPohoda(null);
                            void posliEmail(row, 'pohoda');
                          }}
                        >
                          Ano
                        </button>
                        <button type="button" onClick={() => setDotazPohoda(null)}>
                          Zrušit
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}
      {pohledDomu && zalozka === 'prijezdy' && hosteShrnutiHotove.length && !shrnutiCekaAkce ? (
        <section id="vse-pripraveno" className="ph-domu-radek">
          <button
            type="button"
            className="ph-domu-radek__souhrn"
            aria-expanded={shrnutiOtevreno}
            onClick={() => setShrnutiOtevreno((v) => !v)}
          >
            Vše připraveno · Hotové · {hosteShrnutiHotove.length} {shrnutiOtevreno ? '▴' : '▸'}
          </button>
          {shrnutiOtevreno ? (
            <ul className="ph-odjezdy ph-odjezdy--vnorene">
              {hosteShrnutiHotove.map((row) => {
                const odeslano = row.shrnutiKdy ? hodinaPraha(row.shrnutiKdy) : '';
                const kanalStitek = stitekShrnutiKanalu(row.shrnutiKanal);
                const neposlato = row.shrnutiKanal === 'neposilat';
                const text =
                  zpravyRadku(row).find((z) => z.id === 'shrnuti')?.text ||
                  textShrnuti(
                    {
                      casPrijezdu: row.casPrijezdu,
                      zpusobPrijezdu: row.zpusobPrijezdu,
                      telefonBrana: row.telefonBrana,
                      apartman: row.apartman,
                      jazyk: jazykRadku(row),
                    },
                    jazykRadku(row),
                    row.odkaz,
                  );
                const wa = row.telefonWa;
                const telefonSms = row.telefonText || (wa ? `+${wa}` : '');
                const email = row.email.includes('@') ? row.email : '';
                return (
                  <li key={row.rezervace} className="is-hotovo">
                    <button type="button" className="ph-dnesek__odkaz" onClick={() => otevriKartu(row.rezervace)}>
                      {row.jmeno || 'Host'}
                    </button>
                    {' · '}
                    {row.apartman || 'bez apartmánu'}
                    {odeslano ? (
                      <span>
                        {neposlato
                          ? ` · Neposláno ${odeslano}`
                          : ` · Shrnutí odesláno ${odeslano}${kanalStitek ? ` · ${kanalStitek}` : ''}`}
                      </span>
                    ) : null}
                    <span className="ph-odjezdy__akce">
                      {wa ? (
                        <TlacitkoWhatsApp
                          wa={wa}
                          zprava={text}
                          userAgent={userAgent}
                          onPredOtevrenim={() => oznacShrnuti(row, 'whatsapp')}
                        >
                          WhatsApp
                        </TlacitkoWhatsApp>
                      ) : null}
                      {telefonSms ? (
                        <a
                          className="ph-wa"
                          href={odkazSmsShrnuti(telefonSms, text, jeIos(userAgent))}
                          onClick={() => void oznacShrnuti(row, 'sms')}
                        >
                          SMS
                        </a>
                      ) : null}
                      {email ? (
                        <button
                          type="button"
                          className="ph-wa"
                          onClick={() => otevriDotazShrnutiEmail(row.rezervace)}
                        >
                          E-mail
                        </button>
                      ) : null}
                      <button type="button" className="ph-kopie" onClick={() => void vratShrnuti(row)}>
                        Vrátit
                      </button>
                      {dotazShrnuti === row.rezervace ? (
                        <div
                          id={`shrnuti-email-${row.rezervace}`}
                          className="ph-predano-dotaz ph-predano-dotaz--email"
                        >
                          <p>
                            Pošleme e-mail ze systému VIVIEN na <span className="ph-tel">{email}</span> znovu.
                            Není to WhatsApp ani SMS.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setDotazShrnuti(null);
                              void posliEmail(row, 'shrnuti');
                            }}
                          >
                            Ano, poslat e-mail
                          </button>
                          <button type="button" onClick={() => setDotazShrnuti(null)}>
                            Zrušit
                          </button>
                        </div>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}
      {pohledDomu && zalozka === 'prijezdy' && hostePodekovaniSeznam.length && !podekovaniCekaAkce ? (
        <section id="podekovani" className="ph-domu-radek">
          <button
            type="button"
            className="ph-domu-radek__souhrn"
            aria-expanded={podekovaniOtevreno}
            onClick={() => setPodekovaniOtevreno((v) => !v)}
          >
            Odeslat poděkování · {hostePodekovaniSeznam.length} {podekovaniOtevreno ? '▴' : '▸'}
          </button>
          {podekovaniOtevreno ? (
            <ul className="ph-odjezdy ph-odjezdy--vnorene">
              {hostePodekovaniSeznam.map((row) => {
                const odeslano = row.podekovaniKdy ? hodinaPraha(row.podekovaniKdy) : '';
                const kanalStitek = stitekPodekovaniKanalu(row.podekovaniKanal);
                const text =
                  zpravyRadku(row).find((z) => z.id === 'podekovani')?.text ||
                  textPodekovani(jazykRadku(row), row.odkaz, row.odjezd, dnes);
                const wa = row.telefonWa;
                const telefonSms = row.telefonText || (wa ? `+${wa}` : '');
                const emailSkutecny = skutecnyEmailProPodekovani(row);
                const jenRelayEmail = chybiSkutecnyEmailPodekovani(row);
                return (
                  <li key={row.rezervace} className="is-hotovo">
                    <button type="button" className="ph-dnesek__odkaz" onClick={() => otevriKartu(row.rezervace)}>
                      {row.jmeno || 'Host'}
                    </button>
                    {' · '}
                    {row.apartman || 'bez apartmánu'}
                    {odeslano ? (
                      <span>{` · Poděkování odesláno ${odeslano}${kanalStitek ? ` · ${kanalStitek}` : ''}`}</span>
                    ) : null}
                    <span className="ph-podekovani-email-radek">
                      {emailSkutecny ? (
                        <>
                          E-mail hosta: <span className="ph-tel">{emailSkutecny}</span>
                        </>
                      ) : jenRelayEmail ? (
                        'Chybí skutečný e-mail (Booking/Airbnb)'
                      ) : (
                        'Bez e-mailu'
                      )}
                    </span>
                    <span className="ph-odjezdy__akce">
                      {wa ? (
                        <TlacitkoWhatsApp
                          wa={wa}
                          zprava={text}
                          userAgent={userAgent}
                          onPredOtevrenim={() => oznacPodekovani(row, 'whatsapp')}
                        >
                          WhatsApp
                        </TlacitkoWhatsApp>
                      ) : null}
                      {telefonSms ? (
                        <a
                          className="ph-wa"
                          href={odkazSmsPodekovani(telefonSms, text, jeIos(userAgent))}
                          onClick={() => void oznacPodekovani(row, 'sms')}
                        >
                          SMS
                        </a>
                      ) : null}
                      {emailSkutecny ? (
                        <button
                          type="button"
                          className="ph-wa"
                          onClick={() => {
                            setDotazPodekovani(row.rezervace);
                            requestAnimationFrame(() => {
                              document
                                .getElementById(`podekovani-email-${row.rezervace}`)
                                ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                            });
                          }}
                        >
                          E-mail
                        </button>
                      ) : null}
                      <button type="button" className="ph-kopie" onClick={() => void vratPodekovani(row)}>
                        Vrátit
                      </button>
                    </span>
                    {dotazPodekovani === row.rezervace && emailSkutecny ? (
                      <div
                        id={`podekovani-email-${row.rezervace}`}
                        className="ph-predano-dotaz ph-predano-dotaz--email"
                      >
                        <p>E-mail půjde na</p>
                        <p className="ph-podekovani-email-cil">
                          <span className="ph-tel">{emailSkutecny}</span>
                        </p>
                        <p>
                          Kopie na <span className="ph-tel">info@vivienapartments.cz</span>. Poslat znovu?
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setDotazPodekovani(null);
                            void posliEmail(row, 'podekovani');
                          }}
                        >
                          Ano, poslat
                        </button>
                        <button type="button" onClick={() => setDotazPodekovani(null)}>
                          Zrušit
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}
      {pohledDomu && zalozka === 'prijezdy' && hosteZitraOdjezd.length && !zitraCekaAkce ? (
        <section id="odjezdy-zitra" className="ph-domu-radek">
          <button
            type="button"
            className="ph-domu-radek__souhrn"
            aria-expanded={zitraOtevreno}
            onClick={() => setZitraOtevreno((v) => !v)}
          >
            Zítra odjíždí {hosteZitraOdjezd.length} · vyřízeno {zitraVyrizeno} z{' '}
            {hosteZitraOdjezd.length} {zitraOtevreno ? '▴' : '▸'}
          </button>
          {zitraOtevreno ? (
            <ul className="ph-odjezdy ph-odjezdy--vnorene">
              {hosteZitraOdjezd.map((row) => {
                const cas = casOdjezduRadku(row);
                const znamy = jeHodina(cas);
                const stavText = znamy
                  ? `odjezd ${zobrazCas(cas)} ✓`
                  : row.odjezdDotaz
                    ? `dotaz poslán ${casPraha(row.odjezdDotaz) || hodinaPraha(row.odjezdDotaz)}`
                    : 'dotaz neposlán';
                return (
                  <li key={row.rezervace} className={znamy ? 'is-hotovo' : undefined}>
                    <button type="button" className="ph-dnesek__odkaz" onClick={() => otevriKartu(row.rezervace)}>
                      {row.apartman || '—'} · {row.jmeno || 'Host'}
                    </button>
                    {' · '}
                    {stavText}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}

      {pohledDomu ? (
        <BranaTabulka
          sloty={sloty}
          radky={radky}
          ukazka={ukazka}
          potvrzena={branaOk}
          onPotvrzeno={() => setBranaOk(true)}
          onSloty={setSloty}
          onHlaska={setHlaska}
          onHost={(id) => {
            rozbalDetailKarty(id);
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      ) : null}
      {pohledDomu ? <KalendarPrehled /> : null}
      {/* Záloha: když okno zůstane otevřené mimo kartu hosta (na kartě je volba pod tlačítkem). */}
      {oknoKarty && vybrana !== oknoKarty.rezervace
        ? (() => {
            const row =
              radky.find((r) => r.rezervace === oknoKarty.rezervace) ||
              ({ rezervace: oknoKarty.rezervace } as PrehledRadek);
            return (
              <div className="ph-karta-overlay" role="dialog" aria-modal="true" aria-label="Kam poslat kartu">
                <div className="ph-okno ph-okno--karta ph-okno--karta-overlay">
                  <p>
                    <strong>Předat · {oknoKarty.jmeno}</strong>
                  </p>
                  <p className="ph-okno__kontakty">
                    Kam poslat odkaz na kartu s průvodcem. Po odeslání uvidí host kódy.
                  </p>
                  {oknoKarty.testRezim && oknoKarty.odkaz ? (
                    <p className="ph-okno__kontakty">
                      <a href={oknoKarty.odkaz} target="_blank" rel="noopener noreferrer">
                        Otevřít kartu, kterou host uvidí
                      </a>
                    </p>
                  ) : null}
                  <div className="ph-okno__akce">
                    <button
                      type="button"
                      disabled={cekam !== null || !oknoKarty.telefonWa}
                      title={!oknoKarty.telefonWa ? 'Chybí telefon z check-inu' : undefined}
                      onClick={() => void kanalKarty(row, 'whatsapp')}
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      disabled={cekam !== null || !oknoKarty.telefonWa}
                      title={!oknoKarty.telefonWa ? 'Chybí telefon z check-inu' : undefined}
                      onClick={() => void kanalKarty(row, 'sms')}
                    >
                      SMS
                    </button>
                    <button
                      type="button"
                      disabled={
                        cekam !== null ||
                        !oknoKarty.email ||
                        oknoKarty.emailRelay ||
                        oknoKarty.emailOdeslan
                      }
                      title={
                        oknoKarty.emailRelay
                          ? 'adresa z Bookingu'
                          : !oknoKarty.email
                            ? 'Chybí e-mail z check-inu'
                            : undefined
                      }
                      onClick={() => void kanalKarty(row, 'email')}
                    >
                      E-mail
                    </button>
                    {!predanoRadku(row) ? (
                      <button
                        type="button"
                        disabled={cekam !== null}
                        onClick={() => void predaniBezKarty(row)}
                      >
                        Předat bez karty
                      </button>
                    ) : null}
                    <button type="button" onClick={() => zavriOknoKarty(row)}>
                      Zavřít
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        : null}
      {dotazBezKarty && vybrana !== dotazBezKarty
        ? (() => {
            const row =
              radky.find((r) => r.rezervace === dotazBezKarty) ||
              ({ rezervace: dotazBezKarty } as PrehledRadek);
            return (
              <div className="ph-karta-overlay" role="dialog" aria-modal="true" aria-label="Předat bez karty">
                <div className="ph-okno ph-okno--karta ph-okno--karta-overlay">
                  <p>
                    <strong>Předat bez karty?</strong>
                  </p>
                  <p className="ph-okno__kontakty">
                    Host uvidí kódy v průvodci. Kartu mu teď nepošlete. Útrata se započítá až při
                    předání zpět.
                  </p>
                  <div className="ph-okno__akce">
                    <button
                      type="button"
                      disabled={cekam !== null}
                      onClick={() => void predaniBezKarty(row)}
                    >
                      Ano, předat bez karty
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDotazBezKarty(null);
                      }}
                    >
                      Ne, jen zavřít
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        : null}
    </main>
  );
}

function HostUzZaplatilPole({
  disabled,
  mena = 'CZK',
  onUloz,
}: {
  disabled?: boolean;
  mena?: MenaPlateb;
  onUloz: (castka: string, text: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [castka, setCastka] = useState('');
  const [text, setText] = useState('');
  const [stav, setStav] = useState<'nic' | 'ok' | 'chyba'>('nic');
  const [chyba, setChyba] = useState('');
  const jeEur = mena === 'EUR';

  return (
    <div className="ph-cas ph-pole">
      <span>Host už zaplatil</span>
      <span className="ph-pole-rada">
        <input
          inputMode="decimal"
          autoComplete="off"
          placeholder={jeEur ? '€' : 'Kč'}
          value={castka}
          disabled={disabled}
          onChange={(e) => {
            setCastka(e.target.value);
            setStav('nic');
            setChyba('');
          }}
          aria-label={jeEur ? 'Už zaplacená částka v eurech' : 'Už zaplacená částka v Kč'}
        />
        <button
          type="button"
          className="ph-ulozit"
          disabled={disabled}
          onClick={async () => {
            const vysledek = await onUloz(castka, text);
            if (!vysledek.ok) {
              setStav('chyba');
              setChyba(vysledek.error || 'Nezapsáno, zkuste znovu.');
              return;
            }
            setCastka('');
            setText('');
            setChyba('');
            setStav('ok');
          }}
        >
          Zapsat
        </button>
      </span>
      <input
        autoComplete="off"
        placeholder="Poznámka (faktura, převod…)"
        value={text}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          setStav('nic');
          setChyba('');
        }}
        aria-label="Poznámka k už zaplacené částce"
      />
      {stav === 'ok' ? <span className="ph-ulozeno">Zapsáno ✓</span> : null}
      {stav === 'chyba' ? <span className="ph-neulozeno">{chyba}</span> : null}
    </div>
  );
}

function DohodaPole({
  kc,
  poznamka,
  onUloz,
}: {
  kc: number | null;
  poznamka: string | null;
  onUloz: (
    castka: string,
    text: string,
  ) => Promise<{ ok: boolean; dohodaKc?: number | null; dohodaPoznamka?: string | null }>;
}) {
  const [castka, setCastka] = useState(kc != null ? String(kc) : '');
  const [text, setText] = useState(poznamka || '');
  const [stav, setStav] = useState<'nic' | 'ok' | 'chyba'>('nic');

  return (
    <div className="ph-cas ph-pole">
      <span>Domluvená částka</span>
      <span className="ph-pole-rada">
        <input
          inputMode="numeric"
          autoComplete="off"
          placeholder="Kč"
          value={castka}
          onChange={(e) => {
            setCastka(e.target.value);
            setStav('nic');
          }}
          aria-label="Částka v Kč"
        />
        <button
          type="button"
          className="ph-ulozit"
          onClick={async () => {
            const vysledek = await onUloz(castka, text);
            if (!vysledek.ok) {
              setStav('chyba');
              return;
            }
            setCastka(vysledek.dohodaKc != null ? String(vysledek.dohodaKc) : '');
            setText(vysledek.dohodaPoznamka || '');
            setStav('ok');
          }}
        >
          Uložit
        </button>
        {kc != null ? (
          <button
            type="button"
            className="ph-ulozit"
            onClick={async () => {
              const vysledek = await onUloz('', '');
              if (!vysledek.ok) {
                setStav('chyba');
                return;
              }
              setCastka('');
              setText('');
              setStav('ok');
            }}
          >
            Smazat
          </button>
        ) : null}
      </span>
      <input
        autoComplete="off"
        placeholder="Za co (poznámka)"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setStav('nic');
        }}
        aria-label="Poznámka k částce"
      />
      {stav === 'ok' ? <span className="ph-ulozeno">Uloženo ✓</span> : null}
      {stav === 'chyba' ? <span className="ph-neulozeno">Neuloženo, zkuste znovu</span> : null}
    </div>
  );
}

function PoleSUlozenim({
  label,
  hodnota,
  onUloz,
  poznamka,
  vstup,
}: {
  label: string;
  hodnota: string;
  poznamka?: ReactNode;
  vstup?: InputHTMLAttributes<HTMLInputElement>;
  onUloz: (text: string) => Promise<{ ok: boolean; hodnota?: string }>;
}) {
  const [text, setText] = useState(hodnota);
  const [stav, setStav] = useState<'nic' | 'ok' | 'chyba'>('nic');
  const zeServeru = useRef(hodnota);
  useEffect(() => {
    const predchozi = zeServeru.current;
    zeServeru.current = hodnota;
    setText((rozepsano) => (rozepsano === predchozi ? hodnota : rozepsano));
  }, [hodnota]);

  return (
    <label className="ph-cas ph-pole">
      {label}
      {poznamka}
      <span className="ph-pole-rada">
        <input
          {...vstup}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setStav('nic');
          }}
        />
        <button
          type="button"
          className="ph-ulozit"
          onClick={async () => {
            const vysledek = await onUloz(text);
            if (!vysledek.ok) {
              setStav('chyba');
              return;
            }
            const hotovo = vysledek.hodnota ?? text;
            zeServeru.current = hotovo;
            setText(hotovo);
            setStav('ok');
          }}
        >
          Uložit
        </button>
      </span>
      {stav === 'ok' ? <span className="ph-ulozeno">Uloženo ✓</span> : null}
      {stav === 'chyba' ? <span className="ph-neulozeno">Neuloženo, zkuste znovu</span> : null}
    </label>
  );
}

const PUSH_NAZEV_KLIC = 'vivien-push-nazev';

function nactiNazevPush(): string {
  try {
    return (localStorage.getItem(PUSH_NAZEV_KLIC) || '').trim().slice(0, 40);
  } catch {
    return '';
  }
}

function kdoZNazvuTelefonu(nazev: string): KdoZavad {
  const n = nazev.trim().toLowerCase();
  if (n.includes('nikol')) return 'nikol';
  if (n.includes('miluš') || n.includes('milus')) return 'miluska';
  return 'pravoslav';
}

function OpravitForm({
  row,
  cekam,
  onSubmit,
}: {
  row: PrehledRadek;
  cekam: boolean;
  onSubmit: (extra: Record<string, string>) => void;
}) {
  return (
    <form
      className="ph-form"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSubmit({
          email: String(data.get('email') || ''),
          apartman: String(data.get('apartman') || ''),
          prijezd: String(data.get('prijezd') || ''),
          odjezd: String(data.get('odjezd') || ''),
          osob: String(data.get('osob') || ''),
          jazyk: String(data.get('jazyk') || ''),
          pin: String(data.get('pin') || ''),
        });
      }}
    >
      <label>
        E-mail
        <input name="email" type="email" defaultValue={row.email === STARY_ZAZNAM ? '' : row.email} required />
      </label>
      <label>
        Apartmán
        <select name="apartman" defaultValue={row.apartman || ''}>
          <option value="">Vyberte</option>
          {apartmany.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nazev.cs} ({a.id})
            </option>
          ))}
        </select>
      </label>
      <label>
        Příjezd
        <input name="prijezd" type="date" defaultValue={row.prijezd || ''} required />
      </label>
      <label>
        Odjezd
        <input name="odjezd" type="date" defaultValue={row.odjezd || ''} required />
      </label>
      <label>
        Osoby
        <input name="osob" type="number" min={1} defaultValue={row.osob ?? ''} required />
      </label>
      <label>
        PIN apartmánu
        <input name="pin" defaultValue={row.accessPin || ''} autoComplete="off" required />
      </label>
      <label>
        Jazyk
        <select name="jazyk" defaultValue={row.jazyk || 'cs'}>
          {GUIDE_LANGS.map((lang) => (
            <option key={lang} value={lang}>
              {LANG_LABELS[lang as GuideLang]}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={cekam}>
        Uložit a odeslat
      </button>
    </form>
  );
}
