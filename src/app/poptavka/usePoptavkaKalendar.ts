'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  aptyVolneVeTerminu,
  cenaApartmanuZaPobyt,
  denBezPrijezdu,
  denPlno,
  minCenaVolnych,
  nejlevnejsiVolnyPobyt,
  nociPobytu,
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
    seSlevou: boolean,
  ): CenaPobytu | null {
    if (!prijezd || !odjezd) return null;
    if (terminPresPlnyDen(dny, prijezd, odjezd, bezApt)) return null;
    if (libovolny || apts.length === 0) {
      const best = nejlevnejsiVolnyPobyt(dny, prijezd, odjezd);
      if (!best) return null;
      return seSlevou ? best : { ...best, seSlevou: best.suma };
    }
    if (apts.length === 1) {
      const suma = cenaApartmanuZaPobyt(dny, apts[0], prijezd, odjezd);
      if (suma == null) return null;
      return {
        apt: apts[0],
        suma,
        seSlevou: seSlevou ? slevaPctCastka(suma) : suma,
      };
    }
    return nejlevnejsiVolnyPobyt(dny, prijezd, odjezd, apts);
  }

  const aptObsazenyVeTerminu = useCallback(
    (apt: AptId, prijezd: string, odjezd: string): boolean => {
      if (!prijezd || !odjezd) return false;
      return nociPobytu(prijezd, odjezd).some((d) => Boolean(dny[d]?.[apt]?.obsazeno));
    },
    [dny],
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
    terminPlny: (prijezd: string, odjezd: string) =>
      terminPresPlnyDen(dny, prijezd, odjezd, bezApt) ||
      aptyVolneVeTerminu(dny, prijezd, odjezd).length === 0,
  };
}
