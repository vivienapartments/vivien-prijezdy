'use client';

import { useEffect, useState } from 'react';
import { denPraha } from '@/lib/brana';
import { CHECKOUT, OKNO_KC } from '@/lib/constants';
import { t } from '@/lib/i18n';
import {
  casyPozde,
  jeCasPozde,
  optionPozde,
  posunDen,
  skupinaOdjezd,
  skupinaPozde,
  textStavu,
  vety,
} from '@/lib/okno-pobytu';
import {
  ODJEZD_CEKA_NADPIS,
  ODJEZD_KANAL_OTAZKA,
  ODJEZD_KANAL_STITKY,
  ODJEZD_SOUHLAS_NADPIS,
  jeOdjezdKanal,
  type OdjezdKanal,
  rozpisPozde,
  textCekaOdjezdu,
  textSouhlasuOdjezdu,
} from '@/lib/odjezd-souhlas';
import {
  jeCasOdjezduPovoleny,
  jeHodina,
  slotsOdjezdu,
  TEXT_ODJEZDU,
  ukazatRamecekOdjezdu,
  zobrazCas,
} from '@/lib/odjezd';
import type { ZadostOkna } from '@/lib/store';
import { plochaAno, plochaNe } from '@/lib/plocha-texty';
import { PRANI_LIMIT } from '@/lib/prani-texty';
import * as TX from '@/lib/texts';
import type { GuideLang } from '@/lib/types';
import * as VT from '@/lib/vstup-texty';

type ZpravaOdjezduAck = {
  id: 'odjezd-prijati' | 'odjezd-ceka';
  nova: true;
  nadpis: string;
  text: string;
  sbalenyTitulek: string;
};

type Props = {
  lang: GuideLang;
  den: string | null;
  cas: string | null;
  rucni: boolean;
  token: string | null;
  cteni: boolean;
  ubytovan?: boolean;
  /** Průvodce odemčený (kroky hotové), i před předáním. */
  odemceno?: boolean;
  nejpozdeji?: string;
  zadostOdjezd?: ZadostOkna | null;
  onZpravaOdjezdu?: (zprava: ZpravaOdjezduAck) => void;
  /** Náhled / lokální žádost: ať se stav ukáže i nahoře u příjezdu. */
  onZadostOdjezdu?: (zadost: ZadostOkna | null) => void;
};

