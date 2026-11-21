import { Guide } from '@/components/Guide';
import { loadSecrets } from '@/lib/secrets';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Zkouška · první otevření průvodce',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * První otevření z mailu: nejdřív okno přes celou obrazovku (Přidat na plochu),
 * teprve po Ano / Později je průvodce.
 * Otevřete s ?plocha=okno ať se okno ukáže i na PC.
 */
export default function ZkouskaPridejNaPlochuPage() {
  return (
    <Guide
      apt="V1"
      lang="cs"
      secrets={loadSecrets()}
      stay={{ noci: 2, osob: 2 }}
      kody={null}
      poplatek="neznamo"
      prijezdDen={null}
      rezervace="zkouska-plocha-prvni"
      narodnost="CZE"
      vstup={{
        token: null,
        cteni: true,
        uroven: 'nic',
        hodnoty: {
          cas: null,
          zpusob: null,
          telefon: '',
          spz: '',
          pujcene: false,
          souhlas: false,
        },
        predvyplneny: '',
        ubytovan: false,
      }}
      odjezd={{ den: null, cas: null }}
    />
  );
}
