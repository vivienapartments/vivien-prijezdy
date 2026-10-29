'use client';

import { useEffect, useState } from 'react';
import { denPraha } from '@/lib/brana';
import { CHECKOUT } from '@/lib/constants';
import { t } from '@/lib/i18n';
import {
  casyPozde,
  optionPozde,
  posunDen,
  skupinaOdjezd,
  skupinaPozde,
  textStavu,
  vety,
} from '@/lib/okno-pobytu';
import {
  jeCasOdjezduPovoleny,
  jeHodina,
  slotsOdjezdu,
  TEXT_ODJEZDU,
  ukazatRamecekOdjezdu,
  zobrazCas,
} from '@/lib/odjezd';
import type { ZadostOkna } from '@/lib/store';
import * as TX from '@/lib/texts';
import type { GuideLang } from '@/lib/types';
import * as VT from '@/lib/vstup-texty';

type Props = {
  lang: GuideLang;
  den: string | null;
  cas: string | null;
  rucni: boolean;
  token: string | null;
  cteni: boolean;
  ubytovan?: boolean;
  nejpozdeji?: string;
  zadostOdjezd?: ZadostOkna | null;
};

const VLASTNI = '__vlastni__';

function klicVidel(token: string | null, den: string | null): string {
  return `pv-odjezd-videl:${token || den || 'x'}`;
}

function uzVidel(klic: string): boolean {
  try {
    return localStorage.getItem(klic) === '1';
  } catch {
    return false;
  }
}

function oznacVidel(klic: string) {
  try {
    localStorage.setItem(klic, '1');
  } catch {
    /* private mode */
  }
}

