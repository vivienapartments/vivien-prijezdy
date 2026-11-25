'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { tipZpravaWhatsapp } from '@/lib/doporuceni-komplet-texty';
import { formatKc } from '@/lib/kalendar-texty';
import { klubTexty } from '@/lib/klub-texty';
import {
  KLUB_UROVNE_PRO_LADDER,
  pokrokUrovne,
  type KlubKartaPohled,
} from '@/lib/klub-ukazka';
import type { GuideLang } from '@/lib/types';
import './klub.scss';

const FOTO = '/poptavka/doporuceny-zahrada-vecer.webp';

function IkCal() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#c9a84c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

function IkUser() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#c9a84c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1-4 4-6 7-6s6 2 7 6" />
    </svg>
  );
}

function IkBook() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#c9a84c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 5.5V21" />
    </svg>
  );
}

function Sipka() {
  return (
    <svg className="klub-sip" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function pocetPrijeli(pratele: { stav: string }[]): number {
  return pratele.filter((p) => /přijel|přijela|přijeli|✓/i.test(p.stav)).length;
}

export default function KlubClient() {
  const [klic, setKlic] = useState('');
  const [karta, setKarta] = useState<KlubKartaPohled | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [nacitam, setNacitam] = useState(true);
  const [ladder, setLadder] = useState(false);
  const [dopOpen, setDopOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setKlic((p.get('k') || '').trim());
  }, []);

  useEffect(() => {
    if (!klic) {
      setNacitam(false);
      setChyba('missing');
      return;
    }
    let zruseno = false;
    setNacitam(true);
    (async () => {
      try {
        const res = await fetch(`/api/klub/karta?k=${encodeURIComponent(klic)}`);
        const json = (await res.json()) as { ok?: boolean; karta?: KlubKartaPohled; chyba?: string };
        if (zruseno) return;
        if (json.ok && json.karta) {
          setKarta(json.karta);
          setDopOpen(json.karta.pohled === 'doporucitel');
          setChyba(null);
        } else {
          setKarta(null);
          setChyba(json.chyba || 'missing');
        }
      } catch {
        if (!zruseno) {
          setKarta(null);
          setChyba('missing');
        }
      } finally {
        if (!zruseno) setNacitam(false);
      }
    })();
    return () => {
      zruseno = true;
    };
  }, [klic]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const lang: GuideLang = karta?.jazyk || 'cs';
  const tx = useMemo(() => klubTexty(lang), [lang]);
  const jeDop = karta?.pohled === 'doporucitel';
  const jeFirma = karta?.pohled === 'firma';
  const maUroven = !jeDop;

  const pokrok = useMemo(() => {
    if (!karta || !maUroven) return null;
    return pokrokUrovne(karta.utrataKc, { pohled: karta.pohled });
  }, [karta, maUroven]);

  const odkaz = karta?.odkazDoporuceni || '';

  const ukazToast = useCallback((msg: string) => setToast(msg), []);

  const kopie = useCallback(async () => {
    if (!odkaz) return;
    const text = `${tipZpravaWhatsapp(lang)} ${odkaz}&k=c`;
    try {
      await navigator.clipboard.writeText(text);
      ukazToast(tx.kopieOk);
    } catch {
      ukazToast(tx.kopieOk);
    }
  }, [odkaz, lang, tx.kopieOk, ukazToast]);

  const whatsapp = useCallback(() => {
    if (!odkaz) return;
    const text = `${tipZpravaWhatsapp(lang)} ${odkaz}&k=w`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }, [odkaz, lang]);

  const emailTip = useCallback(() => {
    if (!odkaz) return;
    const subject = encodeURIComponent('VIVIEN Apartments');
    const body = encodeURIComponent(`${tipZpravaWhatsapp(lang)}\n\n${odkaz}&k=e`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [odkaz, lang]);

  const scrollDop = useCallback(() => {
    setDopOpen(true);
    window.setTimeout(() => {
      document.getElementById('klub-dop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, []);

  const poptavkaUrl = karta
    ? `/poptavka?od=${encodeURIComponent(karta.kod)}&lang=${encodeURIComponent(lang)}`
    : '/poptavka';

  if (nacitam) {
    return (
      <main className="klub-page">
        <div className="klub-chyba">{tx.klub}…</div>
      </main>
    );
  }

  if (!karta || chyba) {
    return (
      <main className="klub-page">
        <div className="klub-chyba">{tx.zadnaKarta}</div>
      </main>
    );
  }

  const prijeli = pocetPrijeli(karta.pratele);
  const maNadchazejici = karta.nadchazejici.length > 0;
  /** Před příjezdem / během pobytu: nahoře průvodce, zbytek skromně. Po odjezdu celá karta. */
  const skromnyZbytek = maNadchazejici && karta.pobyty.length === 0 && !jeDop;

  const ladderRows = [...KLUB_UROVNE_PRO_LADDER]
    .sort((a, b) => a.odKc - b.odKc)
    .map((u, i) => {
      const nazev = jeFirma ? u.nazevFirma : u.nazevHost;
      const jeMe = u.id === karta.urovenId;
      const done = (pokrok?.index ?? 0) > i;
      return (
        <div key={u.id} className={jeMe ? 'is-me' : done ? 'is-done' : undefined}>
          <span>
            {nazev} · {u.slevaPct} %
          </span>
          <span>{formatKc(u.odKc)}</span>
        </div>
      );
    });

  return (
    <main className="klub-page">
      <div className="klub-shell">
        {!jeDop ? <img className="klub-foto" src={FOTO} alt="" /> : null}
        <div className="klub-hl">
          <h1 className="klub-jm">{karta.jmenoZobrazeni}</h1>
          {maUroven && !skromnyZbytek ? (
            <button type="button" className="klub-lv" onClick={() => setLadder((v) => !v)}>
              {tx.klub} · <b>{karta.urovenNazev}</b> <i>i</i>
            </button>
          ) : null}
          {!skromnyZbytek ? (
            <div className="klub-sl">
              {jeDop ? tx.dopPopis : tx.sleva(karta.slevaPct)}
            </div>
          ) : null}
          {maUroven && pokrok && !skromnyZbytek ? (
            <>
              <div className="klub-bar" aria-hidden>
                <span style={{ width: `${pokrok.pct}%` }} />
              </div>
              <div className="klub-bt">
                <span>
                  <b>{tx.utrata(formatKc(karta.utrataKc))}</b>
                </span>
                <span>
                  {pokrok.dalsiNazev && pokrok.dalsiPct != null && pokrok.chybiKc != null
                    ? tx.doUrovne(pokrok.dalsiNazev, pokrok.dalsiPct, formatKc(pokrok.chybiKc))
                    : tx.nejvyssi}
                </span>
              </div>
              {ladder ? <div className="klub-ladder">{ladderRows}</div> : null}
            </>
          ) : null}
        </div>

        {!jeDop ? (
          <>
            <section className="klub-sec" style={skromnyZbytek ? undefined : undefined}>
              <div className="klub-sn">{jeFirma ? tx.nadchazejiciFirma : tx.nadchazejici}</div>
              {karta.nadchazejici.length === 0 ? (
                <p className="klub-prazdne">{tx.prazdnePobyty}</p>
              ) : (
                <>
                  {karta.nadchazejici.map((r, i) => (
                    <div
                      className={`klub-radek${r.barva === 'ceka' ? ' klub-radek--ceka' : r.barva === 'zapocteno' ? ' klub-radek--zapocteno' : ''}`}
                      key={`n-${i}`}
                    >
                      <div className="klub-ik">
                        {jeFirma ? <IkUser /> : i === 0 && r.pruvodceUrl ? <IkBook /> : <IkCal />}
                      </div>
                      <div>
                        <div className="klub-t">{r.nadpis}</div>
                        <div className="klub-s">{r.podnadpis}</div>
                      </div>
                    </div>
                  ))}
                  {karta.nadchazejici.some((r) => r.pruvodceUrl) ? (
                    <div className="klub-btns">
                      <a
                        className="klub-btn"
                        href={karta.nadchazejici.find((r) => r.pruvodceUrl)?.pruvodceUrl || '#'}
                      >
                        {tx.mujPruvodce}
                      </a>
                    </div>
                  ) : null}
                </>
              )}
            </section>

            {!skromnyZbytek ? (
              <section className="klub-sec">
                <div className="klub-sn">{jeFirma ? tx.objednanePobyty : tx.mojePobyty}</div>
                {karta.pobyty.length === 0 ? (
                  <p className="klub-prazdne">{tx.prazdnePobyty}</p>
                ) : (
                  karta.pobyty.map((r, i) => (
                    <div
                      className={`klub-radek${r.barva === 'ceka' ? ' klub-radek--ceka' : r.barva === 'zapocteno' ? ' klub-radek--zapocteno' : ''}`}
                      key={`p-${i}`}
                    >
                      <div className="klub-ik">
                        <IkCal />
                      </div>
                      <div>
                        <div className="klub-t">{r.nadpis}</div>
                        <div className="klub-s">{r.podnadpis}</div>
                      </div>
                    </div>
                  ))
                )}
              </section>
            ) : null}
          </>
        ) : null}

        {jeFirma && !skromnyZbytek ? (
          <section className="klub-sec">
            <div className="klub-sn">{tx.fakturace}</div>
            <div className="klub-fu">
              {karta.firmaNazev || karta.jmenoZobrazeni}
              {karta.firmaIco ? ` · IČO ${karta.firmaIco}` : ''}
              {karta.firmaSidlo ? (
                <>
                  <br />
                  {karta.firmaSidlo}
                </>
              ) : null}
              <br />
              {tx.fakturacePozn}
            </div>
          </section>
        ) : null}

        <section
          id="klub-dop"
          className={`klub-sec${dopOpen || jeDop ? ' is-open' : ''}${skromnyZbytek && !jeDop ? ' klub-sec--skromne' : ''}`}
          hidden={skromnyZbytek && !jeDop ? true : undefined}
        >
          {jeDop ? (
            <div className="klub-sn">{tx.mojeDoporuceni}</div>
          ) : (
            <div className="klub-sn">
              <button type="button" onClick={() => setDopOpen((v) => !v)}>
                <span>{tx.doporuceni}</span>
                <Sipka />
              </button>
            </div>
          )}
          {!jeDop ? (
            <div className="klub-kr">
              <div>
                <b>{prijeli}</b>
                <span>{tx.pratelePrijeli}</span>
              </div>
              <div>
                <b>{formatKc(karta.kreditKc)}</b>
                <span>{tx.vasKredit}</span>
              </div>
            </div>
          ) : null}
          <div className="klub-roz">
            <div className="klub-sub">{tx.mujOdkaz}</div>
            <div className="klub-odk">{odkaz}</div>
            <div className="klub-btns">
              <button type="button" className="klub-btn" onClick={emailTip}>
                {tx.poslatEmail}
              </button>
              <button type="button" className="klub-btn2" onClick={whatsapp}>
                {tx.poslatWa}
              </button>
              <button type="button" className="klub-btn2" onClick={kopie}>
                {tx.kopirovat}
              </button>
            </div>
            <div className="klub-sub">{tx.pratele}</div>
            {karta.pratele.length === 0 ? (
              <p className="klub-prazdne">{tx.prazdnePratele}</p>
            ) : (
              karta.pratele.map((p, i) => (
                <div className="klub-radek" key={`f-${i}`}>
                  <div className="klub-ik">
                    <IkUser />
                  </div>
                  <div>
                    <div className="klub-t">{p.jmeno}</div>
                    <div className="klub-s">{p.stav}</div>
                  </div>
                </div>
              ))
            )}
            <div className="klub-sub">{tx.kredit}</div>
            {karta.kreditKc <= 0 && karta.kreditCeka <= 0 ? (
              <p className="klub-prazdne">{tx.prazdneKredit}</p>
            ) : (
              <>
                <div className="klub-kr">
                  <div>
                    <b>{formatKc(karta.kreditCeka)}</b>
                    <span>{tx.ceka}</span>
                  </div>
                  <div>
                    <b>{formatKc(karta.kreditKVyplate)}</b>
                    <span>{tx.kVyplate}</span>
                  </div>
                  <div>
                    <b>{formatKc(karta.kreditVyplaceno)}</b>
                    <span>{tx.vyplaceno}</span>
                  </div>
                </div>
                <div className="klub-btns">
                  <button
                    type="button"
                    className="klub-btn"
                    onClick={() => ukazToast(tx.vyplataOk)}
                  >
                    {tx.pozadat}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {!jeDop ? (
          <div className="klub-btns">
            {jeFirma ? (
              <a className="klub-btn" href={poptavkaUrl}>
                {tx.objednat}
              </a>
            ) : (
              <a className="klub-btn" href={poptavkaUrl}>
                {tx.rezervovat}
              </a>
            )}
            <button type="button" className="klub-btn2" onClick={scrollDop}>
              {jeFirma ? tx.doporucitKratke : tx.doporucit}
            </button>
          </div>
        ) : null}
      </div>
      <div className={`klub-toast${toast ? ' is-on' : ''}`} role="status">
        {toast}
      </div>
    </main>
  );
}
