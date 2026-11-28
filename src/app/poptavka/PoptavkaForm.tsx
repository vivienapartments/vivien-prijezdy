'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { textBuildVerze } from '@/lib/build-verze';
import { apartmany } from '@/lib/guide-data';
import {
  odkazSmsPoptavky,
  odkazWaPoptavky,
  sestavZpravuPoptavky,
  ymdDnesPraha,
  type PoptavkaKanal,
  type PoptavkaZdroj,
} from '@/lib/poptavka';
import { KontaktTelefony } from '@/components/KontaktTelefony';
import {
  klicPoptavkaKoncept,
  nactiKoncept,
  smazKoncept,
  ulozKoncept,
} from '@/lib/poptavka-koncept';
import {
  coverUrl,
  galerieKompletCoverUrl,
  galerieKompletPolozky,
  galerieUrls,
  odkazKvizAtmosfery,
  POPTAVKA_APARTMANY,
  webLangKod,
} from '@/lib/poptavka-apartmany';
import {
  doporucitelUiTexty,
  klicJazykDoporuceni,
} from '@/lib/poptavka-doporucitel-ui';
import {
  formatDatumPoptavky,
  formatRozsahPoptavky,
  poptavkaTexty,
} from '@/lib/poptavka-texty';
import {
  odpovedHlavni,
  odpovedRozstrel,
  prazdnyPruvodceStav,
  pruvodceText,
  pruvodceZpet,
  type PruvodceStav,
  type QuizAnswerKey,
  type TieAnswerKey,
} from '@/lib/poptavka-pruvodce';
import { GUIDE_LANGS, type AptId, type GuideLang } from '@/lib/types';
import { JazykPrepinac } from './JazykPrepinac';
import { PoptavkaPlochaRoot, PoptavkaPlochaTlacitko } from './PoptavkaPlocha';
import { TelefonPole } from './TelefonPole';
import { nazevDlazdice } from '@/lib/poptavka-nazev-dlazdice';
import { ChytryKalendar } from './ChytryKalendar';
import { VolneTerminyKalendar } from './VolneTerminyKalendar';
import { usePoptavkaKalendar } from './usePoptavkaKalendar';
import { VyberJazyka } from './VyberJazyka';
import { formatKc, kalendarTexty, radekVolnychVTerminu, tvarNoci } from '@/lib/kalendar-texty';
import { nociPobytu } from '@/lib/kalendar-denni';
import { uvodVysledkuVolne, vysledekTexty } from '@/lib/poptavka-vysledek-texty';
import {
  slevaDelkaPct,
  vyslednaSlevaPct,
  VYCHOZI_KLUB_PRAVIDLA,
} from '@/lib/klub-pravidla';
import {
  cenaPoKreditu,
  textSlevyPobytu,
  type SlevaDuvod,
} from '@/lib/klub-poptavka-sleva';
import {
  PRAZDNY_KLUB_POPTAVKA,
  type KlubPoptavkaKontext,
} from '@/lib/klub-poptavka-kontext';
import { POPTAVKA_SLEVA_PCT } from '@/lib/poptavka';
import './poptavka.scss';

const GUIDE_LANG_SET = new Set<string>(GUIDE_LANGS);

export type PoptavkaVstupni = {
  lang: GuideLang;
  zdroj: PoptavkaZdroj;
  firmaKod: string | null;
  firmaNazev: string | null;
  doporucitelKod: string | null;
  /** Jak doporučitel odkaz poslal: e / w / c. */
  sdileni?: string | null;
  token: string | null;
  /** Tajný klíč karty klubu (`?k=`). Věrná poptávka bez e-mailového tokenu. */
  klubKlic?: string | null;
  rezervace: string | null;
  jmeno: string;
  telefon: string;
  /** Zkouška: nic se neukládá. */
  suchyBeh?: boolean;
  /** Klub (dávka 4). Při vypnutém klubu se ignoruje. */
  klub?: KlubPoptavkaKontext;
};

type Krok = 'termin' | 'zpusob' | 'apartmany' | 'pruvodce' | 'kontakt';
type GalerieZpet = 'apartmany' | 'pruvodce';
type GalerieStav =
  | { druh: 'apt'; id: AptId; i: number; zpetNa: GalerieZpet }
  | { druh: 'komplet'; i: number; zpetNa: 'apartmany' }
  | null;

