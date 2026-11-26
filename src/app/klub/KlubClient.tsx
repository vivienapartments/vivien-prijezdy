'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { tipZpravaWhatsapp } from '@/lib/doporuceni-komplet-texty';
import { formatKc } from '@/lib/kalendar-texty';
import { klubTexty } from '@/lib/klub-texty';
import { textPosunUrovne, urovenBehemPobytu } from '@/lib/klub-behem-pobytu';
import {
  kartickaGradient,
  KLUB_MODRA,
  KLUB_SEDA_CEKA,
  tonZUrovneId,
} from '@/lib/klub-uroven-ton';
import {
  KLUB_UROVNE_PRO_LADDER,
  pokrokUrovne,
  type KlubKartaPohled,
} from '@/lib/klub-ukazka';
import type { GuideLang } from '@/lib/types';
import { KlubPlochaRadek } from '@/components/KlubPlochaRadek';
import { klubATadyKarta, klubPruvodcePo, klubRamecekPoOdjezduPred, klubRamecekPoOdjezduZa } from '@/lib/klub-podekovani-texty';
import { t as tLang } from '@/lib/i18n';
import { expiredDopis, expiredNadpis, expiredPodpis } from '@/lib/texts';
import './klub.scss';

function IkCal() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

function IkUser() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1-4 4-6 7-6s6 2 7 6" />
    </svg>
  );
}

function IkUserPlus() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.8-3.2 3.2-5 5.5-5s4.7 1.8 5.5 5" />
      <path d="M17 8v6M14 11h6" />
    </svg>
  );
}

function IkBook() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 5.5V21" />
    </svg>
  );
}

