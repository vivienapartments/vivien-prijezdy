'use client';

import { useMemo, useState } from 'react';
import apartmanyJson from '@/data/apartmany.json';
import {
  dotazPredOdeslanimZnovu,
  nabidnoutOdeslani,
  souhrnDne,
  STARY_ZAZNAM,
  type PrehledRadek,
} from '@/lib/prehled';
import { odkazWhatsApp } from '@/lib/whatsapp-zprava';
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
};

function Pole({ text }: { text: string }) {
  if (!text) return null;
  if (text === STARY_ZAZNAM) return <span className="ph-stary">{text}</span>;
  return <>{text}</>;
}

export function PrehledClient({ rows, dnes, zitra, chybiWifi }: Props) {
  const [stav, setStav] = useState<'' | Stav>('');
  const [hledat, setHledat] = useState('');
  const [den, setDen] = useState<'' | 'dnes' | 'zitra'>('');
  const [jenNeotevreni, setJenNeotevreni] = useState(false);
  const [jenBezCheckinu, setJenBezCheckinu] = useState(false);
  const [otevreno, setOtevreno] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState('');
  const [cekam, setCekam] = useState<string | null>(null);
  const [casy, setCasy] = useState<Record<string, string>>({});
  const [ulozene, setUlozene] = useState<Record<string, string>>({});

  function casRadku(row: PrehledRadek): string {
    return casy[row.rezervace] ?? row.casPrijezdu ?? '';
  }

  const dnesSouhrn = useMemo(
    () => souhrnDne(rows, dnes, casy),
    [rows, dnes, casy],
  );
  const zitraSouhrn = useMemo(
    () => souhrnDne(rows, zitra, casy),
    [rows, zitra, casy],
  );

  const viditelne = useMemo(() => {
    const q = hledat.trim().toLowerCase();
    const denYmd = den === 'dnes' ? dnes : den === 'zitra' ? zitra : '';
    return rows.filter((row) => {
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
  }, [rows, stav, hledat, den, dnes, zitra, jenNeotevreni, jenBezCheckinu]);

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
    const cas = hodnota.trim();
    const puvodni = ulozene[row.rezervace] ?? row.casPrijezdu ?? '';
    if (cas === puvodni) return;
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
    setCasy((prev) => ({ ...prev, [row.rezervace]: cas }));
    setUlozene((prev) => ({ ...prev, [row.rezervace]: cas }));
  }

  async function kopirovatZpravu(row: PrehledRadek) {
    try {
      await navigator.clipboard.writeText(row.zprava);
      setHlaska(`Zpráva pro #${row.rezervace} je ve schránce.`);
    } catch {
      setHlaska(row.zprava);
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
        onClick={() => setDen((prev) => (prev === ktery ? '' : ktery))}
      >
        <span>
          {nadpis}: {souhrn.pocet} · průvodce otevřelo {souhrn.otevrelo} · neodesláno {souhrn.neodeslano} · bez
          check-inu: {souhrn.bezCheckinu}
        </span>
        {plan ? <span className="ph-plan">{plan}</span> : null}
      </button>
    );
  }

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

      {viditelne.length === 0 ? <p className="ph-prazdno">Nic tu není.</p> : null}

      {viditelne.map((row) => (
        <article key={row.rezervace} id={row.rezervace} className="ph-row">
          <div className="ph-karta-hlavicka">
            <div className="ph-jmeno">
              <Pole text={row.jmeno} />
            </div>
            <div>
              <Pole text={row.apartmanNazev} />
            </div>
            <div>
              <Pole text={row.termin} />
            </div>
          </div>
          <div className="ph-cell ph-cell--stav" data-label="Stav">
            <span className={`ph-stav ph-stav--${row.stav}`}>{row.stavText}</span>
            {row.stav !== 'bez_checkinu' ? (
              <div className={`ph-otev ph-otev--${row.otevreniTon}`} title={row.otevreniTitle || undefined}>
                {row.otevreniText}
              </div>
            ) : null}
          </div>
          <div className="ph-cell ph-cell--host" data-label="Host">
            <div className="ph-jmeno">
              <Pole text={row.jmeno} />
            </div>
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
            {row.telefonText ? <div className="ph-tel">{row.telefonText}</div> : null}
            {row.telefonWa ? (
              <div className="ph-wa-rada">
                <a
                  className="ph-wa"
                  href={odkazWhatsApp(row.telefonWa, row.zprava)}
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
            {row.jinyTelefonText ? (
              <div className="ph-tel-jiny">
                jiné číslo z rezervace: <span className="ph-tel">{row.jinyTelefonText}</span>
                {row.jinyTelefonWa ? (
                  <a
                    className="ph-wa ph-wa--maly"
                    href={odkazWhatsApp(row.jinyTelefonWa, row.zprava)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp
                  </a>
                ) : null}
              </div>
            ) : null}
            <label className="ph-cas">
              Čas příjezdu
              <input
                value={casRadku(row)}
                placeholder="16:30"
                inputMode="numeric"
                onChange={(e) => setCasy((prev) => ({ ...prev, [row.rezervace]: e.target.value }))}
                onBlur={(e) => ulozCas(row, e.target.value)}
              />
            </label>
          </div>
          <div className="ph-cell ph-cell--apt" data-label="Apartmán">
            <Pole text={row.apartmanNazev} />
          </div>
          <div className="ph-cell ph-cell--pobyt" data-label="Příjezd">
            <div className="ph-termin">
              <Pole text={row.termin} />
            </div>
            {row.pobytText ? <div className="ph-pobyt">{row.pobytText}</div> : null}
            <div className="ph-poplatek">{row.poplatekText}</div>
          </div>
          <div className="ph-cell" data-label="Vytvořeno">
            <div>
              <Pole text={row.vytvorenoText} />
            </div>
            <div>#{row.rezervace}</div>
          </div>
          <div className="ph-cell" data-label="Co se stalo">
            <Pole text={row.coSeStalo} />
          </div>
          <div className="ph-cell" data-label="Poslední pokus">
            <Pole text={row.posledniPokusText} />
          </div>
          <div className="ph-akce">
            {nabidnoutOdeslani(row.stav) ? (
              <>
                <button
                  type="button"
                  disabled={cekam !== null}
                  onClick={() => {
                    const dotaz = dotazPredOdeslanimZnovu(row.stav);
                    if (dotaz && !window.confirm(dotaz)) return;
                    volat(row, 'znovu');
                  }}
                >
                  Odeslat znovu
                </button>
                <button type="button" onClick={() => setOtevreno(otevreno === row.rezervace ? null : row.rezervace)}>
                  Opravit a odeslat
                </button>
              </>
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
                <li key={`${h.cas}-${i}`}>{h.co}</li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
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