export function PoptavkaForm(props: PoptavkaVstupni) {
  /** Věrný i doporučený host: stejná stavba obrazovek (PROMPT-76 / 77). */
  const vernost = props.zdroj === 'vernost' || props.zdroj === 'doporucitel';
  const doporucitel = props.zdroj === 'doporucitel';
  const suchyBeh = Boolean(props.suchyBeh);
  const klub = props.klub || PRAZDNY_KLUB_POPTAVKA;
  const [lang, setLang] = useState<GuideLang>(props.lang);
  const kal = usePoptavkaKalendar();
  const firma = props.zdroj === 'firma';
  const ukazCeny = kal.cenyZapnuto && !firma;
  const [pouzitKredit, setPouzitKredit] = useState(false);
  const t = poptavkaTexty(lang, props.zdroj, kal.cenyZapnuto);
  const kt = kalendarTexty(lang);
  const uiDop = doporucitel ? doporucitelUiTexty(lang) : null;
  const webLang = webLangKod(lang);
  const dnes = ymdDnesPraha();
  const [krok, setKrok] = useState<Krok>('termin');
  const [prijezd, setPrijezd] = useState('');
  const [odjezd, setOdjezd] = useState('');
  const noci = useMemo(
    () => (prijezd && odjezd ? nociPobytu(prijezd, odjezd).length : 0),
    [prijezd, odjezd],
  );
  const slevaInfo = useMemo(() => {
    if (klub.zapnuto) {
      const jeDoporucenyPrvniPobyt = doporucitel && !klub.maDokoncenyPobyt;
      const pct = vyslednaSlevaPct(
        {
          noci: noci || 1,
          prijezd: prijezd || null,
          jeFirma: klub.jeFirma || firma,
          jeDoporucenyPrvniPobyt,
          jeDoporucitelBezPobytu: klub.jeDoporucitelBezPobytu && props.zdroj === 'vernost',
          maDokoncenyPobyt: klub.maDokoncenyPobyt,
          utrataKc: klub.utrataKc,
        },
        VYCHOZI_KLUB_PRAVIDLA,
      );
      const delka = slevaDelkaPct(noci || 1, VYCHOZI_KLUB_PRAVIDLA);
      let duvod: SlevaDuvod = null;
      if (pct > 0) {
        if (delka >= pct && delka > 0) duvod = 'delka';
        else if (klub.jeFirma || firma) duvod = 'firma';
        else if (jeDoporucenyPrvniPobyt) duvod = 'doporuceny';
        else if (klub.jeDoporucitelBezPobytu) duvod = 'doporucitel';
        else if (klub.maDokoncenyPobyt) duvod = 'staly';
        else duvod = 'cesta';
      }
      return { pct, duvod, text: textSlevyPobytu(pct, duvod) };
    }
    // Bez klubu: sleva v ceně jen věrný / doporučený (firma má text, ne výpočet ceny).
    const pct = vernost ? POPTAVKA_SLEVA_PCT : 0;
    return {
      pct,
      duvod: (vernost ? 'cesta' : null) as SlevaDuvod,
      text: t.sleva || '',
    };
  }, [klub, noci, prijezd, doporucitel, firma, vernost, props.zdroj, t.sleva]);
  const slevaPct = slevaInfo.pct;
  const slevaCesty = slevaPct > 0;
  const [zpusob, setZpusob] = useState<'doporucit' | 'vybrat' | 'pruvodce' | null>(null);
  const [apts, setApts] = useState<AptId[]>([]);
  const [jmeno, setJmeno] = useState(props.jmeno);
  const [telefon, setTelefon] = useState(props.telefon);
  const [telefonChyba, setTelefonChyba] = useState(false);
  const [doprava, setDoprava] = useState<'auto' | 'pesky' | 'nevim' | ''>('');
  const [poznamka, setPoznamka] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [galerie, setGalerie] = useState<GalerieStav>(null);
  const [kalendarOtevren, setKalendarOtevren] = useState(false);
  const [cekam, setCekam] = useState(false);
  const [hotovo, setHotovo] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [pruvodce, setPruvodce] = useState<PruvodceStav>(() => prazdnyPruvodceStav(props.lang));
  const [volneNabidka, setVolneNabidka] = useState<AptId[]>([]);
  const [hledaniTerminu, setHledaniTerminu] = useState<{
    apt: AptId;
    puvodniPrijezd: string;
    puvodniOdjezd: string;
  } | null>(null);
  const [cekamJazyk, setCekamJazyk] = useState(doporucitel);
  const [vyberJazyka, setVyberJazyka] = useState(false);
  const [konceptNacten, setKonceptNacten] = useState(false);
  const krokRef = useRef(krok);
  const zpusobRef = useRef(zpusob);
  const galerieRef = useRef(galerie);
  const kalendarRef = useRef(kalendarOtevren);
  const hledaniRef = useRef(hledaniTerminu);
  /** Zavření kalendáře přes history.back() – popstate už nic dalšího nedělá. */
  const kalendarZavirameRef = useRef(false);
  const buildVerze = textBuildVerze();
  const konceptKlic = klicPoptavkaKoncept({
    zdroj: props.zdroj,
    doporucitelKod: props.doporucitelKod,
    firmaKod: props.firmaKod,
    rezervace: props.rezervace,
  });

  useEffect(() => {
    krokRef.current = krok;
  }, [krok]);
  useEffect(() => {
    zpusobRef.current = zpusob;
  }, [zpusob]);
  useEffect(() => {
    galerieRef.current = galerie;
  }, [galerie]);

  useEffect(() => {
    kalendarRef.current = kalendarOtevren;
  }, [kalendarOtevren]);
  useEffect(() => {
    hledaniRef.current = hledaniTerminu;
  }, [hledaniTerminu]);

  function pushKalendarHistorie() {
    try {
      window.history.pushState({ ppKrok: krokRef.current, ppKalendar: 1 }, '');
    } catch {
      /* */
    }
  }

  function zavriKalendarHistorii() {
    try {
      const st = window.history.state as { ppKalendar?: number } | null;
      if (st && st.ppKalendar) {
        kalendarZavirameRef.current = true;
        window.history.back();
      }
    } catch {
      /* */
    }
  }

  function nastavKalendarOtevren(otevreno: boolean) {
    if (otevreno) {
      if (kalendarRef.current || hledaniRef.current) return;
      kalendarRef.current = true;
      setKalendarOtevren(true);
      pushKalendarHistorie();
      return;
    }
    if (!kalendarRef.current && !kalendarOtevren) return;
    kalendarRef.current = false;
    setKalendarOtevren(false);
    zavriKalendarHistorii();
  }

  function otevriHledaniTerminu(apt: AptId) {
    if (!prijezd || !odjezd) return;
    if (kalendarRef.current || hledaniRef.current) return;
    hledaniRef.current = { apt, puvodniPrijezd: prijezd, puvodniOdjezd: odjezd };
    setHledaniTerminu({ apt, puvodniPrijezd: prijezd, puvodniOdjezd: odjezd });
    pushKalendarHistorie();
  }

  function zavriHledaniTerminu() {
    if (!hledaniRef.current && !hledaniTerminu) return;
    hledaniRef.current = null;
    setHledaniTerminu(null);
    zavriKalendarHistorii();
  }

  function vyberHledanyTermin(novyPrijezd: string, novyOdjezd: string) {
    const apt = hledaniRef.current?.apt || hledaniTerminu?.apt;
    hledaniRef.current = null;
    setHledaniTerminu(null);
    zavriKalendarHistorii();
    if (!apt) return;
    setPrijezd(novyPrijezd);
    setOdjezd(novyOdjezd);
    setApts([apt]);
    setGalerie(null);
    setChyba(null);
    jdiNaKrok('kontakt');
  }

  function jdiNaKrok(novy: Krok, opts?: { nahradit?: boolean }) {
    setKrok(novy);
    try {
      if (opts?.nahradit) window.history.replaceState({ ppKrok: novy }, '');
      else window.history.pushState({ ppKrok: novy }, '');
    } catch {
      /* */
    }
  }

  function predchoziKrok(aktualni: Krok, z: typeof zpusob): Krok {
    if (aktualni === 'kontakt') {
      if (z === 'vybrat') return 'apartmany';
      if (z === 'pruvodce') return 'pruvodce';
      return 'zpusob';
    }
    if (aktualni === 'apartmany' || aktualni === 'pruvodce') return 'zpusob';
    if (aktualni === 'zpusob') return 'termin';
    return 'termin';
  }

  useEffect(() => {
    if (!doporucitel) {
      setCekamJazyk(false);
      return;
    }
    try {
      const k = klicJazykDoporuceni(props.doporucitelKod || '');
      const ulozeny = localStorage.getItem(k);
      if (ulozeny && GUIDE_LANG_SET.has(ulozeny)) {
        setLang(ulozeny as GuideLang);
        setVyberJazyka(false);
      } else {
        setVyberJazyka(true);
      }
    } catch {
      setVyberJazyka(true);
    }
    setCekamJazyk(false);
  }, [doporucitel, props.doporucitelKod]);

  useEffect(() => {
    const k = nactiKoncept(konceptKlic);
    if (k) {
      setKrok(k.krok);
      setPrijezd(k.prijezd);
      setOdjezd(k.odjezd);
      setZpusob(k.zpusob);
      setApts(k.apts);
      /* Věrný host: jméno a telefon vždy z karty, starý koncept je nepřepíše. */
      if (props.zdroj !== 'vernost') {
        if (k.jmeno) setJmeno(k.jmeno);
        if (k.telefon) setTelefon(k.telefon);
      }
      setPoznamka(k.poznamka);
      setDoprava(k.doprava);
      if (GUIDE_LANG_SET.has(k.lang)) setLang(k.lang);
      try {
        window.history.replaceState({ ppKrok: k.krok }, '');
      } catch {
        /* */
      }
    } else {
      try {
        window.history.replaceState({ ppKrok: 'termin' }, '');
      } catch {
        /* */
      }
    }
    if (props.zdroj === 'vernost') {
      if (props.jmeno.trim()) setJmeno(props.jmeno.trim());
      if (props.telefon.trim()) setTelefon(props.telefon.trim());
    }
    setKonceptNacten(true);
  }, [konceptKlic, props.zdroj, props.jmeno, props.telefon]);

  useEffect(() => {
    if (!konceptNacten || hotovo) return;
    ulozKoncept(konceptKlic, {
      krok,
      prijezd,
      odjezd,
      zpusob,
      apts,
      jmeno,
      telefon,
      poznamka,
      doprava,
      lang,
    });
  }, [
    konceptNacten,
    hotovo,
    konceptKlic,
    krok,
    prijezd,
    odjezd,
    zpusob,
    apts,
    jmeno,
    telefon,
    poznamka,
    doprava,
    lang,
  ]);

  useEffect(() => {
    if (hotovo) smazKoncept(konceptKlic);
  }, [hotovo, konceptKlic]);

  useEffect(() => {
    function naZpet(e: PopStateEvent) {
      if (galerieRef.current) {
        setGalerie(null);
        try {
          window.history.pushState({ ppKrok: krokRef.current }, '');
        } catch {
          /* */
        }
        return;
      }
      if (kalendarZavirameRef.current) {
        kalendarZavirameRef.current = false;
        return;
      }
      if (kalendarRef.current) {
        kalendarRef.current = false;
        setKalendarOtevren(false);
        return;
      }
      if (hledaniRef.current) {
        hledaniRef.current = null;
        setHledaniTerminu(null);
        return;
      }
      const zeStavu = (e.state as { ppKrok?: Krok } | null)?.ppKrok;
      if (zeStavu === 'termin' || zeStavu === 'zpusob' || zeStavu === 'apartmany' || zeStavu === 'pruvodce' || zeStavu === 'kontakt') {
        setKrok(zeStavu);
        return;
      }
      const ted = krokRef.current;
      if (ted === 'termin') return;
      const zpet = predchoziKrok(ted, zpusobRef.current);
      setKrok(zpet);
      try {
        window.history.pushState({ ppKrok: zpet }, '');
      } catch {
        /* */
      }
    }
    window.addEventListener('popstate', naZpet);
    return () => window.removeEventListener('popstate', naZpet);
  }, []);

  const libovolny = zpusob === 'doporucit';
  const dopravaOdeslat = vernost ? null : doprava || null;

  const zprava = useMemo(
    () =>
      sestavZpravuPoptavky({
        zdroj: props.zdroj,
        firmaKod: props.firmaKod,
        firmaNazev: props.firmaNazev,
        doporucitelKod: props.doporucitelKod,
        rezervace: props.rezervace,
        jmeno,
        telefon,
        prijezd,
        odjezd,
        apartmany: libovolny ? [] : apts,
        libovolnyApartman: libovolny,
        doprava: dopravaOdeslat,
        poznamka,
        jazyk: lang,
        cenaKc: (() => {
          if (!ukazCeny || !prijezd || !odjezd) return null;
          const c = kal.cenaProVyber(prijezd, odjezd, apts, libovolny, slevaPct);
          return c ? (slevaCesty ? c.seSlevou : c.suma) : null;
        })(),
        cenaSeSlevou: slevaCesty && ukazCeny,
      }),
    [props, jmeno, telefon, prijezd, odjezd, apts, libovolny, dopravaOdeslat, poznamka, lang, ukazCeny, slevaCesty, slevaPct, kal],
  );

  const wa = odkazWaPoptavky(zprava);
  const ios = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const sms = odkazSmsPoptavky(zprava, ios);

  /** Při zvoleném termínu jen apartmány volné ve všech nocích. Bez termínu = všech 5. */
  const volneProGalerii = useMemo(() => {
    if (!prijezd || !odjezd) return null;
    return kal.volneApty(prijezd, odjezd);
  }, [prijezd, odjezd, kal.volneApty]);

  const galerieKomplet = useMemo(
    () =>
      galerie?.druh === 'komplet' ? galerieKompletPolozky(webLang, volneProGalerii) : [],
    [galerie?.druh, webLang, volneProGalerii],
  );
  const galerieFotky =
    galerie?.druh === 'apt'
      ? (() => {
          const a = POPTAVKA_APARTMANY.find((x) => x.id === galerie.id);
          return a ? galerieUrls(webLang, a) : [];
        })()
      : galerieKomplet.map((p) => p.url);
  const galerieIndex = galerie?.i ?? 0;
  const galerieAptId: AptId | null =
    galerie?.druh === 'apt'
      ? galerie.id
      : galerie?.druh === 'komplet'
        ? galerieKomplet[Math.min(galerieIndex, Math.max(0, galerieKomplet.length - 1))]?.aptId ??
          null
        : null;

  function nazevApt(id: AptId): string {
    const a = apartmany.find((x) => x.id === id);
    return lang === 'cs' ? a?.nazev.cs || id : a?.nazev.en || id;
  }

  function nazevNaDlazdici(id: AptId): string {
    return nazevDlazdice(id, lang, nazevApt(id));
  }

  function overTermin(): boolean {
    if (!prijezd || !odjezd || odjezd <= prijezd) {
      setChyba(t.chybaTermin);
      return false;
    }
    if (kal.nacteno && kal.terminPlny(prijezd, odjezd)) {
      setChyba(kt.terminBezVolneho);
      return false;
    }
    setChyba(null);
    return true;
  }

  function nastavNejblizsiTermin() {
    if (!prijezd || !odjezd) return;
    const nab = kal.nejblizsi(prijezd, odjezd);
    if (!nab.length) return;
    setPrijezd(nab[0].prijezd);
    setOdjezd(nab[0].odjezd);
    setChyba(null);
  }

  const cenaVyberu =
    ukazCeny && prijezd && odjezd
      ? kal.cenaProVyber(prijezd, odjezd, apts, libovolny, slevaPct)
      : null;
  const nociPocet = prijezd && odjezd ? nociPobytu(prijezd, odjezd).length : 0;
  const cenaGalerie =
    ukazCeny && prijezd && odjezd && galerieAptId
      ? kal.cenaProVyber(prijezd, odjezd, [galerieAptId], false, slevaPct)
      : null;

  function telefonOk(rawIn?: string): boolean {
    const raw = (rawIn ?? telefon).trim();
    if (!raw) return false;
    try {
      return isValidPhoneNumber(raw);
    } catch {
      return false;
    }
  }

  async function odeslat(kanal: PoptavkaKanal = 'formular') {
    setChyba(null);
    if (!overTermin()) return;
    if ((zpusob === 'vybrat' || zpusob === 'pruvodce') && !apts.length && !libovolny) {
      setChyba(t.chybaApartman);
      return;
    }
    const jmenoOdeslat = (jmeno.trim() || props.jmeno.trim()).slice(0, 120);
    const telefonOdeslat = (telefon.trim() || props.telefon.trim()).slice(0, 40);
    if (!jmenoOdeslat) {
      setChyba(t.chybaKontakt);
      return;
    }
    if (!telefonOk(telefonOdeslat)) {
      setTelefonChyba(true);
      return;
    }
    setTelefonChyba(false);
    setCekam(true);
    let ulozOk = false;
    try {
      const res = await fetch('/api/poptavka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: props.token,
          k: props.klubKlic || undefined,
          f: props.firmaKod,
          od: props.doporucitelKod,
          sdileni: props.sdileni || undefined,
          jmeno: jmenoOdeslat,
          telefon: telefonOdeslat,
          prijezd,
          odjezd,
          apartmany: libovolny ? [] : apts,
          libovolnyApartman: libovolny,
          doprava: dopravaOdeslat,
          poznamka,
          lang: lang,
          honeypot,
          kanal,
          zkouska: suchyBeh || undefined,
          slevaPct: slevaPct > 0 ? slevaPct : undefined,
          pouzitKredit: pouzitKredit || undefined,
          kreditKc: pouzitKredit ? klub.kreditKc : undefined,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        duvod?: string;
        nabidka?: AptId[];
      };
      ulozOk = Boolean(json.ok);
      if (!json.ok && kanal === 'formular') {
        if (json.duvod === 'blok') setChyba(t.chybaBlok);
        else if (json.duvod === 'termin') setChyba(t.chybaTermin);
        else if (json.duvod === 'kontakt') setChyba(t.chybaKontakt);
        else if (json.duvod === 'obsazeno') {
          setChyba(kt.aptObsazenOdeslani);
          if (Array.isArray(json.nabidka) && json.nabidka.length) {
            setVolneNabidka(json.nabidka);
          }
        } else setChyba(t.chybaObecna);
        return;
      }
    } catch {
      if (kanal === 'formular') {
        setChyba(t.chybaObecna);
        return;
      }
    } finally {
      setCekam(false);
    }

    if (kanal === 'whatsapp' || kanal === 'sms') {
      const cil = kanal === 'whatsapp' ? wa : sms;
      try {
        sessionStorage.setItem('poptavka-diky', '1');
      } catch {
        /* ignorovat */
      }
      smazKoncept(konceptKlic);
      setHotovo(true);
      try {
        window.location.href = cil;
      } catch {
        /* ignorovat */
      }
      return;
    }

    if (ulozOk) {
      smazKoncept(konceptKlic);
      setHotovo(true);
    }
  }

  function resetPruvodce() {
    setPruvodce(prazdnyPruvodceStav(lang));
  }

  function pokracujSApartmanem(id: AptId) {
    setApts([id]);
    setGalerie(null);
    setChyba(null);
    jdiNaKrok('kontakt');
  }

  const souhrnTerminu =
    prijezd && odjezd
      ? vernost
        ? formatRozsahPoptavky(prijezd, odjezd, lang)
        : `${formatDatumPoptavky(prijezd, lang)} → ${formatDatumPoptavky(odjezd, lang)}`
      : '';

  const souhrnVyberu = libovolny
    ? t.zpusobDoporucit
    : apts.length
      ? apts.map(nazevApt).join(', ')
      : '';

  const malyRadekVernost =
    vernost && krok === 'kontakt' && souhrnTerminu
      ? `${souhrnTerminu}${souhrnVyberu ? `\u00a0·\u00a0${souhrnVyberu}` : ''}`
      : '';

  /**
   * Tmavá cesta: věrný host svoje fotky, doporučený v kroku 1 večerní zahradu.
   * 1 termín / 2 stropy / konec dům. Apartmány beze změny.
   */
  const heroVernost = vernost
    ? hotovo
      ? '/pruvodce/zahrada/zahrada-5-celkovy-pohled.jpg'
      : krok === 'termin'
        ? doporucitel
          ? '/poptavka/doporuceny-zahrada-vecer.webp'
          : '/pruvodce/zahrada-po-odjezdu.jpg'
        : krok === 'zpusob'
          ? galerieKompletCoverUrl(webLang)
          : null
    : null;
  const heroVecer = Boolean(doporucitel && krok === 'termin' && heroVernost);

  const ukazLogo = !vernost || krok === 'termin' || hotovo || Boolean(heroVernost);
  /** Termín věrnosti: karta přes okno, fotka vyplní místo (jako Děkujeme). */
  const kartaTermin = Boolean(vernost && !hotovo && krok === 'termin');
  /** Krátké kroky vyplní výšku. Apartmány a Kontakt necháváme jako dnes. */
  const kartaVypln =
    !galerie && !hotovo && !kartaTermin && krok !== 'apartmany' && krok !== 'kontakt';
  /** Po odeslání: karta přes okno, fotka vyplní zbylé místo. */
  const kartaDekujeme = Boolean(vernost && hotovo);
  /** Věrnost: kontakty jen na Kontakt a Děkujeme. Ostatní cesty beze změny. */
  const ukazPaticku = !vernost || hotovo || krok === 'kontakt';

  function ikonaVolby(druh: 'vybrat' | 'doporucit' | 'pruvodce'): ReactNode {
    const stroke = {
      fill: 'none' as const,
      stroke: '#c9a84c',
      strokeWidth: 1.5,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      width: 30,
      height: 30,
      viewBox: '0 0 24 24',
      'aria-hidden': true as const,
    };
    if (druh === 'vybrat') {
      return (
        <span className="pp__volba-ikona" aria-hidden="true">
          <svg {...stroke}>
            <rect x="7" y="3" width="14" height="12" rx="2" />
            <path d="M3 7v11a2 2 0 0 0 2 2h12" />
            <circle cx="12" cy="7.5" r="1.3" />
            <path d="M21 12l-3.5-3.5L10 15" />
          </svg>
        </span>
      );
    }
    if (druh === 'doporucit') {
      return (
        <span className="pp__volba-ikona" aria-hidden="true">
          <svg {...stroke}>
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
            <path d="M12 8.5l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z" />
          </svg>
        </span>
      );
    }
    return (
      <span className="pp__volba-ikona" aria-hidden="true">
        <svg {...stroke}>
          <circle cx="12" cy="12" r="9" />
          <path d="M15.5 8.5l-2 5-5 2 2-5z" />
        </svg>
      </span>
    );
  }

  if (cekamJazyk) {
    return <main className="pp pp--vernost pp--doporuceny" lang={lang} />;
  }
  if (doporucitel && vyberJazyka) {
    return (
      <VyberJazyka
        lang={lang}
        onLang={setLang}
        daleText={t.dale}
        onDale={() => {
          try {
            localStorage.setItem(klicJazykDoporuceni(props.doporucitelKod || ''), lang);
          } catch {
            /* */
          }
          setVyberJazyka(false);
        }}
      />
    );
  }

  return (
    <PoptavkaPlochaRoot lang={lang}>
    <main
      className={`pp${vernost ? ' pp--vernost' : ''}${doporucitel ? ' pp--doporuceny' : ''}`}
      lang={lang}
    >
      <div
        className={`pp__karta${heroVernost ? ' pp__karta--s-herem' : ''}${kartaVypln ? ' pp__karta--vypln' : ''}${kartaTermin ? ' pp__karta--termin' : ''}${kartaDekujeme ? ' pp__karta--dekujeme' : ''}${krok === 'zpusob' ? ' pp__karta--zpusob' : ''}${krok === 'kontakt' ? ' pp__karta--kontakt' : ''}`}
      >
        {heroVernost ? (
          <div
            className={`pp__hero${
              hotovo
                ? ' pp__hero--dum'
                : krok === 'zpusob'
                  ? ' pp__hero--stropy'
                  : heroVecer
                    ? ' pp__hero--vecer'
                    : ' pp__hero--zahrada'
            }`}
            style={{ backgroundImage: `url('${heroVernost}')` }}
            role="img"
            aria-label=""
          >
            {!hotovo && krok === 'termin' ? (
              <JazykPrepinac lang={lang} onLang={setLang} />
            ) : null}
          </div>
        ) : !hotovo && krok === 'termin' ? (
          <div className="pp__lang-wrap">
            <JazykPrepinac lang={lang} onLang={setLang} />
          </div>
        ) : null}
        <div className="pp__telo">
        {ukazLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="pp__logo"
            src="/pruvodce/va-logo-192.png"
            width={56}
            height={56}
            alt="VIVIEN Apartments"
          />
        ) : null}
        {!vernost ? (
          <>
            <h1>{t.nadpis}</h1>
            {props.firmaNazev ? (
              <p className="pp__firma">{t.firmaRadek.replace('{firma}', props.firmaNazev)}</p>
            ) : null}
            {!hotovo ? <p className="pp__uvod">{t.uvod}</p> : null}
            {slevaInfo.text ? <p className="pp__sleva">{slevaInfo.text}</p> : null}
          </>
        ) : null}
        {vernost && !hotovo && krok === 'termin' ? (
          <>
            <h1>{t.nadpis}</h1>
            {doporucitel && uiDop ? (
              <p className="pp__uvod">
                {uiDop.poptavkaVeta}{' '}
                <span className="pp__sleva-inline">{uiDop.poptavkaSleva}</span>{' '}
                {uiDop.poptavkaNapoveda}
              </p>
            ) : (
              <p className="pp__uvod">{t.uvod}</p>
            )}
          </>
        ) : null}
        {vernost && hotovo ? <h1>{t.nadpisOdeslano}</h1> : null}

        {hotovo ? (
          <>
            <p className="pp__dekujeme">
              {t.dekujeme}
              {t.dekujemeVolejte ? (
                <>
                  <br />
                  <span className="pp__dekujeme-volejte">{t.dekujemeVolejte}</span>
                </>
              ) : null}
            </p>
            {vernost ? <PoptavkaPlochaTlacitko sTelefonem /> : null}
          </>
        ) : (
          <>
            {krok === 'termin' ? (
              <section>
                {!vernost ? <h2 className="pp__krok">{t.krokTermin}</h2> : null}
                <ChytryKalendar
                  lang={lang}
                  dnes={dnes}
                  dny={kal.dny}
                  bezApt={kal.bezApt}
                  prijezd={prijezd}
                  odjezd={odjezd}
                  onPrijezd={(ymd) => {
                    setPrijezd(ymd);
                    setChyba(null);
                  }}
                  onOdjezd={(ymd) => {
                    setOdjezd(ymd);
                    setChyba(null);
                  }}
                  labelPrijezd={t.prijezd}
                  labelOdjezd={t.odjezd}
                  ukazCeny={ukazCeny}
                  sleva={slevaCesty}
                  cenaSuma={cenaVyberu?.suma ?? null}
                  cenaSeSlevou={cenaVyberu?.seSlevou ?? null}
                  daleLabel={t.dale}
                  onDale={() => {
                    if (overTermin()) jdiNaKrok('zpusob');
                  }}
                  chyba={chyba === kt.terminBezVolneho ? chyba : null}
                  ukazNejblizsiLabel={kt.ukazNejblizsi}
                  onNejblizsi={nastavNejblizsiTermin}
                  otevreno={kalendarOtevren}
                  onOtevreno={nastavKalendarOtevren}
                />
                {chyba && chyba !== kt.terminBezVolneho ? <p className="pp__chyba">{chyba}</p> : null}
              </section>
            ) : null}

            {krok === 'zpusob' ? (
              <section>
                {vernost ? (
                  <>
                    {malyRadekVernost ? <p className="pp__maly-radek">{malyRadekVernost}</p> : null}
                    <h1 className="pp__nadpis-krok">{t.nadpisZpusob}</h1>
                    <button
                      type="button"
                      className={`pp__volba pp__volba--ikona${zpusob === 'vybrat' ? ' is-on' : ''}`}
                      onClick={() => {
                        setZpusob('vybrat');
                        jdiNaKrok('apartmany');
                      }}
                    >
                      {ikonaVolby('vybrat')}
                      <span className="pp__volba-text">
                        <strong>{t.zpusobVybrat}</strong>
                        <span>{t.zpusobVybratPopis}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`pp__volba pp__volba--ikona${zpusob === 'doporucit' ? ' is-on' : ''}`}
                      onClick={() => {
                        setZpusob('doporucit');
                        setApts([]);
                        jdiNaKrok('kontakt');
                      }}
                    >
                      {ikonaVolby('doporucit')}
                      <span className="pp__volba-text">
                        <strong>{t.zpusobDoporucit}</strong>
                        <span>{t.zpusobDoporucitPopis}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`pp__volba pp__volba--ikona${zpusob === 'pruvodce' ? ' is-on' : ''}`}
                      onClick={() => {
                        setZpusob('pruvodce');
                        resetPruvodce();
                        setApts([]);
                        jdiNaKrok('pruvodce');
                      }}
                    >
                      {ikonaVolby('pruvodce')}
                      <span className="pp__volba-text">
                        <strong>{t.zpusobPruvodce}</strong>
                        <span>{t.zpusobPruvodcePopis}</span>
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="pp__krok">{t.krokZpusob}</h2>
                    <button
                      type="button"
                      className={`pp__volba${zpusob === 'doporucit' ? ' is-on' : ''}`}
                      onClick={() => {
                        setZpusob('doporucit');
                        setApts([]);
                        jdiNaKrok('kontakt');
                      }}
                    >
                      <strong>{t.zpusobDoporucit}</strong>
                      <span>{t.zpusobDoporucitPopis}</span>
                    </button>
                    <button
                      type="button"
                      className={`pp__volba${zpusob === 'vybrat' ? ' is-on' : ''}`}
                      onClick={() => {
                        setZpusob('vybrat');
                        jdiNaKrok('apartmany');
                      }}
                    >
                      <strong>{t.zpusobVybrat}</strong>
                      <span>{t.zpusobVybratPopis}</span>
                    </button>
                  </>
                )}
                <button type="button" className="pp__btn pp__btn--sms" onClick={() => jdiNaKrok('termin')}>
                  {t.zpet}
                </button>
              </section>
            ) : null}

            {krok === 'pruvodce' ? (
              <section className={pruvodce.phase === 'result' ? 'pp__vysledek' : undefined}>
                {pruvodce.phase === 'result' ? null : malyRadekVernost ? (
                  <p className="pp__maly-radek">{malyRadekVernost}</p>
                ) : null}
                {pruvodce.phase === 'result' && pruvodce.result ? (
                  <>
                    {(() => {
                      const r = pruvodce.result!;
                      const vt = vysledekTexty(lang);
                      const ranked = r.ranked?.length
                        ? r.ranked
                        : ([r.primary, ...r.alternatives] as AptId[]);
                      const volneIds =
                        prijezd && odjezd
                          ? kal.volneApty(prijezd, odjezd)
                          : ranked.slice();
                      const volnePoradi = ranked.filter((id) => volneIds.includes(id));
                      const idealObsazen =
                        Boolean(prijezd && odjezd) && !volneIds.includes(r.primary);
                      let volbaCislo = 0;
                      return (
                        <>
                          <p className="pp__maly-radek pp__vysledek-uvod">
                            {uvodVysledkuVolne(lang, volnePoradi.length)}
                          </p>
                          <div className="pp__vysledek-karty">
                            {volnePoradi.map((id) => {
                              volbaCislo += 1;
                              const a = POPTAVKA_APARTMANY.find((x) => x.id === id);
                              if (!a) return null;
                              const jePrvni = volbaCislo === 1;
                              const fotkyApt = galerieUrls(webLang, a);
                              const cenaApt =
                                ukazCeny && prijezd && odjezd
                                  ? kal.cenaProVyber(prijezd, odjezd, [id], false, slevaPct)
                                  : null;
                              return (
                                <div
                                  key={id}
                                  className={`pp__vysledek-karta${jePrvni ? ' is-prvni' : ''}`}
                                >
                                  <button
                                    type="button"
                                    className="pp__vysledek-karta-foto"
                                    onClick={() =>
                                      setGalerie({ druh: 'apt', id, i: 0, zpetNa: 'pruvodce' })
                                    }
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={fotkyApt[0] || coverUrl(webLang, a)}
                                      alt=""
                                      width={400}
                                      height={260}
                                    />
                                    <span className="pp__vysledek-stitok">{vt.volba(volbaCislo)}</span>
                                    <span className="pp__vysledek-fotky" aria-hidden="true">
                                      1/{Math.max(1, fotkyApt.length)}
                                    </span>
                                  </button>
                                  <p className="pp__vysledek-karta-nazev">{nazevApt(id)}</p>
                                  {cenaApt ? (
                                    <p className="pp__vysledek-karta-cena">
                                      {slevaCesty && cenaApt.seSlevou !== cenaApt.suma ? (
                                        <>
                                          <s className="pp__chytry-skrt">
                                            {formatKc(cenaApt.suma)}
                                          </s>{' '}
                                          <b>{formatKc(cenaApt.seSlevou)}</b>
                                        </>
                                      ) : (
                                        <b>{formatKc(cenaApt.suma)}</b>
                                      )}{' '}
                                      {kt.zaPobyt}
                                    </p>
                                  ) : null}
                                  <button
                                    type="button"
                                    className={
                                      jePrvni
                                        ? 'pp__btn pp__btn--hlavni'
                                        : 'pp__btn pp__btn--sms pp__btn--mensi'
                                    }
                                    onClick={() => pokracujSApartmanem(id)}
                                  >
                                    {jePrvni ? t.pruvodceVybrat || t.vybratTento : t.vybratTento}
                                  </button>
                                </div>
                              );
                            })}
                            {idealObsazen ? (
                              <div className="pp__vysledek-karta is-obsazeno">
                                <div className="pp__vysledek-karta-foto is-static">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={coverUrl(
                                      webLang,
                                      POPTAVKA_APARTMANY.find((x) => x.id === r.primary)!,
                                    )}
                                    alt=""
                                    width={400}
                                    height={260}
                                  />
                                  <span className="pp__vysledek-stitok">{vt.obsazene}</span>
                                </div>
                                <p className="pp__maly-radek">{vt.sedeloBy}</p>
                                <p className="pp__vysledek-karta-nazev">{nazevApt(r.primary)}</p>
                                <button
                                  type="button"
                                  className="pp__vysledek-odkaz"
                                  onClick={() => otevriHledaniTerminu(r.primary)}
                                >
                                  {vt.najitTermin}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </>
                      );
                    })()}
                    <div className="pp__vysledek-zpet">
                      <button type="button" className="pp__btn pp__btn--sms" onClick={resetPruvodce}>
                        {t.pruvodceZnovu}
                      </button>
                      <button
                        type="button"
                        className="pp__btn pp__btn--sms"
                        onClick={() => jdiNaKrok('zpusob')}
                      >
                        {t.zpet}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h1 className="pp__nadpis-krok">{t.nadpisPruvodce}</h1>
                    <p className="pp__maly-radek">{pruvodce.questionCounter}</p>
                    <p className="pp__cena" style={{ textAlign: 'center' }}>
                      {pruvodce.question?.text}
                    </p>
                    {pruvodce.question?.options.map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        className="pp__volba"
                        onClick={() => {
                          if (pruvodce.phase === 'tie') {
                            setPruvodce(
                              odpovedRozstrel(
                                lang,
                                pruvodce.mainAnswers,
                                pruvodce.tieBoosts,
                                o.key as TieAnswerKey,
                              ),
                            );
                          } else {
                            setPruvodce(
                              odpovedHlavni(
                                lang,
                                pruvodce.mainAnswers,
                                pruvodce.tieBoosts,
                                o.key as QuizAnswerKey,
                              ),
                            );
                          }
                        }}
                      >
                        <strong>{o.text}</strong>
                      </button>
                    ))}
                    {pruvodce.mainAnswers.length > 0 || pruvodce.tieBoosts.length > 0 ? (
                      <button
                        type="button"
                        className="pp__btn pp__btn--sms"
                        onClick={() =>
                          setPruvodce(
                            pruvodceZpet(lang, pruvodce.mainAnswers, pruvodce.tieBoosts),
                          )
                        }
                      >
                        {pruvodceText(lang, 'quiz.ui.back')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="pp__btn pp__btn--sms"
                        onClick={() => jdiNaKrok('zpusob')}
                      >
                        {t.zpet}
                      </button>
                    )}
                  </>
                )}
              </section>
            ) : null}

            {krok === 'apartmany' ? (
              <section>
                {vernost ? (
                  <>
                    {malyRadekVernost ? <p className="pp__maly-radek">{malyRadekVernost}</p> : null}
                    <h1 className="pp__nadpis-krok">{t.nadpisApartmany}</h1>
                  </>
                ) : (
                  <h2 className="pp__krok">{t.krokApartmany}</h2>
                )}
                <p className="pp__cena">{t.vyberteApartmany}</p>
                <div className="pp__dlazdice">
                  {[...POPTAVKA_APARTMANY]
                    .sort((a, b) => {
                      const oa =
                        prijezd && odjezd ? Number(kal.aptObsazenyVeTerminu(a.id, prijezd, odjezd)) : 0;
                      const ob =
                        prijezd && odjezd ? Number(kal.aptObsazenyVeTerminu(b.id, prijezd, odjezd)) : 0;
                      return oa - ob;
                    })
                    .map((a) => {
                    const on = apts.includes(a.id);
                    const obs = prijezd && odjezd ? kal.aptObsazenyVeTerminu(a.id, prijezd, odjezd) : false;
                    const cenaApt =
                      ukazCeny && prijezd && odjezd && !obs
                        ? kal.cenaProVyber(prijezd, odjezd, [a.id], false, slevaPct)
                        : null;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className={`pp__dlazdice-polozka${on ? ' is-on' : ''}${obs ? ' is-obsazeno' : ''}`}
                        disabled={obs}
                        onClick={() => {
                          if (obs) return;
                          setGalerie({ druh: 'apt', id: a.id, i: 0, zpetNa: 'apartmany' });
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverUrl(webLang, a)} alt="" width={400} height={260} />
                        {obs ? <span className="pp__dlazdice-stitok">{kt.obsazeno}</span> : null}
                        <span className="pp__dlazdice-text">
                          <span className="pp__dlazdice-nazev">{nazevNaDlazdici(a.id)}</span>
                          {obs ? (
                            <span className="pp__dlazdice-obsazeno">{kt.obsazeno}</span>
                          ) : cenaApt ? (
                            <span className="pp__dlazdice-cena">
                              {slevaCesty && cenaApt.seSlevou !== cenaApt.suma ? (
                                <>
                                  <s className="pp__chytry-skrt">{formatKc(cenaApt.suma)}</s>{' '}
                                  <b>{formatKc(cenaApt.seSlevou)}</b>
                                </>
                              ) : (
                                formatKc(cenaApt.suma)
                              )}{' '}
                              {kt.zaPobyt}
                            </span>
                          ) : (
                            <span className="pp__dlazdice-obsazeno" aria-hidden="true">
                              &nbsp;
                            </span>
                          )}
                        </span>
                        {on ? <span className="pp__dlazdice-vybrano">✓</span> : null}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="pp__dlazdice-polozka"
                    onClick={() => setGalerie({ druh: 'komplet', i: 0, zpetNa: 'apartmany' })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={galerieKompletCoverUrl(webLang)} alt="" width={400} height={260} />
                    <span className="pp__dlazdice-text">
                      <span className="pp__dlazdice-nazev">{t.galerieKomplet}</span>
                      <span className="pp__dlazdice-obsazeno" aria-hidden="true">
                        &nbsp;
                      </span>
                    </span>
                  </button>
                </div>
                {!vernost ? (
                  <p className="pp__kviz">
                    <a href={odkazKvizAtmosfery(webLang)} target="_blank" rel="noopener noreferrer">
                      {t.kvizAtmosfery}
                    </a>
                  </p>
                ) : null}
                {chyba ? <p className="pp__chyba">{chyba}</p> : null}
                <button type="button" className="pp__btn pp__btn--sms" onClick={() => jdiNaKrok('zpusob')}>
                  {t.zpet}
                </button>
              </section>
            ) : null}

            {krok === 'kontakt' ? (
              <section>
                {vernost ? (
                  <>
                    {souhrnTerminu ? (
                      <p className="pp__maly-radek pp__maly-radek--kontakt">
                        <span className="pp__maly-termin">{souhrnTerminu}</span>
                        {souhrnVyberu ? (
                          <span className="pp__maly-zbytek">{`\u00a0·\u00a0${souhrnVyberu}`}</span>
                        ) : null}
                        {ukazCeny && cenaVyberu ? (
                          <span className="pp__maly-zbytek">
                            {'\u00a0·\u00a0'}
                            {slevaCesty && cenaVyberu.seSlevou !== cenaVyberu.suma ? (
                              <>
                                <s className="pp__chytry-skrt">{formatKc(cenaVyberu.suma)}</s>{' '}
                                <b>{formatKc(cenaVyberu.seSlevou)}</b>
                              </>
                            ) : (
                              formatKc(cenaVyberu.suma)
                            )}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    <h1 className="pp__nadpis-krok">{t.nadpisKontakt}</h1>
                  </>
                ) : (
                  <>
                    <h2 className="pp__krok">{t.krokKontakt}</h2>
                    <p className="pp__cena">
                      {souhrnTerminu}
                      {souhrnVyberu ? ` · ${souhrnVyberu}` : ''}
                    </p>
                  </>
                )}
                {klub.zapnuto && slevaInfo.text ? (
                  <p className="pp__sleva pp__sleva--kontakt">{slevaInfo.text}</p>
                ) : null}
                {klub.zapnuto && klub.kreditKc > 0 ? (
                  <label className="pp__kredit">
                    <input
                      type="checkbox"
                      checked={pouzitKredit}
                      onChange={(e) => setPouzitKredit(e.target.checked)}
                    />
                    {`Použít kredit (${klub.kreditKc}\u00a0Kč)`}
                    {pouzitKredit && ukazCeny && cenaVyberu ? (
                      <span className="pp__kredit-po">
                        {' '}
                        → {formatKc(cenaPoKreditu(cenaVyberu.seSlevou, klub.kreditKc, true))}
                      </span>
                    ) : null}
                  </label>
                ) : null}
                <label>
                  {t.jmeno}
                  <input
                    type="text"
                    autoComplete="name"
                    value={jmeno}
                    onChange={(e) => setJmeno(e.target.value)}
                    required
                  />
                </label>
                <TelefonPole
                  key={lang}
                  lang={lang}
                  label={t.telefon}
                  chybaText={t.chybaTelefon}
                  ukazujeChybu={telefonChyba}
                  vychoziE164={telefon}
                  onBlurValidace={() => setTelefonChyba(true)}
                  onChangeE164={(e164) => {
                    setTelefon(e164);
                    if (telefonChyba) setTelefonChyba(false);
                  }}
                />
                {!vernost ? (
                  <fieldset>
                    <legend>{t.doprava}</legend>
                    <div className="pp__doprava">
                      {(
                        [
                          ['auto', t.auto],
                          ['pesky', t.pesky],
                          ['nevim', t.nevim],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          className={`pp__chip${doprava === id ? ' is-on' : ''}`}
                          onClick={() => setDoprava((d) => (d === id ? '' : id))}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : null}
                <label>
                  {t.poznamka}
                  <textarea
                    className="pp__poznamka"
                    rows={2}
                    value={poznamka}
                    onChange={(e) => {
                      setPoznamka(e.target.value);
                      const el = e.currentTarget;
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }}
                    onInput={(e: FormEvent<HTMLTextAreaElement>) => {
                      const el = e.currentTarget;
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }}
                    maxLength={500}
                  />
                </label>
                <label className="pp__hp" aria-hidden="true">
                  web
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </label>
                {chyba ? <p className="pp__chyba">{chyba}</p> : null}
                {volneNabidka.length > 0 ? (
                  <div className="pp__volne-nabidka">
                    {volneNabidka.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="pp__btn pp__btn--tlumeny"
                        onClick={() => {
                          setZpusob('vybrat');
                          setApts([id]);
                          setVolneNabidka([]);
                          setChyba(null);
                        }}
                      >
                        {nazevApt(id)}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="pp__btn pp__btn--sms"
                      onClick={() => {
                        setVolneNabidka([]);
                        if (apts[0]) otevriHledaniTerminu(apts[0]);
                        else {
                          nastavNejblizsiTermin();
                          setChyba(null);
                        }
                      }}
                    >
                      {kt.ukazNejblizsi}
                    </button>
                  </div>
                ) : null}
                <div className="pp__akce">
                  <button
                    type="button"
                    className="pp__btn pp__btn--hlavni"
                    disabled={cekam}
                    onClick={() => void odeslat('formular')}
                  >
                    {t.odeslat}
                  </button>
                  {vernost ? (
                    <>
                      <p className="pp__nebo-pres">{t.neboOdeslatPres}</p>
                      <div className="pp__odeslat-pres">
                        <button
                          type="button"
                          className="pp__btn pp__btn--kanal pp__btn--mensi"
                          disabled={cekam}
                          onClick={() => void odeslat('whatsapp')}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                            <path
                              fill="currentColor"
                              d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.22 8.22 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24m4.52 10.4c-.25-.12-1.47-.72-1.7-.8-.23-.09-.39-.12-.56.12-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.09-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74 2.49 1.08 2.49.72 2.94.67.45-.05 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.17-.47-.29"
                            />
                          </svg>
                          <span>{t.whatsapp}</span>
                        </button>
                        <button
                          type="button"
                          className="pp__btn pp__btn--kanal pp__btn--mensi pp__sms-only"
                          disabled={cekam}
                          onClick={() => void odeslat('sms')}
                        >
                          {t.sms}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="pp__btn pp__btn--wa"
                        disabled={cekam}
                        onClick={() => void odeslat('whatsapp')}
                      >
                        {t.whatsapp}
                      </button>
                      <button
                        type="button"
                        className="pp__btn pp__btn--sms pp__sms-only"
                        disabled={cekam}
                        onClick={() => void odeslat('sms')}
                      >
                        {t.sms}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className={vernost ? 'pp__odkaz-zpet' : 'pp__btn pp__btn--sms'}
                    onClick={() =>
                      jdiNaKrok(
                        zpusob === 'vybrat' ? 'apartmany' : zpusob === 'pruvodce' ? 'pruvodce' : 'zpusob',
                      )
                    }
                  >
                    {t.zpet}
                  </button>
                </div>
              </section>
            ) : null}
          </>
        )}

        {ukazPaticku ? (
          <div className="pp__paticka">
            {vernost ? null : <PoptavkaPlochaTlacitko />}
            <KontaktTelefony zavolat={t.zavolat} zaloha={t.zaloha} className="pp__kontakty-wrap" />
            <p className="pp__verze" aria-hidden="true">
              {buildVerze}
            </p>
          </div>
        ) : (
          <p className="pp__verze" aria-hidden="true">
            {buildVerze}
          </p>
        )}
        </div>
      </div>

      {hledaniTerminu ? (
        <VolneTerminyKalendar
          lang={lang}
          dnes={dnes}
          dny={kal.dny}
          apt={hledaniTerminu.apt}
          aptNazev={nazevApt(hledaniTerminu.apt)}
          puvodniPrijezd={hledaniTerminu.puvodniPrijezd}
          puvodniOdjezd={hledaniTerminu.puvodniOdjezd}
          otevreno
          onZavrit={zavriHledaniTerminu}
          onVybrat={vyberHledanyTermin}
          ukazCeny={ukazCeny}
          labelPrijezd={t.prijezd}
          labelOdjezd={t.odjezd}
        />
      ) : null}

      {galerie && galerieFotky.length ? (
        <div className="pp__lightbox" role="dialog" aria-modal="true">
          <div
            className={`pp__lightbox-vnitr${
              galerie.druh === 'komplet' && prijezd && odjezd ? ' pp__lightbox-vnitr--s-radkem' : ''
            }`}
          >
            {galerie.druh === 'komplet' && prijezd && odjezd ? (
              <p className="pp__lightbox-radek">
                {radekVolnychVTerminu(
                  lang,
                  formatRozsahPoptavky(prijezd, odjezd, lang),
                  volneProGalerii?.length ?? 0,
                )}
              </p>
            ) : null}
            {galerieAptId ? (
              <p className="pp__lightbox-nazev">{nazevApt(galerieAptId)}</p>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={galerieFotky[Math.min(galerieIndex, galerieFotky.length - 1)]}
              alt=""
            />
            <div className="pp__lightbox-ovladani">
              <button
                type="button"
                className="pp__chip"
                disabled={galerieIndex <= 0}
                onClick={() =>
                  setGalerie((g) => (g ? { ...g, i: Math.max(0, g.i - 1) } : g))
                }
              >
                ←
              </button>
              <span>
                {galerieIndex + 1} / {galerieFotky.length}
              </span>
              <button
                type="button"
                className="pp__chip"
                disabled={galerieIndex >= galerieFotky.length - 1}
                onClick={() =>
                  setGalerie((g) =>
                    g ? { ...g, i: Math.min(galerieFotky.length - 1, g.i + 1) } : g,
                  )
                }
              >
                →
              </button>
            </div>
            {cenaGalerie ? (
              <p className="pp__lightbox-cena">
                {tvarNoci(nociPocet, lang)}
                {' · '}
                {slevaCesty && cenaGalerie.seSlevou !== cenaGalerie.suma ? (
                  <>
                    <s className="pp__chytry-skrt">{formatKc(cenaGalerie.suma)}</s>{' '}
                    <b>{formatKc(cenaGalerie.seSlevou)}</b>
                  </>
                ) : (
                  <b>{formatKc(cenaGalerie.suma)}</b>
                )}{' '}
                {kt.zaPobyt}
              </p>
            ) : null}
            {galerieAptId ? (
              <button
                type="button"
                className="pp__btn pp__btn--hlavni"
                onClick={() => pokracujSApartmanem(galerieAptId)}
              >
                {t.vybratTento}
              </button>
            ) : null}
            <button type="button" className="pp__btn pp__btn--sms" onClick={() => setGalerie(null)}>
              {galerie.zpetNa === 'pruvodce' ? t.zpetNaVysledek : t.zpet}
            </button>
          </div>
        </div>
      ) : null}
    </main>
    </PoptavkaPlochaRoot>
  );
}
