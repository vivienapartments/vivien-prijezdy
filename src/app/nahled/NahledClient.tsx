'use client';

import { useRouter } from 'next/navigation';
import { Guide } from '@/components/Guide';
import { denPraha, posunDen } from '@/lib/brana';
import { casyDrive } from '@/lib/okno-pobytu';
import { parseApt, parseLang } from '@/lib/i18n';
import { kodyProHosta } from '@/lib/kody-pruvodce';
import type { GuideSecrets } from '@/lib/secrets';
import type { AptId, GuideLang, Prijezd } from '@/lib/types';
import { jeCasHosta, urovenPruvodce, type ZpusobPrijezdu } from '@/lib/vstup-pruvodce';
import type { VstupHodnoty } from '@/components/VstupHosta';

type Props = {
  secrets: GuideSecrets;
  searchParams: Record<string, string | string[] | undefined>;
};

function one(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export function NahledClient({ secrets, searchParams }: Props) {
  const router = useRouter();
  const apt = parseApt(one(searchParams.apt));
  const lang = parseLang(one(searchParams.lang));
  const vikend = one(searchParams.vikend) === '1';
  const accessPin = one(searchParams.pin);
  const predano = one(searchParams.predano) !== '0';
  const tvar = one(searchParams.tvar) === 'plny' ? 'plny' : 'dnes';

  const casRaw = one(searchParams.cas);
  const zpusobRaw = one(searchParams.zpusob);
  const zpusob: ZpusobPrijezdu | null = zpusobRaw === 'auto' || zpusobRaw === 'pesky' ? zpusobRaw : null;
  const telefon = one(searchParams.brana) || '';
  const spz = one(searchParams.spz) || '';
  const pujcene = one(searchParams.pujcene) === '1';
  const hodnoty: VstupHodnoty = {
    cas: casRaw && (jeCasHosta(casRaw) || /^([01]\d|2[0-3]):[0-5]\d$/.test(casRaw)) ? casRaw : null,
    zpusob,
    telefon,
    spz,
    pujcene,
    souhlas: one(searchParams.souhlas) === '1',
  };
  const vstup = {
    token: null,
    uroven: urovenPruvodce({
      cas: hodnoty.cas,
      zpusob: hodnoty.zpusob,
      telefonBrana: telefon || null,
      spz: spz || null,
      spzPujcene: pujcene,
      souhlas: hodnoty.souhlas,
      odemceno: one(searchParams.odemceno) === '1',
    }),
    hodnoty,
    predvyplneny: '+420777111222',
  };

  const zapisVstup = (next: VstupHodnoty) => {
    const params = new URLSearchParams();
    params.set('apt', apt);
    params.set('lang', lang);
    params.set('vikend', vikend ? '1' : '0');
    params.set('predano', predano ? '1' : '0');
    if (next.cas) params.set('cas', next.cas);
    if (next.zpusob) params.set('zpusob', next.zpusob);
    if (next.telefon) params.set('brana', next.telefon);
    if (next.spz) params.set('spz', next.spz);
    if (next.pujcene) params.set('pujcene', '1');
    if (next.souhlas) params.set('souhlas', '1');
    if (accessPin) params.set('pin', accessPin);
    if (one(searchParams.tvar)) params.set('tvar', one(searchParams.tvar) || '');
    if (one(searchParams.odemceno) === '1') params.set('odemceno', '1');
    router.replace(`/nahled?${params.toString()}`, { scroll: false });
  };

  const write = (next: {
    apt: AptId;
    lang: GuideLang;
    vikend: boolean;
    prijezd: Prijezd | null;
  }) => {
    const params = new URLSearchParams();
    params.set('apt', next.apt);
    params.set('lang', next.lang);
    params.set('vikend', next.vikend ? '1' : '0');
    params.set('predano', one(searchParams.predano) === '0' ? '0' : predano ? '1' : '0');
    if (hodnoty.cas) params.set('cas', hodnoty.cas);
    if (hodnoty.zpusob) params.set('zpusob', hodnoty.zpusob);
    if (hodnoty.telefon) params.set('brana', hodnoty.telefon);
    if (hodnoty.spz) params.set('spz', hodnoty.spz);
    if (hodnoty.pujcene) params.set('pujcene', '1');
    if (hodnoty.souhlas) params.set('souhlas', '1');
    if (accessPin) params.set('pin', accessPin);
    if (one(searchParams.tvar)) params.set('tvar', one(searchParams.tvar) || '');
    router.replace(`/nahled?${params.toString()}`, { scroll: false });
  };

  return (
    <Guide
      apt={apt}
      lang={lang}
      secrets={secrets}
      stay={{ noci: 2, osob: 2 }}
      kody={kodyProHosta(predano, apt, accessPin, lang)}
      tvar={tvar}
      vikend={vikend}
      vstup={vstup}
      onVstup={zapisVstup}
      showDevBar
      onDevChange={write}
      odjezd={
        one(searchParams.odjezd) === '1'
          ? { den: posunDen(denPraha(new Date()), 1), cas: one(searchParams.odjezdCas), rucni: false }
          : null
      }
      okno={
        one(searchParams.pripraveno) === '1'
          ? {
              zeleny: true,
              sekcePrijezd: false,
              sekceOdjezd: false,
              slotyZelene: ['12:00', '12:30', '13:00', '13:30'],
              slotyPrijezd: casyDrive('11:00'),
              slotyOdjezd: [],
              nejpozdeji: '14:00',
              zadostPrijezd: null,
              zadostOdjezd: null,
            }
          : null
      }
    />
  );
}
