'use client';

import { useMemo, useState } from 'react';
import apartmanyJson from '@/data/apartmany.json';
import type { PrehledRadek } from '@/lib/prehled';
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
  { id: 'bez_checkinu', text: 'Bez check-inu' },
  { id: 'zruseno', text: 'Zrušeno' },
];

type Props = {
  rows: PrehledRadek[];
  souhrn: { prijezdy: number; neodeslano: number };
  chybiWifi: string[];
};

export function PrehledClient({ rows, souhrn, chybiWifi }: Props) {
  const [stav, setStav] = useState<'' | Stav>('');
  const [hledat, setHledat] = useState('');
  const [otevreno, setOtevreno] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState('');
  const [cekam, setCekam] = useState<string | null>(null);

  const viditelne = useMemo(() => {
    const q = hledat.trim().toLowerCase();
    return rows.filter((row) => {
      if (stav && row.stav !== stav) return false;
      if (!q) return true;
      return (
        row.rezervace.toLowerCase().includes(q) ||
        row.jmeno.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q)
      );
    });
  }, [rows, stav, hledat]);

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

  return (
    <main className="ph">
      <header className="ph-top">
        <h1>Přehled rezervací</h1>
        <p className="ph-souhrn">
          Dnes přijíždí: {souhrn.prijezdy}, z toho neodesláno: {souhrn.neodeslano}
        </p>
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
        <span>Rezervace</span>
        <span>Apartmán</span>
        <span>Termín</span>
        <span>Host</span>
        <span>Co se stalo</span>
        <span>Poslední pokus</span>
      </div>

      {viditelne.length === 0 ? <p className="ph-prazdno">Nic tu není.</p> : null}

      {viditelne.map((row) => (
        <article key={row.rezervace} id={row.rezervace} className="ph-row">
          <div className="ph-cell" data-label="Stav">
            <span className={`ph-stav ph-stav--${row.stav}`}>{row.stavText}</span>
          </div>
          <div className="ph-cell" data-label="Rezervace">
            #{row.rezervace}
          </div>
          <div className="ph-cell" data-label="Apartmán">
            {row.apartmanNazev}
          </div>
          <div className="ph-cell" data-label="Termín">
            {row.termin}
          </div>
          <div className="ph-cell" data-label="Host">
            <div>{row.jmeno}</div>
            <div className="ph-mail">{row.email}</div>
          </div>
          <div className="ph-cell" data-label="Co se stalo">
            {row.coSeStalo}
          </div>
          <div className="ph-cell" data-label="Poslední pokus">
            {row.posledniPokusText}
          </div>
          <div className="ph-akce">
            <button type="button" disabled={cekam !== null} onClick={() => volat(row, 'znovu')}>
              Odeslat znovu
            </button>
            <button type="button" onClick={() => setOtevreno(otevreno === row.rezervace ? null : row.rezervace)}>
              Opravit a odeslat
            </button>
            <button type="button" disabled={cekam !== null} onClick={() => volat(row, 'odkaz')}>
              Zkopírovat odkaz
            </button>
          </div>
          {otevreno === row.rezervace ? (
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
                  {h.co}
                </li>
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
        <input name="email" type="email" defaultValue={row.email === '—' ? '' : row.email} required />
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
