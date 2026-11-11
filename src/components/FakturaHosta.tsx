'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  jePlatneIco,
  normalizujIco,
  shrnutiFaktury,
  type AresVysledek,
  type FakturaTyp,
  type FakturaUdaje,
  type FakturaVstup,
} from '@/lib/faktura';
import * as FT from '@/lib/faktura-texty';
import type { GuideLang } from '@/lib/types';

type Texty = Record<GuideLang, string>;

function textFaktura(tab: Texty, lang: GuideLang): string {
  return tab[lang] || tab.en;
}

type StavAres = 'zadny' | 'hleda' | 'ok' | 'ne';

export type VysledekUlozeni = { duvod: string; text?: string } | null;

type FormularProps = {
  lang: GuideLang;
  initial: FakturaUdaje | null;
  /** E-mail z rezervace, když host ještě žádný neuložil. */
  email?: string;
  /** Náhled. Nic se nehledá ani neukládá. */
  cteni?: boolean;
  ares: (ico: string) => Promise<AresVysledek | null>;
  onUlozit: (vstup: FakturaVstup) => Promise<VysledekUlozeni>;
  onZrusit?: () => void;
};

/** Formulář na fakturu. Používá ho host v průvodci i majitel v přehledu. */
export function FakturaFormular({ lang, initial, email = '', cteni = false, ares, onUlozit, onZrusit }: FormularProps) {
  const tt = (tab: Texty) => textFaktura(tab, lang);
  const [typ, setTyp] = useState<FakturaTyp>(initial?.typ ?? (lang === 'cs' ? 'cz' : 'zahranici'));
  const [ico, setIco] = useState(initial?.ico ?? '');
  const [nazev, setNazev] = useState(initial?.nazev ?? '');
  const [adresa, setAdresa] = useState(initial?.adresa ?? '');
  const [zeme, setZeme] = useState(initial?.zeme ?? '');
  const [dic, setDic] = useState(initial?.dic ?? '');
  const [mail, setMail] = useState(initial?.email ?? email);
  const [poznamka, setPoznamka] = useState(initial?.poznamka ?? '');
  const [stavAres, setStavAres] = useState<StavAres>('zadny');
  const [odesilam, setOdesilam] = useState(false);
  const [hlaska, setHlaska] = useState('');

  useEffect(() => {
    if (!initial?.email && email) setMail((prev) => prev || email);
  }, [email, initial?.email]);

  const icoCisla = normalizujIco(ico);

  useEffect(() => {
    if (cteni || typ !== 'cz' || !jePlatneIco(icoCisla)) {
      setStavAres('zadny');
      return;
    }
    let zruseno = false;
    setStavAres('hleda');
    void ares(icoCisla).then((v) => {
      if (zruseno) return;
      if (v?.ok) {
        setNazev(v.nazev || '');
        setAdresa(v.adresa || '');
        setDic(v.dic || '');
        setStavAres('ok');
      } else {
        setStavAres('ne');
      }
    });
    return () => {
      zruseno = true;
    };
    // ares je stabilní funkce rodiče
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icoCisla, typ, cteni]);

  async function odesli() {
    if (cteni || odesilam) return;
    setHlaska('');
    if (typ === 'cz') {
      if (!jePlatneIco(icoCisla)) {
        setHlaska(tt(FT.FAKTURA_CHYBI_ICO));
        return;
      }
      if (stavAres === 'hleda') return;
      if (stavAres !== 'ok' && (!nazev.trim() || !adresa.trim())) {
        setHlaska(tt(FT.FAKTURA_CHYBI_UDAJE));
        return;
      }
    } else if (!nazev.trim() || !adresa.trim() || !zeme.trim()) {
      setHlaska(tt(FT.FAKTURA_CHYBI_UDAJE));
      return;
    }
    setOdesilam(true);
    try {
      const chyba = await onUlozit({
        typ,
        ico: typ === 'cz' ? icoCisla : '',
        nazev,
        adresa,
        zeme: typ === 'zahranici' ? zeme : '',
        dic,
        email: mail,
        poznamka,
      });
      if (chyba) {
        setHlaska(
          chyba.text ||
            (chyba.duvod === 'chybi_ico'
              ? tt(FT.FAKTURA_CHYBI_ICO)
              : chyba.duvod === 'chybi_udaje'
                ? tt(FT.FAKTURA_CHYBI_UDAJE)
                : tt(FT.FAKTURA_CHYBA)),
        );
      }
    } finally {
      setOdesilam(false);
    }
  }

  const rucne = typ === 'zahranici' || stavAres === 'ne';

  return (
    <div className="pv-prani__form pv-faktura__form">
      <fieldset className="pv-faktura__typ" disabled={cteni}>
        <label>
          <input type="radio" name="faktura-typ" checked={typ === 'cz'} onChange={() => setTyp('cz')} />
          {tt(FT.FAKTURA_TYP_CZ)}
        </label>
        <label>
          <input
            type="radio"
            name="faktura-typ"
            checked={typ === 'zahranici'}
            onChange={() => setTyp('zahranici')}
          />
          {tt(FT.FAKTURA_TYP_ZAHRANICI)}
        </label>
      </fieldset>

      {typ === 'cz' ? (
        <>
          <label>
            {tt(FT.FAKTURA_ICO)}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              value={ico}
              disabled={cteni}
              onChange={(e) => setIco(e.target.value)}
            />
          </label>
          {stavAres === 'ok' ? (
            <p className="pv-faktura__ares">
              {tt(FT.FAKTURA_ARES_NALEZENO)} {nazev}
              {adresa ? `, ${adresa}` : ''}
            </p>
          ) : stavAres === 'ne' ? (
            <p className="pv-prani__chyba">{tt(FT.FAKTURA_ARES_NENALEZENO)}</p>
          ) : (
            <p className="pv-prani__muted">{tt(FT.FAKTURA_ICO_NAPOVEDA)}</p>
          )}
        </>
      ) : null}

      {rucne ? (
        <>
          <label>
            {tt(FT.FAKTURA_NAZEV)}
            <input
              type="text"
              maxLength={200}
              value={nazev}
              disabled={cteni}
              onChange={(e) => setNazev(e.target.value)}
            />
          </label>
          <label>
            {tt(FT.FAKTURA_ADRESA)}
            <input
              type="text"
              maxLength={200}
              value={adresa}
              disabled={cteni}
              onChange={(e) => setAdresa(e.target.value)}
            />
          </label>
        </>
      ) : null}

      {typ === 'zahranici' ? (
        <>
          <label>
            {tt(FT.FAKTURA_ZEME)}
            <input
              type="text"
              maxLength={200}
              value={zeme}
              disabled={cteni}
              onChange={(e) => setZeme(e.target.value)}
            />
          </label>
          <label>
            {tt(FT.FAKTURA_DIC)}
            <input
              type="text"
              maxLength={200}
              value={dic}
              disabled={cteni}
              onChange={(e) => setDic(e.target.value)}
            />
          </label>
        </>
      ) : null}

      <label>
        {tt(FT.FAKTURA_EMAIL)}
        <input
          type="email"
          autoComplete="email"
          maxLength={200}
          value={mail}
          disabled={cteni}
          onChange={(e) => setMail(e.target.value)}
        />
      </label>
      <label>
        {tt(FT.FAKTURA_POZNAMKA)}
        <textarea
          rows={3}
          maxLength={500}
          value={poznamka}
          disabled={cteni}
          onChange={(e) => setPoznamka(e.target.value)}
        />
      </label>

      {hlaska ? <p className="pv-prani__chyba">{hlaska}</p> : null}
      <div className="pv-faktura__akce">
        <button type="button" disabled={cteni || odesilam || stavAres === 'hleda'} onClick={() => void odesli()}>
          {tt(FT.FAKTURA_ODESLAT)}
        </button>
        {onZrusit && !cteni ? (
          <button type="button" onClick={onZrusit}>
            Zrušit
          </button>
        ) : null}
      </div>
    </div>
  );
}

