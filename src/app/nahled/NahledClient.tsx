'use client';

import { useRouter } from 'next/navigation';
import { Guide } from '@/components/Guide';
import { parseApt, parseLang } from '@/lib/i18n';
import { kodyProHosta } from '@/lib/kody-pruvodce';
import type { GuideSecrets } from '@/lib/secrets';
import type { AptId, GuideLang, Prijezd } from '@/lib/types';

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
  const prijezdRaw = one(searchParams.prijezd);
  const prijezd: Prijezd | null =
    prijezdRaw === 'auto' || prijezdRaw === 'pesky' ? prijezdRaw : null;
  const accessPin = one(searchParams.pin);
  const predano = one(searchParams.predano) !== '0';
  const tvar = one(searchParams.tvar) === 'plny' ? 'plny' : 'dnes';

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
    if (next.prijezd) params.set('prijezd', next.prijezd);
    if (accessPin) params.set('pin', accessPin);
    if (one(searchParams.predano)) params.set('predano', one(searchParams.predano) || '');
    if (one(searchParams.tvar)) params.set('tvar', one(searchParams.tvar) || '');
    // scroll: false = přepínač neodroluje stránku nahoru
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
      initialPrijezd={prijezd}
      showDevBar
      onDevChange={write}
    />
  );
}
