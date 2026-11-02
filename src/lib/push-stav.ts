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
  if (err instanceof Error) {
    const jmeno = err.name?.trim();
    const text = err.message?.trim();
    if (jmeno && text && text !== jmeno) return `Upozornění se nepodařilo zapnout (${jmeno}: ${text.slice(0, 80)}).`;
    if (jmeno) return `Upozornění se nepodařilo zapnout (${jmeno}).`;
    if (text) return `Upozornění se nepodařilo zapnout (${text.slice(0, 80)}).`;
  }
  if (err && typeof err === 'object' && 'name' in err && typeof (err as { name: unknown }).name === 'string') {
    const jmeno = (err as { name: string }).name.trim();
    if (jmeno) return `Upozornění se nepodařilo zapnout (${jmeno}).`;
  }
  return 'Upozornění se nepodařilo zapnout. Zkuste znovu.';
}

/** Pauza mezi zrušením a novým odběrem (Android jinak často selže). */
export function pockejMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const HLASKA_ZAPINAM = 'Zapínám…';
export const HLASKA_ZAPNUTO = 'Upozornění jsou zapnutá.';
export const HLASKA_NESPAROVANO =
  'Uloženo, ale telefon se nespároval. Klepněte prosím znovu.';
export const HLASKA_NEPOVOLENO = 'Upozornění jsou v telefonu vypnutá.';
export const HLASKA_NENASTAVENO = 'Upozornění ještě nejsou nastavená. (server nemá klíč VAPID)';
export const HLASKA_PROHLIZEC = 'Prohlížeč upozornění nepředal.';
export const HLASKA_READY_TIMEOUT = 'Prohlížeč nepřipravil upozornění, zkuste znovu.';
export const HLASKA_ODBER_TIMEOUT =
  'Telefon nevytvořil odběr upozornění. Zkuste Resetovat upozornění níže.';
export const HLASKA_SIT_TIMEOUT = 'Server neodpověděl včas. Zkuste znovu.';
export const HLASKA_CELEK_TIMEOUT =
  'Zapínání trvalo moc dlouho a skončilo. Zkuste Resetovat upozornění níže.';

/** fetch s horním limitem (Android jinak umí viset na Zapínám…). */
export async function fetchSTimeoutem(
  vstup: RequestInfo | URL,
  init: RequestInit | undefined,
  ms: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const vnitrni = init?.signal;
  const naAbort = () => ctrl.abort();
  if (vnitrni) {
    if (vnitrni.aborted) ctrl.abort();
    else vnitrni.addEventListener('abort', naAbort, { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(vstup, { ...init, signal: ctrl.signal });
  } catch (err) {
    if (ctrl.signal.aborted) throw new Error(HLASKA_SIT_TIMEOUT);
    throw err;
  } finally {
    clearTimeout(timer);
    if (vnitrni) vnitrni.removeEventListener('abort', naAbort);
  }
}

/** Jen registrace se scope /prehled/ (ne /uklid/). */
export function jePrehledSwScope(scope: string | undefined | null): boolean {
  if (!scope) return false;
  try {
    const cesta = new URL(scope, 'https://local.invalid').pathname;
    return cesta === '/prehled' || cesta.startsWith('/prehled/');
  } catch {
    return scope.includes('/prehled');
  }
}

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
