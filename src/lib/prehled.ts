import apartmanyJson from '@/data/apartmany.json';
import type { PoplatekStav } from './poplatek';
import type { ProcessStore, RezervaceRecord, RezervaceStav } from './store';
import { normalizujTelefon, textTelefonu } from './telefon';
import type { AptId, GuideLang } from './types';
import { LANG_LABELS } from './types';
import { vetaNavrhu } from './rucni-pole';
import type { RucniPole } from './store';
import { chybejiciKroky, type ChybejiciKrok } from './vstup-pruvodce';
import { zpravyMenu, type ZpravaMenu } from './whatsapp-zprava';
import { zneniVerze } from './pravidla-verze';
import { priplatekCasu, soucetVyjezdu } from './priplatek-prijezd';

export const STARY_ZAZNAM = 'starý záznam';

export type OtevreniTon = 'ano' | 'ne' | 'nevim';

export type PrehledRadek = {
  rezervace: string;
  apartman: AptId | null;
  apartmanNazev: string;
  prijezd: string | null;
  odjezd: string | null;
  termin: string;
  pobytText: string;
  jmeno: string;
  email: string;
  stav: RezervaceStav;
  stavText: string;
  coSeStalo: string;
  posledniPokus: string;
  posledniPokusText: string;
  historie: { cas: string; co: string }[];
  noci: number | null;
  osob: number | null;
  jazyk: GuideLang | null;
  jazykText: string;
  vlajka: string;
  narodnost: string | null;
  accessPin: string | null;
  poplatek: PoplatekStav;
  poplatekText: string;
  otevrenoPocet: number | null;
  otevreniText: string;
  otevreniTon: OtevreniTon;
  otevreniTitle: string;
  stary: boolean;
  telefonText: string | null;
  telefonWa: string | null;
  telefonPuvodni: string | null;
  telefonNejisty: boolean;
  telefonKtery: 'checkin' | 'rezervace' | null;
  jinyTelefonText: string | null;
  jinyTelefonWa: string | null;
  jinyTelefonPuvodni: string | null;
  jinyTelefonNejisty: boolean;
  jinyTelefonKtery: 'checkin' | 'rezervace' | null;
  checkinUrl: string | null;
  zpravy: ZpravaMenu[];
  zdrojText: string;
  casPrijezdu: string | null;
  vytvorenoText: string;
  odkaz: string | null;
  zprava: string;
  stitek: 'rucne' | 'info' | null;
  /** Čas předání. null = kódy v průvodci ještě nejsou. */
  predano: string | null;
  /** Kdy host napsal, že je na místě. */
  naMiste: string | null;
  /** Ruční příplatek za čas. null = počítá se sám. */
  priplatekRucni: number | null;
  /** Čas, kdy byl vybraný městský poplatek. null = ještě není vybraný. */
  zaplaceno: string | null;
  poplatekVybral: 'ja' | 'nikol' | null;
  vyjezdy: { id: string; kdy: string; castka: number }[];
  souhlas: { kdy: string; jazyk: string; verze: string } | null;
  souhlasZneni: string | null;
  casZadalHost: boolean;
  zpusobPrijezdu: 'auto' | 'pesky' | null;
  telefonBrana: string | null;
  spz: string | null;
  spzPujcene: boolean;
  branaRegistrovano: string | null;
  pruvodceOdemcen: string | null;
  rozbalen: boolean;
  rozbalenText: string;
  navrhy: { pole: RucniPole; veta: string; hodnota: string }[];
};

type AptRow = { id: AptId; nazev: { cs: string; en: string } };
const apartmany = (apartmanyJson as { apartmany: AptRow[] }).apartmany;

/** U zrušené rezervace se znovu neposílá. Odkaz na průvodce zůstává. */
export function nabidnoutOdeslani(stav: RezervaceStav): boolean {
  return stav !== 'zruseno' && stav !== 'bez_checkinu';
}

