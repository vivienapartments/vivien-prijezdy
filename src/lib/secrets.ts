import type { AptId } from './types';

export type GuideSecrets = {
  KOD_ZAHRADA_V1: string;
  KOD_ZAHRADA_V2: string;
  KOD_ZAHRADA_V3: string;
  KOD_ZAHRADA_V4: string;
  KOD_ZAHRADA_V5: string;
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
  return v && v.length > 0 ? v : 'DOPLNIT';
}

/** Jen server. */
export function loadSecrets(): GuideSecrets {
  return {
    KOD_ZAHRADA_V1: envOrDoplnit('KOD_ZAHRADA_V1'),
    KOD_ZAHRADA_V2: envOrDoplnit('KOD_ZAHRADA_V2'),
    KOD_ZAHRADA_V3: envOrDoplnit('KOD_ZAHRADA_V3'),
    KOD_ZAHRADA_V4: envOrDoplnit('KOD_ZAHRADA_V4'),
    KOD_ZAHRADA_V5: envOrDoplnit('KOD_ZAHRADA_V5'),
    WIFI_HESLO_V1: envOrDoplnit('WIFI_HESLO_V1'),
    WIFI_HESLO_V2: envOrDoplnit('WIFI_HESLO_V2'),
    WIFI_HESLO_V3: envOrDoplnit('WIFI_HESLO_V3'),
    WIFI_HESLO_V4: envOrDoplnit('WIFI_HESLO_V4'),
    WIFI_HESLO_V5: envOrDoplnit('WIFI_HESLO_V5'),
    WIFI_HESLO_ZAHRADA: envOrDoplnit('WIFI_HESLO_ZAHRADA'),
    BRANA_TELEFON: envOrDoplnit('BRANA_TELEFON'),
  };
}

export function kodZahradyProApt(secrets: GuideSecrets, apt: AptId): string {
  switch (apt) {
    case 'V1':
      return secrets.KOD_ZAHRADA_V1;
    case 'V2':
      return secrets.KOD_ZAHRADA_V2;
    case 'V3':
      return secrets.KOD_ZAHRADA_V3;
    case 'V4':
      return secrets.KOD_ZAHRADA_V4;
    case 'V5':
      return secrets.KOD_ZAHRADA_V5;
  }
}
