import { t } from './i18n';
import { priplatekCasu, priplatekProCas } from './priplatek-prijezd';
import type { RezervaceRecord } from './store';
import type { GuideLang, LText } from './types';

/** Oddělené od žádosti o dřívější příjezd (`zadostPrijezd`). */
export type ZadostPozdniPrijezd = {
  cas: string;
  kc: number;
  stav: 'ceka' | 'potvrzeno' | 'nelze';
  kdy: string;
  /** Vlastní text hostitele při odmítnutí nebo nabídce jiného času. */
  zprava?: string | null;
  /**
   * Po potvrzení host změnil čas: drží staré potvrzení, dokud nová žádost neprojde.
   */
  drziPotvrzeni?: { cas: string; kc: number } | null;
};

/** Krátký řádek, dokud čeká potvrzení. */
export const TEXT_SBALENY_CEKA: LText = {
  cs: 'Příjezd {cas} · zatím nepotvrzeno',
  en: 'Arrival {cas} · not confirmed yet',
  de: 'Ankunft {cas} · noch nicht bestätigt',
  pl: 'Przyjazd {cas} · jeszcze niepotwierdzony',
  uk: 'Приїзд {cas} · ще не підтверджено',
  'zh-Hant': '抵達 {cas} · 尚未確認',
  sv: 'Ankomst {cas} · inte bekräftad ännu',
  es: 'Llegada {cas} · aún sin confirmar',
  hu: 'Érkezés {cas} · még nincs megerősítve',
  da: 'Ankomst {cas} · endnu ikke bekræftet',
  fr: 'Arrivée {cas} · pas encore confirmée',
  it: 'Arrivo {cas} · non ancora confermato',
  pt: 'Chegada {cas} · ainda sem confirmação',
};

/** Potvrzení hostovi po uložení žádosti (musí být v jazyku průvodce). */
export const TEXT_CEKA_VETA: LText = {
  cs: 'Čas {cas} a příplatek {kc} Kč jsme přijali. Platí až po našem potvrzení.',
  en: 'We have received the time {cas} and the surcharge of {kc} Kč. It applies only after we confirm it.',
  de: 'Die Zeit {cas} und den Zuschlag von {kc} Kč haben wir erhalten. Sie gelten erst nach unserer Bestätigung.',
  pl: 'Przyjęliśmy godzinę {cas} i dopłatę {kc} Kč. Obowiązuje dopiero po naszym potwierdzeniu.',
  uk: 'Час {cas} і доплату {kc} Kč ми прийняли. Діє лише після нашого підтвердження.',
  'zh-Hant': '我們已收到時間 {cas} 與附加費 {kc} Kč。需經我們確認後才生效。',
  sv: 'Vi har tagit emot tiden {cas} och tillägget {kc} Kč. Det gäller först efter vår bekräftelse.',
  es: 'Hemos recibido la hora {cas} y el suplemento de {kc} Kč. Solo vale después de nuestra confirmación.',
  hu: 'A {cas} időpontot és a {kc} Kč felárat megkaptuk. Csak a megerősítésünk után érvényes.',
  da: 'Vi har modtaget tidspunktet {cas} og tillægget på {kc} Kč. Det gælder først efter vores bekræftelse.',
  fr: 'Nous avons bien reçu l’heure {cas} et le supplément de {kc} Kč. Cela ne vaut qu’après notre confirmation.',
  it: 'Abbiamo ricevuto l’orario {cas} e il supplemento di {kc} Kč. Vale solo dopo la nostra conferma.',
  pt: 'Recebemos a hora {cas} e o suplemento de {kc} Kč. Só vale depois da nossa confirmação.',
};