const VLASTNI = '__vlastni__';
const KANALY: OdjezdKanal[] = ['whatsapp', 'pruvodce', 'sms'];

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
  odemceno = false,
  nejpozdeji = '14:00',
  zadostOdjezd = null,
  onZpravaOdjezdu,
  onZadostOdjezdu,
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
  const [souhlasCas, setSouhlasCas] = useState<string | null>(null);
  const [kanal, setKanal] = useState<OdjezdKanal | null>(null);
  /** Náhled bez tokenu: simulace žádosti, ať je vidět „čeká na schválení“. */
  const [lokalniZadost, setLokalniZadost] = useState<ZadostOkna | null>(null);

  useEffect(() => {
    oznacVidel(klic);
  }, [klic]);

  if (!ukazatRamecekOdjezdu(den, new Date(), ubytovan, odemceno)) return null;

  const text = TEXT_ODJEZDU[lang] || TEXT_ODJEZDU.en;
  const tt = (x: Parameters<typeof t>[0]) => t(x, lang);
  const tOkno = vety(lang);
  const dnes = denPraha(new Date());
  const nadpis =
    den === dnes ? text.nadpisDnes : den === posunDen(dnes, 1) ? text.nadpisZitra : text.nadpisJindy;
  const zamceno = rucni && Boolean(ulozeny);
  const efektivniZadost = zadostOdjezd || lokalniZadost;
  const stavZaklad = textStavu(lang, 'odjezd', efektivniZadost);
  const stav =
    stavZaklad &&
    efektivniZadost?.stav === 'ceka' &&
    efektivniZadost.kanal &&
    jeOdjezdKanal(efektivniZadost.kanal)
      ? {
          ...stavZaklad,
          veta: textCekaOdjezdu(
            efektivniZadost.cas,
            efektivniZadost.kc,
            efektivniZadost.kanal,
            lang,
          ),
        }
      : stavZaklad;
  const casNaRadku = efektivniZadost?.cas || ulozeny || CHECKOUT;
  const jeVlastni = vyber === VLASTNI;
  const rozpis = souhlasCas ? rozpisPozde(souhlasCas) : null;

  function ohlasCeka(casUlozit: string, kanalVolba: OdjezdKanal) {
    const kc = rozpisPozde(casUlozit)?.kc || 0;
    onZpravaOdjezdu?.({
      id: 'odjezd-ceka',
      nova: true,
      nadpis: t(ODJEZD_CEKA_NADPIS, lang),
      text: textCekaOdjezdu(casUlozit, kc, kanalVolba, lang),
      sbalenyTitulek: t(ODJEZD_CEKA_NADPIS, lang),
    });
  }

  async function ulozitHotovy(casUlozit: string, kanalVolba: OdjezdKanal | null) {
    if (cteni || !token) {
      setUlozeny(casUlozit);
      if (vSeznamu(casUlozit)) {
        setVyber(casUlozit);
        setVlastni('');
      } else {
        setVyber(VLASTNI);
        setVlastni(casUlozit);
      }
      if (kanalVolba && rozpisPozde(casUlozit)) {
        const kc = rozpisPozde(casUlozit)!.kc;
        const zadost: ZadostOkna = {
          cas: casUlozit,
          kc,
          stav: 'ceka',
          kdy: new Date().toISOString(),
          od: 'pruvodce',
          hned: true,
          upozorneno: false,
          kanal: kanalVolba,
        };
        setLokalniZadost(zadost);
        onZadostOdjezdu?.(zadost);
        ohlasCeka(casUlozit, kanalVolba);
      } else {
        setLokalniZadost(null);
        onZadostOdjezdu?.(null);
      }
      setOtevreno(false);
      setSouhlasCas(null);
      setKanal(null);
      return;
    }
    setCekam(true);
    setChyba('');
    const res = await fetch('/api/pruvodce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        akce: 'odjezd',
        cas: casUlozit,
        ...(kanalVolba ? { kanal: kanalVolba } : {}),
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      duvod?: string;
      cas?: string;
      zadostCeka?: boolean;
      kanal?: OdjezdKanal;
      zpravaOdjezdu?: ZpravaOdjezduAck;
    } | null;
    setCekam(false);
    if (!res.ok || !json?.ok) {
      const hlaska =
        json?.duvod === 'limit' || res.status === 429
          ? tt(PRANI_LIMIT)
          : jeVlastni
            ? tt(VT.odjezdVlastniChyba)
            : text.poznamka;
      setChyba(hlaska);
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
    setSouhlasCas(null);
    setKanal(null);
    if (json.zadostCeka && json.kanal) {
      const kc = rozpisPozde(hotovo)?.kc || 0;
      const zadost: ZadostOkna = {
        cas: hotovo,
        kc,
        stav: 'ceka',
        kdy: new Date().toISOString(),
        od: 'pruvodce',
        hned: true,
        upozorneno: false,
        kanal: json.kanal,
      };
      setLokalniZadost(zadost);
      onZadostOdjezdu?.(zadost);
      ohlasCeka(hotovo, json.kanal);
    } else {
      setLokalniZadost(null);
      onZadostOdjezdu?.(null);
      if (json.zpravaOdjezdu) onZpravaOdjezdu?.(json.zpravaOdjezdu);
    }
  }

  async function ulozit() {
    const casUlozit = jeVlastni ? vlastni.trim() : vyber;
    if (!jeCasOdjezduPovoleny(casUlozit) && !jeCasPozde(casUlozit)) {
      setChyba(tt(VT.odjezdVlastniChyba));
      return;
    }
    if (jeCasPozde(casUlozit)) {
      if (!jeCasOdjezduPovoleny(casUlozit) && !rozpisPozde(casUlozit)) {
        setChyba(tt(VT.odjezdVlastniChyba));
        return;
      }
      setSouhlasCas(casUlozit);
      setKanal(null);
      setChyba('');
      return;
    }
    if (!jeCasOdjezduPovoleny(casUlozit)) {
      setChyba(tt(VT.odjezdVlastniChyba));
      return;
    }
    await ulozitHotovy(casUlozit, null);
  }

  async function potvrditSouhlas() {
    if (!souhlasCas || !kanal) return;
    await ulozitHotovy(souhlasCas, kanal);
  }

  async function zrusitZadost() {
    if (lokalniZadost && !token) {
      setLokalniZadost(null);
      onZadostOdjezdu?.(null);
      setUlozeny('');
      setVyber(CHECKOUT);
      setOtevreno(true);
      onZpravaOdjezdu?.({
        id: 'odjezd-ceka',
        nova: true,
        nadpis: '',
        text: '',
        sbalenyTitulek: '',
      });
      return;
    }
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
    <>
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
        {efektivniZadost?.stav === 'ceka' ? (
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
                  step={900}
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

      {souhlasCas && rozpis ? (
        <div className="pv-zprava-overlay" role="dialog" aria-modal="true">
          <div className="pv-zprava-overlay__karta pv-zprava-overlay__karta--prani">
            <h3 className="pv-zprava-overlay__nadpis">{tt(ODJEZD_SOUHLAS_NADPIS)}</h3>
            <p className="pv-zprava-overlay__text">
              {textSouhlasuOdjezdu(souhlasCas, rozpis.kc, lang)}
            </p>
            <p className="pv-odjezd__castka">
              {zobrazCas(souhlasCas)} · +{rozpis.kc} Kč
              <span>
                {rozpis.pulhodin} × {OKNO_KC} Kč
              </span>
            </p>
            <p className="pv-zprava-overlay__text">{tt(ODJEZD_KANAL_OTAZKA)}</p>
            <div className="pv-odjezd__kanaly">
              {KANALY.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={kanal === k ? 'pv-odjezd__kanal pv-odjezd__kanal--ano' : 'pv-odjezd__kanal'}
                  onClick={() => setKanal(k)}
                >
                  {tt(ODJEZD_KANAL_STITKY[k])}
                </button>
              ))}
            </div>
            {chyba ? <p className="pv-zprava-overlay__text">{chyba}</p> : null}
            <div className="pv-zprava-overlay__akce">
              <button
                type="button"
                className="pv-zprava-overlay__btn"
                disabled={cekam}
                onClick={() => {
                  setSouhlasCas(null);
                  setKanal(null);
                  setChyba('');
                }}
              >
                {tt(plochaNe)}
              </button>
              <button
                type="button"
                className="pv-zprava-overlay__btn pv-zprava-overlay__btn--ano"
                disabled={cekam || !kanal}
                onClick={() => void potvrditSouhlas()}
              >
                {tt(plochaAno)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
