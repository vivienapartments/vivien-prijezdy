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
 * V Gmailu/Seznamu často nejde, tam je potřeba intent://.
 */
export function jeChrome(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  if (/; wv\)|WebView/i.test(ua)) return false;
  if (/EdgA?|OPR|SamsungBrowser|Firefox|CriOS/i.test(ua)) return false;
  return /Chrome\//i.test(ua);
}

/**
 * Otevře stejnou stránku v Chrome (z Gmailu, Seznamu, Custom Tab…).
 * Funguje jen na Androidu. Když už jsi v Chrome, nic nedělá (ochrana proti smyčce).
 * `plocha: true` doplní ?plocha=1, ať se po otevření znovu ukáže výzva.
 */
export function otevriStejnouStrankuVChrome(opts?: { plocha?: boolean }): void {
  if (typeof window === 'undefined') return;
  if (jeChrome()) return;
  const u = new URL(window.location.href);
  if (opts?.plocha) u.searchParams.set('plocha', '1');
  const cil = `${u.host}${u.pathname}${u.search}${u.hash}`;
  window.location.href = `intent://${cil}#Intent;scheme=https;package=com.android.chrome;end`;
}
