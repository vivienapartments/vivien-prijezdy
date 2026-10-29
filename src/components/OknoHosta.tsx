'use client';

import type { OknoPohled } from '@/lib/okno-pobytu';
import type { GuideLang } from '@/lib/types';

type Props = {
  lang: GuideLang;
  token: string | null;
  cteni: boolean;
  okno: OknoPohled;
};

/** Dřívější příjezd a ceník jsou ve VstupHosta / StavApartmanu (prompt 45). */
export function OknoHosta(_props: Props) {
  void _props;
  return null;
}
