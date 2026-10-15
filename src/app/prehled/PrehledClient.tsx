'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import apartmanyJson from '@/data/apartmany.json';
import {
  casPraha,
  hodinaPraha,
  nabidnoutOdeslani,
  souhrnDne,
  rozpisPlateb,
  STARY_ZAZNAM,
  terminKratky,
  textVybranehoPoplatku,
  textSouhlasu,
  vetaChyby,
  type PrehledRadek,
} from '@/lib/prehled';
import { normalizujCasPrijezdu } from '@/lib/cas-prijezdu';
import { popisekCasu, novyVyjezd, vratPosledniVyjezd, VYJEZD_CASTKA, CEKANI_MINUT, type VyjezdPolozka } from '@/lib/priplatek-prijezd';
import { normalizujTelefon, textTelefonu } from '@/lib/telefon';
import { langFromNarodnost } from '@/lib/vivien-data';
import { odkazWhatsAppPrehled } from '@/lib/whatsapp-zprava';
import { odkazPruvodceMajitele } from '@/lib/pruvodce-majitel';
import { GUIDE_LANGS, LANG_LABELS, type AptId, type GuideLang } from '@/lib/types';

type Stav = PrehledRadek['stav'];

type AptRow = { id: AptId; nazev: { cs: string } };
const apartmany = (apartmanyJson as { apartmany: AptRow[] }).apartmany;

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
};

