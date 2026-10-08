export type GuideSecrets = {
  KOD_ZAHRADA: string;
  WIFI_HESLO_V1: string;
  WIFI_HESLO_V2: string;
  WIFI_HESLO_V3: string;
  WIFI_HESLO_V4: string;
  WIFI_HESLO_V5: string;
  WIFI_HESLO_ZAHRADA: string;
  BRANA_TELEFON: string;
};

function envOrDoplnit(key: keyof GuideSecrets): string {
  const v = process.env[key]?.trim();
  return v && v.length > 0 ? v : 'DOPLNIT';
}

/** Jen server. */
export function loadSecrets(): GuideSecrets {
  return {
    KOD_ZAHRADA: envOrDoplnit('KOD_ZAHRADA'),
    WIFI_HESLO_V1: envOrDoplnit('WIFI_HESLO_V1'),
    WIFI_HESLO_V2: envOrDoplnit('WIFI_HESLO_V2'),
    WIFI_HESLO_V3: envOrDoplnit('WIFI_HESLO_V3'),
    WIFI_HESLO_V4: envOrDoplnit('WIFI_HESLO_V4'),
    WIFI_HESLO_V5: envOrDoplnit('WIFI_HESLO_V5'),
    WIFI_HESLO_ZAHRADA: envOrDoplnit('WIFI_HESLO_ZAHRADA'),
    BRANA_TELEFON: envOrDoplnit('BRANA_TELEFON'),
  };
}