function Sipka() {
  return (
    <svg className="klub-sip" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function pocetPrijeli(pratele: { stav: string }[]): number {
  return pratele.filter((p) => /přijel|přijela|přijeli|✓/i.test(p.stav)).length;
}

function barvaPobytu(barva: string | null | undefined): string {
  if (barva === 'ceka' || barva === 'probiha' || barva === 'storno') return barva;
  return 'zapocteno';
}

export default function KlubClient() {
  const [klic, setKlic] = useState('');
  const [karta, setKarta] = useState<KlubKartaPohled | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [nacitam, setNacitam] = useState(true);
  const [ladder, setLadder] = useState(false);
  const [dopOpen, setDopOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [ukazPodekovani, setUkazPodekovani] = useState(false);

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
          const q = new URLSearchParams(window.location.search);
          const demoPrvni = q.get('prvni') === '1';
          const poOdjezdu =
            !json.karta.praveBydli &&
            (json.karta.pobyty?.length || 0) > 0 &&
            !(json.karta.nadchazejici?.length > 0);
          const prvni =
            demoPrvni ||
            (poOdjezdu && !json.karta.podekovaniVidel && !json.karta.ukazka) ||
            (demoPrvni && json.karta.ukazka);
          setUkazPodekovani(Boolean(prvni || (json.karta.ukazka && demoPrvni)));
          if (prvni && !json.karta.ukazka) {
            void fetch('/api/klub/podekovani-videl', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ k: json.karta.tajnyKlic }),
            }).catch(() => undefined);
          }
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

  const behem = useMemo(() => {
    if (!karta) return null;
    return urovenBehemPobytu({
      utrataKc: karta.utrataKc,
      probihajiciKc: karta.praveBydli ? karta.utrataCekaKc || 0 : 0,
      praveBydli: karta.praveBydli,
      jeFirma,
    });
  }, [karta, jeFirma]);

  const pokrok = useMemo(() => {
    if (!karta || !maUroven || !behem) return null;
    return pokrokUrovne(behem.zobrazena.id === karta.urovenId ? karta.utrataKc : behem.ocekavanaUtrataKc, {
      pohled: karta.pohled,
    });
  }, [karta, maUroven, behem]);

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

  if (!karta || chyba || !behem) {
    return (
      <main className="klub-page">
        <div className="klub-chyba">{tx.zadnaKarta}</div>
      </main>
    );
  }

  const prijeli = pocetPrijeli(karta.pratele);
  const maNadchazejici = karta.nadchazejici.length > 0;
  const skromnyZbytek = maNadchazejici && karta.pobyty.length === 0 && !jeDop;
  const maDokoncenePobyty =
    karta.utrataKc > 0 ||
    karta.pobyty.some((p) => p.barva === 'zapocteno' || p.barva === 'probiha');
  const predPrvnim = !jeFirma && !jeDop && !maDokoncenePobyty && !karta.praveBydli;
  const verzeB = Boolean(
    !jeDop && (karta.praveBydli || maNadchazejici),
  );
  const verzeC = !verzeB;

  const ton = tonZUrovneId(jeDop ? 'host' : behem.zobrazena.id);
  const slevaPct = Math.max(5, behem.slevaPct);
  const urovenNazevKarticka = jeDop
    ? tx.doporucitelUroven
    : jeFirma
      ? behem.zobrazena.nazevFirma
      : behem.zobrazena.nazevHost;
  const posun = behem.posuneUroven
    ? textPosunUrovne(behem.zobrazena, jeFirma)
    : null;

  const serazene = [...KLUB_UROVNE_PRO_LADDER].sort((a, b) => a.odKc - b.odKc);
  const idxZobr = serazene.findIndex((u) => u.id === behem.zobrazena.id);
  const aktualni = serazene[idxZobr >= 0 ? idxZobr : 0];
  const dalsi = serazene[(idxZobr >= 0 ? idxZobr : 0) + 1] || null;
  const nazevTed = jeFirma ? aktualni.nazevFirma : aktualni.nazevHost;
  const nazevDalsi = dalsi ? (jeFirma ? dalsi.nazevFirma : dalsi.nazevHost) : null;

  const ceka = karta.utrataCekaKc || 0;
  const utrataGold = karta.utrataKc;
  const stayKc = ceka > 0 ? ceka : 0;
  const stayJeProbiha = karta.praveBydli && stayKc > 0;
  const stayJeNadchazejici = !karta.praveBydli && maNadchazejici && stayKc > 0;
  const cilKc = behem.posuneUroven
    ? Math.max(behem.ocekavanaUtrataKc, 1)
    : dalsi
      ? dalsi.odKc
      : Math.max(utrataGold + (stayJeProbiha ? stayKc : 0), 1);

  let pGold = Math.min(100, (utrataGold / cilKc) * 100);
  let pStay = 0;
  if (behem.posuneUroven) {
    pGold = Math.min(100, (utrataGold / cilKc) * 100);
    pStay = Math.min(100 - pGold, (stayKc / cilKc) * 100);
  } else if (stayJeProbiha || stayJeNadchazejici) {
    pStay = Math.min(100 - pGold, (stayKc / cilKc) * 100);
  }
  const pEnd = pGold + pStay;
  const chybiPo = behem.posuneUroven
    ? 0
    : dalsi
      ? Math.max(0, cilKc - utrataGold - (stayJeProbiha ? stayKc : 0))
      : 0;

  const stayColor = stayJeProbiha ? KLUB_MODRA : stayJeNadchazejici ? KLUB_SEDA_CEKA : ton.acc;
  const barBg =
    pEnd <= 0
      ? ton.mid
      : `linear-gradient(to right, ${ton.acc} 0%, ${ton.acc} ${pGold}%, ${stayColor} ${pGold}%, ${stayColor} ${pEnd}%, ${ton.mid} ${pEnd}%, ${ton.mid} 100%)`;

  const pageStyle = {
    '--acc': ton.acc,
    '--bg': ton.bg,
    '--mid': ton.mid,
    '--tile': ton.tile,
    '--tb': ton.tb,
    '--tx': ton.tx,
    '--sec': ton.sec,
  } as CSSProperties;

  const ladderRows = serazene.map((u, i) => {
    const nazev = jeFirma ? u.nazevFirma : u.nazevHost;
    const jeMe = u.id === behem.zobrazena.id;
    const done = (idxZobr >= 0 ? idxZobr : 0) > i;
    return (
      <div key={u.id} className={jeMe ? 'is-me' : done ? 'is-done' : undefined}>
        <span>
          {nazev} · {u.slevaPct} %
        </span>
        <span>{formatKc(u.odKc)}</span>
      </div>
    );
  });

  const tlacitkaB = (
    <div className="klub-duo">
      <a className="klub-vB" href={poptavkaUrl}>
        <IkCal />
        {jeFirma ? tx.tlacObjednat : tx.tlacRezervovat}
      </a>
      <button type="button" className="klub-vB" onClick={scrollDop}>
        <IkUserPlus />
        {tx.tlacDoporucit}
      </button>
    </div>
  );

  const tlacitkaC = (() => {
    if (jeDop) {
      return (
        <div className="klub-duo">
          <button type="button" className="klub-vC" onClick={scrollDop}>
            <IkUserPlus />
            <b>{tx.tlacDoporucit}</b>
            <i>{tx.tlacPritel}</i>
          </button>
          <a className="klub-vC" href={poptavkaUrl}>
            <IkCal />
            <b>{tx.tlacProSebe}</b>
            <i>{tx.tlacPrvni}</i>
          </a>
        </div>
      );
    }
    if (jeFirma) {
      return (
        <div className="klub-duo">
          <a className="klub-vC" href={poptavkaUrl}>
            <IkCal />
            <b>{tx.tlacObjednat}</b>
            <i>{tx.tlacKolega(slevaPct)}</i>
          </a>
          <button type="button" className="klub-vC" onClick={scrollDop}>
            <IkUserPlus />
            <b>{tx.tlacDoporucit}</b>
            <i>{tx.tlacFirma5}</i>
          </button>
        </div>
      );
    }
    return (
      <div className="klub-duo">
        <a className="klub-vC" href={poptavkaUrl}>
          <IkCal />
          <b>{tx.tlacRezervovat}</b>
          <i>{tx.tlacDalsiPobyt(slevaPct)}</i>
        </a>
        <button type="button" className="klub-vC" onClick={scrollDop}>
          <IkUserPlus />
          <b>{tx.tlacDoporucit}</b>
          <i>{tx.tlacPritel}</i>
        </button>
      </div>
    );
  })();

  return (
    <main className="klub-page" data-uroven={ton.id} style={pageStyle}>
      <div className="klub-shell">
        {ukazPodekovani ? (
          <div className="klub-podekovani-prvni">
            <h2>{tLang(expiredNadpis, lang)}</h2>
            <p>{tLang(expiredDopis, lang)}</p>
            <p className="klub-podekovani-prvni__podpis">{tLang(expiredPodpis, lang)}</p>
            <button
              type="button"
              className="klub-podekovani-prvni__sip"
              onClick={() => {
                document.getElementById('klub-karta-kotva')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {tLang(klubATadyKarta, lang)}
            </button>
          </div>
        ) : null}

        <div id="klub-karta-kotva" />

        <div className="klub-karticka" style={{ background: kartickaGradient(ton) }}>
          <span className="klub-karticka__vtisk klub-karticka__vtisk--tmavy" aria-hidden />
          <span className="klub-karticka__vtisk klub-karticka__vtisk--svetly" aria-hidden />
          <span className="klub-karticka__vtisk klub-karticka__vtisk--zaklad" aria-hidden />
          <div className="klub-karticka__k1">VIVIEN KLUB</div>
          <div className="klub-karticka__k2">{urovenNazevKarticka}</div>
          <div className="klub-karticka__k3">{karta.jmenoZobrazeni}</div>
          <div className="klub-karticka__k4">
            {predPrvnim ? tx.slevaTento : tx.slevaKarticka}{' '}
            <b>{slevaPct} %</b>
          </div>
        </div>

        {ukazPodekovani && verzeC ? (
          <div className="klub-ramecek-po">
            {tLang(klubRamecekPoOdjezduPred, lang)} <b>{urovenNazevKarticka}</b>.{' '}
            {tLang(klubRamecekPoOdjezduZa, lang)} <b>{slevaPct}&nbsp;%</b>.
          </div>
        ) : null}

        {posun ? (
          <div className="klub-up">
            Tímto pobytem jste <b>{posun.nadpis}</b>. {slevaPct} % platí už pro rezervaci, kterou
            uděláte teď.
          </div>
        ) : null}

        {maUroven && !skromnyZbytek ? (
          <div className="klub-hl">
            <div className="klub-pruh-urovne">
              <button type="button" className="klub-pruh-urovne__ted" onClick={() => setLadder((v) => !v)} style={{ background: 'none', border: 0, padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer' }}>
                {nazevTed} · {aktualni.slevaPct} %
              </button>
              <span className="klub-pruh-urovne__dalsi">
                {behem.posuneUroven && posun
                  ? posun.legendaOk
                  : nazevDalsi && dalsi
                    ? `${nazevDalsi} · ${dalsi.slevaPct} %`
                    : tx.nejvyssi}
              </span>
            </div>
            <div className="klub-bar klub-bar--tri" style={{ background: barBg }} aria-hidden />
            <div className="klub-pruh-leg">
              <span className="klub-pruh-leg__pol">
                <i className="is-zap" aria-hidden />
                {tx.pruhVasePobyty}
              </span>
              {stayJeProbiha || stayJeNadchazejici ? (
                <span className="klub-pruh-leg__pol">
                  <i className={stayJeProbiha ? 'is-probiha' : 'is-ceka'} aria-hidden />
                  {stayJeProbiha ? tx.pruhTentoPobyt : tx.pruhNadchazejici}
                </span>
              ) : null}
              <span className="klub-pruh-leg__pol">
                <i className="is-zbyva" aria-hidden />
                {behem.posuneUroven && posun
                  ? posun.legendaOk
                  : tx.pruhZbyva(formatKc(chybiPo))}
              </span>
            </div>
            {ladder ? <div className="klub-ladder">{ladderRows}</div> : null}
          </div>
        ) : null}

        {!jeDop ? (
          <>
            {maNadchazejici ? (
              <section className={`klub-sec${karta.praveBydli ? ' klub-sec--now' : ''}`}>
                <div className={`klub-sn${karta.praveBydli ? ' klub-sn--now' : ''}`}>
                  {karta.praveBydli
                    ? tx.praveBydli
                    : jeFirma
                      ? tx.nadchazejiciFirma
                      : tx.nadchazejici}
                </div>
                {karta.nadchazejici.map((r, i) => (
                  <div className="klub-radek" key={`n-${i}`}>
                    <div className="klub-ik">
                      {jeFirma ? <IkUser /> : r.pruvodceUrl ? <IkBook /> : <IkCal />}
                    </div>
                    <div>
                      <div className="klub-t">{r.nadpis}</div>
                      <div className="klub-s">{r.podnadpis}</div>
                    </div>
                  </div>
                ))}
                {karta.nadchazejici.some((r) => r.pruvodceUrl) ? (
                  <a
                    className="klub-btn-pruvodce"
                    href={karta.nadchazejici.find((r) => r.pruvodceUrl)?.pruvodceUrl || '#'}
                  >
                    {tx.mujPruvodce}
                  </a>
                ) : null}
                {verzeB ? tlacitkaB : null}
              </section>
            ) : null}

            {!skromnyZbytek ? (
              <section className="klub-sec">
                <div className="klub-sn">{jeFirma ? tx.objednanePobyty : tx.mojePobyty}</div>
                {karta.pobyty.length === 0 ? (
                  <p className="klub-prazdne">{tx.prazdnePobyty}</p>
                ) : (
                  <>
                    {karta.pobyty.map((r, i) => {
                      const b = barvaPobytu(r.barva as string);
                      const stav =
                        r.stavText ||
                        (b === 'ceka'
                          ? 'čeká'
                          : b === 'storno'
                            ? 'zrušeno'
                            : 'započítáno');
                      return (
                        <div className={`klub-pobyt klub-pobyt--${b}`} key={`p-${i}`}>
                          <div>
                            <div className="klub-t">{r.nadpis}</div>
                            <div className="klub-s">{r.podnadpis}</div>
                          </div>
                          <div
                            className={`klub-pobyt__stav${
                              b === 'ceka'
                                ? ' is-ceka'
                                : b === 'probiha'
                                  ? ' is-probiha'
                                  : b === 'storno'
                                    ? ' is-storno'
                                    : ''
                            }`}
                          >
                            {stav.split('\n').map((radek, j) => (
                              <span key={j}>
                                {radek}
                                {j === 0 && stav.includes('\n') ? <br /> : null}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <div className="klub-leg">
                      <i className="is-zap" /> započítáno
                      <i className="is-probiha" /> právě bydlí
                      <i className="is-ceka" /> čeká
                    </div>
                  </>
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

        {!karta.skrytDoporuceni || jeDop ? (
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
        ) : null}

        {verzeC ? <div style={{ marginTop: 10 }}>{tlacitkaC}</div> : null}
        {verzeB && !maNadchazejici ? <div style={{ marginTop: 10 }}>{tlacitkaB}</div> : null}

        {/* Po odjezdu: nenápadný průvodce (bod 4) */}
        {verzeC && !jeDop
          ? (() => {
              const url =
                karta.pobyty.find((p) => p.pruvodceUrl)?.pruvodceUrl ||
                karta.nadchazejici.find((p) => p.pruvodceUrl)?.pruvodceUrl ||
                '/nahled';
              return (
                <a className="klub-pruvodce-po" href={url}>
                  {tLang(klubPruvodcePo, lang)}
                </a>
              );
            })()
          : null}

        {/* Bod 6: A / B1 / C úplně dole (nahled-plocha-uz-ma-3-verze) */}
        <KlubPlochaRadek
          lang={lang}
          token={karta.tajnyKlic}
          odkazKarty={
            typeof window !== 'undefined'
              ? `${window.location.origin}/klub?k=${encodeURIComponent(karta.tajnyKlic)}`
              : `/klub?k=${encodeURIComponent(karta.tajnyKlic)}`
          }
        />
      </div>
      <div className={`klub-toast${toast ? ' is-on' : ''}`} role="status">
        {toast}
      </div>
    </main>
  );
}
