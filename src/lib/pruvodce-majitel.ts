/** Odkazy a interval, které smí importovat i prohlížeč. Bez Node a bez úložiště. */

export const DOTAZ_PREDANI_MS = 20_000;

export function odkazPruvodceMajitele(id: string, ukazka = false): string {
  const cesta = `/prehled/host/${encodeURIComponent(id)}`;
  return ukazka ? `${cesta}?ukazka=1` : cesta;
}

/** Hash je číslo řádku v přehledu, aby se majitel vrátil k tomu hostu. */
export function odkazZpetDoPrehledu(id: string, ukazka = false): string {
  const base = ukazka ? '/prehled?ukazka=1' : '/prehled';
  return `${base}#${encodeURIComponent(id)}`;
}
