'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  denBezPrijezdu,
  denPlno,
  maxDosahNoci,
  minCenaVolnych,
  mozneDnyOdjezdu,
  nociPobytu,
  type KalendarDenni,
} from '@/lib/kalendar-denni';
import {
  chytryKalendarTexty,
  formatChytryDatum,
} from '@/lib/chytry-kalendar-texty';
import { formatRozsahPoptavky } from '@/lib/poptavka-texty';
import { formatKc, kalendarTexty, tvarNoci } from '@/lib/kalendar-texty';
import type { GuideLang } from '@/lib/types';

function parseYmd(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function weekdayMon0(d: Date): number {
  return (d.getDay() + 6) % 7;
}

const DNY: Record<string, string[]> = {
  cs: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
};

type Zalozka = 'prijezd' | 'odjezd';

type Props = {
  lang: GuideLang;
  dnes: string;
  dny: KalendarDenni;
  bezApt: Record<string, number>;
  prijezd: string;
  odjezd: string;
  onPrijezd: (ymd: string) => void;
  onOdjezd: (ymd: string) => void;
  labelPrijezd: string;
  labelOdjezd: string;
  ukazCeny: boolean;
  sleva: boolean;
  cenaSuma: number | null;
  cenaSeSlevou: number | null;
  daleLabel: string;
  onDale: () => void;
  chyba: string | null;
  ukazNejblizsiLabel: string;
  onNejblizsi: () => void;
  /** Pro šipku zpět v PoptavkaForm. */
  otevreno: boolean;
  onOtevreno: (otevreno: boolean) => void;
};

export function ChytryKalendar(props: Props) {
  const {
    lang,
    dnes,
    dny,
    bezApt,
    prijezd,
    odjezd,
    onPrijezd,
    onOdjezd,
    labelPrijezd,
    labelOdjezd,
    ukazCeny,
    sleva,
    cenaSuma,
    cenaSeSlevou,
    daleLabel,
    onDale,
    chyba,
    ukazNejblizsiLabel,
    onNejblizsi,
    otevreno,
    onOtevreno,
  } = props;
  const ct = chytryKalendarTexty(lang);
  const kt = kalendarTexty(lang);
  const [vDomu, setVDomu] = useState(false);
  const [zalozka, setZalozka] = useState<Zalozka>('prijezd');
  const start = parseYmd(prijezd || dnes) || new Date();
  const [kurz, setKurz] = useState(() => startOfMonth(start));

  useEffect(() => {
    setVDomu(true);
  }, []);

  useEffect(() => {
    if (!otevreno) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [otevreno]);

  const mozneOdjezdy = useMemo(
    () => (prijezd ? new Set(mozneDnyOdjezdu(dny, prijezd)) : new Set<string>()),
    [dny, prijezd],
  );
  const dosah = prijezd ? maxDosahNoci(dny, prijezd) : 0;
  const nociPocet = prijezd && odjezd ? nociPobytu(prijezd, odjezd).length : 0;
  const vybiramOdjezd = otevreno && zalozka === 'odjezd' && Boolean(prijezd);

  const bunky = useMemo(() => {
    const first = startOfMonth(kurz);
    const pad = weekdayMon0(first);
    const daysInMonth = new Date(kurz.getFullYear(), kurz.getMonth() + 1, 0).getDate();
    const cells: ({
      ymd: string;
      day: number;
      minulost: boolean;
      plno: boolean;
      ztlumeno: boolean;
      moznyOdjezd: boolean;
      cenaOd: number | null;
      role: 'prijezd' | 'mez' | 'odjezd' | null;
    } | null)[] = [];
    for (let i = 0; i < pad; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(kurz.getFullYear(), kurz.getMonth(), day);
      const ymd = toYmd(d);
      const den = dny[ymd];
      const ba = bezApt[ymd] || 0;
      const minulost = ymd < dnes;
      const plno = !minulost && denPlno(den, ba);
      let ztlumeno = false;
      let moznyOdjezd = false;
      if (vybiramOdjezd) {
        if (ymd < prijezd || (ymd > prijezd && !mozneOdjezdy.has(ymd))) ztlumeno = true;
        if (mozneOdjezdy.has(ymd)) moznyOdjezd = true;
      }
      let role: 'prijezd' | 'mez' | 'odjezd' | null = null;
      if (prijezd && ymd === prijezd) role = 'prijezd';
      else if (odjezd && ymd === odjezd) role = 'odjezd';
      else if (prijezd && odjezd && !vybiramOdjezd && ymd > prijezd && ymd < odjezd) role = 'mez';
      const cenaOd =
        minulost || role === 'odjezd' || moznyOdjezd ? null : minCenaVolnych(den);
      cells.push({
        ymd,
        day,
        minulost,
        plno: minulost ? false : plno,
        ztlumeno,
        moznyOdjezd,
        cenaOd,
        role,
      });
    }
    return cells;
  }, [kurz, dnes, dny, bezApt, prijezd, odjezd, mozneOdjezdy, vybiramOdjezd]);

  function otevri(tab: Zalozka) {
    if (tab === 'odjezd' && !prijezd) {
      setZalozka('prijezd');
    } else if (tab === 'prijezd') {
      onOdjezd('');
      setZalozka('prijezd');
    } else {
      setZalozka('odjezd');
    }
    const kotva = tab === 'odjezd' && prijezd ? prijezd : prijezd || dnes;
    setKurz(startOfMonth(parseYmd(kotva) || new Date()));
    onOtevreno(true);
  }

  function zavri() {
    onOtevreno(false);
  }

  function klep(ymd: string, b: NonNullable<(typeof bunky)[number]>) {
    if (b.minulost) return;
    if (zalozka === 'prijezd' || !prijezd) {
      if (b.plno || denBezPrijezdu(dny[ymd], bezApt[ymd] || 0)) return;
      onPrijezd(ymd);
      onOdjezd('');
      setZalozka('odjezd');
      return;
    }
    if (ymd === prijezd || ymd < prijezd) {
      if (b.plno || denBezPrijezdu(dny[ymd], bezApt[ymd] || 0)) return;
      onPrijezd(ymd);
      onOdjezd('');
      setZalozka('odjezd');
      return;
    }
    if (mozneOdjezdy.has(ymd)) {
      onOdjezd(ymd);
      onOtevreno(false);
    }
  }

  const dnyHlav = DNY[lang] || DNY.en;
  const mesicNazev = new Intl.DateTimeFormat(lang === 'zh-Hant' ? 'zh-Hant' : lang, {
    month: 'long',
    year: 'numeric',
  }).format(kurz);

  const souhrnText =
    prijezd && odjezd
      ? `${formatRozsahPoptavky(prijezd, odjezd, lang)} · ${tvarNoci(nociPocet, lang)} ${ct.souhrnOdjezdRano(formatChytryDatum(odjezd, lang))}`
      : '';

  const hotovyTermin = Boolean(prijezd && odjezd && nociPocet > 0 && !chyba);

  const textPrijezd = prijezd ? formatChytryDatum(prijezd, lang) : '—';
  const textOdjezd = odjezd ? formatChytryDatum(odjezd, lang) : '—';
  const datumVPoli = (ymd: string) => (ymd ? formatDatumPole(ymd, lang) : '—');

  const pokyn =
    zalozka === 'odjezd' && prijezd
      ? ct.poPrijezdu(formatChytryDatum(prijezd, lang))
      : ct.predVyberem;

  const panel =
    otevreno && vDomu
      ? createPortal(
          <div className="pp__kalendar pp__chytry-panel" role="dialog" aria-modal="true">
            <div className="pp__kalendar-vnitr pp__chytry-panel-vnitr">
              <div className="pp__chytry-zalozky" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={zalozka === 'prijezd'}
                  className={`pp__chytry-zalozka${zalozka === 'prijezd' ? ' is-on' : ''}`}
                  onClick={() => {
                    onOdjezd('');
                    setZalozka('prijezd');
                  }}
                >
                  {labelPrijezd} {textPrijezd}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={zalozka === 'odjezd'}
                  className={`pp__chytry-zalozka${zalozka === 'odjezd' ? ' is-on' : ''}`}
                  disabled={!prijezd}
                  onClick={() => {
                    if (!prijezd) return;
                    setZalozka('odjezd');
                  }}
                >
                  {labelOdjezd} {textOdjezd}
                </button>
              </div>

              <p className="pp__chytry-pokyn">{pokyn}</p>
              {zalozka === 'odjezd' && prijezd && dosah > 0 && dosah < 7 ? (
                <p className="pp__chytry-mal pp__chytry-pokyn-mal">
                  {ct.dosah(formatChytryDatum(prijezd, lang), dosah)}
                </p>
              ) : null}

              <div className="pp__chytry-hlavicka">
                <button
                  type="button"
                  className="pp__chip"
                  onClick={() => setKurz((k) => addMonths(k, -1))}
                >
                  ←
                </button>
                <span className="pp__chytry-mesic">{mesicNazev}</span>
                <button
                  type="button"
                  className="pp__chip"
                  onClick={() => setKurz((k) => addMonths(k, 1))}
                >
                  →
                </button>
              </div>
              <div className="pp__chytry-dny">
                {dnyHlav.map((d) => (
                  <span key={d} className="pp__chytry-den-nazev">
                    {d}
                  </span>
                ))}
                {bunky.map((c, i) =>
                  c ? (
                    <button
                      key={c.ymd}
                      type="button"
                      className={[
                        'pp__chytry-den',
                        c.minulost ? 'is-min' : '',
                        c.plno && !c.moznyOdjezd && c.role !== 'odjezd' ? 'is-plno' : '',
                        c.ztlumeno ? 'is-ztl' : '',
                        c.role === 'prijezd' ? 'is-prijezd' : '',
                        c.role === 'mez' ? 'is-mez' : '',
                        c.role === 'odjezd' ? 'is-odjezd' : '',
                        c.moznyOdjezd ? 'is-mozny' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      disabled={
                        c.minulost ||
                        (c.ztlumeno && !c.moznyOdjezd && c.role !== 'prijezd') ||
                        (zalozka === 'prijezd' &&
                          (c.plno || denBezPrijezdu(dny[c.ymd], bezApt[c.ymd] || 0)))
                      }
                      onClick={() => klep(c.ymd, c)}
                    >
                      <span
                        className={
                          c.plno && !c.moznyOdjezd && c.role !== 'odjezd' ? 'is-skrt' : undefined
                        }
                      >
                        {c.day}
                      </span>
                      {c.minulost ? null : c.moznyOdjezd || c.role === 'odjezd' ? (
                        <small>{ct.podDnemOdjezd}</small>
                      ) : c.plno ? (
                        <small>{kt.plno}</small>
                      ) : ukazCeny && c.cenaOd != null ? (
                        <small>{c.cenaOd}</small>
                      ) : null}
                    </button>
                  ) : (
                    <span key={`e-${i}`} className="pp__chytry-den is-empty" />
                  ),
                )}
              </div>

              <p className="pp__chytry-mal pp__chytry-legenda">{kt.cenaLegenda}</p>
              <p className="pp__chytry-mal">{ct.ranoOdjezd}</p>
              <button type="button" className="pp__btn pp__btn--sms" onClick={zavri}>
                ←
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="pp__chytry">
      <div className="pp__termin">
        <div className="pp__termin-pole">
          <span className="pp__termin-label">{labelPrijezd}</span>
          <button
            type="button"
            className={`pp__termin-tlacitko${prijezd ? '' : ' is-prazdne'}`}
            onClick={() => otevri('prijezd')}
          >
            {datumVPoli(prijezd)}
          </button>
        </div>
        <div className="pp__termin-pole">
          <span className="pp__termin-label">{labelOdjezd}</span>
          <button
            type="button"
            className={`pp__termin-tlacitko${odjezd ? '' : ' is-prazdne'}`}
            onClick={() => otevri('odjezd')}
          >
            {datumVPoli(odjezd)}
          </button>
        </div>
      </div>

      {hotovyTermin ? (
        <div className="pp__chytry-souhrn">
          <p>{souhrnText}</p>
          {ukazCeny && cenaSuma != null ? (
            <p>
              {kt.cenaZaPobyt}
              {kt.cenaOdPozice === 'pred' ? ` ${kt.cenaOd} ` : ' '}
              {sleva && cenaSeSlevou != null ? (
                <>
                  <s className="pp__chytry-skrt">{formatKc(cenaSuma)}</s>{' '}
                  <b>{formatKc(cenaSeSlevou)}</b>
                </>
              ) : (
                <b>{formatKc(cenaSuma)}</b>
              )}
              {kt.cenaOdPozice === 'za' ? kt.cenaOd : null}
            </p>
          ) : null}
          {sleva && ukazCeny ? <p className="pp__chytry-mal">{kt.cenaSleva}</p> : null}
          {ukazCeny ? <p className="pp__chytry-mal">{kt.cenaPoznamka}</p> : null}
        </div>
      ) : null}

      {chyba ? <p className="pp__chyba">{chyba}</p> : null}
      {chyba ? (
        <button type="button" className="pp__btn pp__btn--tlumeny" onClick={onNejblizsi}>
          {ukazNejblizsiLabel}
        </button>
      ) : null}

      {hotovyTermin ? (
        <button type="button" className="pp__btn pp__btn--hlavni" onClick={onDale}>
          {daleLabel}
        </button>
      ) : null}

      <p className="pp__chytry-mal">{ct.ranoOdjezd}</p>
      {panel}
    </div>
  );
}

function formatDatumPole(ymd: string, lang: GuideLang): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  if (lang === 'zh-Hant') return `${y}/${m}/${d}`;
  return `${d}. ${m}. ${y}`;
}