export const TEXT_SCHVALENI: LText = {
  cs: 'Příjezd ve {cas} platí. Příplatek {kc} Kč vyrovnáme při předání.',
  en: 'Arrival at {cas} is confirmed. We will settle the {kc} Kč surcharge at handover.',
  de: 'Die Ankunft um {cas} gilt. Den Zuschlag von {kc} Kč gleichen wir bei der Übergabe aus.',
  pl: 'Przyjazd o {cas} obowiązuje. Dopłatę {kc} Kč rozliczymy przy przekazaniu.',
  uk: 'Приїзд о {cas} діє. Доплату {kc} Kč розрахуємо при передачі.',
  'zh-Hant': '抵達時間 {cas} 已確認。附加費 {kc} Kč 於交屋時結清。',
  sv: 'Ankomst kl. {cas} gäller. Tillägget {kc} Kč reglerar vi vid överlämningen.',
  es: 'La llegada a las {cas} queda confirmada. El suplemento de {kc} Kč lo liquidamos en la entrega.',
  hu: 'A {cas} érkezés érvényes. A {kc} Kč felárat átadáskor rendezzük.',
  da: 'Ankomst kl. {cas} gælder. Tillægget på {kc} Kč afregner vi ved overdragelsen.',
  fr: 'L’arrivée à {cas} est confirmée. Nous réglerons le supplément de {kc} Kč à la remise des clés.',
  it: 'L’arrivo alle {cas} è confermato. Il supplemento di {kc} Kč lo saldiamo alla consegna.',
  pt: 'A chegada às {cas} está confirmada. O suplemento de {kc} Kč acertamos na entrega.',
};

export const TEXT_VYJIMKA: LText = {
  cs: 'Individuální příjezd ve {cas} platí. Příplatek {kc} Kč vyrovnáme na místě.',
  en: 'Individual arrival at {cas} is confirmed. We will settle the {kc} Kč surcharge on site.',
  de: 'Individuelle Ankunft um {cas} gilt. Den Zuschlag von {kc} Kč gleichen wir vor Ort aus.',
  pl: 'Indywidualny przyjazd o {cas} obowiązuje. Dopłatę {kc} Kč rozliczymy na miejscu.',
  uk: 'Індивідуальний приїзд о {cas} діє. Доплату {kc} Kč розрахуємо на місці.',
  'zh-Hant': '個別抵達時間 {cas} 已確認。附加費 {kc} Kč 於現場結清。',
  sv: 'Individuell ankomst kl. {cas} gäller. Tillägget {kc} Kč reglerar vi på plats.',
  es: 'La llegada individual a las {cas} queda confirmada. El suplemento de {kc} Kč lo liquidamos in situ.',
  hu: 'Az egyedi {cas} érkezés érvényes. A {kc} Kč felárat a helyszínen rendezzük.',
  da: 'Individuel ankomst kl. {cas} gælder. Tillægget på {kc} Kč afregner vi på stedet.',
  fr: 'L’arrivée individuelle à {cas} est confirmée. Nous réglerons le supplément de {kc} Kč sur place.',
  it: 'L’arrivo individuale alle {cas} è confermato. Il supplemento di {kc} Kč lo saldiamo sul posto.',
  pt: 'A chegada individual às {cas} está confirmada. O suplemento de {kc} Kč acertamos no local.',
};

/** @deprecated Použij TEXT_SCHVALENI / textSchvaleniPozdni. */
export const TEXT_SCHVALENI_CS = TEXT_SCHVALENI.cs;
/** @deprecated */
export const TEXT_ZMENA_CS = TEXT_CEKA_VETA.cs;
/** @deprecated */
export const TEXT_VYJIMKA_CS = TEXT_VYJIMKA.cs;
/** @deprecated */
export const TEXT_SBALENY_CEKA_CS = TEXT_SBALENY_CEKA.cs;

export function doplnSablonu(sablona: string, cas: string, kc: number): string {
  return sablona.replaceAll('{cas}', cas).replaceAll('{kc}', String(kc));
}

export function textCekaPozdni(cas: string, kc: number, lang?: GuideLang | null): string {
  return doplnSablonu(t(TEXT_CEKA_VETA, lang || 'en'), cas, kc);
}

export function textSchvaleniPozdni(cas: string, kc: number, lang?: GuideLang | null): string {
  return doplnSablonu(t(TEXT_SCHVALENI, lang || 'en'), cas, kc);
}

