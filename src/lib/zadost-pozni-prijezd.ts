import { priplatekCasu, priplatekProCas } from './priplatek-prijezd';
import type { RezervaceRecord } from './store';

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

export const TEXT_SCHVALENI_CS = 'Příjezd ve {cas} platí. Příplatek {kc} Kč vyrovnáme při předání.';
export const TEXT_ZMENA_CS = 'Nový čas {cas} jsme přijali. Platí až po našem potvrzení.';
export const TEXT_VYJIMKA_CS = 'Individuální příjezd ve {cas} platí. Příplatek {kc} Kč vyrovnáme na místě.';
export const TEXT_SBALENY_CEKA_CS = 'Příjezd {cas} · zatím nepotvrzeno';

export function doplnSablonu(sablona: string, cas: string, kc: number): string {
  return sablona.replaceAll('{cas}', cas).replaceAll('{kc}', String(kc));
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
    textHostovi: doplnSablonu(TEXT_SCHVALENI_CS, z.cas, z.kc),
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
    textHostovi: doplnSablonu(TEXT_VYJIMKA_CS, cas, castka),
  };
}

export function textSbalenehoRadkuPozdni(z: ZadostPozdniPrijezd | null | undefined): string | null {
  if (!z) return null;
  if (z.stav === 'ceka') return doplnSablonu(TEXT_SBALENY_CEKA_CS, z.cas, z.kc);
  if (z.stav === 'potvrzeno') return doplnSablonu(TEXT_SCHVALENI_CS, z.cas, z.kc);
  if (z.stav === 'nelze') return z.zprava || `Příjezd ve ${z.cas} nelze`;
  return null;
}
