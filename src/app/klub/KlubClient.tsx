'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  blizciPrikladRadek1,
  blizciPrikladRadek2,
  blizciPrikladRadek3,
  blizciPrikladRadek4,
  blizciPrikladUvod,
  tipZpravaWhatsapp,
} from '@/lib/doporuceni-komplet-texty';
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
import { klubATadyKarta, klubRamecekPoOdjezdu } from '@/lib/klub-podekovani-texty';
import { pozdravDalsiOtevreni } from '@/lib/klub-pozdravy';
import { t as tLang } from '@/lib/i18n';
import {
  klicPoslednihoDokonceneho,
  parsePodekovaniQuery,
  pocetDokoncenePobyty,
  textyPodekovaniVarianty,
  vyberPodekovaniId,
  type PodekovaniVariantaId,
} from '@/lib/klub-podekovani-varianty';
import { expiredPodpis } from '@/lib/texts';
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

function podnadpisPobytu(r: { podnadpis?: string; stavText?: string }): string | null {
  const pod = (r.podnadpis || '').trim();
  const stav = (r.stavText || '').trim();
  if (!pod || pod === stav || /^započítáno$/i.test(pod)) return null;
  return pod;
}

/** „26.–30. 11. 2026 · Ušlechtilý kontrast · 15 000 Kč“ → sloupce. */
function rozdelNadpisPobytu(nadpis: string): { termin: string; apt: string; castka: string } {
  const parts = (nadpis || '')
    .split(' · ')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 3 && /\d/.test(parts[parts.length - 1]) && /Kč/i.test(parts[parts.length - 1])) {
    return {
      termin: parts[0],
      apt: parts.slice(1, -1).join(' · '),
      castka: parts[parts.length - 1],
    };
  }
  if (parts.length === 2) {
    return { termin: parts[0], apt: parts[1], castka: '' };
  }
  return { termin: nadpis || '', apt: '', castka: '' };
}