export function OdjezdRamecek({
  lang,
  den,
  cas,
  rucni,
  token,
  cteni,
  ubytovan = false,
  nejpozdeji = '14:00',
  zadostOdjezd = null,
}: Props) {
  const bezne = slotsOdjezdu();
  const pozde = casyPozde(nejpozdeji);
  const vSeznamu = (c: string) => bezne.includes(c) || pozde.includes(c);
  const klic = klicVidel(token, den);
  const [ulozeny, setUlozeny] = useState(jeHodina(cas) ? cas : '');
  const [otevreno, setOtevreno] = useState(() => !jeHodina(cas) && !uzVidel(klic));
  const [vyber, setVyber] = useState(() => {
    if (jeHodina(cas) && vSeznamu(cas)) return cas;
    if (jeHodina(cas)) return VLASTNI;
    return CHECKOUT;
  });
  const [vlastni, setVlastni] = useState(() => (jeHodina(cas) && !vSeznamu(cas) ? cas : ''));
  const [cekam, setCekam] = useState(false);
  const [chyba, setChyba] = useState('');

  useEffect(() => {
    oznacVidel(klic);
  }, [klic]);

  if (!ukazatRamecekOdjezdu(den, new Date(), ubytovan)) return null;

  const text = TEXT_ODJEZDU[lang] || TEXT_ODJEZDU.en;
  const tt = (x: Parameters<typeof t>[0]) => t(x, lang);
  const tOkno = vety(lang);
  const dnes = denPraha(new Date());
  const nadpis =
    den === dnes ? text.nadpisDnes : den === posunDen(dnes, 1) ? text.nadpisZitra : text.nadpisJindy;
  const zamceno = rucni && Boolean(ulozeny);
  const stav = textStavu(lang, 'odjezd', zadostOdjezd);
  const casNaRadku = zadostOdjezd?.cas || ulozeny || CHECKOUT;
  const jeVlastni = vyber === VLASTNI;

  async function ulozit() {
    const casUlozit = jeVlastni ? vlastni.trim() : vyber;
    if (!jeCasOdjezduPovoleny(casUlozit)) {
      setChyba(tt(VT.odjezdVlastniChyba));
      return;
    }
    if (cteni || !token) {
      setUlozeny(casUlozit);
      setOtevreno(false);
      return;
    }
    setCekam(true);
    setChyba('');
    const res = await fetch('/api/pruvodce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, akce: 'odjezd', cas: casUlozit }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; cas?: string } | null;
    setCekam(false);
    if (!res.ok || !json?.ok) {
      setChyba(jeVlastni ? tt(VT.odjezdVlastniChyba) : text.poznamka);
      return;
    }
    const hotovo = jeHodina(json.cas) ? json.cas : casUlozit;
    setUlozeny(hotovo);
    if (vSeznamu(hotovo)) {
      setVyber(hotovo);
      setVlastni('');
    } else {
      setVyber(VLASTNI);
      setVlastni(hotovo);
    }
    setOtevreno(false);
  }

  async function zrusitZadost() {
    if (cteni || !token) return;
    setCekam(true);
    try {
      const res = await fetch('/api/pruvodce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, akce: 'okno', zrusit: 'odjezd' }),
      });
      if (!res.ok) return;
      window.location.reload();
    } finally {
      setCekam(false);
    }
  }

  return (
    <details
      className="pv-sbal pv-odjezd"
      lang={lang}
      open={otevreno}
      onToggle={(e) => {
        if (zamceno) {
          (e.target as HTMLDetailsElement).open = false;
          return;
        }
        setOtevreno((e.target as HTMLDetailsElement).open);
      }}
    >
      <summary>
        <span className="pv-sbal__text">
          <span className="pv-sbal__nadpis">
            {stav?.kratce
              ? stav.kratce
              : `${text.radek} ${zobrazCas(casNaRadku)}${zamceno ? '' : ` · ${text.zmenit}`}`}
          </span>
          {stav?.veta && !otevreno ? <span className="pv-sbal__veta">{stav.veta}</span> : null}
        </span>
        {zamceno ? null : (
          <span className="pv-sbal__btn" aria-hidden="true">
            <span className="pv-sbal__btn-open">
              {tt(TX.ui.expandSection)} ▾
            </span>
            <span className="pv-sbal__btn-close">
              {tt(TX.ui.collapseSection)} ▴
            </span>
          </span>
        )}
      </summary>
      <h2 className="pv-odjezd__nadpis-sbal">{nadpis}</h2>
      {stav?.veta ? <p>{stav.veta}</p> : null}
      {zadostOdjezd?.stav === 'ceka' ? (
        <button type="button" disabled={cekam} onClick={() => void zrusitZadost()}>
          {tOkno.zrusit}
        </button>
      ) : (
        <>
          <label>
            <select
              value={vyber}
              onChange={(e) => {
                setVyber(e.target.value);
                setChyba('');
              }}
              disabled={cteni || zamceno}
            >
              <optgroup label={skupinaOdjezd(lang)}>
                {bezne.map((slot) => (
                  <option key={slot} value={slot}>
                    {zobrazCas(slot)}
                  </option>
                ))}
              </optgroup>
              {pozde.length ? (
                <optgroup label={skupinaPozde(lang)}>
                  {pozde.map((slot) => (
                    <option key={slot} value={slot}>
                      {optionPozde(slot)}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <option value={VLASTNI}>{tt(VT.odjezdJinyCas)}</option>
            </select>
          </label>
          {jeVlastni ? (
            <label className="pv-odjezd__vlastni">
              {tt(VT.odjezdVlastniPopisek)}
              <input
                type="time"
                min="06:00"
                max="14:00"
                step={60}
                value={vlastni}
                onChange={(e) => {
                  setVlastni(e.target.value);
                  setChyba('');
                }}
                disabled={cteni || zamceno}
              />
            </label>
          ) : null}
          <p className="pv-odjezd__poznamka">{text.poznamka}</p>
          <button type="button" disabled={cekam || zamceno} onClick={() => void ulozit()}>
            {text.ulozit}
          </button>
        </>
      )}
      {chyba ? <p className="pv-odjezd__poznamka">{chyba}</p> : null}
    </details>
  );
}
