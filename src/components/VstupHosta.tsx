'use client';

import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import { CAS_PO_23, VYJEZD_CASTKA, priplatekProCas } from '@/lib/priplatek-prijezd';
import * as TX from '@/lib/texts';
import type { GuideLang } from '@/lib/types';
import {
  CAS_PO_20,
  CASY_VYBERU,
  jeCasHosta,
  normalizujSpz,
  pruvodceRozbalen,
  telefonProBranu,
  type ZpusobPrijezdu,
} from '@/lib/vstup-pruvodce';
import * as VT from '@/lib/vstup-texty';

export type VstupHodnoty = {
  cas: string | null;
  zpusob: ZpusobPrijezdu | null;
  telefon: string;
  spz: string;
  pujcene: boolean;
  souhlas: boolean;
};

type Props = {
  lang: GuideLang;
  predano: boolean;
  token: string | null;
  cteni?: boolean;
  hodnoty: VstupHodnoty;
  predvyplneny: string;
  onUlozeno: (next: VstupHodnoty) => void;
};

function sJednotkou(text: string) {
  const casti = text.split(
    /(čtvrt hodiny|až hodinu|\d{1,2}\s*(?:minut\w*|Minuten|minutes|хвилин|分鐘|perc\w*)|\d+\s*Kč|\d{2}:\d{2})/g,
  );
  return casti.map((cast, i) =>
    /\d/.test(cast) || cast === 'čtvrt hodiny' || cast === 'až hodinu' ? (
      <span key={i} className="pv-nedel">
        {cast}
      </span>
    ) : (
      cast
    ),
  );
}

function teloPravidla(text: string) {
  const phone = '+420 604 692 573';
  const at = text.indexOf(phone);
  if (at < 0) return sJednotkou(text);
  const po = text.slice(at + phone.length);
  const tecka = po.startsWith('.') || po.startsWith('。') ? po[0] : '';
  return (
    <>
      {sJednotkou(text.slice(0, at))}
      <a className="pv-phone" href="tel:+420604692573">
        +420&nbsp;604&nbsp;692&nbsp;573
        {tecka}
      </a>
      {sJednotkou(tecka ? po.slice(1) : po)}
    </>
  );
}

function renderPravidlo(raw: string, tucnaPrvni = false) {
  const text = raw.replaceAll('{{VYJEZD}}', String(VYJEZD_CASTKA));
  if (!tucnaPrvni) return teloPravidla(text);
  const konec = text.search(/[.。]/);
  if (konec < 0) return <strong>{teloPravidla(text)}</strong>;
  return (
    <>
      <strong>{teloPravidla(text.slice(0, konec + 1))}</strong>
      {teloPravidla(text.slice(konec + 1))}
    </>
  );
}

function moznostiCasu(slovo: string, po23: string) {
  return (
    <>
      {CASY_VYBERU.map((hodina) => {
        const kc = priplatekProCas(hodina);
        return (
          <option key={hodina} value={hodina}>
            {kc ? `${hodina} · ${slovo} ${kc} Kč` : hodina}
          </option>
        );
      })}
      <option value={CAS_PO_23}>{po23}</option>
    </>
  );
}

function renderPhoneText(raw: string) {
  const phone = '+420 604 692 573';
  const at = raw.indexOf(phone);
  if (at < 0) return raw;
  const rest = raw.slice(at + phone.length);
  const tecka = rest.startsWith('.') || rest.startsWith('。') ? rest[0] : '';
  return (
    <>
      {raw.slice(0, at)}
      <a className="pv-phone" href="tel:+420604692573">
        +420&nbsp;604&nbsp;692&nbsp;573
        {tecka}
      </a>
      {tecka ? rest.slice(1) : rest}
    </>
  );
}

function Zamek() {
  return (
    <svg className="pv-ikona" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 10V7a5 5 0 0 1 10 0v3h1.2A1.8 1.8 0 0 1 20 11.8v8.4A1.8 1.8 0 0 1 18.2 22H5.8A1.8 1.8 0 0 1 4 20.2v-8.4A1.8 1.8 0 0 1 5.8 10H7zm2 0h6V7a3 3 0 0 0-6 0v3z"
      />
    </svg>
  );
}

