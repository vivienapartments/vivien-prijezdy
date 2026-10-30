'use client';

import { textyDokladu } from '@/lib/doklady-texty';
import type { GuideLang } from '@/lib/types';

type Props = {
  lang: GuideLang;
  narodnost?: string | null;
};

export function DokladyRamecek({ lang, narodnost }: Props) {
  const t = textyDokladu(narodnost, lang);
  return (
    <aside className="pv-doklady" lang={lang}>
      <p className="pv-doklady__nadpis">{t.nadpis}</p>
      <p className="pv-doklady__text">{t.pruvodce}</p>
    </aside>
  );
}