function textPruvodce(row: PrehledRadek): { text: string; ton: 'ano' | 'ne' | 'nevim' } | null {
  if (row.stav === 'bez_checkinu') return null;
  if (row.otevrenoPocet == null) return { text: 'Nevíme', ton: 'nevim' };
  if (row.otevrenoPocet <= 0) return { text: 'Průvodce neotevřen', ton: 'ne' };
  return { text: `Průvodce otevřen ${row.otevrenoPocet}×`, ton: 'ano' };
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

export function PrehledClient({ rows, dnes, zitra, chybiWifi, ukazka = false, userAgent = '' }: Props) {
  const [radky, setRadky] = useState(rows);
  const [telefony, setTelefony] = useState<Record<string, string>>({});
  const [rozbalene, setRozbalene] = useState<Record<string, boolean>>({});
  const [stav, setStav] = useState<'' | Stav>('');
  const [hledat, setHledat] = useState('');
  const [den, setDen] = useState<'' | 'dnes' | 'zitra'>('');
  const [jenNeotevreni, setJenNeotevreni] = useState(false);
  const [jenBezCheckinu, setJenBezCheckinu] = useState(false);
  const [odjeliOtevreno, setOdjeliOtevreno] = useState(false);
  const [otevreno, setOtevreno] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState('');
  const [cekam, setCekam] = useState<string | null>(null);
  const [casy, setCasy] = useState<Record<string, string>>({});
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
  const [dotazPlatby, setDotazPlatby] = useState<{ id: string; druh: 'vybrat' | 'vratit' } | null>(null);
  const [jazyky, setJazyky] = useState<Record<string, GuideLang>>({});
  const [dotazZnovu, setDotazZnovu] = useState<string | null>(null);
  const [dotazDalsi, setDotazDalsi] = useState<{ id: string; druh: 'brana' | 'odemknout' } | null>(null);

  function jazykRadku(row: PrehledRadek): GuideLang {
    return jazyky[row.rezervace] || (row.narodnost?.trim() ? langFromNarodnost(row.narodnost) : row.jazyk || 'cs');
  }

  function casRadku(row: PrehledRadek): string {
    if (casy[row.rezervace] != null) return casy[row.rezervace];
    if (row.casPrijezdu === 'po20' || row.casPrijezdu === 'po23') return popisekCasu(row.casPrijezdu);
    return row.casPrijezdu ?? '';
  }

  function telefonRadku(row: PrehledRadek): string {
    return telefony[row.rezervace] ?? row.telefonText ?? '';
  }

  function predanoRadku(row: PrehledRadek): string | null {
    if (Object.prototype.hasOwnProperty.call(predani, row.rezervace)) return predani[row.rezervace];
    return row.predano;
  }

  function textPredani(iso: string): string {
    const hod = hodinaPraha(iso);
    return hod ? `Předáno ${hod}` : 'Předáno';
  }

  function vyberPoplatku(row: PrehledRadek): { kdy: string | null; kdo: 'ja' | 'nikol' | null } {
    if (Object.prototype.hasOwnProperty.call(platby, row.rezervace)) return platby[row.rezervace];
    return { kdy: row.zaplaceno, kdo: row.poplatekVybral };
  }

  async function ulozPoplatek(row: PrehledRadek, kdo: 'ja' | 'nikol' | null) {
    setDotazPlatby(null);
    if (ukazka) {
      setPlatby((prev) => ({
        ...prev,
        [row.rezervace]: kdo ? { kdy: new Date().toISOString(), kdo } : { kdy: null, kdo: null },
      }));
      return;
    }
    setCekam(`${row.rezervace}:platba`);
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rezervace: row.rezervace,
        akce: kdo ? 'zaplaceno' : 'zrusit-zaplaceni',
        kdo: kdo || undefined,
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      zaplaceno?: string | null;
      poplatekVybral?: 'ja' | 'nikol' | null;
    } | null;
    setCekam(null);
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Poplatek se neuložil.');
      return;
    }
    setPlatby((prev) => ({
      ...prev,
      [row.rezervace]: { kdy: json.zaplaceno ?? null, kdo: json.poplatekVybral ?? null },
    }));
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
    const q = hledat.trim().toLowerCase();
    const denYmd = den === 'dnes' ? dnes : den === 'zitra' ? zitra : '';
    return radky.filter((row) => {
      if (denYmd && row.prijezd !== denYmd) return false;
      if (jenNeotevreni && (row.otevrenoPocet !== 0 || row.stav === 'bez_checkinu')) return false;
      if (jenBezCheckinu && row.stav !== 'bez_checkinu') return false;
      if (stav && row.stav !== stav) return false;
      if (!q) return true;
      return (
        row.rezervace.toLowerCase().includes(q) ||
        row.jmeno.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q)
      );
    });
  }, [radky, stav, hledat, den, dnes, zitra, jenNeotevreni, jenBezCheckinu]);

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

  function zpravaRadku(row: PrehledRadek): string {
    const id = volba[row.rezervace] ?? row.zpravy.find((z) => z.vychozi)?.id;
    return row.zpravy.find((z) => z.id === id)?.text || row.zprava;
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
    if (ktery === (row.telefonKtery || 'rezervace')) {
      setTelefony((prev) => ({ ...prev, [row.rezervace]: hotovo }));
    } else {
      setRadky((prev) =>
        prev.map((r) => (r.rezervace === row.rezervace ? { ...r, jinyTelefonText: hotovo } : r)),
      );
    }
    return { ok: true, hodnota: hotovo };
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
    const pruvodce = textPruvodce(row);
    const chyba = vetaChyby(row);
    const wa = row.telefonWa || row.jinyTelefonWa;
    const predanoKdy = predanoRadku(row);
    const poplatek = row.poplatek === 'ne' || row.stav === 'zruseno' ? null : vyberPoplatku(row);
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
    return (
      <article key={row.rezervace} className={rozbaleno ? 'ph-row' : 'ph-row is-shut'} id={row.rezervace}>
        <div className="ph-karta-hlavicka">
          <div className="ph-jmeno">{kdo}</div>
          {apartman ? <div className="ph-apt">{apartman}</div> : null}
          {termin ? <div className="ph-kde">{termin}</div> : null}
          {row.poplatekText ? <div className="ph-stitek">{row.poplatekText}</div> : null}
        </div>
        <div className="ph-znacky">
          {predanoKdy ? <span className="ph-znacka ph-znacka--ano">{textPredani(predanoKdy)}</span> : null}
          {poplatek?.kdy ? (
            <span className="ph-znacka ph-znacka--ano">{textVybranehoPoplatku(poplatek.kdy, poplatek.kdo)}</span>
          ) : poplatek ? (
            <span className="ph-znacka ph-znacka--ne">Poplatek městu není vybraný</span>
          ) : null}
          {jizdy.map((jizda) => (
            <span key={jizda.id} className="ph-znacka ph-znacka--ne">
              Opakovaný výjezd {jizda.castka} Kč
            </span>
          ))}
          {row.souhlas ? (
            <span className="ph-znacka ph-znacka--ano">{textSouhlasu(row.souhlas.kdy)}</span>
          ) : (
            <span className="ph-znacka ph-znacka--ne">Pravidla nezaškrtl</span>
          )}
        </div>
        {pruvodce ? <div className={`ph-pruvodce ph-pruvodce--${pruvodce.ton}`}>{pruvodce.text}</div> : null}
        {chyba ? <div className="ph-chyba-kratka">{chyba}</div> : null}
        {telefonPole(row)}
        {row.jinyTelefonKtery ? (
            <PoleSUlozenim
              key={`${row.rezervace}-druhe`}
              label="Druhé číslo"
              hodnota={row.jinyTelefonText || ''}
              vstup={{ inputMode: 'tel', autoComplete: 'off' }}
              onUloz={(text) => ulozTelefon(row, row.jinyTelefonKtery || 'rezervace', text)}
            />
          ) : null}
          <PoleSUlozenim
            key={`${row.rezervace}-cas`}
            label="Čas příjezdu"
            hodnota={casRadku(row)}
            poznamka={row.casZadalHost ? <span className="ph-od-hosta"> zadal host</span> : null}
            vstup={{ inputMode: 'numeric', autoComplete: 'off' }}
            onUloz={(text) => ulozCas(row, text)}
          />
          {row.navrhy.map((n) => (
            <p key={n.pole} className="ph-navrh">
              {n.veta}
              {' · '}
              <button type="button" onClick={() => prevzit(row, n.pole, n.hodnota)}>
                Použít
              </button>
            </p>
          ))}
          {row.zpusobPrijezdu === 'pesky' ? <div className="ph-prijezd">Pěšky</div> : null}
          {row.zpusobPrijezdu === 'auto' && (row.telefonBrana || row.spz || row.spzPujcene) ? (
            <div className={`ph-brana${row.branaRegistrovano ? ' ph-brana--ano' : ' ph-brana--ne'}`}>
              Brána {row.telefonBrana ? textTelefonu(row.telefonBrana) : 'bez telefonu'}
              {' · '}
              {row.spzPujcene ? 'SPZ později' : row.spz ? `SPZ ${row.spz.length > 4 ? `${row.spz.slice(0, -4)} ${row.spz.slice(-4)}` : row.spz}` : 'bez SPZ'}
            </div>
          ) : null}
          <div className={row.rozbalen ? 'ph-rozbalen' : 'ph-chybi'}>{row.rozbalenText}</div>
          {row.zpusobPrijezdu === 'auto' && row.telefonBrana && !row.branaRegistrovano ? (
            <button
              type="button"
              className="ph-predano"
              disabled={cekam !== null}
              onClick={() => setDotazDalsi({ id: row.rezervace, druh: 'brana' })}
            >
              Zaregistrováno v bráně
            </button>
          ) : null}
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
              <p>
                {dotazDalsi.druh === 'brana'
                  ? 'Opravdu označit, že telefon je zaregistrovaný v bráně?'
                  : 'Opravdu odemknout celý průvodce? Kódy se tím neotevřou.'}
              </p>
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
                          ? {
                              ...r,
                              branaRegistrovano: druh === 'brana' ? new Date().toISOString() : r.branaRegistrovano,
                              pruvodceOdemcen: druh === 'odemknout' ? new Date().toISOString() : r.pruvodceOdemcen,
                            }
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
            {naMisteKdy ? (
              <div>
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
            )}
            <PoleSUlozenim
              key={`${row.rezervace}-priplatek`}
              label="Příplatek za čas ručně"
              hodnota={rucniCastka == null ? '' : String(rucniCastka)}
              vstup={{ inputMode: 'numeric', autoComplete: 'off', placeholder: 'nechat výpočet' }}
              onUloz={(text) => ulozPriplatek(row, text)}
            />
          </div>
          {row.zpravy.length && wa ? (
            <fieldset className="ph-menu">
              <legend>Zpráva</legend>
              {row.zpravy.map((z) => {
                const vybrano = (volba[row.rezervace] ?? row.zpravy.find((z) => z.vychozi)?.id) === z.id;
                return (
                  <label key={z.id} className={vybrano ? 'is-on' : ''}>
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
          ) : null}
          <div className="ph-akce-skupiny">
            {wa || row.telefonText || row.jinyTelefonText ? (
              <div className="ph-akce-rada ph-akce-rada--zprava">
                {wa ? (
                  <>
                    <a
                      className="ph-wa"
                      href={odkazWhatsAppPrehled(wa, zpravaRadku(row), userAgent)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Napsat na WhatsApp
                    </a>
                    <button type="button" className="ph-kopie" onClick={() => kopirovatZpravu(row)}>
                      Zkopírovat zprávu
                    </button>
                  </>
                ) : null}
                <UlozitKontakt row={row} />
              </div>
            ) : null}
            <div className="ph-akce-rada ph-akce-rada--predani">
            {predanoKdy ? (
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
            )}
            {poplatek?.kdy ? (
              <button
                type="button"
                className="ph-predano"
                disabled={cekam !== null}
                onClick={() => setDotazPlatby({ id: row.rezervace, druh: 'vratit' })}
              >
                Vrátit poplatek
              </button>
            ) : poplatek ? (
              <button
                type="button"
                className="ph-zaplatit"
                disabled={cekam !== null}
                onClick={() => setDotazPlatby({ id: row.rezervace, druh: 'vybrat' })}
              >
                Poplatek vybrán
              </button>
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
            </div>
            <div className="ph-akce-rada ph-akce-rada--pruvodce">
              <a className="ph-hostuv-pruvodce" href={odkazPruvodceMajitele(row.rezervace, ukazka)}>
                Průvodce hosta
              </a>
              <button
                type="button"
                className="ph-rozbal"
                aria-expanded={rozbaleno}
                onClick={() => setRozbalene((prev) => ({ ...prev, [row.rezervace]: !prev[row.rezervace] }))}
              >
                {rozbaleno ? 'Skrýt detail ▴' : 'Detail ▾'}
              </button>
            </div>
            {dotazPlatby?.id === row.rezervace ? (
              <div className="ph-predano-dotaz">
                {dotazPlatby.druh === 'vybrat' ? (
                  <>
                    <p>Kdo vybral poplatek městu?</p>
                    <button type="button" disabled={cekam !== null} onClick={() => ulozPoplatek(row, 'ja')}>
                      Já
                    </button>
                    <button type="button" disabled={cekam !== null} onClick={() => ulozPoplatek(row, 'nikol')}>
                      Nikol
                    </button>
                  </>
                ) : (
                  <>
                    <p>Opravdu vrátit? Zůstane, že poplatek městu není vybraný.</p>
                    <button type="button" disabled={cekam !== null} onClick={() => ulozPoplatek(row, null)}>
                      Ano, vrátit
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setDotazPlatby(null)}>
                  Zrušit
                </button>
              </div>
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
            {dotazPredani?.id === row.rezervace ? (
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
            ) : null}
          </div>
        <div className="ph-detail">
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
            {row.telefonNejisty ? <div className="ph-poznamka">ověřte předvolbu</div> : null}
            {row.jinyTelefonText ? (
              <div className="ph-tel-jiny">
                jiné číslo z rezervace: <span className="ph-tel">{row.jinyTelefonText}</span>
                {row.jinyTelefonPuvodni ? <span className="ph-puvodni"> napsáno {row.jinyTelefonPuvodni}</span> : null}
                {row.jinyTelefonNejisty ? <div className="ph-poznamka">ověřte předvolbu</div> : null}
                {row.jinyTelefonWa && row.telefonWa && row.jinyTelefonWa !== row.telefonWa ? (
                  <a
                    className="ph-wa ph-wa--maly"
                    href={odkazWhatsAppPrehled(row.jinyTelefonWa, zpravaRadku(row), userAgent)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp
                  </a>
                ) : null}
              </div>
            ) : null}
            {row.stav === 'bez_checkinu' ? (
              <PoleSUlozenim
                key={`${row.rezervace}-checkin`}
                label="Odkaz na check-in"
                hodnota={odkazy[row.rezervace] ?? row.checkinUrl ?? ''}
                vstup={{ autoComplete: 'off', placeholder: 'https://' }}
                onUloz={(text) => ulozOdkaz(row, text)}
              />
            ) : null}
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
    );
  }

  const aktivni = viditelne.filter((row) => !(row.odjezd && row.odjezd < dnes));
  const odjeli = viditelne.filter((row) => Boolean(row.odjezd && row.odjezd < dnes));

  return (
    <main className="ph">
      <header className="ph-top">
        <h1>Přehled rezervací</h1>
        {radekDne('dnes', 'Dnes přijíždí', dnesSouhrn)}
        {radekDne('zitra', 'Zítra přijíždí', zitraSouhrn)}
        {chybiWifi.length ? (
          <p className="ph-wifi">V nastavení chybí heslo WiFi pro {chybiWifi.join(', ')}.</p>
        ) : null}
      </header>

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
        <label>
          Hledat
          <input
            value={hledat}
            onChange={(e) => setHledat(e.target.value)}
            placeholder="číslo, jméno nebo e-mail"
          />
        </label>
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

      {aktivni.map((row) => kartaHosta(row))}

      {odjeli.length ? (
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

function Upozorneni() {
  const [klic, setKlic] = useState('');
  const [zarizeni, setZarizeni] = useState<{ nazev: string; endpoint: string }[]>([]);
  const [hlaska, setHlaska] = useState('');

  useEffect(() => {
    let zive = true;
    fetch('/api/prehled/push')
      .then((res) => res.json())
      .then((json: { ok?: boolean; publicKey?: string; zarizeni?: { nazev: string; endpoint: string }[] }) => {
        if (!zive || !json?.ok) return;
        setKlic(json.publicKey || '');
        setZarizeni(json.zarizeni || []);
      })
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
    const json = (await res.json().catch(() => null)) as { ok?: boolean; zarizeni?: { nazev: string; endpoint: string }[] } | null;
    if (!res.ok || !json?.ok) {
      setHlaska('Upozornění se nepodařilo zapnout.');
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

  return (
    <div className="ph-push">
      <button type="button" className="ph-ulozit" onClick={() => void zapnout()}>
        Zapnout upozornění
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
