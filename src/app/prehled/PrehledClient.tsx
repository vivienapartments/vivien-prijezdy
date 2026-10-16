'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import apartmanyJson from '@/data/apartmany.json';
import {
  casPraha,
  hodinaPraha,
  nabidnoutOdeslani,
  souhrnDne,
  cekajiciUkon,
  rozpisPlateb,
  STARY_ZAZNAM,
  terminKratky,
  textPoplatku,
  vetaChyby,
  type PrehledRadek,
} from '@/lib/prehled';
import { normalizujCasPrijezdu } from '@/lib/cas-prijezdu';
import { odkazPripraveno, textPripraveno } from '@/lib/okno-pobytu';
import { popisekCasu, novyVyjezd, vratPosledniVyjezd, VYJEZD_CASTKA, CEKANI_MINUT, type VyjezdPolozka } from '@/lib/priplatek-prijezd';
import { normalizujTelefon, textTelefonu } from '@/lib/telefon';
import { langFromNarodnost } from '@/lib/vivien-data';
import { jeHodina, nazevDluhu, polozkyDluhu, seradOdjezdy, textRozpisu, ukazatCasNaKarte, zobrazCas, zpravaOdjezdu, type DruhDluhu } from '@/lib/odjezd';
import { jeProPohodu, textPohody } from '@/lib/pohoda';
import { odkazPruvodceMajitele } from '@/lib/pruvodce-majitel';
import { TlacitkoWhatsApp } from '@/components/TlacitkoWhatsApp';
import { BranaTabulka, ParkovaniRadek } from './BranaPrehled';
import { Dnesek } from './Dnesek';
import { Hledani, Nedoplatky, RadaZalozek } from './ZalozkyPrehledu';
import type { JakPlatby, PlatbaPolozky } from '@/lib/store';
import { casPrevzetiText, formatKc, jeHostOdjetly, jeNove, jeVDnesnichOdjezdech, jeVNedoplatcich, nahledPlateb, otisk, vychoziZalozka, type Zalozka } from '@/lib/zalozky';
import { nactiBranu, stavParkovani, type BranaSlot } from '@/lib/brana';
import { GUIDE_LANGS, LANG_LABELS, type AptId, type GuideLang } from '@/lib/types';

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

