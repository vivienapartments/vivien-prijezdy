import { loadSecrets, type GuideSecrets } from './secrets';
import { APT_IDS, type AptId } from './types';

/** Jen upozornění v přehledu. Odeslání průvodce to nezastaví. */
export function chybejiciWifi(): AptId[] {
  const secrets = loadSecrets();
  return APT_IDS.filter((id) => {
    const wifi = secrets[`WIFI_HESLO_${id}` as keyof GuideSecrets];
    return !wifi || wifi === 'DOPLNIT';
  });
}
