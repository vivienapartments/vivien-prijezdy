'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  aptyVolneVeTerminu,
  cenaApartmanuZaPobyt,
  denBezPrijezdu,
  denPlno,
  minCenaVolnych,
  nejblizsiVolneTerminy,
  nejlevnejsiVolnyPobyt,
  slevaPctCastka,
  terminPresPlnyDen,
  type KalendarDenni,
  type CenaPobytu,
} from '@/lib/kalendar-denni';
import type { AptId } from '@/lib/types';
import type { DenInfoKalendare } from './TerminKalendar';

type ApiOdpoved = {
  ok?: boolean;
  cenyZapnuto?: boolean;
  dny?: KalendarDenni;
  bezAptPoDnech?: Record<string, number>;
};

export function usePoptavkaKalendar() {
  const [dny, setDny] = useState<KalendarDenni>({});
  const [bezApt, setBezApt] = useState<Record<string, number>>({});
  const [cenyZapnuto, setCenyZapnuto] = useState(true);
  const [nacteno, setNacteno] = useState(false);

  useEffect(() => {
    let zruseno = false;
    void (async () => {
      try {
        const res = await fetch('/api/poptavka/kalendar', { cache: 'no-store' });
        const json = (await res.json()) as ApiOdpoved;
        if (zruseno || !json.ok) return;
        setDny(json.dny || {});
        setBezApt(json.bezAptPoDnech || {});
        setCenyZapnuto(json.cenyZapnuto !== false);
      } catch {
        /* bez kalendáře = staré chování */
      } finally {
        if (!zruseno) setNacteno(true);
      }
    })();
    return () => {
      zruseno = true;
    };
  }, []);

  const denInfo = useCallback(
    (ymd: string): DenInfoKalendare => {
      const den = dny[ymd];
      const ba = bezApt[ymd] || 0;
      return {
        plno: denPlno(den, ba),
        bezPrijezdu: denBezPrijezdu(den, ba),
        cenaOd: minCenaVolnych(den),
      };
    },
    [dny, bezApt],
  );

  function cenaProVyber(
    prijezd: string,
    odjezd: string,
    apts: AptId[],
    libovolny: boolean,
    /** 0 = bez slevy; jinak % (klub nebo pevných 5). */
    slevaPct: number,
  ): CenaPobytu | null {
    if (!prijezd || !odjezd) return null;
    if (terminPresPlnyDen(dny, prijezd, odjezd, bezApt)) return null;
    const pct = Math.max(0, Math.round(slevaPct));
    if (libovolny || apts.length === 0) {
      const best = nejlevnejsiVolnyPobyt(dny, prijezd, odjezd, undefined, pct || 0);
      if (!best) return null;
      return pct > 0 ? best : { ...best, seSlevou: best.suma };
    }
    if (apts.length === 1) {
      const suma = cenaApartmanuZaPobyt(dny, apts[0], prijezd, odjezd);
      if (suma == null) return null;
      return {
        apt: apts[0],
        suma,
        seSlevou: pct > 0 ? slevaPctCastka(suma, pct) : suma,
      };
    }
    return nejlevnejsiVolnyPobyt(dny, prijezd, odjezd, apts, pct || 0);
  }

  const aptObsazenyVeTerminu = useCallback(
    (apt: AptId, prijezd: string, odjezd: string): boolean => {
      if (!prijezd || !odjezd || !nacteno) return false;
      // Bez ceny nebo obsazeno = nenabízet jako volný.
      return !aptyVolneVeTerminu(dny, prijezd, odjezd).includes(apt);
    },
    [dny, nacteno],
  );

  const volneApty = useMemo(() => {
    return (prijezd: string, odjezd: string) => aptyVolneVeTerminu(dny, prijezd, odjezd);
  }, [dny]);

  return {
    dny,
    bezApt,
    cenyZapnuto,
    nacteno,
    denInfo,
    cenaProVyber,
    aptObsazenyVeTerminu,
    volneApty,
    nejblizsi: (prijezd: string, odjezd: string, apt?: AptId | null) =>
      nejblizsiVolneTerminy(dny, prijezd, odjezd, apt),
    terminPlny: (prijezd: string, odjezd: string) =>
      terminPresPlnyDen(dny, prijezd, odjezd, bezApt) ||
      aptyVolneVeTerminu(dny, prijezd, odjezd).length === 0,
  };
}
