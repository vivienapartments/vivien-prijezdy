'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
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
  textAutomatNebezi,
  textPoplatku,
  vetaChyby,
  zavaznostProblemuPrijezdu,
  type PrehledRadek,
} from '@/lib/prehled';
import { normalizujCasPrijezdu } from '@/lib/cas-prijezdu';
import { zpravaZUpozorneniUrl } from '@/lib/prehled-odkaz';
import { odkazWhatsAppPrehled, zpravyMenu } from '@/lib/whatsapp-zprava';
import { chybejiciKroky } from '@/lib/vstup-pruvodce';
import {
  CAS_PO_23,
  popisekCasu,
  novyVyjezd,
  priplatekProCas,
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
  ukazatCasNaKarte,
  zobrazCas,
  zpravaOdjezdu,
  type DruhDluhu,
} from '@/lib/odjezd';
import { jeProPohodu, textPohody } from '@/lib/pohoda';
import { odkazPruvodceMajitele } from '@/lib/pruvodce-majitel';
import { TlacitkoWhatsApp } from '@/components/TlacitkoWhatsApp';
import { BranaTabulka, ParkovaniRadek } from './BranaPrehled';
import { CoDoplnit } from './CoDoplnit';
import { Dnesek } from './Dnesek';
import { PraniDetail, PraniRamecekDomu, PraniStitek } from './PraniAdmin';
import { Hledani, Nedoplatky, RadaZalozek } from './ZalozkyPrehledu';
import type { PraniRadekPrehled, PraniStitekKarty } from '@/lib/prani';
import type { JakPlatby, PlatbaPolozky, UpozorneniZaznam } from '@/lib/store';
import { casPrevzetiText, formatKc, jeHostOdjetly, jeNove, jeVDnesnichOdjezdech, jeVNedoplatcich, nahledPlateb, otisk, vychoziZalozka, type Zalozka } from '@/lib/zalozky';
import { jeIos, nactiBranu, smsOdkaz, stavParkovani, type BranaSlot } from '@/lib/brana';
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
  ukazatCheckinNedojezd,
  type CasovaZpravaId,
} from '@/lib/pripominky-stupne';
import {
  HLASKA_NENASTAVENO,
  HLASKA_NEPOVOLENO,
  HLASKA_NESPAROVANO,
  HLASKA_PROHLIZEC,
  HLASKA_ZAPINAM,
  HLASKA_ZAPNUTO,
  hlaskaChybyZapnuti,
  jeSparovano,
  nadpisPushSekce,
  radekDiagnostikyPush,
  type PushPovoleni,
} from '@/lib/push-stav';
function stitekDneKarty(prijezd: string | null, dnesDen: string): string {
  if (!prijezd) return 'Bez data';
  if (prijezd === dnesDen) return 'Dnes';
  const casti = prijezd.split('-');
  if (casti.length !== 3) return prijezd;
  return `${Number(casti[2])}.\u00A0${Number(casti[1])}.`;
}

type DetailSekceId =
  | 'kontakt'
  | 'casy'
  | 'predani'
  | 'prani'
  | 'parkovani'
  | 'pruvodce'
  | 'penize'
  | 'rezervace'
  | 'historie';