export function textVyjimkaPozdni(cas: string, kc: number, lang?: GuideLang | null): string {
  return doplnSablonu(t(TEXT_VYJIMKA, lang || 'en'), cas, kc);
}

/** Veřejný výběr hosta po 20:00 do 21:00 včetně = nutná žádost. */
export function vyzadujeZadostPozdni(cas: string | null | undefined): boolean {
  const v = priplatekCasu(cas);
  return v.stav === 'castka' && v.kc > 0;
}

/** Po 21:00 bez individuální výjimky host sám nevolí. */
export function jeCasJenIndividualni(cas: string | null | undefined): boolean {
  return priplatekCasu(cas).stav === 'domluva';
}

export function nactiZadostPozdni(raw: unknown): ZadostPozdniPrijezd | null {
  if (!raw || typeof raw !== 'object') return null;
  const z = raw as ZadostPozdniPrijezd;
  if (typeof z.cas !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(z.cas)) return null;
  if (z.stav !== 'ceka' && z.stav !== 'potvrzeno' && z.stav !== 'nelze') return null;
  if (typeof z.kc !== 'number' || !Number.isFinite(z.kc) || z.kc < 0) return null;
  if (typeof z.kdy !== 'string' || !z.kdy) return null;
  let drzi: ZadostPozdniPrijezd['drziPotvrzeni'] = null;
  if (z.drziPotvrzeni && typeof z.drziPotvrzeni === 'object') {
    const d = z.drziPotvrzeni;
    if (
      typeof d.cas === 'string' &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(d.cas) &&
      typeof d.kc === 'number' &&
      Number.isFinite(d.kc) &&
      d.kc >= 0
    ) {
      drzi = { cas: d.cas, kc: Math.round(d.kc) };
    }
  }
  return {
    cas: z.cas,
    kc: Math.round(z.kc),
    stav: z.stav,
    kdy: z.kdy,
    zprava: typeof z.zprava === 'string' && z.zprava.trim() ? z.zprava.trim() : null,
    drziPotvrzeni: drzi,
  };
}

function novaZadost(cas: string, kc: number, now: Date, drzi?: ZadostPozdniPrijezd['drziPotvrzeni']): ZadostPozdniPrijezd {
  return {
    cas,
    kc,
    stav: 'ceka',
    kdy: now.toISOString(),
    zprava: null,
    drziPotvrzeni: drzi || null,
  };
}

/**
 * Host zvolil čas po 20:00. Uloží žádost `ceka`.
 * Při změně už potvrzeného času drží původní potvrzení, dokud majitel nerozhodne.
 */
export function podaniZadostiPozdni(
  rec: RezervaceRecord,
  cas: string,
  now = new Date(),
): { patch: Partial<RezervaceRecord>; historie: string; push: string; bezeZmeny?: boolean } | null {
  if (!vyzadujeZadostPozdni(cas)) return null;
  const kc = priplatekProCas(cas);
  if (kc == null) return null;
  const z = rec.zadostPozdniPrijezd;
  if (z?.stav === 'ceka' && z.cas === cas && z.kc === kc && !z.drziPotvrzeni) {
    return { patch: {}, historie: '', push: '', bezeZmeny: true };
  }

  if (z?.stav === 'potvrzeno' && z.cas === cas && z.kc === kc) {
    return { patch: {}, historie: '', push: '', bezeZmeny: true };
  }

  const drzi =
    z?.stav === 'potvrzeno' ? { cas: z.cas, kc: z.kc } : z?.drziPotvrzeni || null;
  const zadost = novaZadost(cas, kc, now, drzi);
  const platnyCas = drzi ? drzi.cas : cas;
  return {
    patch: {
      zadostPozdniPrijezd: zadost,
      // Dokud čeká nové potvrzení, v kartě držíme poslední potvrzený čas.
      casPrijezdu: platnyCas,
      casZadalHost: true,
    },
    historie: drzi
      ? `Žádost o pozdní příjezd ve ${cas} (platí potvrzený ${drzi.cas})`
      : `Žádost o pozdní příjezd ve ${cas}`,
    push: `${rec.jmeno || rec.rezervace}: žádost o pozdní příjezd ve ${cas} (+${kc} Kč)`,
  };
}

