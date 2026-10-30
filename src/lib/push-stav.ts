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
export const HLASKA_NENASTAVENO = 'Upozornění ještě nejsou nastavená. (server nemá klíč VAPID)';
export const HLASKA_PROHLIZEC = 'Prohlížeč upozornění nepředal.';
export const HLASKA_READY_TIMEOUT = 'Prohlížeč nepřipravil upozornění, zkuste znovu.';

export function hlaskaNacteniPush(status: number | 'sit' | null): string {
  if (status === 'sit' || status == null) return 'Nepodařilo se načíst nastavení upozornění (síť).';
  return `Nepodařilo se načíst nastavení upozornění (${status}).`;
}

/** Promise s horním limitem. Po timeoutu vrátí hodnotu z `priTimeoutu`. */
export function sTimeoutem<T>(
  p: Promise<T>,
  ms: number,
  priTimeoutu: () => T | Promise<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let hotovo = false;
    const timer = setTimeout(() => {
      if (hotovo) return;
      hotovo = true;
      void Promise.resolve(priTimeoutu()).then(resolve, reject);
    }, ms);
    p.then(
      (v) => {
        if (hotovo) return;
        hotovo = true;
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        if (hotovo) return;
        hotovo = true;
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

type SwLike = {
  getRegistration: (scope?: string) => Promise<{ pushManager: { getSubscription: () => Promise<{ endpoint: string } | null> } } | undefined>;
};

/** Jen čtení. Nepoužívá `ready` (to by viselo bez aktivního SW). */
export async function nactiLokalniOdberZeSw(
  sw: SwLike | null | undefined,
  timeoutMs = 3000,
): Promise<{ odber: boolean; endpoint: string | null }> {
  if (!sw) return { odber: false, endpoint: null };
  try {
    const reg = await sTimeoutem(sw.getRegistration('/prehled/'), timeoutMs, () => undefined);
    if (!reg) return { odber: false, endpoint: null };
    const sub = await sTimeoutem(reg.pushManager.getSubscription(), timeoutMs, () => null);
    return { odber: Boolean(sub), endpoint: sub?.endpoint ?? null };
  } catch {
    return { odber: false, endpoint: null };
  }
}

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