export default function KlubClient() {
  const [klic, setKlic] = useState(() => {
    if (typeof window === 'undefined') return '';
    return (new URLSearchParams(window.location.search).get('k') || '').trim();
  });
  const [karta, setKarta] = useState<KlubKartaPohled | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [nacitam, setNacitam] = useState(true);
  const [ladder, setLadder] = useState(false);
  const [dopOpen, setDopOpen] = useState(false);
  /** Po odjezdu: pod vrškem (karta + tlačítka) je zbytek za „Další detaily“. */
  const [detailyOpen, setDetailyOpen] = useState(false);
  /** Pravidla doporučení pod zlatým „i“ (stejný příklad jako po odjezdu). */
  const [dopPravidla, setDopPravidla] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [ukazPodekovani, setUkazPodekovani] = useState(false);
  const [podekovaniId, setPodekovaniId] = useState<PodekovaniVariantaId>('1');
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
    let alive = true;
    const ac = new AbortController();
    const timeout = window.setTimeout(() => ac.abort(), 20000);
    setNacitam(true);
    (async () => {
      try {
        const res = await fetch(`/api/klub/karta?k=${encodeURIComponent(klic)}`, {
          signal: ac.signal,
        });
        const json = (await res.json()) as { ok?: boolean; karta?: KlubKartaPohled; chyba?: string };
        if (!alive) return;
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
            (json.karta.ukazka && demoPrvni);
          setUkazPodekovani(Boolean(prvni));
          // Bez poděkování (např. z mailu): detaily rovnou otevřené, jde zase sbalit.
          setDetailyOpen(Boolean(poOdjezdu && !prvni));
          if (prvni) {
            const qPodek = parsePodekovaniQuery(q.get('podekovani'));
            const pobytKlic = klicPoslednihoDokonceneho(json.karta.pobyty);
            const pocet = pocetDokoncenePobyty(json.karta.pobyty);
            let id: PodekovaniVariantaId | null = qPodek;
            if (!id && json.karta.podekovaniVariantaPobyt === pobytKlic && json.karta.podekovaniVarianta) {
              id = json.karta.podekovaniVarianta as PodekovaniVariantaId;
            }
            if (!id && typeof window !== 'undefined') {
              try {
                const raw = localStorage.getItem(`vivien-klub-podekovani:${json.karta.tajnyKlic}`);
                if (raw) {
                  const j = JSON.parse(raw) as { pobyt?: string; id?: string };
                  if (j.pobyt === pobytKlic && j.id) id = j.id as PodekovaniVariantaId;
                }
              } catch {
                /* paměť */
              }
            }
            if (!id) {
              const pred =
                (json.karta.podekovaniVariantaPred as PodekovaniVariantaId | null) ||
                (json.karta.podekovaniVariantaPobyt !== pobytKlic
                  ? (json.karta.podekovaniVarianta as PodekovaniVariantaId | null)
                  : null);
              id = vyberPodekovaniId({
                pocetDokoncene: pocet,
                seed: `${json.karta.tajnyKlic}|${pobytKlic}|${pocet}`,
                predchoziId: pred,
              });
            }
            setPodekovaniId(id);
            try {
              localStorage.setItem(
                `vivien-klub-podekovani:${json.karta.tajnyKlic}`,
                JSON.stringify({ pobyt: pobytKlic, id }),
              );
            } catch {
              /* paměť */
            }
            if (!json.karta.ukazka) {
              void fetch('/api/klub/podekovani-videl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  k: json.karta.tajnyKlic,
                  varianta: id,
                  pobytKlic,
                }),
              }).catch(() => undefined);
            }
          }
        } else {
          setKarta(null);
          setChyba(json.chyba || 'missing');
        }
      } catch {
        if (alive) {
          setKarta(null);
          setChyba('missing');
        }
      } finally {
        window.clearTimeout(timeout);
        if (alive) setNacitam(false);
      }
    })();
    return () => {
      alive = false;
      ac.abort();
      window.clearTimeout(timeout);
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
  const bookingBez = karta?.bookingRezim === 'bez-klubu';
  const bookingKlub = karta?.bookingRezim === 'po-ubytovani';
  const maUroven = !jeDop && !bookingBez && !bookingKlub;

  const behem = useMemo(() => {
    if (!karta) return null;
    if (bookingKlub) {
      const hostUroven = {
        id: 'host',
        nazevHost: 'Náš host',
        nazevFirma: 'Partner',
        slevaPct: 5,
        odKc: 0,
      };
      return {
        oficielni: hostUroven,
        zobrazena: hostUroven,
        slevaPct: 5,
        posuneUroven: false,
        ocekavanaUtrataKc: 0,
      };
    }
    return urovenBehemPobytu({
      utrataKc: karta.utrataKc,
      probihajiciKc: karta.praveBydli ? karta.utrataCekaKc || 0 : 0,
      praveBydli: karta.praveBydli,
      jeFirma,
    });
  }, [karta, jeFirma, bookingKlub]);

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
    setDetailyOpen(true);
    setDopOpen(true);
    window.setTimeout(() => {
      document.getElementById('klub-dop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, []);

  /** Rezervovat = věrný host z vlastní karty (jméno/telefon předvyplněné). Doporučení kamarádovi zůstává ?od=. */
  const poptavkaUrl = karta
    ? `/poptavka?k=${encodeURIComponent(karta.tajnyKlic)}&lang=${encodeURIComponent(lang)}`
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
  const predPrvnim = !jeFirma && !jeDop && !maDokoncenePobyty && !karta.praveBydli && !bookingKlub;
  const verzeB = Boolean(!jeDop && (karta.praveBydli || maNadchazejici));
  const verzeC = !verzeB;

  const ton = tonZUrovneId(jeDop ? 'host' : bookingKlub ? 'host' : behem.zobrazena.id);
  const slevaPct = bookingKlub ? 5 : Math.max(5, behem.slevaPct);
  const urovenNazevKarticka = jeDop
    ? tx.doporucitelUroven
    : bookingKlub
      ? 'Náš host'
      : jeFirma
        ? behem.zobrazena.nazevFirma
        : behem.zobrazena.nazevHost;
  const posun = !bookingKlub && behem.posuneUroven ? textPosunUrovne(behem.zobrazena, jeFirma) : null;
  const [ramecekPred, ramecekZa = ''] = tLang(klubRamecekPoOdjezdu, lang).split('{sleva}');

  const serazene = [...KLUB_UROVNE_PRO_LADDER].sort((a, b) => a.odKc - b.odKc);
  const idxZobr = serazene.findIndex((u) => u.id === behem.zobrazena.id);
  const idxOfic = serazene.findIndex((u) => u.id === behem.oficielni.id);
  const aktualni = serazene[idxZobr >= 0 ? idxZobr : 0];
  const oficUroven = serazene[idxOfic >= 0 ? idxOfic : 0];
  const dalsi = serazene[(idxZobr >= 0 ? idxZobr : 0) + 1] || null;
  /** Při posunu úrovně vlevo odkud jde (oficiální), ne kam míří. */
  const nazevTed = behem.posuneUroven
    ? jeFirma
      ? oficUroven.nazevFirma
      : oficUroven.nazevHost
    : jeFirma
      ? aktualni.nazevFirma
      : aktualni.nazevHost;
  const pctTed = behem.posuneUroven ? oficUroven.slevaPct : aktualni.slevaPct;
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

  const infoDoporuceni =
    !karta.skrytDoporuceni || jeDop ? (
      <div className="klub-dop-info">
        <button
          type="button"
          className={`klub-dop-info__btn${dopPravidla ? ' is-open' : ''}`}
          aria-expanded={dopPravidla}
          onClick={() => setDopPravidla((v) => !v)}
        >
          <span className="klub-dop-info__i" aria-hidden="true">
            i
          </span>
          <span className="klub-dop-info__veta">{tLang(blizciPrikladUvod, lang)}</span>
          <em className="klub-dop-info__sip" aria-hidden="true">
            {dopPravidla ? '⌃' : '⌄'}
          </em>
        </button>
        {dopPravidla ? (
          <div className="klub-dop-priklad">
            <p>{tLang(blizciPrikladRadek1, lang)}</p>
            <p>{tLang(blizciPrikladRadek2, lang)}</p>
            <p>{tLang(blizciPrikladRadek3, lang)}</p>
            <p className="klub-dop-priklad__pozn">{tLang(blizciPrikladRadek4, lang)}</p>
          </div>
        ) : null}
      </div>
    ) : null;

  const tlacitkaB = (
    <>
      <div className="klub-duo">
        <a className="klub-vB" href={poptavkaUrl}>
          <IkCal />
          {bookingKlub ? 'Rezervovat napřímo' : jeFirma ? tx.tlacObjednat : tx.tlacRezervovat}
        </a>
        <button type="button" className="klub-vB" onClick={scrollDop}>
          <IkUserPlus />
          {tx.tlacDoporucit}
        </button>
      </div>
      {infoDoporuceni}
    </>
  );

  const tlacitkaC = (() => {
    let duo: ReactNode;
    if (jeDop) {
      duo = (
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
    } else if (jeFirma) {
      duo = (
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
    } else {
      duo = (
        <div className="klub-duo">
          <a className="klub-vC" href={poptavkaUrl}>
            <IkCal />
            <b>{bookingKlub ? 'Rezervovat napřímo' : tx.tlacRezervovat}</b>
            <i>{tx.tlacDalsiPobyt(slevaPct)}</i>
          </a>
          <button type="button" className="klub-vC" onClick={scrollDop}>
            <IkUserPlus />
            <b>{tx.tlacDoporucit}</b>
            <i>{tx.tlacPritel}</i>
          </button>
        </div>
      );
    }
    return (
      <>
        {duo}
        {infoDoporuceni}
      </>
    );
  })();

  const pruvodceUrl =
    karta.pobyty.find((p) => p.pruvodceUrl)?.pruvodceUrl ||
    karta.nadchazejici.find((p) => p.pruvodceUrl)?.pruvodceUrl ||
    '/nahled';

  const pozdrav = !ukazPodekovani
    ? pozdravDalsiOtevreni(lang, {
        krestniJmeno: karta.krestniJmeno || karta.jmenoZobrazeni.split(/\s+/)[0] || '',
        posledniOdjezdYmd: karta.posledniOdjezdYmd,
        pristiPrijezdYmd: karta.pristiPrijezdYmd,
        dnesOdjezdPredPredanim: karta.dnesOdjezdPredPredanim,
        praveBydli: karta.praveBydli,
        bookingKlub,
      })
    : null;

  const ukazVyplatu = jeFirma && karta.vyplatyZapnuto;

  const sekceDoporuceni =
    !karta.skrytDoporuceni || jeDop ? (
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
        {dopOpen || jeDop ? (
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
            ) : ukazVyplatu ? (
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
                  <button type="button" className="klub-btn" onClick={() => ukazToast(tx.vyplataOk)}>
                    {tx.pozadat}
                  </button>
                </div>
              </>
            ) : (
              <div className="klub-kr">
                <div>
                  <b>{formatKc(karta.kreditKc)}</b>
                  <span>{tx.vasKredit}</span>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </section>
    ) : null;

  const sekcePobyty =
    !jeDop && !skromnyZbytek ? (
      <section className="klub-sec">
        <div className="klub-sn">{jeFirma ? tx.objednanePobyty : tx.mojePobyty}</div>
        {karta.pobyty.length === 0 ? (
          <p className="klub-prazdne">{tx.prazdnePobyty}</p>
        ) : (
          karta.pobyty.map((r, i) => {
            const b = barvaPobytu(r.barva as string);
            const stav =
              r.stavText ||
              (b === 'ceka' ? 'čeká' : b === 'storno' ? 'zrušeno' : 'započítáno');
            const pod = podnadpisPobytu(r);
            const nepocita = /nepočítá/i.test(stav);
            const dil = rozdelNadpisPobytu(r.nadpis);
            return (
              <div className={`klub-pobyt klub-pobyt--${b}`} key={`p-${i}`}>
                <div className="klub-pobyt__horn">
                  <div className="klub-pobyt__termin">{dil.termin}</div>
                  {dil.castka ? <div className="klub-pobyt__kc">{dil.castka}</div> : null}
                </div>
                <div className="klub-pobyt__dol">
                  <div className="klub-pobyt__apt">{dil.apt || r.nadpis}</div>
                  <div
                    className={`klub-pobyt__stav${
                      nepocita || b === 'ceka'
                        ? ' is-ceka'
                        : b === 'probiha'
                          ? ' is-probiha'
                          : b === 'storno'
                            ? ' is-storno'
                            : ''
                    }`}
                  >
                    {stav}
                  </div>
                </div>
                {pod ? <div className="klub-s klub-pobyt__pod">{pod}</div> : null}
              </div>
            );
          })
        )}
      </section>
    ) : null;

  const sekceFakturace =
    jeFirma && !skromnyZbytek ? (
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
    ) : null;

  const plocha = (
    <KlubPlochaRadek
      lang={lang}
      token={karta.tajnyKlic}
      odkazKarty={
        typeof window !== 'undefined'
          ? `${window.location.origin}/klub?k=${encodeURIComponent(karta.tajnyKlic)}`
          : `/klub?k=${encodeURIComponent(karta.tajnyKlic)}`
      }
    />
  );

  const spodniZbytek = (
    <>
      {sekcePobyty}
      {sekceFakturace}
      {sekceDoporuceni}
      {!verzeB ? plocha : null}
    </>
  );

  /* —— Booking odkaz z Bookingu: jen průvodce, bez klubu —— */
  if (bookingBez) {
    const radek = karta.nadchazejici[0] || karta.pobyty[0];
    const url = radek?.pruvodceUrl || pruvodceUrl;
    return (
      <main className="klub-page" data-uroven="host" style={pageStyle}>
        <div className="klub-shell">
          {pozdrav ? <p className="klub-pozdrav">{pozdrav}</p> : null}
          <div className="klub-bez">
            <div className="klub-bez__logo">VA</div>
            <div className="klub-bez__znacka">VIVIEN APARTMENTS</div>
            <div className="klub-bez__jmeno">{karta.jmenoZobrazeni}</div>
          </div>
          {maNadchazejici || karta.praveBydli ? (
            <section className={`klub-sec${karta.praveBydli ? ' klub-sec--now' : ''}`}>
              <div className={`klub-sn${karta.praveBydli ? ' klub-sn--now' : ''}`}>
                {karta.praveBydli ? tx.praveBydli : tx.nadchazejici}
              </div>
              {(karta.nadchazejici.length
                ? karta.nadchazejici
                : [
                    {
                      nadpis: radek?.nadpis || '',
                      podnadpis: radek?.podnadpis || '',
                      pruvodceUrl: url,
                    },
                  ]
              ).map((r, i) => {
                const pod =
                  karta.praveBydli || !(r.podnadpis || '').trim() ? null : r.podnadpis.trim();
                return (
                  <div className="klub-radek" key={`n-${i}`}>
                    <div className="klub-ik">
                      {jeFirma ? <IkUser /> : <IkCal />}
                    </div>
                    <div>
                      <div className="klub-t">{r.nadpis}</div>
                      {pod ? <div className="klub-s">{pod}</div> : null}
                    </div>
                  </div>
                );
              })}
              <a className="klub-btn-pruvodce" href={url}>
                {tx.mujPruvodce}
              </a>
            </section>
          ) : null}
          <a
            className="klub-plocha-link klub-plocha-link--radek"
            href="https://wa.me/420604692573"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="klub-plocha-link__jedna">
              Napište nám · WhatsApp{' '}
              <span style={{ whiteSpace: 'nowrap' }}>604&nbsp;692&nbsp;573</span>
            </span>
            <em>›</em>
          </a>
          {/* Plocha níž: hlavní nabídka je při otevření z mailu, tady jen připomínka. */}
          {plocha}
        </div>
        <div className={`klub-toast${toast ? ' is-on' : ''}`} role="status">
          {toast}
        </div>
      </main>
    );
  }

  void pokrok;

  return (
    <main className="klub-page" data-uroven={ton.id} style={pageStyle}>
      <div className="klub-shell">
        {ukazPodekovani ? (
          <div className="klub-podekovani-prvni">
            <img
              className="klub-podekovani-prvni__foto"
              src="/email/hlavicka-po-odjezdu.jpg"
              alt=""
              width={600}
              height={280}
            />
            <h2>{textyPodekovaniVarianty(podekovaniId, lang).nadpis}</h2>
            <p>{textyPodekovaniVarianty(podekovaniId, lang).dopis}</p>
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
        ) : pozdrav ? (
          <p className="klub-pozdrav">{pozdrav}</p>
        ) : null}

        <div id="klub-karta-kotva" />

        {/* 1. Kartička */}
        <div className="klub-karticka" style={{ background: kartickaGradient(ton) }}>
          <span className="klub-karticka__vtisk klub-karticka__vtisk--tmavy" aria-hidden />
          <span className="klub-karticka__vtisk klub-karticka__vtisk--svetly" aria-hidden />
          <span className="klub-karticka__vtisk klub-karticka__vtisk--zaklad" aria-hidden />
          <div className="klub-karticka__k1">VIVIEN KLUB</div>
          <div className="klub-karticka__k2">{urovenNazevKarticka}</div>
          <div className="klub-karticka__k3">{karta.jmenoZobrazeni}</div>
          <div className="klub-karticka__k4">
            {bookingKlub
              ? 'sleva na další přímý pobyt'
              : predPrvnim
                ? tx.slevaTento
                : tx.slevaKarticka}{' '}
            <b>{slevaPct} %</b>
          </div>
        </div>

        {/* 2. Rámeček jen když říká něco nového */}
        {posun ? (
          <div className="klub-ramecek-po">
            Tímto pobytem jste <b>{posun.nadpis}</b>. {slevaPct}&nbsp;% platí už pro rezervaci,
            kterou uděláte teď.
          </div>
        ) : null}
        {ukazPodekovani && verzeC && !posun ? (
          <div className="klub-ramecek-po">
            {ramecekPred}
            <b>{slevaPct}</b>
            {ramecekZa}
          </div>
        ) : null}

        {/* 3. Pruh úrovně */}
        {maUroven && !skromnyZbytek ? (
          <div className="klub-hl">
            <div className="klub-pruh-urovne">
              <button
                type="button"
                className="klub-pruh-urovne__ted"
                onClick={() => setLadder((v) => !v)}
                style={{
                  background: 'none',
                  border: 0,
                  padding: 0,
                  color: 'inherit',
                  font: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {nazevTed} · {pctTed} %
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
              {!behem.posuneUroven ? (
                <span className="klub-pruh-leg__pol">
                  <i className="is-zbyva" aria-hidden />
                  {tx.pruhZbyva(formatKc(chybiPo))}
                </span>
              ) : null}
            </div>
            {ladder ? <div className="klub-ladder">{ladderRows}</div> : null}
          </div>
        ) : null}

        {/* 4. Tlačítka C hned pod pruhem */}
        {verzeC ? <div className="klub-tlac-pod-pruhem">{tlacitkaC}</div> : null}

        {/* 5. Průvodce / právě bydlí (B) */}
        {!jeDop && maNadchazejici ? (
          <section className={`klub-sec${karta.praveBydli ? ' klub-sec--now' : ''}`}>
            <div className={`klub-sn${karta.praveBydli ? ' klub-sn--now' : ''}`}>
              {karta.praveBydli
                ? tx.praveBydli
                : jeFirma
                  ? tx.nadchazejiciFirma
                  : tx.nadchazejici}
            </div>
            {karta.nadchazejici.map((r, i) => {
              /** Po předání už „Adresa, příjezd, kódy“ netřeba. Jen před příjezdem. */
              const pod =
                karta.praveBydli || !(r.podnadpis || '').trim() ? null : r.podnadpis.trim();
              return (
                <div className="klub-radek" key={`n-${i}`}>
                  <div className="klub-ik">{jeFirma ? <IkUser /> : <IkCal />}</div>
                  <div>
                    <div className="klub-t">{r.nadpis}</div>
                    {pod ? <div className="klub-s">{pod}</div> : null}
                  </div>
                </div>
              );
            })}
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

        {verzeB && !maNadchazejici ? <div className="klub-tlac-pod-pruhem">{tlacitkaB}</div> : null}

        {/* Při bydlení / předání: Plocha hned pod „Právě u nás bydlíte“, ať to host nepřehlédne. */}
        {verzeB ? plocha : null}

        {/* Po odjezdu: jen vršek (poděkování, karta, tlačítka). Zbytek za Další detaily. */}
        {verzeC ? (
          <div className={`klub-sec klub-dalsi${detailyOpen ? ' is-open' : ''}`}>
            <div className="klub-sn">
              <button
                type="button"
                onClick={() => setDetailyOpen((v) => !v)}
                aria-expanded={detailyOpen}
              >
                <span>Další detaily</span>
                <Sipka />
              </button>
            </div>
            {detailyOpen ? <div className="klub-dalsi__obsah">{spodniZbytek}</div> : null}
          </div>
        ) : (
          spodniZbytek
        )}
      </div>
      <div className={`klub-toast${toast ? ' is-on' : ''}`} role="status">
        {toast}
      </div>
    </main>
  );
}