type Props = {
  token: string | null;
  lang: GuideLang;
  /** Náhled majitele. Nic se neodesílá. */
  cteni?: boolean;
  /** Údaje uložené na serveru při načtení stránky. */
  initial?: FakturaUdaje | null;
};

/** Obsah dlaždice „Faktura na firmu“ v ose průvodce. */
export function FakturaHosta({ token, lang, cteni = false, initial = null }: Props) {
  const tt = (tab: Texty) => textFaktura(tab, lang);
  const jenCteni = cteni || !token;
  const [faktura, setFaktura] = useState<FakturaUdaje | null>(initial);
  const [email, setEmail] = useState('');
  const [uprava, setUprava] = useState(false);

  useEffect(() => {
    setFaktura(initial);
  }, [initial]);

  useEffect(() => {
    if (!token || cteni) return;
    let zruseno = false;
    void fetch('/api/pruvodce/faktura', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, akce: 'nacti' }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ok?: boolean; faktura?: FakturaUdaje | null; email?: string } | null) => {
        if (zruseno || !data?.ok) return;
        setFaktura(data.faktura ?? null);
        setEmail(data.email || '');
      })
      .catch(() => undefined);
    return () => {
      zruseno = true;
    };
  }, [token, cteni]);

  const ares = useCallback(
    async (ico: string): Promise<AresVysledek | null> => {
      if (!token) return null;
      try {
        const res = await fetch('/api/pruvodce/faktura', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, akce: 'ares', ico }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; ares?: AresVysledek } | null;
        return res.ok && data?.ok ? (data.ares ?? null) : null;
      } catch {
        return null;
      }
    },
    [token],
  );

  async function ulozit(vstup: FakturaVstup): Promise<VysledekUlozeni> {
    if (!token || cteni) return { duvod: 'chyba' };
    try {
      const res = await fetch('/api/pruvodce/faktura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, akce: 'ulozit', ...vstup }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; duvod?: string; faktura?: FakturaUdaje }
        | null;
      if (!res.ok || !data?.ok || !data.faktura) return { duvod: data?.duvod || 'chyba' };
      setFaktura(data.faktura);
      setUprava(false);
      return null;
    } catch {
      return { duvod: 'chyba' };
    }
  }

  const shrnuti = faktura ? (
    <div className="pv-faktura__shrnuti">
      <p>
        <strong>{shrnutiFaktury(faktura)}</strong>
      </p>
      {faktura.adresa ? <p>{faktura.adresa}</p> : null}
      {faktura.zeme ? <p>{faktura.zeme}</p> : null}
      {faktura.email ? <p>{faktura.email}</p> : null}
    </div>
  ) : null;

  return (
    <div className={`pv-prani pv-prani--v-ose pv-faktura${jenCteni ? ' pv-prani--cteni' : ''}`} lang={lang}>
      {faktura?.hotovo ? (
        <>
          <p className="pv-prani__uvod">{tt(FT.FAKTURA_VYRIZENO)}</p>
          {shrnuti}
        </>
      ) : faktura && !uprava ? (
        <>
          <p className="pv-prani__uvod">{tt(FT.FAKTURA_ULOZENO)}</p>
          {shrnuti}
          {!jenCteni ? (
            <div className="pv-prani__akce">
              <button type="button" onClick={() => setUprava(true)}>
                {tt(FT.FAKTURA_UPRAVIT)}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="pv-prani__uvod">{tt(FT.FAKTURA_VETA_SBALENA)}</p>
          <FakturaFormular
            lang={lang}
            initial={faktura}
            email={email}
            cteni={jenCteni}
            ares={ares}
            onUlozit={ulozit}
            onZrusit={faktura ? () => setUprava(false) : undefined}
          />
        </>
      )}
    </div>
  );
}
