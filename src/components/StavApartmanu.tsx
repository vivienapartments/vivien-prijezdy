'use client';

import { t } from '@/lib/i18n';
import type { StavApartmanuPohled } from '@/lib/okno-pobytu';
import * as TX from '@/lib/texts';
import type { GuideLang } from '@/lib/types';
import * as VT from '@/lib/vstup-texty';

type Props = {
  lang: GuideLang;
  stav: StavApartmanuPohled | null | undefined;
};

export function StavApartmanu({ lang, stav }: Props) {
  if (!stav) return null;
  const tt = (x: Parameters<typeof t>[0]) => t(x, lang);
  const zlaty = stav.barva === 'zlaty';
  const nadpis = zlaty ? tt(VT.stavPripravujeme) : tt(VT.stavPripraveno);
  const trida = zlaty ? 'pv-stav pv-stav--zlaty' : 'pv-stav pv-stav--zeleny';

  if (!stav.rozbalit) {
    return (
      <div className={trida} lang={lang}>
        <p className="pv-stav__nadpis">{nadpis}</p>
      </div>
    );
  }

  return (
    <details className={`pv-sbal ${trida}`} lang={lang}>
      <summary>
        <span className="pv-sbal__text">
          <span className="pv-sbal__nadpis pv-stav__nadpis">{nadpis}</span>
        </span>
        <span className="pv-sbal__btn" aria-hidden="true">
          <span className="pv-sbal__btn-open">
            {tt(TX.ui.expandSection)} ▾
          </span>
          <span className="pv-sbal__btn-close">
            {tt(TX.ui.collapseSection)} ▴
          </span>
        </span>
      </summary>
      {zlaty ? (
        <p>{tt(VT.stavPripravujemeText)}</p>
      ) : (
        <>
          <p>{tt(VT.stavPripravenoText)}</p>
          <a className="pv-stav__tlacitko" href="#cas-prijezdu">
            {tt(VT.stavZmenitCas)}
          </a>
        </>
      )}
    </details>
  );
}
