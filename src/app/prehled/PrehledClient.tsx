'use client';

import { useMemo, useState, type FormEvent } from 'react';
import apartmanyJson from '@/data/apartmany.json';
import {
  casPraha,
  hodinaPraha,
  nabidnoutOdeslani,
  poplatekKratky,
  souhrnDne,
  STARY_ZAZNAM,
  terminKratky,
  vetaChyby,
  type PrehledRadek,
} from '@/lib/prehled';
import { normalizujCasPrijezdu } from '@/lib/cas-prijezdu';
import { normalizujTelefon, textTelefonu } from '@/lib/telefon';
import { langFromNarodnost } from '@/lib/vivien-data';
import { odkazWhatsAppPrehled } from '@/lib/whatsapp-zprava';
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
  const [ulozene, setUlozene] = useState<Record<string, string>>({});
  const [volba, setVolba] = useState<Record<string, string>>({});
  const [odkazy, setOdkazy] = useState<Record<string, string>>({});
  const [ulozeneOdkazy, setUlozeneOdkazy] = useState<Record<string, string>>({});
  const [pridat, setPridat] = useState(false);
  const [predani, setPredani] = useState<Record<string, string | null>>({});
  const [dotazPredani, setDotazPredani] = useState<{ id: string; druh: 'predano' | 'vratit' } | null>(null);
  const [jazyky, setJazyky] = useState<Record<string, GuideLang>>({});
  const [dotazZnovu, setDotazZnovu] = useState<string | null>(null);

  function jazykRadku(row: PrehledRadek): GuideLang {
    return jazyky[row.rezervace] || (row.narodnost?.trim() ? langFromNarodnost(row.narodnost) : row.jazyk || 'cs');
  }

  function casRadku(row: PrehledRadek): string {
    return casy[row.rezervace] ?? row.casPrijezdu ?? '';
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
      <label className="ph-tel-pole">
        Telefon
        <input
          value={telefonRadku(row)}
          inputMode="tel"
          autoComplete="off"
          onChange={(e) => setTelefony((prev) => ({ ...prev, [row.rezervace]: e.target.value }))}
          onBlur={(e) => ulozTelefon(row, row.telefonKtery || 'rezervace', e.target.value)}
        />
      </label>
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

  async function volat(row: PrehledRadek, akce: 'znovu' | 'odkaz' | 'opravit', extra?: Record<string, string>) {
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

  async function ulozCas(row: PrehledRadek, hodnota: string) {
    const vysledek = normalizujCasPrijezdu(hodnota);
    if (!vysledek.ok) {
      setHlaska('Čas napište jako 1630.');
      return;
    }
    const cas = vysledek.cas ?? '';
    const puvodni = ulozene[row.rezervace] ?? row.casPrijezdu ?? '';
    setCasy((prev) => ({ ...prev, [row.rezervace]: cas }));
    if (cas === puvodni) {
      setHlaska('');
      return;
    }
    if (ukazka) {
      setUlozene((prev) => ({ ...prev, [row.rezervace]: cas }));
      setHlaska('');
      return;
    }
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'cas', cas }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Čas se neuložil.');
      return;
    }
    setUlozene((prev) => ({ ...prev, [row.rezervace]: cas }));
  }

  function zpravaRadku(row: PrehledRadek): string {
    const id = volba[row.rezervace] ?? row.zpravy.find((z) => z.vychozi)?.id;
    return row.zpravy.find((z) => z.id === id)?.text || row.zprava;
  }

  async function ulozOdkaz(row: PrehledRadek, hodnota: string) {
    const url = hodnota.trim();
    const puvodni = ulozeneOdkazy[row.rezervace] ?? row.checkinUrl ?? '';
    if (url === puvodni) return;
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'checkin', url }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Odkaz se neuložil.');
      return;
    }
    setUlozeneOdkazy((prev) => ({ ...prev, [row.rezervace]: url }));
    window.location.reload();
  }

  async function ulozTelefon(row: PrehledRadek, ktery: 'checkin' | 'rezervace', hodnota: string) {
    const cislo = hodnota.trim();
    if (!cislo) return;
    const ukazane = (ktery === row.jinyTelefonKtery ? row.jinyTelefonText : row.telefonText) || '';
    if (cislo === ukazane.trim()) return;
    const tel = normalizujTelefon(cislo, row.narodnost);
    if (!tel) {
      setHlaska('Napište číslo.');
      return;
    }
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
      setHlaska('');
      return;
    }
    setHlaska('');
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace: row.rezervace, akce: 'telefon', ktery, cislo }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !json?.ok) {
      setHlaska(json?.error || 'Číslo se neuložilo.');
      return;
    }
    window.location.reload();
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
    const kde = [row.apartman, termin].filter(Boolean).join(' · ');
    const pruvodce = textPruvodce(row);
    const chyba = vetaChyby(row);
    const wa = row.telefonWa || row.jinyTelefonWa;
    return (
      <article key={row.rezervace} id={row.rezervace} className={rozbaleno ? 'ph-row is-open' : 'ph-row is-shut'}>
        <div className="ph-shrnuti">
          <div className="ph-hlavicka-hosta">
            <div className="ph-jmeno">{kdo}</div>
            {predanoRadku(row) ? (
              <span className="ph-predano-hotovo">{textPredani(predanoRadku(row) || '')}</span>
            ) : null}
          </div>
          {kde ? <div className="ph-kde">{kde}</div> : null}
          {row.stav === 'bez_checkinu' ? <div className="ph-neni-checkin">Není check-in</div> : null}
          {row.stitek === 'rucne' ? <div className="ph-stitek">přidáno ručně</div> : null}
          {row.stitek === 'info' ? <div className="ph-stitek">přeposláno z info@</div> : null}
          {pruvodce ? <div className={`ph-pruvodce ph-pruvodce--${pruvodce.ton}`}>{pruvodce.text}</div> : null}
          {chyba ? <div className="ph-chyba-kratka">{chyba}</div> : null}
          {telefonPole(row)}
          <label className="ph-cas ph-cas-prijezd">
            Čas příjezdu
            <input
              value={casRadku(row)}
              inputMode="numeric"
              onChange={(e) => setCasy((prev) => ({ ...prev, [row.rezervace]: e.target.value }))}
              onBlur={(e) => ulozCas(row, e.target.value)}
            />
          </label>
          <div className="ph-poplatek-kratky">{poplatekKratky(row.poplatek, row.noci, row.osob)}</div>
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
          {wa ? (
            <div className="ph-wa-rada">
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
            </div>
          ) : null}
          <div className="ph-akce-spodek">
            <button
              type="button"
              className="ph-rozbal"
              aria-expanded={rozbaleno}
              onClick={() => setRozbalene((prev) => ({ ...prev, [row.rezervace]: !prev[row.rezervace] }))}
            >
              {rozbaleno ? 'Skrýt detail ▴' : 'Detail ▾'}
            </button>
            <UlozitKontakt row={row} />
            {predanoRadku(row) ? (
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
                className="ph-predano"
                disabled={cekam !== null}
                onClick={() => setDotazPredani({ id: row.rezervace, druh: 'predano' })}
              >
                Předáno
              </button>
            )}
            {dotazPredani?.id === row.rezervace ? (
              <div className="ph-predano-dotaz">
                <p>
                  {dotazPredani.druh === 'predano'
                    ? 'Opravdu předáno? Hostovi se v průvodci zobrazí vstupní kódy.'
                    : 'Opravdu vrátit předání? Host v průvodci kódy neuvidí.'}
                </p>
                <button type="button" disabled={cekam !== null} onClick={() => ulozPredani(row, dotazPredani.druh === 'predano')}>
                  {dotazPredani.druh === 'predano' ? 'Ano, předáno' : 'Ano, vrátit'}
                </button>
                <button type="button" onClick={() => setDotazPredani(null)}>
                  Zrušit
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="ph-detail">
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
              <label className="ph-cas ph-checkin">
                Odkaz na check-in
                <input
                  value={odkazy[row.rezervace] ?? row.checkinUrl ?? ''}
                  placeholder="https://"
                  onChange={(e) => setOdkazy((prev) => ({ ...prev, [row.rezervace]: e.target.value }))}
                  onBlur={(e) => ulozOdkaz(row, e.target.value)}
                />
              </label>
            ) : null}
          </div>
          <div className="ph-cell" data-label="Apartmán">
            <Pole text={row.apartmanNazev} />
            {row.pobytText ? <div className="ph-pobyt">{row.pobytText}</div> : null}
            <div className="ph-poplatek">{row.poplatekText}</div>
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

    </main>
  );
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