/** Čas do 20:00 včetně: žádost o pozdní odpadá. */
export function zrusZadostPozdniPriBezplatnem(
  rec: RezervaceRecord,
  cas: string,
): Partial<RezervaceRecord> | null {
  if (vyzadujeZadostPozdni(cas) || jeCasJenIndividualni(cas)) return null;
  if (!rec.zadostPozdniPrijezd) return null;
  return { zadostPozdniPrijezd: null };
}

export function potvrdZadostPozdni(
  rec: RezervaceRecord,
  now = new Date(),
): { patch: Partial<RezervaceRecord>; historie: string; textHostovi: string } | null {
  const z = rec.zadostPozdniPrijezd;
  if (!z || z.stav !== 'ceka') return null;
  return {
    patch: {
      zadostPozdniPrijezd: {
        ...z,
        stav: 'potvrzeno',
        kdy: now.toISOString(),
        zprava: null,
        drziPotvrzeni: null,
      },
      casPrijezdu: z.cas,
      casZadalHost: true,
    },
    historie: `Pozdní příjezd ve ${z.cas} potvrzen`,
    textHostovi: textSchvaleniPozdni(z.cas, z.kc, rec.jazyk),
  };
}

export function odmitniZadostPozdni(
  rec: RezervaceRecord,
  zprava: string,
  now = new Date(),
): { patch: Partial<RezervaceRecord>; historie: string; textHostovi: string } | null {
  const z = rec.zadostPozdniPrijezd;
  if (!z || (z.stav !== 'ceka' && z.stav !== 'potvrzeno')) return null;
  const text = zprava.trim();
  if (!text) return null;
  const vratCas = z.drziPotvrzeni?.cas || null;
  return {
    patch: {
      zadostPozdniPrijezd: {
        ...z,
        stav: 'nelze',
        kdy: now.toISOString(),
        zprava: text,
        drziPotvrzeni: null,
      },
      casPrijezdu: vratCas,
    },
    historie: `Pozdní příjezd ve ${z.cas} nelze`,
    textHostovi: text,
  };
}

/** Hostitel nastaví individuální čas po 21:00 (nebo jiný schválený mimo běžný výběr). */
export function nastavIndividualniPozdni(
  rec: RezervaceRecord,
  cas: string,
  kc: number,
  now = new Date(),
): { patch: Partial<RezervaceRecord>; historie: string; textHostovi: string } | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cas)) return null;
  if (!Number.isFinite(kc) || kc < 0) return null;
  const castka = Math.round(kc);
  return {
    patch: {
      casPrijezdu: cas,
      casZadalHost: false,
      zadostPozdniPrijezd: {
        cas,
        kc: castka,
        stav: 'potvrzeno',
        kdy: now.toISOString(),
        zprava: null,
        drziPotvrzeni: null,
      },
      // Individuální příplatek hostitel zadá zvlášť; když je 0+ číslo, drží se v priplatekRucni.
      ...(castka === 0 || castka > 0 ? { priplatekRucni: castka } : {}),
    },
    historie: `Individuální pozdní příjezd ve ${cas}`,
    textHostovi: textVyjimkaPozdni(cas, castka, rec.jazyk),
  };
}

export function textSbalenehoRadkuPozdni(
  z: ZadostPozdniPrijezd | null | undefined,
  lang?: GuideLang | null,
): string | null {
  if (!z) return null;
  const j = lang || 'cs';
  if (z.stav === 'ceka') return doplnSablonu(t(TEXT_SBALENY_CEKA, j), z.cas, z.kc);
  if (z.stav === 'potvrzeno') return textSchvaleniPozdni(z.cas, z.kc, j);
  if (z.stav === 'nelze') return z.zprava || `Příjezd ve ${z.cas} nelze`;
  return null;
}
