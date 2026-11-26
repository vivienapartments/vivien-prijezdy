/**
 * Upozornění „zkontrolovat slevu“ v /prehled/klienti.
 * Když během pobytu vznikla rezervace s vyšší (očekávanou) slevou
 * a ten pobyt se nakonec nepředá (storno / nezaplaceno), nic se nemění
 * automaticky – majitel jen vidí štítek.
 */

export type SlevaBehemZaznam = {
  rezervaceId: string;
  slevaPctUdelena: number;
  oficielniSlevaPct: number;
  /** ISO datum zápisu. */
  kdy: string;
  /** Rezervace probíhajícího pobytu, ze kterého očekávaná sleva vycházela. */
  zdrojPobytId?: string;
};

export type SlevaKontrolaStav = {
  aktivni: boolean;
  slevaPctUdelena: number;
  oficielniSlevaPct: number;
  rezervaceId: string;
  duvod: string;
};

export type KlientSlevaKontrolaCast = {
  slevaBehem?: SlevaBehemZaznam[];
  slevaKontrola?: SlevaKontrolaStav | null;
};

/** Zápis vyšší slevy udělené během probíhajícího pobytu. */
export function pridejSlevuBehemPobytu(
  cast: KlientSlevaKontrolaCast,
  zaznam: SlevaBehemZaznam,
): SlevaBehemZaznam[] {
  const list = [...(cast.slevaBehem || [])];
  const i = list.findIndex((x) => x.rezervaceId === zaznam.rezervaceId);
  if (i >= 0) list[i] = zaznam;
  else list.push(zaznam);
  return list;
}

/**
 * Po stornu / nepředání probíhajícího pobytu: když mezitím vznikla
 * rezervace s vyšší slevou, aktivuj upozornění. Nic na slevách neměň.
 */
export function aktivujSlevaKontroluPoNepredani(
  cast: KlientSlevaKontrolaCast,
  opts: { zdrojPobytId?: string; oficielniSlevaPct: number },
): SlevaKontrolaStav | null {
  const list = cast.slevaBehem || [];
  const kandidati = list.filter((z) => {
    if (z.slevaPctUdelena <= opts.oficielniSlevaPct) return false;
    if (opts.zdrojPobytId && z.zdrojPobytId && z.zdrojPobytId !== opts.zdrojPobytId) {
      return false;
    }
    return true;
  });
  if (!kandidati.length) return cast.slevaKontrola || null;
  const posledni = kandidati[kandidati.length - 1];
  return {
    aktivni: true,
    slevaPctUdelena: posledni.slevaPctUdelena,
    oficielniSlevaPct: opts.oficielniSlevaPct,
    rezervaceId: posledni.rezervaceId,
    duvod: 'zkontrolovat slevu',
  };
}

export function jeSlevaKontrolaAktivni(cast: KlientSlevaKontrolaCast): boolean {
  return Boolean(cast.slevaKontrola?.aktivni);
}

/** Po nedojezdu / stornu: když má klient zápis vyšší slevy, aktivuj štítek. */
export async function zkusSlevaKontroluPoNepredani(
  store: {
    getKv: (k: string) => Promise<string | null>;
    setKv: (k: string, v: string) => Promise<void>;
  },
  opts: { rezervaceId: string; email?: string | null; telefon?: string | null },
): Promise<boolean> {
  try {
    const { klubZapnut, klubKlic } = await import('./klub-klic');
    if (!klubZapnut()) return false;
    const {
      nactiKlientPodleId,
      ulozKlientKartu,
    } = await import('./klient-karta');
    const { urovenZUtraty } = await import('./klub-pravidla');

    let id: string | null = null;
    const rawRez = await store.getKv(klubKlic(`klient-index:rez:${opts.rezervaceId}`));
    if (rawRez) {
      try {
        id = (JSON.parse(rawRez) as { id?: string }).id || null;
      } catch {
        /* ignore */
      }
    }
    if (!id) return false;
    const k = await nactiKlientPodleId(store as never, id);
    if (!k) return false;
    const oficielni = urovenZUtraty(k.utrataKc).slevaPct;
    const stav = aktivujSlevaKontroluPoNepredani(k, {
      zdrojPobytId: opts.rezervaceId,
      oficielniSlevaPct: oficielni,
    });
    if (!stav?.aktivni) return false;
    k.slevaKontrola = stav;
    await ulozKlientKartu(store as never, k);
    return true;
  } catch {
    return false;
  }
}
