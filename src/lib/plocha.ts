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
