export type GuideSecrets = {
  WIFI_HESLO_V1: string;
  WIFI_HESLO_V2: string;
  WIFI_HESLO_V3: string;
  WIFI_HESLO_V4: string;
  WIFI_HESLO_V5: string;
  WIFI_HESLO_ZAHRADA: string;
  BRANA_TELEFON: string;
};

function envOrDoplnit(key: string): string {
  const v = process.env[key]?.trim();
  // Na Vercelu občas omylem zůstane placeholder = název proměnné.
  if (!v || v === key || /^WIFI_HESLO_V[1-5]$/i.test(v) || v === 'WIFI_HESLO_ZAHRADA') {
    return 'DOPLNIT';
  }
  return v;
}

/** Jen server. */
export function loadSecrets(): GuideSecrets {
  return {
    WIFI_HESLO_V1: envOrDoplnit('WIFI_HESLO_V1'),
    WIFI_HESLO_V2: envOrDoplnit('WIFI_HESLO_V2'),
    WIFI_HESLO_V3: envOrDoplnit('WIFI_HESLO_V3'),
    WIFI_HESLO_V4: envOrDoplnit('WIFI_HESLO_V4'),
    WIFI_HESLO_V5: envOrDoplnit('WIFI_HESLO_V5'),
    WIFI_HESLO_ZAHRADA: envOrDoplnit('WIFI_HESLO_ZAHRADA'),
    BRANA_TELEFON: envOrDoplnit('BRANA_TELEFON'),
  };
}