/** Už odeslaný průvodce se znovu posílá jen po této otázce. */
export function dotazPredOdeslanimZnovu(stav: RezervaceStav): string | null {
  if (stav === 'odeslano' || stav === 'odeslano_s_vyhradou') {
    return 'Host už průvodce dostal. Opravdu poslat znovu?';
  }
  return null;
}

export const STAV_TEXT: Record<RezervaceStav, string> = {
  odeslano: 'Odesláno',
  odeslano_s_vyhradou: 'Odesláno s výhradou',
  neodeslano: 'Neodesláno',
  vraceno: 'Vráceno',
  bez_checkinu: 'Čeká na check-in',
  zruseno: 'Zrušeno',
};

export function dnesVPraze(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function czDen(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return ymd;
  return `${Number(d)}. ${Number(m)}.`;
}

function czDenRok(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return ymd;
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

function sklon(n: number, jedna: string, dve: string, pet: string): string {
  if (n === 1) return jedna;
  if (n >= 2 && n <= 4) return dve;
  return pet;
}

export function terminText(prijezd: string | null, odjezd: string | null): string {
  if (prijezd && odjezd) return `${czDen(prijezd)} → ${czDen(odjezd)}`;
  if (prijezd) return czDen(prijezd);
  if (odjezd) return czDen(odjezd);
  return '';
}

function rozpadDne(ymd: string | null): { d: number; m: number; y: number } | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { d, m, y };
}

/** Příjezd a odjezd bez roku. Stejný měsíc je 12.–14.10., přes měsíc 30.10.–2.11. */
export function terminKratky(prijezd: string | null, odjezd: string | null): string {
  const a = rozpadDne(prijezd);
  const b = rozpadDne(odjezd);
  if (a && b) {
    if (a.y === b.y && a.m === b.m) return `${a.d}.–${b.d}.${b.m}.`;
    return `${a.d}.${a.m}.–${b.d}.${b.m}.`;
  }
  const jeden = a || b;
  return jeden ? `${jeden.d}.${jeden.m}.` : '';
}

/** Krátký poplatek do sbaleného řádku. Výpočet zůstává v detailu. */
export function poplatekKratky(stav: PoplatekStav, noci: number | null, osob: number | null): string {
  if (stav === 'ne') return 'Poplatek ne';
  if (stav === 'neznamo') return 'Poplatek neznámo';
  if (noci && osob && noci > 0 && osob > 0) return `Poplatek ${noci * osob * 50} Kč`;
  if (stav === 'ano') return 'Poplatek ano';
  return '';
}

/** Štítek v přehledu. Kdo vybral městský poplatek. */
export function textVybranehoPoplatku(kdy: string, kdo: 'ja' | 'nikol' | null): string {
  const hod = hodinaPraha(kdy);
  const cas = hod ? ` ${hod}` : '';
  if (kdo === 'nikol') return `Poplatek vybrala Nikol${cas}`;
  if (kdo === 'ja') return `Poplatek vybral já${cas}`;
  return hod ? `Poplatek vybrán ${hod}` : 'Poplatek vybrán';
}

export function textSouhlasu(kdy: string): string {
  const hod = hodinaPraha(kdy);
  return hod ? `Souhlasí s pravidly ${hod}` : 'Souhlasí s pravidly';
}

/** Jedna červená věta ve sbaleném řádku, když se mail neodeslal, vrátil, nebo číslo není jisté. */
export function vetaChyby(row: {
  stav: RezervaceStav;
  telefonNejisty: boolean;
  jinyTelefonNejisty: boolean;
}): string | null {
  const nejisty = row.telefonNejisty || row.jinyTelefonNejisty;
  if (row.stav === 'neodeslano' && nejisty) return 'Průvodce se neodeslal, ověřte předvolbu.';
  if (row.stav === 'vraceno' && nejisty) return 'E-mail se vrátil, ověřte předvolbu.';
  if (row.stav === 'neodeslano') return 'Průvodce se neodeslal.';
  if (row.stav === 'vraceno') return 'E-mail se vrátil.';
  if (nejisty) return 'Ověřte předvolbu.';
  return null;
}

export function pobytText(noci: number | null, osob: number | null): string {
  const kusy: string[] = [];
  if (noci && noci > 0) kusy.push(`${noci} ${sklon(noci, 'noc', 'noci', 'nocí')}`);
  if (osob && osob > 0) kusy.push(`${osob} ${sklon(osob, 'osoba', 'osoby', 'osob')}`);
  return kusy.join(' · ');
}

export function textPoplatku(stav: PoplatekStav, noci: number | null, osob: number | null): string {
  if (stav === 'ne') return 'Poplatek: ne';
  if (stav === 'neznamo') return 'Poplatek: neznámo';
  if (noci && osob && noci > 0 && osob > 0) {
    const kc = noci * osob * 50;
    return `Poplatek: ${kc} Kč (${noci} ${sklon(noci, 'noc', 'noci', 'nocí')} × ${osob} ${sklon(osob, 'osoba', 'osoby', 'osob')})`;
  }
  return 'Poplatek: ano';
}

export type RadekPlatby = {
  nazev: string;
  text: string;
  dovetek: string;
};

export type RozpisPlateb = {
  radky: RadekPlatby[];
  soucet: number;
  /** Všechny tři částky známe. Po domluvě a neznámý čas součet ještě není celý. */
  uplny: boolean;
  /** Když majitel zadal jinou částku, než vychází z času. */
  navrhKc: number | null;
};

function kcText(kc: number): string {
  return `${kc}\u00A0Kč`;
}

function radekCasu(v: { cas: string | null; skutecny?: string | null; rucni?: number | null }): {
  text: string;
  dovetek: string;
  kc: number | null;
  uplny: boolean;
  navrhKc: number | null;
} {
  const odhad = priplatekCasu(v.cas);
  const maSkutecny = Boolean(v.skutecny && v.skutecny.trim());
  const skutecny = maSkutecny ? priplatekCasu(v.skutecny) : null;
  const vypocet = skutecny ?? odhad;
  const vypocetKc = vypocet.stav === 'castka' || vypocet.stav === 'nic' ? vypocet.kc : null;

  if (typeof v.rucni === 'number' && Number.isFinite(v.rucni) && v.rucni >= 0) {
    const kc = Math.round(v.rucni);
    return {
      text: kcText(kc),
      dovetek: 'ručně',
      kc,
      uplny: true,
      navrhKc: vypocetKc != null && vypocetKc !== kc ? vypocetKc : null,
    };
  }

  if (vypocet.stav === 'neznamo') {
    return { text: 'neznáme', dovetek: '', kc: null, uplny: false, navrhKc: null };
  }
  if (vypocet.stav === 'domluva') {
    return { text: 'po domluvě', dovetek: '', kc: null, uplny: false, navrhKc: null };
  }
  const jinyOdhad =
    maSkutecny && (odhad.stav === 'castka' || odhad.stav === 'nic') && odhad.kc !== vypocet.kc;
  return {
    text: kcText(vypocet.kc),
    dovetek: jinyOdhad ? `odhad ${kcText(odhad.kc)}` : '',
    kc: vypocet.kc,
    uplny: true,
    navrhKc: null,
  };
}

/** Městský poplatek, příplatek za čas a další příjezd. Každá částka zvlášť a součet. */
export function rozpisPlateb(v: {
  poplatek: PoplatekStav;
  noci: number | null;
  osob: number | null;
  cas: string | null;
  /** Hodina skutečného příjezdu. Nejdřív Host je na místě, jinak Předáno. */
  skutecny?: string | null;
  /** Částka, kterou majitel uložil ručně. */
  rucni?: number | null;
  vyjezdy: { castka: number }[];
}): RozpisPlateb {
  const radky: RadekPlatby[] = [];
  let soucet = 0;
  let uplny = true;

  if (v.poplatek === 'ne') {
    radky.push({ nazev: 'Městský poplatek', text: 'ne', dovetek: '' });
  } else if (v.poplatek === 'neznamo' || !v.noci || !v.osob || v.noci < 1 || v.osob < 1) {
    radky.push({ nazev: 'Městský poplatek', text: 'neznámo', dovetek: '' });
    uplny = false;
  } else {
    const kc = v.noci * v.osob * 50;
    soucet += kc;
    radky.push({
      nazev: 'Městský poplatek',
      text: kcText(kc),
      dovetek: `${v.noci} ${sklon(v.noci, 'noc', 'noci', 'nocí')} × ${v.osob} ${sklon(v.osob, 'osoba', 'osoby', 'osob')}`,
    });
  }

  const cas = radekCasu(v);
  if (!cas.uplny) uplny = false;
  if (cas.kc != null) soucet += cas.kc;
  radky.push({ nazev: 'Příplatek za čas', text: cas.text, dovetek: cas.dovetek });

  const vyjezd = soucetVyjezdu(v.vyjezdy);
  soucet += vyjezd;
  radky.push({ nazev: 'Další příjezd', text: kcText(vyjezd), dovetek: '' });

  return { radky, soucet, uplny, navrhKc: cas.navrhKc };
}

const VLAJKY: Record<string, string> = {
  CZE: 'CZ',
  SVK: 'SK',
  DEU: 'DE',
  AUT: 'AT',
  CHE: 'CH',
  POL: 'PL',
  UKR: 'UA',
  TWN: 'TW',
  TW: 'TW',
  HKG: 'HK',
  HK: 'HK',
  CHN: 'CN',
  CN: 'CN',
  GBR: 'GB',
  USA: 'US',
  FRA: 'FR',
  ITA: 'IT',
  ESP: 'ES',
  NLD: 'NL',
  BEL: 'BE',
  HUN: 'HU',
  IRL: 'IE',
  DNK: 'DK',
  SWE: 'SE',
  NOR: 'NO',
  FIN: 'FI',
};

export function vlajkaNarodnosti(narodnost: string | null | undefined): string {
  const code = (narodnost || '').trim().toUpperCase();
  if (!code) return '';
  const a2 = code.length === 2 && /^[A-Z]{2}$/.test(code) ? code : VLAJKY[code];
  if (!a2 || !/^[A-Z]{2}$/.test(a2)) return '';
  return String.fromCodePoint(...[...a2].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function zdrojText(raw: string | null | undefined): string {
  const s = (raw || '').trim();
  if (!s) return '';
  const n = s.toLowerCase();
  if (n.includes('airbnb')) return 'Airbnb';
  if (n.includes('booking')) return 'Booking';
  if (n.includes('prim') || n.includes('přím') || n.includes('direct') || n === 'web' || n.includes('vivien')) {
    return 'přímá';
  }
  return s;
}

function aptNazev(id: AptId | null): string {
  if (!id) return '';
  const a = apartmany.find((x) => x.id === id);
  return a ? `${a.nazev.cs} (${id})` : id;
}

export function casPraha(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(t));
  const get = (typ: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === typ)?.value || '';
  const den = get('day');
  const mes = get('month');
  const hod = get('hour');
  const min = get('minute');
  if (!den || !mes || !hod || !min) return '';
  return `${den}. ${mes}. ${hod}:${min}`;
}

/** Jen hodina a minuta v Praze, třeba 15:42. */
export function hodinaPraha(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(t));
  const hod = parts.find((p) => p.type === 'hour')?.value || '';
  const min = parts.find((p) => p.type === 'minute')?.value || '';
  if (!hod || !min) return '';
  return `${hod}:${min}`;
}

export function textOtevreni(
  pocet: number | null,
  naposled: string | null,
): { text: string; ton: OtevreniTon } {
  if (pocet == null) return { text: 'Nevíme', ton: 'nevim' };
  if (pocet <= 0) return { text: 'Zatím neotevřel', ton: 'ne' };
  const cas = naposled ? casPraha(naposled) : '';
  const kdy = cas ? ` ${cas}` : '';
  return { text: `Otevřel${kdy} (${pocet}×)`, ton: 'ano' };
}

function chybi(hodnota: string, stary: boolean): string {
  if (hodnota) return hodnota;
  return stary ? STARY_ZAZNAM : '';
}

function stejneCislo(a: string | null, b: string | null, aw: string | null, bw: string | null): boolean {
  if (aw && bw) return aw === bw;
  if (!a || !b) return false;
  return textTelefonu(a) === textTelefonu(b);
}

type TelefonKus = {
  text: string;
  wa: string | null;
  puvodni: string | null;
  nejisty: boolean;
  ktery: 'checkin' | 'rezervace';
};

function cislice(s: string): string {
  return s.replace(/\D/g, '');
}

function kusTelefonu(
  ulozeny: string | null,
  wa: string | null,
  puvodni: string | null,
  ktery: 'checkin' | 'rezervace',
  narodnost: string | null,
): TelefonKus | null {
  if (!ulozeny) return null;
  const znovu = normalizujTelefon(ulozeny, narodnost);
  const hotovy = znovu && !znovu.nejisty ? znovu.ulozeny : ulozeny;
  const waHotove = znovu && !znovu.nejisty ? znovu.wa : wa;
  const text = textTelefonu(hotovy);
  const ukazat = puvodni && cislice(puvodni) !== cislice(hotovy) ? puvodni : null;
  return { text, wa: waHotove, puvodni: ukazat, nejisty: !waHotove, ktery };
}

/** Hlavní telefon je z check-inu. Když se liší, druhé číslo z rezervace zůstane vidět. */
export function telefonyPrehledu(rec: RezervaceRecord): {
  text: string | null;
  wa: string | null;
  puvodni: string | null;
  nejisty: boolean;
  ktery: 'checkin' | 'rezervace' | null;
  jinyText: string | null;
  jinyWa: string | null;
  jinyPuvodni: string | null;
  jinyNejisty: boolean;
  jinyKtery: 'checkin' | 'rezervace' | null;
} {
  const checkin = kusTelefonu(rec.telefon, rec.telefonWa, rec.telefonPuvodni, 'checkin', rec.narodnost);
  const rezervace = kusTelefonu(
    rec.telefonRezervace,
    rec.telefonRezervaceWa,
    rec.telefonRezervacePuvodni,
    'rezervace',
    rec.narodnost,
  );
  const prazdny = {
    text: null,
    wa: null,
    puvodni: null,
    nejisty: false,
    ktery: null as 'checkin' | 'rezervace' | null,
    jinyText: null,
    jinyWa: null,
    jinyPuvodni: null,
    jinyNejisty: false,
    jinyKtery: null as 'checkin' | 'rezervace' | null,
  };
  if (checkin && rezervace && !stejneCislo(rec.telefon, rec.telefonRezervace, rec.telefonWa, rec.telefonRezervaceWa)) {
    return {
      text: checkin.text,
      wa: checkin.wa,
      puvodni: checkin.puvodni,
      nejisty: checkin.nejisty,
      ktery: checkin.ktery,
      jinyText: rezervace.text,
      jinyWa: rezervace.wa,
      jinyPuvodni: rezervace.puvodni,
      jinyNejisty: rezervace.nejisty,
      jinyKtery: rezervace.ktery,
    };
  }
  const hlavni = checkin || rezervace;
  if (!hlavni) return prazdny;
  return {
    ...prazdny,
    text: hlavni.text,
    wa: hlavni.wa,
    puvodni: hlavni.puvodni,
    nejisty: hlavni.nejisty,
    ktery: hlavni.ktery,
  };
}

export function radekZRezervace(rec: RezervaceRecord): PrehledRadek {
  const stary = rec.otevrenoPocet == null;
  const vety = rec.duvody.map((d) => d.veta).filter(Boolean);
  const coSeStalo =
    rec.stav === 'zruseno'
      ? 'Rezervace je zrušená.'
      : vety.join(' ') ||
        (rec.stav === 'bez_checkinu'
          ? 'Čeká na online check-in.'
          : rec.stav === 'odeslano' || rec.stav === 'odeslano_s_vyhradou'
            ? 'Průvodce odeslán.'
            : chybi('', stary));
  const otev = textOtevreni(rec.otevrenoPocet, rec.otevrenoNaposled);
  const telefony = telefonyPrehledu(rec);
  const kroky = chybejiciKroky({
    cas: rec.casPrijezdu,
    zpusob: rec.zpusobPrijezdu,
    telefonBrana: rec.telefonBrana,
    spz: rec.spz,
    spzPujcene: Boolean(rec.spzPujcene),
    souhlas: Boolean(rec.souhlasPravidel),
  });
  const zpravy = zpravyMenu({
    stav: rec.stav,
    lang: rec.jazyk,
    zdroj: rec.zdroj,
    pruvodce: null,
    checkinUrl: rec.checkinUrl,
    otevrenoPocet: rec.otevrenoPocet,
    casPrijezdu: rec.casPrijezdu,
    prijezd: rec.prijezd,
    dnes: dnesVPraze(),
    chybi: kroky,
    branaChybi: rec.zpusobPrijezdu === 'auto' && (!rec.telefonBrana || (!rec.spz && !rec.spzPujcene)),
  });
  const poprve = rec.otevrenoPoprve ? casPraha(rec.otevrenoPoprve) : '';
  const naposled = rec.otevrenoNaposled ? casPraha(rec.otevrenoNaposled) : '';
  const jazykText = rec.jazyk ? LANG_LABELS[rec.jazyk] : '';
  return {
    rezervace: rec.rezervace,
    apartman: rec.apartman,
    apartmanNazev: chybi(aptNazev(rec.apartman), stary),
    prijezd: rec.prijezd,
    odjezd: rec.odjezd,
    termin: chybi(terminText(rec.prijezd, rec.odjezd), stary),
    pobytText: pobytText(rec.noci, rec.osob),
    jmeno: chybi(rec.jmeno?.trim() || '', stary),
    email: chybi(rec.emailHosta?.trim() || '', stary),
    stav: rec.stav,
    stavText: STAV_TEXT[rec.stav],
    coSeStalo,
    posledniPokus: rec.posledniPokus,
    posledniPokusText: chybi(casPraha(rec.posledniPokus), stary),
    historie: rec.historie,
    noci: rec.noci,
    osob: rec.osob,
    jazyk: rec.jazyk,
    jazykText: chybi(jazykText, stary),
    vlajka: vlajkaNarodnosti(rec.narodnost),
    narodnost: rec.narodnost,
    accessPin: rec.accessPin,
    poplatek: rec.poplatek,
    poplatekText: textPoplatku(rec.poplatek, rec.noci, rec.osob),
    otevrenoPocet: rec.otevrenoPocet,
    otevreniText: otev.text,
    otevreniTon: otev.ton,
    otevreniTitle: poprve && naposled && poprve !== naposled ? `Poprvé ${poprve}` : '',
    stary,
    telefonText: telefony.text,
    telefonWa: telefony.wa,
    telefonPuvodni: telefony.puvodni,
    telefonNejisty: telefony.nejisty,
    telefonKtery: telefony.ktery,
    jinyTelefonText: telefony.jinyText,
    jinyTelefonWa: telefony.jinyWa,
    jinyTelefonPuvodni: telefony.jinyPuvodni,
    jinyTelefonNejisty: telefony.jinyNejisty,
    jinyTelefonKtery: telefony.jinyKtery,
    checkinUrl: rec.checkinUrl,
    zdrojText: chybi(zdrojText(rec.zdroj), stary),
    casPrijezdu: rec.casPrijezdu,
    vytvorenoText: chybi(rec.vytvoreno ? czDenRok(rec.vytvoreno) : '', stary),
    odkaz: null,
    zpravy,
    zprava: zpravy.find((z) => z.vychozi)?.text || '',
    stitek: rec.stitek,
    predano: rec.predano,
    naMiste: rec.naMiste,
    priplatekRucni: rec.priplatekRucni,
    zaplaceno: rec.zaplaceno,
    poplatekVybral: rec.poplatekVybral,
    vyjezdy: rec.vyjezdy || [],
    souhlas: rec.souhlasPravidel,
    souhlasZneni: rec.souhlasPravidel ? zneniVerze(rec.souhlasPravidel.verze) : null,
    casZadalHost: rec.casZadalHost,
    zpusobPrijezdu: rec.zpusobPrijezdu,
    telefonBrana: rec.telefonBrana,
    spz: rec.spz,
    spzPujcene: rec.spzPujcene,
    branaRegistrovano: rec.branaRegistrovano,
    pruvodceOdemcen: rec.pruvodceOdemcen,
    rozbalen: kroky.length === 0,
    rozbalenText: textRozbaleni(kroky),
    navrhy: (rec.navrhy || []).map((n) => ({ pole: n.pole, veta: vetaNavrhu(n), hodnota: n.hodnota })),
  };
}

function textRozbaleni(kroky: ChybejiciKrok[]): string {
  if (!kroky.length) return 'Průvodce rozbalen';
  const nazev: Record<ChybejiciKrok, string> = {
    cas: 'čas',
    zpusob: 'způsob příjezdu',
    pravidla: 'pravidla',
  };
  return `Průvodce nerozbalen · chybí: ${kroky.map((krok) => nazev[krok]).join(', ')}`;
}

/** Nejbližší příjezd nahoře. Kdo už odjel, je až dole. */
export function seradRadky(rows: PrehledRadek[], now = new Date()): PrehledRadek[] {
  const today = dnesVPraze(now);
  const skupina = (r: PrehledRadek) => (r.odjezd && r.odjezd < today ? 1 : 0);
  return [...rows].sort((a, b) => {
    const ga = skupina(a);
    const gb = skupina(b);
    if (ga !== gb) return ga - gb;
    if (ga === 1) {
      const oa = a.odjezd || '';
      const ob = b.odjezd || '';
      if (oa !== ob) return oa < ob ? 1 : -1;
    } else {
      const da = a.prijezd || '9999-99-99';
      const db = b.prijezd || '9999-99-99';
      if (da !== db) return da < db ? -1 : 1;
    }
    return a.rezervace < b.rezervace ? -1 : 1;
  });
}

export async function buildPrehled(store: ProcessStore, now = new Date()): Promise<PrehledRadek[]> {
  const entries = await store.listRezervace();
  return seradRadky(
    entries.map(({ record }) => radekZRezervace(record)),
    now,
  );
}

export function posunDen(ymd: string, dny: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dny));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export type PlanHost = { rezervace: string; jmeno: string; cas: string | null };

export type DenSouhrn = {
  den: string;
  pocet: number;
  otevrelo: number;
  neodeslano: number;
  bezCheckinu: number;
  plan: PlanHost[];
};

export function souhrnDne(rows: PrehledRadek[], den: string, casy: Record<string, string | null> = {}): DenSouhrn {
  const list = rows.filter((r) => r.prijezd === den);
  const plan = list
    .map((r) => ({
      rezervace: r.rezervace,
      jmeno: r.jmeno || 'Host',
      cas: casy[r.rezervace] ?? r.casPrijezdu,
    }))
    .sort((a, b) => {
      if (a.cas && b.cas && a.cas !== b.cas) return a.cas < b.cas ? -1 : 1;
      if (a.cas && !b.cas) return -1;
      if (!a.cas && b.cas) return 1;
      return a.jmeno.localeCompare(b.jmeno, 'cs');
    });
  return {
    den,
    pocet: list.length,
    otevrelo: list.filter((r) => (r.otevrenoPocet ?? 0) > 0).length,
    neodeslano: list.filter((r) => r.stav === 'neodeslano').length,
    bezCheckinu: list.filter((r) => r.stav === 'bez_checkinu').length,
    plan,
  };
}
