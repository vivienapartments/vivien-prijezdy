'use client';

import { useRouter } from 'next/navigation';
import { Guide } from '@/components/Guide';
import { parseApt, parseLang } from '@/lib/i18n';
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
    router.replace(`/nahled?${params.toString()}`);
  };

  return (
    <Guide
      apt={apt}
      lang={lang}
      secrets={secrets}
      stay={{ noci: 2, osob: 2 }}
      accessPin={accessPin}
      vikend={vikend}
      initialPrijezd={prijezd}
      showDevBar
      onDevChange={write}
    />
  );
}