const DETAIL_SEKCE_VSE: DetailSekceId[] = [
  'kontakt',
  'casy',
  'predani',
  'prani',
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

const KLIC_UPOZORNENI_PRECTENO = 'vivien-upozorneni-precteno';

/** Číslo rezervace z odkazu upozornění (`/prehled#12026…`). */
function idZUpozorneniUrl(url: string): string | null {
  const raw = (url || '').trim();
  if (!raw) return null;
  const hash = (raw.split('#')[1] || '').split(/[?&]/)[0].trim();
  if (!hash || hash === 'pohoda' || hash === 'brana' || hash.startsWith('odjezdy')) return null;
  return hash;
}

function zalozkaZUpozorneniUrl(url: string): Zalozka | null {
  const m = (url || '').match(/[?&]zalozka=(prijezdy|dnes|dluhy|hledat)\b/);
  if (!m) return null;
  return m[1] as Zalozka;
}

/** Kotva sekce (pohoda, odjezdy-zitra), ne číslo rezervace. */
function kotvaZUpozorneniUrl(url: string): string | null {
  const hash = (url || '').split('#')[1]?.split(/[?&]/)[0]?.trim() || '';
  if (hash === 'pohoda' || hash === 'brana' || hash.startsWith('odjezdy')) return hash;
  return null;
}

type ZpetKam = { zalozka: Zalozka; y: number };

type Props = {
  rows: PrehledRadek[];
  dnes: string;
  zitra: string;
  chybiWifi: string[];
  /** ISO času posledního běhu automatu. Pro varování nahoře. */
  posledniBehCas?: string | null;
  /** Soupis upozornění z Upstash (jednou při otevření). */
  upozorneniSeznam?: UpozorneniZaznam[];
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

function Pole({ text }: { text: string }) {
  if (!text) return null;
  if (text === STARY_ZAZNAM) return <span className="ph-stary">{text}</span>;
  return <>{text}</>;
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

export function PrehledClient({
  rows,
  dnes,
  zitra,
  chybiWifi,
  posledniBehCas = null,
  upozorneniSeznam = [],
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
  const [prectenoUpozorneni, setPrectenoUpozorneni] = useState<string | null>(null);
  const [praniRadky, setPraniRadky] = useState(praniRadkyVstup);
  const [praniStitky, setPraniStitky] = useState(praniStitkyVstup);
  const [praniFocus, setPraniFocus] = useState<Record<string, string>>({});
  /** Vybraný den nahoře (YYYY-MM-DD). Jen v paměti stránky, výchozí dnes. */
  const [vybranyDen, setVybranyDen] = useState(dnes);
  /** Domů = provoz (upozornění, záložky, hledat). Den = jen karty vybraného dne. */
  const [pohledDomu, setPohledDomu] = useState(true);
  const [zalozka, setZalozka] = useState<Zalozka>('prijezdy');
  const [kdoKouka, setKdoKouka] = useState<'pravoslav' | 'nikol'>('pravoslav');
  const [videne, setVidene] = useState<Record<string, Record<string, string>> | null>(null);
  const [vybrana, setVybrana] = useState<string | null>(null);
  const [dotazVratitOdjezd, setDotazVratitOdjezd] = useState<string | null>(null);
  const zalozkaNactena = useRef(false);
  const [jenNeotevreni, setJenNeotevreni] = useState(false);
  const [jenBezCheckinu, setJenBezCheckinu] = useState(false);
  const [odjeliOtevreno, setOdjeliOtevreno] = useState(false);
  const [otevreno, setOtevreno] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState('');
  const [cekam, setCekam] = useState<string | null>(null);
  const [oknoHotovo, setOknoHotovo] = useState<Record<string, true>>({});
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
  const [dotazPredani, setDotazPredani] = useState<{ id: string; druh: 'predano' | 'vratit' } | null>(null);
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
  const [jazyky, setJazyky] = useState<Record<string, GuideLang>>({});
  const [dotazZnovu, setDotazZnovu] = useState<string | null>(null);
  const [dotazDalsi, setDotazDalsi] = useState<{ id: string; druh: 'brana' | 'odemknout' } | null>(null);
  const [dotazEmail, setDotazEmail] = useState<{ id: string; email: string } | null>(null);
  const [dotazOdjezd, setDotazOdjezd] = useState<string | null>(null);
  const [dotazPohoda, setDotazPohoda] = useState<string | null>(null);
  const [dotazPrestoPrijezd, setDotazPrestoPrijezd] = useState<string | null>(null);
  const [poplatekOtevren, setPoplatekOtevren] = useState<Record<string, boolean>>({});
  /** V detailu karty: které skupiny jsou rozbalené (může jich být víc, včetně všech). */
  const [detailSekce, setDetailSekce] = useState<Record<string, DetailSekceId[]>>({});
  const [hledatDotaz, setHledatDotaz] = useState('');
  const [kontaktUlozen, setKontaktUlozen] = useState<Record<string, string>>({});

  useEffect(() => {
    setRadky(rows);
    setSloty(nactiBranu(brana));
    setBranaOk(branaPotvrzena);
  }, [rows, brana, branaPotvrzena]);

  useEffect(() => {
    try {
      setPrectenoUpozorneni(localStorage.getItem(KLIC_UPOZORNENI_PRECTENO));
    } catch {
      setPrectenoUpozorneni(null);
    }
  }, []);

  function rozbalDetailKarty(cislo: string) {
    setRozbalene((prev) => ({ ...prev, [cislo]: true }));
    setDetailSekce((prev) => ({ ...prev, [cislo]: [...DETAIL_SEKCE_VSE] }));
  }

  function otevriKartu(id: string) {
    const cislo = id.trim();
    if (!cislo || cislo === 'pohoda' || cislo.startsWith('odjezdy')) return;
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
      if (typeof window !== 'undefined' && window.location.hash !== `#${cislo}`) {
        window.history.replaceState(null, '', `#${cislo}`);
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
    const kam = zpetKam;
    setZpetKam(null);
    setVybrana(null);
    try {
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch {
      /* hash */
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

  function praniZUrl(url: string): string | null {
    const m = (url || '').match(/[?#&]prani=([^&#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function otevriPrani(rezervace: string, vlakno?: string | null) {
    if (!radky.some((r) => r.rezervace === rezervace && !r.nelzeNacist)) {
      setHlaska(`Kartu ${rezervace} teď v přehledu nevidím. Zkuste Hledat.`);
      otevriZalozku('hledat');
      setHledatDotaz(rezervace);
      return;
    }
    otevriKartu(rezervace);
    setDetailSekce((prev) => {
      const cur = prev[rezervace] || DETAIL_SEKCE_VSE;
      return { ...prev, [rezervace]: cur.includes('prani') ? cur : [...cur, 'prani'] };
    });
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

  function otevriZUpozorneni(url: string, text = '') {
    const id = idZUpozorneniUrl(url);
    if (id) {
      if (!radky.some((r) => r.rezervace === id && !r.nelzeNacist)) {
        setHlaska(`Kartu ${id} teď v přehledu nevidím. Zkuste Hledat.`);
        otevriZalozku('hledat');
        setHledatDotaz(id);
        return;
      }
      const prani = praniZUrl(url);
      if (prani) {
        otevriPrani(id, prani);
        return;
      }
      otevriKartu(id);
      const zprava = zpravaZUpozorneniUrl(url);
      if (zprava) {
        setVolba((prev) => ({ ...prev, [id]: zprava }));
        setPanelZpravy((prev) => ({ ...prev, [id]: true }));
      }
      return;
    }
    let kotva = kotvaZUpozorneniUrl(url);
    /** Stará upozornění „Zítra odjíždí…“ měla jen záložku Dnešek bez kotvy. */
    if (!kotva && /odjíždí|dotaz na odjezd/i.test(text)) kotva = 'odjezdy-zitra';
    if (!kotva && /v pořádku/i.test(text)) kotva = 'pohoda';

    if (kotva === 'odjezdy-zitra') {
      const zitraYmd = posunDen(dnes, 1);
      const zitrejsi = radky.filter(
        (r) => !r.nelzeNacist && r.stav !== 'zruseno' && r.odjezd === zitraYmd,
      );
      if (zitrejsi.length === 1) {
        otevriKartu(zitrejsi[0].rezervace);
        return;
      }
    }

    const z = zalozkaZUpozorneniUrl(url) || (kotva ? 'dnes' : null);
    if (z) {
      otevriZalozku(z);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            if (kotva) {
              document.getElementById(kotva)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              window.scrollTo(0, 0);
            }
          } catch {
            /* scroll */
          }
        });
      });
      return;
    }
    setHlaska('U toho upozornění není odkaz na hosta.');
  }

  useEffect(() => {
    setPraniRadky(praniRadkyVstup);
    setPraniStitky(praniStitkyVstup);
  }, [praniRadkyVstup, praniStitkyVstup]);

  useEffect(() => {
    function zHash() {
      const raw = window.location.hash.replace(/^#/, '').trim();
      const id = raw.split(/[?&]/)[0].trim();
      if (!id || id === 'pohoda' || id === 'brana' || id.startsWith('odjezdy')) return;
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
      const prani = praniZUrl(window.location.href) || praniZUrl(`#${raw}`);
      if (prani) {
        setDetailSekce((prev) => {
          const cur = prev[id] || DETAIL_SEKCE_VSE;
          return { ...prev, [id]: cur.includes('prani') ? cur : [...cur, 'prani'] };
        });
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
      const zprava = zpravaZUpozorneniUrl(window.location.href);
      if (zprava) {
        setVolba((prev) => ({ ...prev, [id]: zprava }));
        setPanelZpravy((prev) => ({ ...prev, [id]: true }));
      }
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
      casPrijezdu: casSoucet,
      naMiste: naMisteRadku(row),
      predano: predanoRadku(row),
      vyjezdy: vyjezdyRadku(row),
      priplatekDrive: row.zadostPrijezd?.stav === 'potvrzeno' ? row.zadostPrijezd.kc : null,
      priplatekPozde: castkaPozdejsihoOdjezdu(row),
    });
    return polozky.map((p) => ({ ...p, nazev: nazevDluhu(p.druh) }));
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

  async function ulozPredani(row: PrehledRadek, zapnout: boolean) {
    setDotazPredani(null);
    if (ukazka) {
      setPredani((prev) => ({ ...prev, [row.rezervace]: zapnout ? new Date().toISOString() : null }));
      return;
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
      return;
    }
    setPredani((prev) => ({ ...prev, [row.rezervace]: json.predano ?? null }));
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
      if (row.stav === 'zruseno' && stav !== 'zruseno') return false;
      if (jenNeotevreni && (row.otevrenoPocet !== 0 || row.stav === 'bez_checkinu')) return false;
      if (jenBezCheckinu && row.stav !== 'bez_checkinu') return false;
      if (stav && row.stav !== stav) return false;
      return true;
    });
  }, [radky, stav, vybranyDen, jenNeotevreni, jenBezCheckinu]);

  function hostOdjezdu(row: PrehledRadek) {
    return {
      odjezd: row.odjezd,
      casOdjezdu: casOdjezduRadku(row),
      prevzatoKdy: row.prevzatoKdy || null,
      stav: row.stav,
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
    if (z === 'dnes') {
      return otisk(
        radky
          .filter((r) => !r.nelzeNacist && (jeVDnesnichOdjezdech(hostOdjezdu(r), dnes, ted) || (r.prijezd === dnes && r.stav !== 'zruseno')))
          .map((r) => ({ id: r.rezervace, kc: 0 })),
      );
    }
    if (z === 'prijezdy') {
      return otisk(
        radky
          .filter((r) => r.prijezd === dnes && r.stav !== 'zruseno' && !jeHostOdjetly(hostOdjezdu(r), dnes, ted))
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
      if (zprava === 'odjezd' || zprava === 'pohoda') {
        const ted = new Date().toISOString();
        setRadky((prev) =>
          prev.map((r) =>
            r.rezervace === row.rezervace
              ? {
                  ...r,
                  odjezdDotaz: zprava === 'odjezd' ? ted : r.odjezdDotaz,
                  pohodaDotaz: zprava === 'pohoda' ? ted : r.pohodaDotaz,
                }
              : r,
          ),
        );
      }
      setHlaska('V náhledu se e-mail neodešle.');
      return;
    }
    setCekam(`${row.rezervace}:email`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'email', zprava, jazyk: jazykRadku(row) }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; nazev?: string } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'E-mail se nepodařilo odeslat.');
      return;
    }
    setDotazEmail(null);
    setDotazPohoda(null);
    const nazev = json.nazev || 'zpráva';
    const ted = new Date().toISOString();
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              odjezdDotaz: zprava === 'odjezd' ? ted : r.odjezdDotaz,
              pohodaDotaz: zprava === 'pohoda' ? ted : r.pohodaDotaz,
              historie: [...r.historie, { cas: ted, co: `E-mailem: ${nazev}` }].slice(-40),
            }
          : r,
      ),
    );
    setHlaska(`E-mail „${nazev}“ je odeslaný.`);
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
  ) {
    const klic = `${row.rezervace}:${akce}`;
    if (ukazka) {
      setOknoHotovo((stav) => ({ ...stav, [klic]: true }));
      setDotazPrestoPrijezd(null);
      return;
    }
    setCekam(klic);
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce, ...(presto ? { presto: true } : {}) }),
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

  async function oznacKanal(
    row: PrehledRadek,
    kanal: 'whatsapp' | 'sms',
    druhZpravy?: string,
  ): Promise<string | null> {
    const seznam = zpravyRadku(row);
    const zprava = druhZpravy ?? volba[row.rezervace] ?? seznam.find((z) => z.vychozi)?.id;
    if (!zprava) return null;
    const nazev = seznam.find((z) => z.id === zprava)?.nazev || 'zpráva';
    const ted = new Date().toISOString();
    const prefix = kanal === 'sms' ? 'SMS' : 'WhatsApp';
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
      if (!res.ok) {
        setHlaska(`${prefix} se nepodařilo zapsat.`);
        return null;
      }
    }
    setVolba((prev) => ({ ...prev, [row.rezervace]: zprava }));
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              odjezdDotaz: zprava === 'odjezd' ? ted : r.odjezdDotaz,
              pohodaDotaz: zprava === 'pohoda' ? ted : r.pohodaDotaz,
              historie: [...r.historie, { cas: ted, co: `${prefix}: ${nazev}` }].slice(-40),
            }
          : r,
      ),
    );
    return seznam.find((z) => z.id === zprava)?.text || row.zprava;
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
    });
  }

  function zpravaRadku(row: PrehledRadek): string {
    const seznam = zpravyRadku(row);
    const id = volba[row.rezervace] ?? seznam.find((z) => z.vychozi)?.id;
    if (id === 'odjezd') return textDotazuOdjezdu(row);
    return seznam.find((z) => z.id === id)?.text || row.zprava;
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
        if (hlavni) return { ...r, telefonText: hotovo, telefonWa: tel.wa, telefonNejisty: tel.nejisty };
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
    const text = zpravaRadku(row);
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
        zruseno: row.stav === 'zruseno',
      },
      sloty,
      new Date(),
    ).akce;
    const odjel = jeHostOdjetly(hostOdjezdu(row), dnes, new Date());
    const fazeText = odjel && row.stav !== 'zruseno' && !row.fazeText.startsWith('Odjel') && row.fazeText !== 'Zrušeno'
      ? `Odjel ${casPrevzetiText(row.prevzatoKdy) || ''}`.trim()
      : row.fazeText;
    const cekajici = cekajiciUkon({
      predano: Boolean(predanoKdy),
      naMiste: Boolean(naMisteKdy),
      denPrijezdu: row.prijezd === dnes,
      parkovani: parkAkce,
      odjel,
    });
    const casAktualni = Object.prototype.hasOwnProperty.call(casy, row.rezervace)
      ? casy[row.rezervace].trim() || null
      : row.casPrijezdu;
    const zpravyNahore =
      !odjel &&
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
    const kontaktNahore = !kontaktUlozenCas && !staly?.kontaktZMinula && !odjel;
    /** Na kartě, dokud není předáno. Po předání je Vrátit jen v Detailu. */
    const predaniNahore = !odjel && !predanoKdy;
    const tlacitkoKontakt = muzeKontakt ? (
      <UlozitKontakt row={row} onUlozeno={() => oznacKontaktUlozen(row)} />
    ) : null;
    const kontaktNahoreBlok = kontaktNahore ? (
      telefonNahore ? (
        <TelefonNahore
          key={`${row.rezervace}-telefon-nahore`}
          hodnota={telefonRadku(row)}
          onUloz={(text) => ulozTelefon(row, row.telefonKtery || 'rezervace', text)}
        />
      ) : (
        <a
          className="ph-nova-kontakt"
          href={`/api/prehled/vizitka?rezervace=${encodeURIComponent(row.rezervace)}`}
          onClick={() => oznacKontaktUlozen(row)}
        >
          Uložit kontakt
        </a>
      )
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
    const muzePoslat = nabidnoutOdeslani(row.stav);
    const jazykText = LANG_LABELS[jazykRadku(row)];
    const uzMelPruvodce = Boolean(dotazPredOdeslanimZnovu(row.stav));
    const dotazZnovuText = uzMelPruvodce
      ? `${dotazPredOdeslanimZnovu(row.stav)} Jazyk: ${jazykText}.`
      : `Poslat průvodce v jazyce ${jazykText}? Host dostane e-mail.`;
    const ukazBlokOdeslani = muzePoslat || row.stav === 'bez_checkinu' || maMenuZprav;
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
        onClick={() => setDotazPredani({ id: row.rezervace, druh: 'predano' })}
      >
        Předat apartmán
      </button>
    );
    const predaniDotaz = dotazPredani?.id === row.rezervace ? (
      <div className="ph-predano-dotaz">
        <p>
          {dotazPredani.druh === 'predano'
            ? 'Opravdu předat apartmán? Hostovi se v průvodci zobrazí vstupní kódy.'
            : 'Opravdu vrátit předání? Host v průvodci kódy neuvidí.'}
        </p>
        <button type="button" disabled={cekam !== null} onClick={() => ulozPredani(row, dotazPredani.druh === 'predano')}>
          {dotazPredani.druh === 'predano' ? 'Ano, předat' : 'Ano, vrátit'}
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
    const platbaCastkaText =
      sumaNezap > 0
        ? formatKc(sumaNezap)
        : sumaZap > 0
          ? formatKc(sumaZap)
          : null;
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
              <p key={polozka.druh}>
                {polozka.nazev} {formatKc(polozka.kc)}
                {polozka.vypocet ? ` (${polozka.vypocet})` : ''}
                {polozka.zaplacena
                  ? ` · ${[polozka.kdo, polozka.kdy, polozka.jak].filter(Boolean).join(', ')}`
                  : null}
                {polozka.zaplacena ? (
                  <button type="button" className="ph-predano" onClick={() => void vratPlatbuKarty(row, polozka.druh)}>
                    Vrátit platbu
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ph-zaplatit"
                    disabled={cekam !== null}
                    onClick={() => setVolbaPlatby({ id: row.rezervace, druh: polozka.druh, krok: 'kdo', kdo: null })}
                  >
                    Zaplatit
                  </button>
                )}
              </p>
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
          setRadky((prev) =>
            prev.map((r) =>
              r.rezervace === row.rezervace ? { ...r, branaRegistrovano: new Date().toISOString() } : r,
            ),
          );
          setBranaZTile((prev) => ({ ...prev, [row.rezervace]: false }));
        }}
        deti={(dil) => (
      <article key={row.rezervace} className={rozbaleno ? 'ph-row' : 'ph-row is-shut'} id={row.rezervace}>
        {(() => {
          const checkinOk = row.stav !== 'bez_checkinu';
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
            row.prijezd === dnes,
            row.historie,
          );
          if (
            casZpravaId === 'nedojezd' &&
            !(denPredNeboDenCi && row.stav !== 'zruseno' && !predanoRadku(row))
          ) {
            casZpravaId = 'pruvodce3';
          }
          const checkinStupen = stupenCheckinu(pocetCheckinPripoinek(row.historie), denPredNeboDenCi);
          const branaStupenVal = stupenBrany(pocetBranaPripoinek(row.historie), row.prijezd === dnes);
          /** Jen krátký štítek. Dlouhý text fáze (čas, brána, průvodce) je v dlaždicích. */
          const pillText = (() => {
            if (row.stav === 'zruseno') return 'Zrušeno';
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
              : pillText === 'Odjel' || pillText.startsWith('Odjel') || pillText === 'Zrušeno'
                ? 'seda'
                : 'wait';
          const osobText =
            row.osob == null ? null : row.osob === 1 ? '1 dospělý' : `${row.osob} dospělí`;
          return (
            <>
              <div className="ph-nova-top">
                <span>
                  {stitekDneKarty(row.prijezd, dnes)}
                  {row.apartman ? ` · ${row.apartman}` : ''}
                  {row.stitek === 'rucne' ? ' · Ruční' : ''}
                </span>
                <span className={`ph-nova-pill ph-nova-pill--${pillTon}`}>{pillText}</span>
              </div>
              <div className="ph-nova-jmeno">{kdo}</div>
              <p className="ph-nova-sub">
                {[apartman, osobText, termin].filter(Boolean).join(' · ')}
              </p>
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
              {kontaktNahoreBlok}
              <div className="ph-nova-dlazdice">
                <button
                  type="button"
                  className={`ph-nova-tile${casOk ? ' ph-nova-tile--ok' : ' ph-nova-tile--chybi'}`}
                  disabled={casOk || odjel}
                  onClick={() => {
                    if (casOk || odjel) return;
                    setVolba((prev) => ({ ...prev, [row.rezervace]: casZpravaId }));
                    setKanalZpravy((prev) => ({ ...prev, [row.rezervace]: prev[row.rezervace] || 'whatsapp' }));
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
                    className={`ph-nova-tile${branaOk ? ' ph-nova-tile--ok' : ' ph-nova-tile--ne'}`}
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
                              ? `${popisekStupneBrany(branaStupenVal)}${pocetBranaPripoinek(row.historie) ? ` · už ${pocetBranaPripoinek(row.historie)}×` : ''} · napsat`
                              : branaDrobek}
                        </span>
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
                  className={`ph-nova-stav${checkinOk ? ' ph-nova-stav--ok' : ' ph-nova-stav--ne'}`}
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
                      ? 'Hotovo'
                      : (() => {
                          const n = pocetCheckinPripoinek(row.historie);
                          const posledni = ukazatCheckinNedojezd({
                            stav: row.stav,
                            prijezd: row.prijezd,
                            dnes,
                            predano: predanoRadku(row) || '',
                            historie: row.historie,
                          });
                          const pop = posledni
                            ? popisekStupneCheckinu('nedojezd')
                            : popisekStupneCheckinu(checkinStupen);
                          return `${pop}${n ? ` · už ${n}×` : ''}`;
                        })()}
                  </span>
                </button>
                <button
                  type="button"
                  className={`ph-nova-stav${pruvodceOk ? ' ph-nova-stav--ok' : ' ph-nova-stav--ne'}`}
                  disabled={pruvodceOk || odjel || !checkinOk}
                  onClick={() => {
                    if (pruvodceOk || odjel || !checkinOk) return;
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
                      : !casOk
                        ? 'čeká na čas'
                        : (row.otevrenoPocet ?? 0) === 0
                          ? 'neotevřen'
                          : 'dokončit'}
                  </span>
                </button>
              </div>
            </>
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
                const pop =
                  idZpravy === 'neotevrel'
                    ? popisekStupneCasu(dalsiCasovaZprava(uz) === 'nedojezd' ? 'pruvodce3' : dalsiCasovaZprava(uz))
                    : popisekStupneCasu(idZpravy as CasovaZpravaId);
                return (
                  <p className="ph-nova-panel__stupen">
                    {pop}
                    {uz ? ` · už odesláno ${uz}×` : ' · ještě neodesláno'}
                  </p>
                );
              }
              if (idZpravy === 'checkin' || idZpravy === 'checkinNedojezd') {
                const uz = pocetCheckinPripoinek(row.historie);
                const pop =
                  idZpravy === 'checkinNedojezd'
                    ? popisekStupneCheckinu('nedojezd')
                    : popisekStupneCheckinu(stupenCheckinu(uz, denOk));
                return (
                  <p className="ph-nova-panel__stupen">
                    {pop}
                    {uz ? ` · už odesláno ${uz}×` : ' · ještě neodesláno'}
                  </p>
                );
              }
              if (idZpravy === 'brana') {
                const uz = pocetBranaPripoinek(row.historie);
                return (
                  <p className="ph-nova-panel__stupen">
                    {popisekStupneBrany(stupenBrany(uz, row.prijezd === dnes))}
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
                    const text = zpravaRadku(row);
                    const druh = volba[row.rezervace] ?? zpravyHosta.find((z) => z.vychozi)?.id;
                    if (!wa || !druh) return;
                    void oznacKanal(row, 'sms', druh).then((ok) => {
                      if (ok == null && !ukazka) return;
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
        {staly?.telefonZMinula ? (
          <p className="ph-dnesek__akce">
            <button type="button" disabled={cekam !== null} onClick={() => void ulozTelefon(row, 'rezervace', staly.telefonZMinula!)}>
              Použít telefon z minula: {staly.telefonZMinula}
            </button>
          </p>
        ) : null}
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
        {[
          row.zadostPrijezd?.stav === 'ceka' && !oknoHotovo[`${row.rezervace}:potvrdit-prijezd`] && !oknoHotovo[`${row.rezervace}:nelze-prijezd`]
            ? { akce: 'prijezd' as const, text: vetaZadosti(row, 'prijezd') }
            : null,
          row.zadostOdjezd?.stav === 'ceka' && !oknoHotovo[`${row.rezervace}:potvrdit-odjezd`] && !oknoHotovo[`${row.rezervace}:nelze-odjezd`]
            ? { akce: 'odjezd' as const, text: vetaZadosti(row, 'odjezd') }
            : null,
        ]
          .filter((polozka): polozka is { akce: 'prijezd' | 'odjezd'; text: string } => Boolean(polozka))
          .map((polozka) => (
            <div key={polozka.akce} className="ph-okno">
              <p>{polozka.text}</p>
              <button type="button" onClick={() => void oknoAkce(row, polozka.akce === 'prijezd' ? 'potvrdit-prijezd' : 'potvrdit-odjezd')}>
                Potvrdit
              </button>
              <button type="button" onClick={() => void oknoAkce(row, polozka.akce === 'prijezd' ? 'nelze-prijezd' : 'nelze-odjezd')}>
                Nelze
              </button>
              {polozka.akce === 'prijezd' && dotazPrestoPrijezd === row.rezervace ? (
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
          ))}
        {ukazatCasNaKarte(row.odjezd, dnes) && jeHodina(odjezdCas) ? (
          <div className="ph-prijezd-cas">Odjezd {zobrazCas(odjezdCas)}</div>
        ) : null}
        <div className="ph-nova-platba">{poplatekRadek}</div>
        {chyba ? <div className="ph-chyba-kratka">{chyba}</div> : null}
        {predaniNahore ? (
          <>
            {predaniTlacitko}
            {predaniDotaz}
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
            const prepni = (id: DetailSekceId) =>
              setDetailSekce((prev) => {
                const cur = prev[row.rezervace] || [];
                return {
                  ...prev,
                  [row.rezervace]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
                };
              });
            const telDrobek = row.telefonText || row.jinyTelefonText || 'bez čísla';
            const pobytDrobek = staly && staly.poradi > 1 ? `${staly.poradi}. pobyt` : null;
            const kontaktDrobek = [telDrobek, pobytDrobek].filter(Boolean).join(' · ');
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
            return (
              <>
                <button
                  type="button"
                  className="ph-sekce-vse"
                  onClick={() =>
                    setDetailSekce((prev) => ({
                      ...prev,
                      [row.rezervace]: vseOtevrene ? [] : [...DETAIL_SEKCE_VSE],
                    }))
                  }
                >
                  {vseOtevrene ? 'Sbalit vše' : 'Rozbalit vše'}
                </button>
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
                  {predaniNahore ? null : (
                    <>
                      {predaniTlacitko}
                      {predaniDotaz}
                    </>
                  )}
                  {predaniNahore ? (
                    <p className="ph-hlaska">Předat apartmán je nahoře na kartě.</p>
                  ) : null}
                  {ukazZavady ? zavadyBlok : <p className="ph-hlaska">Zatím bez závad.</p>}
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
                  {row.stav !== 'bez_checkinu' ? (
                    <button type="button" disabled={cekam !== null} onClick={() => volat(row, 'odkaz')}>
                      Zkopírovat odkaz na průvodce
                    </button>
                  ) : null}
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
                  {skutecnyPrijezdPole}
                  {row.poplatek === 'neznamo' && !row.poplatekOdhad ? (
                    <span className="ph-poplatek-volba">
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
                  {row.zdrojText ? (
                    <div className="ph-zdroj">
                      <Pole text={row.zdrojText} />
                    </div>
                  ) : null}
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
    prijezdy: radky.filter((r) => r.prijezd === dnes && r.stav !== 'zruseno' && !jeHostOdjetly(hostOdjezdu(r), dnes, ted)).length,
    dnes: radky.filter((r) => jeVDnesnichOdjezdech(hostOdjezdu(r), dnes, ted) || (r.prijezd === dnes && r.stav !== 'zruseno' && !r.nelzeNacist)).length,
    dluhy: radky.filter((r) => patriDoDluhu(r)).length,
    hledat: 0,
  };
  const nove: Record<Zalozka, boolean> = {
    prijezdy: jeNove(otiskZalozky('prijezdy'), videne?.[kdoKouka]?.prijezdy || null),
    dnes: jeNove(otiskZalozky('dnes'), videne?.[kdoKouka]?.dnes || null),
    dluhy: jeNove(otiskZalozky('dluhy'), videne?.[kdoKouka]?.dluhy || null),
    hledat: false,
  };
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
            <p className="ph-den__nadpis">
              {nadpisSouhrnuDne(vybranyDen, dnes)}: {vybranySouhrn.pocet} · průvodce otevřelo {vybranySouhrn.otevrelo} ·
              neodesláno {vybranySouhrn.neodeslano} · bez check-inu: {vybranySouhrn.bezCheckinu}
            </p>
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
        ) : null}
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
      {pohledDomu
        ? (() => {
            const nova = upozorneniSeznam.filter((u) => !prectenoUpozorneni || u.cas > prectenoUpozorneni);
            if (!nova.length) return null;
            return (
              <div className="ph-upozorneni-seznam">
                <div className="ph-upozorneni-seznam__hlava">
                  <h2>Nová upozornění ({nova.length})</h2>
                  <button
                    type="button"
                    className="ph-ulozit"
                    onClick={() => {
                      const ted = new Date().toISOString();
                      try {
                        localStorage.setItem(KLIC_UPOZORNENI_PRECTENO, ted);
                      } catch {
                        /* paměť */
                      }
                      setPrectenoUpozorneni(ted);
                    }}
                  >
                    Přečetl jsem
                  </button>
                </div>
                <ul>
                  {nova.map((u) => {
                    const id = idZUpozorneniUrl(u.url);
                    const kotva = kotvaZUpozorneniUrl(u.url);
                    const maCil = Boolean(id || kotva || zalozkaZUpozorneniUrl(u.url));
                    return (
                      <li key={`${u.cas}:${u.text}`}>
                        <button
                          type="button"
                          className={maCil ? 'ph-upozorneni-seznam__radek' : 'ph-upozorneni-seznam__radek is-bez-odkazu'}
                          onClick={() => otevriZUpozorneni(u.url, u.text)}
                        >
                          <span className="ph-upozorneni-seznam__cas">{casPraha(u.cas) || u.cas}</span>
                          <span>{u.text}</span>
                          {id ? (
                            <span className="ph-upozorneni-seznam__hint">Otevřít kartu ▸</span>
                          ) : kotva === 'odjezdy-zitra' || /odjíždí|dotaz na odjezd/i.test(u.text) ? (
                            <span className="ph-upozorneni-seznam__hint">Zítřejší odjezdy ▸</span>
                          ) : maCil ? (
                            <span className="ph-upozorneni-seznam__hint">Otevřít ▸</span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()
        : null}

      {pohledDomu ? <RadaZalozek zalozka={zalozka} pocty={pocty} nove={nove} onZmena={otevriZalozku} /> : null}
      {pohledDomu ? (
        <label className="ph-hledat-nahore">
          Hledat hosta
          <input
            value={hledatDotaz}
            onChange={(e) => {
              const text = e.target.value;
              setHledatDotaz(text);
              if (text.trim()) otevriZalozku('hledat');
            }}
            onFocus={() => {
              if (hledatDotaz.trim()) otevriZalozku('hledat');
            }}
            placeholder="jméno, číslo rezervace, apartmán…"
            autoComplete="off"
          />
        </label>
      ) : null}

      {pohledDomu && zalozka === 'dnes' ? (
        <Dnesek
          radky={radky}
          dnes={dnes}
          operacePovolene
          ukazka={ukazka}
          brana={brana}
          vPrehledu
          onPrevzato={poPrevzeti}
          onOtevri={otevriKartu}
          onZavadyZapsany={() => {
            setHlaska('Závady po odjezdu uloženy.');
            router.refresh();
          }}
        />
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
            jenVysledky
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
      {pohledDomu ? (
        <p className="ph-dnesek__akce">
          <button type="button" onClick={() => otevriNovouRezervaci(null)}>
            Nová rezervace – nový host
          </button>
        </p>
      ) : null}

      {pohledDomu ? (
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
          <button
            type="button"
            className={jenNeotevreni ? 'is-on' : ''}
            aria-pressed={jenNeotevreni}
            onClick={() => setJenNeotevreni((v) => !v)}
          >
            Neotevřeli průvodce
          </button>
          <button
            type="button"
            className={jenBezCheckinu ? 'is-on' : ''}
            aria-pressed={jenBezCheckinu}
            onClick={() => setJenBezCheckinu((v) => !v)}
          >
            Bez check-inu
          </button>
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

      {pohledDomu && zalozka === 'dnes'
        ? (() => {
            const hoste = seradOdjezdy(radky.filter((r) => jeProPohodu(r, dnes)));
            if (!hoste.length) return null;
            return (
              <section id="pohoda" className="ph-odjezdy">
                <h2>Je vše v pořádku?</h2>
                <ul>
                  {hoste.map((row) => {
                    const odeslano = row.pohodaDotaz ? hodinaPraha(row.pohodaDotaz) : '';
                    const text = textPohody(jazykRadku(row));
                    const wa = row.telefonWa;
                    const email = row.email.includes('@') ? row.email : '';
                    return (
                      <li key={row.rezervace} className={odeslano ? 'is-hotovo' : undefined}>
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
                              {odeslano ? 'Poslat e-mailem znovu' : 'Poslat e-mailem'}
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
                              Poslat e-mail na <span className="ph-tel">{email}</span>
                              {odeslano ? ' znovu' : ''}?
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
              </section>
            );
          })()
        : null}

      {(pohledDomu && zalozka === 'dnes' ? [{ den: zitra, nadpis: 'Zítřejší odjezdy', kotva: 'odjezdy-zitra' }] : []).map((sekce) => {
        const hoste = seradOdjezdy(radky.filter((r) => r.stav !== 'zruseno' && r.odjezd === sekce.den));
        if (!hoste.length) return null;
        return (
          <section key={sekce.kotva} id={sekce.kotva} className="ph-odjezdy">
            <h2>{sekce.nadpis}</h2>
            <ul>
              {hoste.map((row) => {
                const cas = casOdjezduRadku(row);
                const znamy = jeHodina(cas);
                const dluh = vyberPoplatku(row).kdy ? '' : row.dluhText;
                const dotaz = row.odjezdDotaz ? hodinaPraha(row.odjezdDotaz) : '';
                const text = textDotazuOdjezdu(row);
                const wa = row.telefonWa;
                const email = row.email.includes('@') ? row.email : '';
                return (
                  <li key={row.rezervace} className={znamy ? 'is-hotovo' : undefined}>
                    <button type="button" className="ph-dnesek__odkaz" onClick={() => otevriKartu(row.rezervace)}>
                      {row.jmeno || 'Host'}
                    </button>
                    {' · '}
                    {row.apartman || 'bez apartmánu'}
                    {' · '}
                    {znamy ? `Odjezd ${zobrazCas(cas)}` : 'čas neznámý'}
                    {dluh ? ` · ${dluh}` : ''}
                    {znamy ? null : dotaz ? (
                      <span>{` · Dotaz odeslán ${dotaz}`}</span>
                    ) : (
                      <span className="ph-odjezdy__akce">
                        <TlacitkoWhatsApp
                          wa={wa}
                          zprava={text}
                          userAgent={userAgent}
                          onPredOtevrenim={() => oznacDotaz(row)}
                        />
                        {email ? (
                          <button type="button" className="ph-wa" onClick={() => setDotazOdjezd(row.rezervace)}>
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
                    )}
                    {dotazOdjezd === row.rezervace ? (
                      <div className="ph-predano-dotaz">
                        <p>
                          Poslat e-mail na <span className="ph-tel">{email}</span>?
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setDotazOdjezd(null);
                            void posliEmail(row, 'odjezd');
                          }}
                        >
                          Ano
                        </button>
                        <button type="button" onClick={() => setDotazOdjezd(null)}>
                          Zrušit
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

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

      {pohledDomu && zalozka === 'prijezdy' ? (
        <Dnesek
          radky={radky}
          dnes={dnes}
          operacePovolene
          jenUklid
          ukazka={ukazka}
          brana={brana}
          vPrehledu
          onPrevzato={poPrevzeti}
          onOtevri={otevriKartu}
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
        <CoDoplnit
          radky={radky}
          dnes={dnes}
          odkazy={odkazy}
          onOtevri={(id) => otevriKartu(id)}
          onUlozOdkaz={(row, text) => ulozOdkaz(row, text)}
          onUlozTelefon={(row, text) => ulozTelefon(row, row.telefonKtery || 'rezervace', text)}
        />
      ) : null}

      {pohledDomu && zalozka === 'prijezdy' ? (
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
      <Upozorneni />
    </main>
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

function ulozNazevPush(nazev: string) {
  const cisty = nazev.trim().slice(0, 40);
  try {
    localStorage.setItem(PUSH_NAZEV_KLIC, cisty);
    const kdo = cisty.toLowerCase().includes('nikol') ? 'nikol' : 'pravoslav';
    localStorage.setItem('vivien-kdo', kdo);
  } catch {
    /* paměť */
  }
}

function kdoZNazvuTelefonu(nazev: string): KdoZavad {
  const n = nazev.trim().toLowerCase();
  if (n.includes('nikol')) return 'nikol';
  if (n.includes('miluš') || n.includes('milus')) return 'miluska';
  return 'pravoslav';
}

function datumPrihlaseniPush(iso: string | undefined): string {
  if (!iso) return '';
  const t = casPraha(iso);
  const m = t.match(/^(\d+\.\s*\d+\.)/);
  return m ? m[1].replace(/\s+/g, ' ').trim() : t;
}

function Upozorneni() {
  const [klic, setKlic] = useState('');
  const [zarizeni, setZarizeni] = useState<{ nazev: string; endpoint: string; cas?: string }[]>([]);
  const [hlaska, setHlaska] = useState('');
  const [zkousim, setZkousim] = useState(false);
  const [ptamJmeno, setPtamJmeno] = useState(false);
  const [jmenoDraft, setJmenoDraft] = useState('');
  const [endpointTeto, setEndpointTeto] = useState('');
  const [maOdber, setMaOdber] = useState<boolean | null>(null);
  const [povoleni, setPovoleni] = useState<PushPovoleni>('neurceno');

  async function registraceSw() {
    const reg = await navigator.serviceWorker.register('/prehled/sw.js', { scope: '/prehled/' });
    try {
      await reg.update();
    } catch {
      /* starý prohlížeč */
    }
    return navigator.serviceWorker.ready;
  }

  async function nactiLokalniOdber() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setMaOdber(false);
      return null as PushSubscription | null;
    }
    try {
      const ready = await navigator.serviceWorker.ready.catch(() => null);
      if (!ready) {
        setMaOdber(false);
        return null;
      }
      const sub = await ready.pushManager.getSubscription();
      setMaOdber(Boolean(sub));
      if (sub?.endpoint) setEndpointTeto(sub.endpoint);
      return sub;
    } catch {
      setMaOdber(null);
      return null;
    }
  }

  async function posliSubscription(publicKey: string, nazev: string, tise: boolean): Promise<boolean> {
    if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      if (!tise) setHlaska(HLASKA_NENASTAVENO);
      return false;
    }
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      if (!tise) setHlaska(HLASKA_NEPOVOLENO);
      return false;
    }
    try {
      const ready = await registraceSw();
      let sub = await ready.pushManager.getSubscription();
      if (sub && !jeSparovano(sub.endpoint, zarizeni)) {
        try {
          await sub.unsubscribe();
        } catch {
          /* starý odběr */
        }
        sub = null;
      }
      if (!sub) {
        sub = await ready.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: klicNaBajty(publicKey),
        });
      }
      const jsonSub = sub.toJSON();
      if (!jsonSub.endpoint || !jsonSub.keys) {
        if (!tise) setHlaska(HLASKA_PROHLIZEC);
        return false;
      }
      setEndpointTeto(jsonSub.endpoint);
      setMaOdber(true);
      const res = await fetch('/api/prehled/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          akce: 'zapnout',
          nazev,
          endpoint: jsonSub.endpoint,
          keys: jsonSub.keys,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        zarizeni?: { nazev: string; endpoint: string; cas?: string }[];
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        if (!tise) setHlaska(json?.error || 'Upozornění se nepodařilo zapnout.');
        return false;
      }
      const seznam = json.zarizeni || [];
      setZarizeni(seznam);
      if (!jeSparovano(jsonSub.endpoint, seznam)) {
        if (!tise) setHlaska(HLASKA_NESPAROVANO);
        return false;
      }
      if (!tise) setHlaska(HLASKA_ZAPNUTO);
      return true;
    } catch (err) {
      if (!tise) setHlaska(hlaskaChybyZapnuti(err));
      return false;
    }
  }

  useEffect(() => {
    let zive = true;
    if (typeof Notification !== 'undefined') {
      setPovoleni(Notification.permission as PushPovoleni);
    }
    (async () => {
      await nactiLokalniOdber();
      try {
        const res = await fetch('/api/prehled/push');
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          publicKey?: string;
          zarizeni?: { nazev: string; endpoint: string; cas?: string }[];
          pocet?: number;
          chybaUlaziste?: string;
        } | null;
        if (!zive || !json?.ok) return;
        const publicKey = json.publicKey || '';
        setKlic(publicKey);
        setZarizeni(json.zarizeni || []);
        if (json.chybaUlaziste) {
          setHlaska('Úložiště teď neodpovídá. Zkuste zapnout znovu za chvíli.');
          return;
        }
        const nazev = nactiNazevPush();
        if (
          nazev &&
          publicKey &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          const ok = await posliSubscription(publicKey, nazev, true);
          if (!zive) return;
          if (ok) setHlaska(HLASKA_ZAPNUTO);
          else setHlaska('Po nasazení je potřeba znovu klepnout na Zapnout upozornění.');
          return;
        }
        if ((json.pocet ?? 0) === 0) setHlaska('Žádné zařízení. Zapněte upozornění na tomto telefonu.');
      } catch (err) {
        setHlaska(hlaskaChybyZapnuti(err));
      }
    })();
    return () => {
      zive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function zapnout() {
    setHlaska(HLASKA_ZAPINAM);
    const ulozene = nactiNazevPush();
    if (!ulozene) {
      setPtamJmeno(true);
      setJmenoDraft('');
      setHlaska('Napište, čí je to telefon.');
      return;
    }
    if (!klic) {
      setHlaska(HLASKA_NENASTAVENO);
      return;
    }
    try {
      const pov = await Notification.requestPermission();
      setPovoleni(pov as PushPovoleni);
      if (pov !== 'granted') {
        setHlaska(HLASKA_NEPOVOLENO);
        return;
      }
      await posliSubscription(klic, ulozene, false);
    } catch (err) {
      setHlaska(hlaskaChybyZapnuti(err));
    }
  }

  async function potvrdJmeno() {
    const nazev = jmenoDraft.trim().slice(0, 40);
    if (!nazev) {
      setHlaska('Napište, čí je to telefon.');
      return;
    }
    ulozNazevPush(nazev);
    setPtamJmeno(false);
    setHlaska(HLASKA_ZAPINAM);
    if (!klic) {
      setHlaska(HLASKA_NENASTAVENO);
      return;
    }
    try {
      const pov = await Notification.requestPermission();
      setPovoleni(pov as PushPovoleni);
      if (pov !== 'granted') {
        setHlaska(HLASKA_NEPOVOLENO);
        return;
      }
      await posliSubscription(klic, nazev, false);
    } catch (err) {
      setHlaska(hlaskaChybyZapnuti(err));
    }
  }

  async function zkusit() {
    setZkousim(true);
    setHlaska('');
    const res = await fetch('/api/prehled/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce: 'zkusit' }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; text?: string; error?: string } | null;
    setZkousim(false);
    setHlaska(json?.text || json?.error || 'Zkouška se nepovedla.');
  }

  const nazevTelefonu = nactiNazevPush();
  const totoZapnute = jeSparovano(endpointTeto, zarizeni);
  const rozbalit = !totoZapnute || !nazevTelefonu;
  const nadpis = nadpisPushSekce({ sparovano: totoZapnute, nazev: nazevTelefonu });
  const diagnostika = radekDiagnostikyPush({
    povoleni,
    odber: maOdber,
    sparovano: totoZapnute,
  });
  const tedMs = Date.now();

  async function odebrat(z: { nazev: string; endpoint: string }) {
    if (!window.confirm(`Odebrat ${z.nazev}? Tomuto zařízení přestanou chodit upozornění.`)) return;
    setHlaska('');
    const res = await fetch('/api/prehled/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce: 'vypnout', endpoint: z.endpoint }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      zarizeni?: { nazev: string; endpoint: string; cas?: string }[];
      error?: string;
    } | null;
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Zařízení se nepodařilo odebrat.');
      return;
    }
    setZarizeni(json.zarizeni || []);
    setHlaska(`Odebráno: ${z.nazev}.`);
  }

  return (
    <details className="ph-push" {...(rozbalit ? { open: true } : {})}>
      <summary className={`ph-push__souhrn${nadpis.varovani ? ' is-varovani' : ''}`}>
        {nadpis.text}
      </summary>
      <div className="ph-push__telo">
        <p className="ph-dnesek__akce">
          Tento telefon: {nazevTelefonu || 'neuvedeno'}
          <button
            type="button"
            onClick={() => {
              setPtamJmeno(true);
              setJmenoDraft(nazevTelefonu || '');
            }}
          >
            změnit
          </button>
        </p>
        <button type="button" className="ph-ulozit" onClick={() => void zapnout()}>
          {totoZapnute ? 'Obnovit upozornění' : 'Zapnout upozornění'}
        </button>
        <button type="button" className="ph-ulozit" disabled={zkousim} onClick={() => void zkusit()}>
          {zkousim ? 'Zkouším…' : 'Zkusit upozornění'}
        </button>
        {hlaska ? <span className="ph-push-stav">{hlaska}</span> : null}
        <p className="ph-push__diag">{diagnostika}</p>
        {ptamJmeno ? (
          <div className="ph-predano-dotaz">
            <p>Tento telefon</p>
            <input
              value={jmenoDraft}
              onChange={(e) => setJmenoDraft(e.target.value)}
              maxLength={40}
              autoComplete="name"
              placeholder="Pravoslav, Nikol…"
              aria-label="Tento telefon"
            />
            <button type="button" onClick={() => void potvrdJmeno()}>
              Uložit
            </button>
            <button type="button" onClick={() => setPtamJmeno(false)}>
              Zrušit
            </button>
          </div>
        ) : null}
        {zarizeni.length ? (
          <ul className="ph-push-seznam">
            {zarizeni.map((z) => {
              const stary =
                z.cas && tedMs - new Date(z.cas).getTime() > 30 * 24 * 60 * 60 * 1000;
              const tento = z.endpoint === endpointTeto;
              return (
                <li key={z.endpoint} className={stary ? 'is-stary' : undefined}>
                  {z.nazev}
                  {tento ? ' · tento telefon' : ''}
                  {z.cas ? ` · přihlášeno ${datumPrihlaseniPush(z.cas)}` : ''}
                  {!tento ? (
                    <button type="button" className="ph-push__odebrat" onClick={() => void odebrat(z)}>
                      Odebrat
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </details>
  );
}

function klicNaBajty(klic: string): ArrayBuffer {
  const pad = '='.repeat((4 - (klic.length % 4)) % 4);
  const raw = atob((klic + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new ArrayBuffer(raw.length);
  const pohled = new Uint8Array(out);
  for (let i = 0; i < raw.length; i += 1) pohled[i] = raw.charCodeAt(i);
  return out;
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