type Props = {
  rows: PrehledRadek[];
  dnes: string;
  zitra: string;
  chybiWifi: string[];
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

function UlozitKontakt({ row }: { row: PrehledRadek }) {
  if (!row.telefonText && !row.jinyTelefonText) return null;
  return (
    <a className="ph-kontakt" href={`/api/prehled/vizitka?rezervace=${encodeURIComponent(row.rezervace)}`}>
      Uložit kontakt
    </a>
  );
}

export function PrehledClient({
  rows,
  dnes,
  zitra,
  chybiWifi,
  ukazka = false,
  userAgent = '',
  brana = [],
  branaPotvrzena = false,
  branaPripravena = false,
}: Props) {
  const [radky, setRadky] = useState(rows);
  const [sloty, setSloty] = useState<BranaSlot[]>(() => nactiBranu(brana));
  const [branaOk, setBranaOk] = useState(branaPotvrzena);
  const [telefony, setTelefony] = useState<Record<string, string>>({});
  const [rozbalene, setRozbalene] = useState<Record<string, boolean>>({});
  const [stav, setStav] = useState<'' | Stav>('');
  const [den, setDen] = useState<'' | 'dnes' | 'zitra'>('');
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
  const [odkazy, setOdkazy] = useState<Record<string, string>>({});
  const [pridat, setPridat] = useState(false);
  const [predani, setPredani] = useState<Record<string, string | null>>({});
  const [naMisteStav, setNaMisteStav] = useState<Record<string, string | null>>({});
  const [priplatekStav, setPriplatekStav] = useState<Record<string, number | null>>({});
  const [dotazPredani, setDotazPredani] = useState<{ id: string; druh: 'predano' | 'vratit' } | null>(null);
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
      priplatekPozde: row.zadostOdjezd?.stav === 'potvrzeno' ? row.zadostOdjezd.kc : null,
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

  async function ulozPridani(event: FormEvent<HTMLFormElement>) {
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
        rezervace: String(data.get('rezervace') || ''),
        jmeno: String(data.get('jmeno') || ''),
        telefon: String(data.get('telefon') || ''),
        email: String(data.get('email') || ''),
        apartman: String(data.get('apartman') || ''),
        prijezd: String(data.get('prijezd') || ''),
        odjezd: String(data.get('odjezd') || ''),
        osob: String(data.get('osob') || ''),
        zdroj: String(data.get('zdroj') || ''),
      }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Rezervace se nepřidala.');
      return;
    }
    window.location.reload();
  }

  function telefonPole(row: PrehledRadek) {
    return (
      <PoleSUlozenim
        key={`${row.rezervace}-telefon`}
        label="Telefon"
        hodnota={telefonRadku(row)}
        vstup={{ inputMode: 'tel', autoComplete: 'off' }}
        onUloz={(text) => ulozTelefon(row, row.telefonKtery || 'rezervace', text)}
      />
    );
  }

  function jeRozbaleno(row: PrehledRadek): boolean {
    return rozbalene[row.rezervace] === true;
  }

  const dnesSouhrn = useMemo(
    () => souhrnDne(radky, dnes, casy),
    [radky, dnes, casy],
  );
  const zitraSouhrn = useMemo(
    () => souhrnDne(radky, zitra, casy),
    [radky, zitra, casy],
  );

  const viditelne = useMemo(() => {
    const denYmd = den === 'dnes' ? dnes : den === 'zitra' ? zitra : '';
    return radky.filter((row) => {
      if (row.nelzeNacist) return false;
      if (denYmd && row.prijezd !== denYmd) return false;
      if (jenNeotevreni && (row.otevrenoPocet !== 0 || row.stav === 'bez_checkinu')) return false;
      if (jenBezCheckinu && row.stav !== 'bez_checkinu') return false;
      if (stav && row.stav !== stav) return false;
      return true;
    });
  }, [radky, stav, den, dnes, zitra, jenNeotevreni, jenBezCheckinu]);

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
      const ulozenyKdo = localStorage.getItem('vivien-kdo');
      if (ulozenyKdo === 'nikol' || ulozenyKdo === 'pravoslav') kdo = ulozenyKdo;
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
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'email', zprava }),
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
              historie: [...r.historie, { cas: ted, co: 'Je vše v pořádku? na WhatsApp' }].slice(-40),
            }
          : r,
      ),
    );
  }

  async function oznacWhatsApp(row: PrehledRadek) {
    const seznam = zpravyRadku(row);
    const zprava = volba[row.rezervace] ?? seznam.find((z) => z.vychozi)?.id;
    if (!zprava) return;
    const nazev = seznam.find((z) => z.id === zprava)?.nazev || 'zpráva';
    const ted = new Date().toISOString();
    if (!ukazka) {
      const res = await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace: row.rezervace, akce: 'whatsapp', zprava }),
      });
      if (!res.ok) {
        setHlaska('WhatsApp se nepodařilo zapsat.');
        return;
      }
    }
    setRadky((prev) =>
      prev.map((r) =>
        r.rezervace === row.rezervace
          ? {
              ...r,
              odjezdDotaz: zprava === 'odjezd' ? ted : r.odjezdDotaz,
              pohodaDotaz: zprava === 'pohoda' ? ted : r.pohodaDotaz,
              historie: [...r.historie, { cas: ted, co: `WhatsApp: ${nazev}` }].slice(-40),
            }
          : r,
      ),
    );
  }

  function naMisteRadku(row: PrehledRadek): string | null {
    if (Object.prototype.hasOwnProperty.call(naMisteStav, row.rezervace)) return naMisteStav[row.rezervace];
    return row.naMiste;
  }

  function priplatekRadku(row: PrehledRadek): number | null {
    if (Object.prototype.hasOwnProperty.call(priplatekStav, row.rezervace)) return priplatekStav[row.rezervace];
    return row.priplatekRucni;
  }

  async function ulozNaMiste(row: PrehledRadek, zapnout: boolean) {
    if (ukazka) {
      setNaMisteStav((prev) => ({ ...prev, [row.rezervace]: zapnout ? new Date().toISOString() : null }));
      return;
    }
    setCekam(`${row.rezervace}:miste`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: zapnout ? 'na-miste' : 'zrusit-na-miste' }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; naMiste?: string | null } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Čas na místě se neuložil.');
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
    const uklizeno = radky.some(
      (r) => r.apartman && r.apartman === row.apartman && r.odjezd === dnes && r.uklizenoKdy && r.rezervace !== row.rezervace,
    );
    const cas = row.casPrijezdu;
    const po = !cas || cas > '14:00';
    if (!uklizeno || row.predano || row.prijezd !== dnes || !po || row.zpravy.some((z) => z.id === 'pripraveno')) return row.zpravy;
    return [
      ...row.zpravy,
      {
        id: 'pripraveno' as const,
        nazev: 'Apartmán je připravený',
        text: textPripraveno(row.jazyk, row.odkaz ? odkazPripraveno(row.odkaz) : ''),
        vychozi: false,
        vystraha: false,
      },
    ];
  }

  function zpravaRadku(row: PrehledRadek): string {
    const seznam = zpravyRadku(row);
    const id = volba[row.rezervace] ?? seznam.find((z) => z.vychozi)?.id;
    if (id === 'odjezd') return textDotazuOdjezdu(row);
    return seznam.find((z) => z.id === id)?.text || row.zprava;
  }

  async function ulozOdkaz(row: PrehledRadek, hodnota: string): Promise<{ ok: boolean; hodnota?: string }> {
    const url = hodnota.trim();
    if (ukazka) {
      setOdkazy((prev) => ({ ...prev, [row.rezervace]: url }));
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
    return { ok: true, hodnota: hotovo };
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

  function radekDne(ktery: 'dnes' | 'zitra', nadpis: string, souhrn: ReturnType<typeof souhrnDne>) {
    const plan = souhrn.plan
      .map((h) => (h.cas ? `${h.cas} ${h.jmeno}` : `bez času ${h.jmeno}`))
      .join(' · ');
    return (
      <button
        type="button"
        className={den === ktery ? 'ph-den is-on' : 'ph-den'}
        aria-pressed={den === ktery}
        onClick={() => setDen(den === ktery ? '' : ktery)}
      >
        <span>
          {nadpis}: {souhrn.pocet} · průvodce otevřelo {souhrn.otevrelo} · neodesláno {souhrn.neodeslano} · bez
          check-inu: {souhrn.bezCheckinu}
        </span>
        {plan ? <span className="ph-plan">{plan}</span> : null}
      </button>
    );
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
    const fazeTon = odjel && row.stav !== 'zruseno' ? 'seda' : row.fazeTon;
    const cekajici = cekajiciUkon({
      predano: Boolean(predanoKdy),
      naMiste: Boolean(naMisteKdy),
      denPrijezdu: row.prijezd === dnes,
      parkovani: parkAkce,
      odjel,
    });
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
        className="ph-predano ph-predano-vyrazne"
        disabled={cekam !== null}
        onClick={() => setDotazPredani({ id: row.rezervace, druh: 'predano' })}
      >
        Předat
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
    const namisteTlacitko = naMisteKdy ? (
      <div className="ph-namiste">
        Host je na místě <span className="ph-soucet__kc">{hodinaPraha(naMisteKdy)}</span>
        {' · '}
        <button type="button" onClick={() => void ulozNaMiste(row, false)}>
          Vrátit
        </button>
      </div>
    ) : (
      <button type="button" className="ph-predano" onClick={() => void ulozNaMiste(row, true)}>
        Host je na místě
      </button>
    );
    const poplatekRadek = (
      <div className={`ph-poplatek-kratky${nahled.ton === 'seda' ? ' ph-platby--seda' : ''}${nahled.ton === 'zelena' ? ' ph-platby--zelena' : ''}`}>
        {otevirat ? (
          <button
            type="button"
            className="ph-poplatek-tlacitko"
            aria-expanded={poplatekRozbalen}
            onClick={() => setPoplatekOtevren((prev) => ({ ...prev, [row.rezervace]: !prev[row.rezervace] }))}
          >
            {nahled.text} {poplatekRozbalen ? '▴' : '▾'}
          </button>
        ) : (
          <span>{nahled.text}</span>
        )}
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
                    Zaplaceno
                  </button>
                )}
              </p>
            ))}
            {nezaplacene.length > 0 ? (
              <p>
                <button
                  type="button"
                  className="ph-zaplatit"
                  disabled={cekam !== null}
                  onClick={() => setVolbaPlatby({ id: row.rezervace, druh: 'vse', krok: 'kdo', kdo: null })}
                >
                  Zaplaceno
                </button>
              </p>
            ) : null}
            {volbaPlatby?.id === row.rezervace ? (
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
            ) : null}
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
        onSloty={setSloty}
        onHlaska={setHlaska}
        deti={(dil) => (
      <article key={row.rezervace} className={rozbaleno ? 'ph-row' : 'ph-row is-shut'} id={row.rezervace}>
        <div className="ph-karta-hlavicka">
          <div className="ph-jmeno">{kdo}</div>
          {apartman ? <div className="ph-apt">{apartman}</div> : null}
          {termin ? <div className="ph-kde">{termin}</div> : null}
        </div>
        <div className="ph-znacky">
          <span className={`ph-faze ph-faze--${fazeTon}`}>Fáze · {fazeText}</span>
        </div>
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
        {ukazatPrijezd ? <div className="ph-prijezd-cas">Příjezd {casText}</div> : null}
        {ukazatCasNaKarte(row.odjezd, dnes) && jeHodina(odjezdCas) ? (
          <div className="ph-prijezd-cas">Odjezd {zobrazCas(odjezdCas)}</div>
        ) : null}
        {dil.radek}
        {poplatekRadek}
        {chyba ? <div className="ph-chyba-kratka">{chyba}</div> : null}
        {predanoKdy || odjel ? null : (
          <>
            {zpravaRamecek}
            {akceZpravy}
          </>
        )}
        {cekajici === 'registrace' ? dil.registrace : null}
        {cekajici === 'odpoved' ? dil.odpoved : null}
        {cekajici === 'predani' ? (
          <>
            {predaniTlacitko}
            {predaniDotaz}
          </>
        ) : null}
        {cekajici === 'namiste' ? namisteTlacitko : null}
        <button
          type="button"
          className="ph-rozbal"
          aria-expanded={rozbaleno}
          onClick={() => setRozbalene((prev) => ({ ...prev, [row.rezervace]: !prev[row.rezervace] }))}
        >
          {rozbaleno ? 'Skrýt detail ▴' : 'Detail ▾'}
        </button>
        <div className="ph-detail">
          {telefonPole(row)}
          {row.telefonNejisty ? (
            <div className="ph-predvolba">
              Doplňte předvolbu, např. <span className="ph-tel">+34&nbsp;612&nbsp;345&nbsp;678</span>
            </div>
          ) : null}
          {row.jinyTelefonKtery ? (
            <PoleSUlozenim
              key={`${row.rezervace}-druhe`}
              label="Druhé číslo"
              hodnota={row.jinyTelefonText || ''}
              vstup={{ inputMode: 'tel', autoComplete: 'off' }}
              onUloz={(text) => ulozTelefon(row, row.jinyTelefonKtery || 'rezervace', text)}
            />
          ) : null}
          {row.jinyTelefonKtery && row.jinyTelefonNejisty ? (
            <div className="ph-predvolba">
              Doplňte předvolbu, např. <span className="ph-tel">+34&nbsp;612&nbsp;345&nbsp;678</span>
            </div>
          ) : null}
          {row.zpusobPrijezdu === 'auto' && (row.telefonBrana || row.spz || row.spzPujcene) ? (
            <div className={`ph-brana${row.branaRegistrovano ? ' ph-brana--ano' : ' ph-brana--ne'}`}>
              Brána {row.telefonBrana ? textTelefonu(row.telefonBrana) : 'bez telefonu'}
              {' · '}
              {row.spzPujcene ? 'SPZ později' : row.spz ? `SPZ ${row.spz.length > 4 ? `${row.spz.slice(0, -4)} ${row.spz.slice(-4)}` : row.spz}` : 'bez SPZ'}
            </div>
          ) : null}
          {cekajici === 'registrace' ? null : dil.registrace}
          {cekajici === 'odpoved' ? null : dil.odpoved}
          {dil.detail}
          {casPole}
          {odjezdPole}
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
          {cekajici === 'namiste' ? null : namisteTlacitko}
          {predanoKdy || odjel ? (
            <>
              {zpravaRamecek}
              {akceZpravy}
            </>
          ) : null}
          {row.prevzatoKdy ? (
            <button type="button" className="ph-predano" onClick={() => setDotazVratitOdjezd(row.rezervace)}>
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
          {cekajici === 'predani' ? null : (
            <>
              {predaniTlacitko}
              {predaniDotaz}
            </>
          )}
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
              <button type="button" disabled={cekam !== null} onClick={() => ulozVyjezd(row, dotazVyjezdu.druh === 'pridat')}>
                {dotazVyjezdu.druh === 'pridat' ? 'Ano, započítat' : 'Ano, vrátit'}
              </button>
              <button type="button" onClick={() => setDotazVyjezdu(null)}>
                Zrušit
              </button>
            </div>
          ) : null}
          {wa || row.telefonText || row.jinyTelefonText ? <UlozitKontakt row={row} /> : null}
          <a className="ph-hostuv-pruvodce" href={odkazPruvodceMajitele(row.rezervace, ukazka)}>
            Průvodce hosta
          </a>
          {row.navrhy.map((n) => (
            <p key={n.pole} className="ph-navrh">
              {n.veta}
              {' · '}
              <button type="button" onClick={() => prevzit(row, n.pole, n.hodnota)}>
                Použít
              </button>
            </p>
          ))}
          {soucetPole}
          {row.souhlasZneni ? (
            <div className="ph-souhlas-zneni">
              <p>Znění, které host odsouhlasil</p>
              <p>{row.souhlasZneni}</p>
            </div>
          ) : null}
          {nabidnoutOdeslani(row.stav) ? (
            <div className="ph-znovu">
              <label>
                Jazyk průvodce
                <select
                  value={jazykRadku(row)}
                  onChange={(e) => setJazyky((prev) => ({ ...prev, [row.rezervace]: e.target.value as GuideLang }))}
                >
                  {GUIDE_LANGS.map((lang) => (
                    <option key={lang} value={lang}>
                      {LANG_LABELS[lang]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={cekam !== null}
                onClick={() => setDotazZnovu(row.rezervace)}
              >
                Odeslat průvodce znovu
              </button>
              {dotazZnovu === row.rezervace ? (
                <div className="ph-predano-dotaz">
                  <p>
                    Poslat průvodce znovu v jazyce {LANG_LABELS[jazykRadku(row)]}? Host dostane nový e-mail.
                  </p>
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
            </div>
          ) : null}
          <div className="ph-cell ph-cell--host" data-label="Host">
            <div className="ph-mail">
              <Pole text={row.email} />
            </div>
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
            {row.telefonPuvodni ? <div className="ph-puvodni">napsáno {row.telefonPuvodni}</div> : null}
            {row.telefonNejisty ? (
              <div className="ph-predvolba">
                Doplňte předvolbu, např. <span className="ph-tel">+34&nbsp;612&nbsp;345&nbsp;678</span>
              </div>
            ) : null}
            {row.jinyTelefonText ? (
              <div className="ph-tel-jiny">
                jiné číslo z rezervace: <span className="ph-tel">{row.jinyTelefonText}</span>
                {row.jinyTelefonPuvodni ? <span className="ph-puvodni"> napsáno {row.jinyTelefonPuvodni}</span> : null}
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
            <>
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
              </>
          </div>
          <div className="ph-cell" data-label="Příjezd">
            <Pole text={row.termin} />
          </div>
          <div className="ph-cell" data-label="Vytvořeno">
            <Pole text={row.vytvorenoText} />
          </div>
          <div className="ph-cell" data-label="Rezervace">
            <div>{row.rezervace}</div>
          </div>
          <div className="ph-cell" data-label="Co se stalo">
            <Pole text={row.coSeStalo} />
          </div>
          <div className="ph-cell" data-label="Poslední pokus">
            <Pole text={row.posledniPokusText} />
          </div>
          <div className="ph-akce">
            {nabidnoutOdeslani(row.stav) ? (
              <button type="button" onClick={() => setOtevreno(otevreno === row.rezervace ? null : row.rezervace)}>
                Opravit a odeslat
              </button>
            ) : null}
            {row.stav !== 'bez_checkinu' ? (
              <button type="button" disabled={cekam !== null} onClick={() => volat(row, 'odkaz')}>
                Zkopírovat odkaz
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
                <li key={`${h.cas}-${i}`}>{casPraha(h.cas) ? `${casPraha(h.cas)} ${h.co}` : h.co}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </article>
        )}
      />
    );
  }

  const ted = new Date();
  const aktivni = viditelne.filter((row) => !jeHostOdjetly(hostOdjezdu(row), dnes, ted));
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
        <h1>Přehled rezervací</h1>
        {radekDne('dnes', 'Dnes přijíždí', dnesSouhrn)}
        {radekDne('zitra', 'Zítra přijíždí', zitraSouhrn)}
        {chybiWifi.length ? (
          <p className="ph-wifi">V nastavení chybí heslo WiFi pro {chybiWifi.join(', ')}.</p>
        ) : null}
      </header>

      <RadaZalozek zalozka={zalozka} pocty={pocty} nove={nove} onZmena={otevriZalozku} />
      <p className="ph-dnesek__akce">
        Kdo se dívá
        <button
          type="button"
          className={kdoKouka === 'pravoslav' ? 'is-on' : undefined}
          onClick={() => {
            setKdoKouka('pravoslav');
            try { localStorage.setItem('vivien-kdo', 'pravoslav'); } catch { /* paměť */ }
          }}
        >
          Pravoslav
        </button>
        <button
          type="button"
          className={kdoKouka === 'nikol' ? 'is-on' : undefined}
          onClick={() => {
            setKdoKouka('nikol');
            try { localStorage.setItem('vivien-kdo', 'nikol'); } catch { /* paměť */ }
          }}
        >
          Nikol
        </button>
      </p>

      {zalozka === 'dnes' ? <Dnesek radky={radky} dnes={dnes} ukazka={ukazka} brana={brana} vPrehledu onPrevzato={poPrevzeti} /> : null}
      {zalozka === 'dluhy' ? (
        <Nedoplatky
          radky={radky}
          dnes={dnes}
          ukazka={ukazka}
          onOtevri={(id) => {
            setVybrana(id);
            setRozbalene((prev) => ({ ...prev, [id]: true }));
          }}
          onPlatby={zapisPlatbyRadku}
        />
      ) : null}
      {zalozka === 'hledat' ? (
        <Hledani
          radky={radky}
          dnes={dnes}
          zitra={zitra}
          onOtevri={(id) => {
            setVybrana(id);
            setRozbalene((prev) => ({ ...prev, [id]: true }));
          }}
        />
      ) : null}
      {zalozka === 'dluhy' || zalozka === 'hledat' ? (vybrany ? kartaHosta(vybrany) : null) : null}

      {zalozka === 'prijezdy' ? (
      <>
      <button type="button" className="ph-rozbal" onClick={() => setPridat((v) => !v)}>
        {pridat ? 'Skrýt formulář' : 'Přidat rezervaci'}
      </button>
      {pridat ? (
        <form className="ph-pridani" onSubmit={ulozPridani}>
          <label>
            Číslo rezervace
            <input name="rezervace" inputMode="numeric" required autoComplete="off" />
          </label>
          <label>
            Jméno a příjmení
            <input name="jmeno" autoComplete="name" />
          </label>
          <label>
            Telefon
            <input name="telefon" type="tel" inputMode="tel" autoComplete="tel" />
          </label>
          <label className="ph-siroke">
            E-mail
            <input name="email" type="email" autoComplete="email" />
          </label>
          <label>
            Apartmán
            <select name="apartman" defaultValue="">
              <option value="">nevybráno</option>
              {apartmany.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} {a.nazev.cs}
                </option>
              ))}
            </select>
          </label>
          <label>
            Příjezd
            <input name="prijezd" type="date" />
          </label>
          <label>
            Odjezd
            <input name="odjezd" type="date" />
          </label>
          <label>
            Počet osob
            <input name="osob" inputMode="numeric" />
          </label>
          <label>
            Zdroj
            <select name="zdroj" defaultValue="">
              <option value="">nevybráno</option>
              <option value="Booking">Booking</option>
              <option value="Airbnb">Airbnb</option>
              <option value="přímá">přímá</option>
            </select>
          </label>
          <div className="ph-akce-spodek">
            <button type="submit" disabled={cekam !== null}>
              Uložit
            </button>
          </div>
        </form>
      ) : null}

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

      {zalozka === 'dnes'
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
                        <a href={`#${row.rezervace}`}>{row.jmeno || 'Host'}</a>
                        {' · '}
                        {row.apartman || 'bez apartmánu'}
                        {odeslano ? (
                          <span>{` · Odesláno ${odeslano}`}</span>
                        ) : (
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
                        )}
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
              </section>
            );
          })()
        : null}

      {(zalozka === 'dnes' ? [{ den: zitra, nadpis: 'Zítřejší odjezdy', kotva: 'odjezdy-zitra' }] : []).map((sekce) => {
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
                    <a href={`#${row.rezervace}`}>{row.jmeno || 'Host'}</a>
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

      {zalozka === 'prijezdy' ? aktivni.map((row) => kartaHosta(row)) : null}

      {zalozka === 'prijezdy' && odjeli.length ? (
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

      {zalozka === 'prijezdy' ? <BranaTabulka
        sloty={sloty}
        radky={radky}
        ukazka={ukazka}
        potvrzena={branaOk}
        onPotvrzeno={() => setBranaOk(true)}
        onSloty={setSloty}
        onHlaska={setHlaska}
        onHost={(id) => {
          setRozbalene((prev) => ({ ...prev, [id]: true }));
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      /> : null}

      {ukazka ? null : <OdkazyZeSchranky />}
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

type RadekOdkazu = {
  rezervace: string;
  host: string;
  nalezen: string;
  naKarte: string;
  stane: string;
};

function OdkazyZeSchranky() {
  const [radky, setRadky] = useState<RadekOdkazu[] | null>(null);
  const [cekam, setCekam] = useState('');
  const [hlaska, setHlaska] = useState('');
  const [potvrdit, setPotvrdit] = useState(false);

  async function nacti(akce: 'ukazat' | 'doplnit') {
    setCekam(akce);
    setHlaska('');
    const res = await fetch('/api/prehled/checkin-odkazy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      radky?: RadekOdkazu[];
      doplneno?: { rezervace: string; host: string }[];
    } | null;
    setCekam('');
    if (!res.ok || !json?.ok || !json.radky) {
      setHlaska(json?.error || 'Schránku se nepodařilo přečíst.');
      return;
    }
    setRadky(json.radky);
    setPotvrdit(false);
    if (akce === 'doplnit') {
      const kdo = (json.doplneno || []).map((r) => `${r.rezervace} ${r.host}`).join(', ');
      setHlaska(kdo ? `Doplněno u ${json.doplneno?.length}: ${kdo}.` : 'Doplněno nikde. Odkaz už na kartách je.');
    }
  }

  const jdeDoplnit = Boolean(radky?.some((r) => r.stane === 'doplní se'));

  return (
    <section className="ph-odkazy-schranka">
      <p>Odkazy na check-in ze schránky</p>
      <button type="button" className="ph-ulozit" disabled={cekam !== ''} onClick={() => void nacti('ukazat')}>
        {cekam === 'ukazat' ? 'Čtu schránku…' : 'Ukázat'}
      </button>
      {hlaska ? <p>{hlaska}</p> : null}
      {radky ? (
        <div className="ph-odkazy-tabulka">
          <table>
            <thead>
              <tr>
                <th>Rezervace</th>
                <th>Host</th>
                <th>Odkaz nalezen</th>
                <th>Na kartě už je</th>
                <th>Co se stane</th>
              </tr>
            </thead>
            <tbody>
              {radky.length ? (
                radky.map((r) => (
                  <tr key={r.rezervace}>
                    <td>{r.rezervace}</td>
                    <td>{r.host}</td>
                    <td>{r.nalezen}</td>
                    <td>{r.naKarte}</td>
                    <td>{r.stane}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>Za 30 dní tu žádná výzva k check-inu není.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
      {jdeDoplnit && !potvrdit ? (
        <button type="button" className="ph-ulozit" disabled={cekam !== ''} onClick={() => setPotvrdit(true)}>
          Doplnit
        </button>
      ) : null}
      {potvrdit ? (
        <div className="ph-predano-dotaz">
          <p>Doplnit odkaz jen tam, kde na kartě žádný není?</p>
          <button type="button" disabled={cekam !== ''} onClick={() => void nacti('doplnit')}>
            {cekam === 'doplnit' ? 'Doplňuji…' : 'Ano, doplnit'}
          </button>
          <button type="button" onClick={() => setPotvrdit(false)}>
            Zrušit
          </button>
        </div>
      ) : null}
    </section>
  );
}

function Upozorneni() {
  const [klic, setKlic] = useState('');
  const [zarizeni, setZarizeni] = useState<{ nazev: string; endpoint: string }[]>([]);
  const [hlaska, setHlaska] = useState('');
  const [zkousim, setZkousim] = useState(false);

  useEffect(() => {
    let zive = true;
    fetch('/api/prehled/push')
      .then((res) => res.json())
      .then(
        (json: {
          ok?: boolean;
          publicKey?: string;
          zarizeni?: { nazev: string; endpoint: string }[];
          pocet?: number;
          chybaUlaziste?: string;
        }) => {
          if (!zive || !json?.ok) return;
          setKlic(json.publicKey || '');
          setZarizeni(json.zarizeni || []);
          if (json.chybaUlaziste) setHlaska('Úložiště teď neodpovídá. Zkuste zapnout znovu za chvíli.');
          else if ((json.pocet ?? 0) === 0) setHlaska('Žádné zařízení. Zapněte upozornění na tomto telefonu.');
        },
      )
      .catch(() => undefined);
    return () => {
      zive = false;
    };
  }, []);

  async function zapnout() {
    setHlaska('');
    if (!klic || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setHlaska('Upozornění ještě nejsou nastavená.');
      return;
    }
    const povoleni = await Notification.requestPermission();
    if (povoleni !== 'granted') {
      setHlaska('Upozornění jsou v telefonu vypnutá.');
      return;
    }
    const reg = await navigator.serviceWorker.register('/prehled/sw.js', { scope: '/prehled/' });
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: klicNaBajty(klic),
    });
    const jsonSub = sub.toJSON();
    const res = await fetch('/api/prehled/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        akce: 'zapnout',
        nazev: navigator.userAgent.includes('Android') ? 'Android' : 'Telefon',
        endpoint: jsonSub.endpoint,
        keys: jsonSub.keys,
      }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; zarizeni?: { nazev: string; endpoint: string }[]; error?: string } | null;
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Upozornění se nepodařilo zapnout.');
      return;
    }
    setZarizeni(json.zarizeni || []);
    setHlaska('Upozornění jsou zapnutá.');
  }

  async function vypnout(endpoint: string) {
    const res = await fetch('/api/prehled/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce: 'vypnout', endpoint }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; zarizeni?: { nazev: string; endpoint: string }[] } | null;
    if (res.ok && json?.ok) setZarizeni(json.zarizeni || []);
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

  return (
    <div className="ph-push">
      <button type="button" className="ph-ulozit" onClick={() => void zapnout()}>
        Zapnout upozornění
      </button>
      <button type="button" className="ph-ulozit" disabled={zkousim} onClick={() => void zkusit()}>
        {zkousim ? 'Zkouším…' : 'Zkusit upozornění'}
      </button>
      {zarizeni.map((z) => (
        <button key={z.endpoint} type="button" className="ph-push-vyp" onClick={() => void vypnout(z.endpoint)}>
          Vypnout {z.nazev}
        </button>
      ))}
      {hlaska ? <span className="ph-push-stav">{hlaska}</span> : null}
    </div>
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
