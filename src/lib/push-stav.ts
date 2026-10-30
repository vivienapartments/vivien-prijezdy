/** Endpoint tohoto telefonu je v seznamu ze serveru. */
export function jeSparovano(
  endpoint: string | null | undefined,
  seznam: { endpoint: string }[],
): boolean {
  if (!endpoint) return false;
  return seznam.some((z) => z.endpoint === endpoint);
}

export type PushPovoleni = 'granted' | 'denied' | 'default' | 'neurceno';

export function textPovoleni(p: PushPovoleni): string {
  if (p === 'granted') return 'ano';
  if (p === 'denied') return 'ne';
  if (p === 'default') return 'ne';
  return 'neurčeno';
}

export function textAnoNe(v: boolean | null): string {
  if (v == null) return 'neurčeno';
  return v ? 'ano' : 'ne';
}

export function radekDiagnostikyPush(opts: {
  povoleni: PushPovoleni;
  odber: boolean | null;
  sparovano: boolean;
}): string {
  return `Povolení: ${textPovoleni(opts.povoleni)} · Odběr v prohlížeči: ${textAnoNe(opts.odber)} · Spárováno se serverem: ${textAnoNe(opts.sparovano)}`;
}

/** Hláška po neúspěchu zapnutí (bez tajných údajů). */
export function hlaskaChybyZapnuti(err: unknown): string {
  if (err && typeof err === 'object' && 'name' in err && typeof (err as { name: unknown }).name === 'string') {
    const jmeno = (err as { name: string }).name.trim();
    if (jmeno) return `Upozornění se nepodařilo zapnout (${jmeno}).`;
  }
  return 'Upozornění se nepodařilo zapnout. Zkuste znovu.';
}

export const HLASKA_ZAPINAM = 'Zapínám…';
export const HLASKA_ZAPNUTO = 'Upozornění jsou zapnutá.';
export const HLASKA_NESPAROVANO =
  'Uloženo, ale telefon se nespároval. Klepněte prosím znovu.';
export const HLASKA_NEPOVOLENO = 'Upozornění jsou v telefonu vypnutá.';
export const HLASKA_NENASTAVENO = 'Upozornění ještě nejsou nastavená.';
export const HLASKA_PROHLIZEC = 'Prohlížeč upozornění nepředal.';

export function nadpisPushSekce(opts: {
  sparovano: boolean;
  nazev: string;
}): { text: string; varovani: boolean } {
  if (!opts.sparovano) {
    return { text: '⚙ Telefon a upozornění · tento telefon upozornění nedostává', varovani: true };
  }
  const kdo = opts.nazev.trim() || 'bez jména';
  return { text: `⚙ Telefon a upozornění · ${kdo} ✓`, varovani: false };
}