export function VstupHosta({ lang, predano, token, cteni = false, hodnoty, predvyplneny, onUlozeno }: Props) {
  const tt = (map: Parameters<typeof t>[0]) => t(map, lang);
  const [uprava, setUprava] = useState(false);
  const [cas, setCas] = useState(hodnoty.cas || '');
  const [zpusob, setZpusob] = useState<ZpusobPrijezdu | null>(hodnoty.zpusob);
  const [telefon, setTelefon] = useState(hodnoty.telefon || predvyplneny || '');
  const [spz, setSpz] = useState(hodnoty.spz || '');
  const [pujcene, setPujcene] = useState(hodnoty.pujcene);
  const [souhlas, setSouhlas] = useState(hodnoty.souhlas);
  const [pokus, setPokus] = useState(false);
  const [chybaTelefonu, setChybaTelefonu] = useState('');
  const [chybaSpz, setChybaSpz] = useState('');
  const [selhani, setSelhani] = useState(false);
  const [cekam, setCekam] = useState(false);

  useEffect(() => {
    setCas(hodnoty.cas || '');
    setZpusob(hodnoty.zpusob);
    setTelefon(hodnoty.telefon || predvyplneny || '');
    setSpz(hodnoty.spz || '');
    setPujcene(hodnoty.pujcene);
    setSouhlas(hodnoty.souhlas);
    setUprava(false);
    setPokus(false);
  }, [hodnoty.cas, hodnoty.zpusob, hodnoty.telefon, hodnoty.spz, hodnoty.pujcene, hodnoty.souhlas, predvyplneny]);

  const hotovo =
    pruvodceRozbalen({
      cas: hodnoty.cas,
      zpusob: hodnoty.zpusob,
      telefonBrana: hodnoty.telefon || null,
      spz: hodnoty.spz || null,
      spzPujcene: hodnoty.pujcene,
      souhlas: hodnoty.souhlas,
    }) && !uprava;

  async function uloz(next: VstupHodnoty) {
    if (cteni) return;
    setSelhani(false);
    if (!token) {
      onUlozeno(next);
      return;
    }
    setCekam(true);
    try {
      const res = await fetch('/api/pruvodce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          akce: 'dokoncit',
          cas: next.cas,
          zpusob: next.zpusob,
          telefon: next.telefon,
          spz: next.spz,
          pujcene: next.pujcene,
          souhlas: next.souhlas,
          jazyk: lang,
        }),
      });
      if (!res.ok) {
        setSelhani(true);
        return;
      }
      onUlozeno(next);
      window.location.reload();
    } catch {
      setSelhani(true);
    } finally {
      setCekam(false);
    }
  }

  function ulozVse() {
    setPokus(true);
    const chybiCas = !jeCasHosta(cas);
    let telefonUlozeny = '';
    let spzUlozena = '';
    let chybiZpusob = !zpusob;
    setChybaTelefonu('');
    setChybaSpz('');
    if (zpusob === 'auto') {
      const tel = telefonProBranu(telefon);
      if (!tel.ok) {
        chybiZpusob = true;
        setChybaTelefonu(tt(VT.vstupChybaTelefon));
      } else {
        telefonUlozeny = tel.ulozeny;
      }
      if (!pujcene) {
        const v = normalizujSpz(spz);
        if (!v.ok) {
          chybiZpusob = true;
          setChybaSpz(tt(VT.vstupChybaSpz));
        } else {
          spzUlozena = v.spz;
        }
      }
    }
    if (chybiCas || chybiZpusob || !souhlas) return;
    void uloz({
      cas,
      zpusob,
      telefon: zpusob === 'auto' ? telefonUlozeny : '',
      spz: zpusob === 'auto' ? spzUlozena : '',
      pujcene: zpusob === 'auto' ? pujcene : false,
      souhlas: true,
    });
  }

  const casText = !hodnoty.cas
    ? ''
    : hodnoty.cas === CAS_PO_20
      ? tt(VT.vstupPo20)
      : hodnoty.cas === CAS_PO_23
        ? tt(VT.vstupPo23)
        : priplatekProCas(hodnoty.cas)
          ? `${hodnoty.cas} · ${tt(VT.vstupPriplatek)} ${priplatekProCas(hodnoty.cas)} Kč`
          : hodnoty.cas;

  const radek = sJednotkou(
    `${tt(VT.vstupRadek)} ${casText} · ${hodnoty.zpusob === 'pesky' ? tt(VT.vstupPeskyKratce) : tt(VT.vstupAutemKratce)} · ${tt(VT.vstupPravidlaOk)}`,
  );

  return (
    <>
      {predano && hodnoty.pujcene ? (
        <p className="pv-vstup__pripominka" lang={lang}>
          {tt(VT.vstupPripominkaSpz)}
        </p>
      ) : null}
      {hotovo ? (
        <p className="pv-vstup pv-vstup--radek" lang={lang}>
          {radek}
          {cteni ? null : (
            <>
              {' · '}
              <button type="button" className="pv-vstup__zmenit" onClick={() => setUprava(true)}>
                {tt(VT.vstupZmenit)}
              </button>
            </>
          )}
        </p>
      ) : (
        <section className="pv-vstup" id="pv-vstup" lang={lang}>
          <h2>{tt(VT.vstupNadpis)}</h2>
          {!predano && hodnoty.pujcene ? <p className="pv-vstup__pripominka">{tt(VT.vstupPripominkaSpz)}</p> : null}
          <p>{tt(VT.vstupUvod)}</p>
          <ol className="pv-vstup__pravidla">
            {VT.vstupPravidla.map((veta, i) => (
              <li key={veta.cs}>{renderPravidlo(tt(veta), i === 1 || i === 2)}</li>
            ))}
          </ol>
          <div className="pv-vstup__pole">
            <label>
              {tt(VT.vstupCasPopisek)}
              <select value={cas} onChange={(e) => setCas(e.target.value)} disabled={cteni}>
                <option value="">{tt(VT.vstupCekaCas)}</option>
                {moznostiCasu(tt(VT.vstupPriplatek), tt(VT.vstupPo23))}
              </select>
            </label>
            {pokus && !jeCasHosta(cas) ? <p className="pv-vstup__chyba">{tt(VT.vstupChybiCas)}</p> : null}
          </div>
          <h3>{tt(VT.vstupJak)}</h3>
          <div className="pv-hub__choices">
            <button
              type="button"
              className={`pv-hub__choice${zpusob === 'pesky' ? ' pv-hub__choice--on' : ''}`}
              onClick={() => {
                setZpusob('pesky');
                setChybaTelefonu('');
                setChybaSpz('');
              }}
              disabled={cteni}
            >
              <span className="pv-hub__choice-title">{tt(VT.vstupPesky)}</span>
            </button>
            <button
              type="button"
              className={`pv-hub__choice${zpusob === 'auto' ? ' pv-hub__choice--on' : ''}`}
              onClick={() => setZpusob('auto')}
              disabled={cteni}
            >
              <span className="pv-hub__choice-title">{tt(VT.vstupAutem)}</span>
            </button>
          </div>
          {zpusob === 'auto' ? (
            <div className="pv-vstup__auto">
              <div className="pv-vstup__varovani">
                <h3>{tt(VT.vstupBranaNadpis)}</h3>
                <p>{tt(VT.vstupBranaText)}</p>
              </div>
              <label>
                {tt(VT.vstupTelefon)}
                <input type="tel" autoComplete="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} disabled={cteni} />
              </label>
              {chybaTelefonu ? (
                <p className="pv-vstup__chyba">
                  {chybaTelefonu} <span className="pv-phone">+420&nbsp;777&nbsp;123&nbsp;456</span>. {tt(VT.vstupChybaTelefonKonec)}
                </p>
              ) : null}
              <label>
                {tt(VT.vstupSpz)}
                <input value={spz} onChange={(e) => setSpz(e.target.value)} disabled={cteni || pujcene} />
              </label>
              {chybaSpz ? <p className="pv-vstup__chyba">{chybaSpz}</p> : null}
              <label className="pv-vstup__check">
                <input type="checkbox" checked={pujcene} onChange={(e) => setPujcene(e.target.checked)} disabled={cteni} />
                <span>{tt(VT.vstupPujcene)}</span>
              </label>
            </div>
          ) : null}
          {pokus && !zpusob ? <p className="pv-vstup__chyba">{tt(VT.vstupChybiZpusob)}</p> : null}
          <label className="pv-vstup__souhlas">
            <input type="checkbox" checked={souhlas} onChange={(e) => setSouhlas(e.target.checked)} disabled={cteni} />
            <span>{tt(VT.vstupSouhlas)}</span>
          </label>
          {pokus && !souhlas ? <p className="pv-vstup__chyba">{tt(VT.vstupChybiPravidla)}</p> : null}
          {cteni ? null : (
            <button type="button" className="pv-vstup__ulozit" disabled={cekam} onClick={ulozVse}>
              {tt(VT.vstupUlozitPiny)}
            </button>
          )}
          <ul className="pv-vstup__zamky">
            {[VT.vstupZamekCesta, VT.vstupZamekParkovani, VT.vstupZamekWifi].map((veta) => (
              <li key={veta.cs}>
                <Zamek />
                <span>{tt(veta)}</span>
              </li>
            ))}
          </ul>
          <p className="pv-vstup__vitej">
            <strong>{tt(VT.vstupViteji)}</strong>
          </p>
        </section>
      )}
      {selhani ? (
        <div className="pv-vstup__selhani" lang={lang}>
          <p>{renderPhoneText(tt(VT.vstupChybaUlozeni))}</p>
          <div className="pv-vstup__akce">
            <a className="pv-vstup__ulozit" href="sms:+420604692573">
              {tt(TX.casPrijezduSms)}
            </a>
            <a className="pv-vstup__ulozit" href="https://wa.me/420604692573" target="_blank" rel="noopener noreferrer">
              {tt(TX.casPrijezduWhatsapp)}
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
