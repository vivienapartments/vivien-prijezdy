export type PlochaStav = 'nic' | 'později' | 'skryto' | 'hotovo';

const PREFIX = 'vivien-pv-plocha:';

export function klicPlochy(rezervace: string | null | undefined): string {
  return `${PREFIX}${rezervace || 'x'}`;
}

export function nactiPlochaStav(rezervace: string | null | undefined): PlochaStav {
  try {
    const raw = localStorage.getItem(klicPlochy(rezervace));
    if (raw === 'později' || raw === 'skryto' || raw === 'hotovo') return raw;
  } catch {
    /* paměť */
  }
  return 'nic';
}

export function ulozPlochaStav(rezervace: string | null | undefined, stav: PlochaStav): void {
  try {
    if (stav === 'nic') localStorage.removeItem(klicPlochy(rezervace));
    else localStorage.setItem(klicPlochy(rezervace), stav);
  } catch {
    /* paměť */
  }
}

/**
 * Záznam „na ploše“ u nás (plochaOd). Jen poprvé. Bez Telegramu a e-mailu.
 * Token může být i po odjezdu (stránka Expired).
 */
export function posliPlochaNaServer(token: string | null | undefined): void {
  const t = (token || '').trim();
  if (!t || t === 'nahled') return;
  try {
    void fetch('/api/pruvodce/plocha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* síť */
  }
}

export function jeStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
  } catch {
    /* media */
  }
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

type RelatedApp = { id?: string; platform?: string; url?: string };

/** ano = ikona je, ne = Chrome říká že není, nevim = API chybí (iPhone…). */
export type PlochaZjisteni = 'ano' | 'ne' | 'nevim';

/**
 * Skutečný stav ikony na ploše.
 * Chrome Android: getInstalledRelatedApps. Jinak nevim (bereme localStorage).
 */
export async function zjistiPwaNaPlose(): Promise<PlochaZjisteni> {
  if (typeof window === 'undefined') return 'nevim';
  if (jeStandalone()) return 'ano';
  const nav = window.navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<RelatedApp[]>;
  };
  if (typeof nav.getInstalledRelatedApps !== 'function') return 'nevim';
  try {
    const apps = await nav.getInstalledRelatedApps();
    return Array.isArray(apps) && apps.length > 0 ? 'ano' : 'ne';
  } catch {
    return 'nevim';
  }
}

/** true jen když víme jistě, že ikona je (standalone nebo related apps). */
export async function jePwaNainstalovana(): Promise<boolean> {
  return (await zjistiPwaNaPlose()) === 'ano';
}

export function jeIos(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  return window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
}

export function jeAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(window.navigator.userAgent || '');
}

/**
 * Skutečný Chrome (ne WebView, ne Edge/Opera/Samsung).
 * Pozor: Custom Tab z Gmailu/Seznamu má stejný UA — smyčku řeš `vchrome=1`, ne UA.
 */
export function jeChrome(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  if (/; wv\)|WebView/i.test(ua)) return false;
  if (/EdgA?|OPR|SamsungBrowser|Firefox|CriOS/i.test(ua)) return false;
  return /Chrome\//i.test(ua);
}

/** Už jsme v plném Chrome přes intent (ochrana proti smyčce). */
export function maVchromeParam(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('vchrome') === '1';
  } catch {
    return false;
  }
}

/**
 * Čistý start_url pro ikonu na ploše: /{token} bez poprve/plocha/vchrome a bez #.
 */
export function cistyStartUrlPlochy(href?: string): string {
  if (typeof window === 'undefined' && !href) return '/';
  try {
    const u = new URL(href || window.location.href, 'https://club.vivienapartments.cz');
    u.searchParams.delete('poprve');
    u.searchParams.delete('plocha');
    u.searchParams.delete('vchrome');
    u.hash = '';
    const q = u.searchParams.toString();
    return `${u.pathname}${q ? `?${q}` : ''}` || '/';
  } catch {
    return '/';
  }
}

/**
 * Otevře stejnou stránku v Chrome (z Gmailu, Seznamu, Custom Tab…).
 * Smyčku řeší `vchrome=1`: když už je v URL, nic nedělá.
 * `plocha: true` doplní plocha=1 i vchrome=1.
 */
export function otevriStejnouStrankuVChrome(opts?: { plocha?: boolean }): void {
  if (typeof window === 'undefined') return;
  if (maVchromeParam()) return;
  const u = new URL(window.location.href);
  if (opts?.plocha) u.searchParams.set('plocha', '1');
  u.searchParams.set('vchrome', '1');
  u.hash = '';
  const cil = `${u.host}${u.pathname}${u.search}`;
  window.location.href = `intent://${cil}#Intent;scheme=https;package=com.android.chrome;end`;
}
