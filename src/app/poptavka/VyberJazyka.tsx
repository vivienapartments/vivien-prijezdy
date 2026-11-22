'use client';

import {
  doporucitelUiTexty,
  POPTAVKA_JAZYKY,
  vlajkaJazyka,
} from '@/lib/poptavka-doporucitel-ui';
import type { GuideLang } from '@/lib/types';

type Props = {
  lang: GuideLang;
  onLang: (l: GuideLang) => void;
  onDale: () => void;
  daleText: string;
};

export function VyberJazyka(props: Props) {
  const ui = doporucitelUiTexty(props.lang);
  return (
    <main className="pp pp--vernost pp--doporuceny pp--jazyk" lang={props.lang}>
      <div className="pp__karta pp__karta--s-herem pp__karta--vypln pp__karta--jazyk">
        <div
          className="pp__hero pp__hero--vecer"
          style={{ backgroundImage: "url('/poptavka/doporuceny-zahrada-vecer.webp')" }}
          role="img"
          aria-hidden="true"
        />
        <div className="pp__telo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="pp__logo"
            src="/pruvodce/va-logo-192.png"
            width={56}
            height={56}
            alt="VIVIEN Apartments"
          />
          <h1 className="pp__nadpis-krok">{ui.vyberteJazyk}</h1>
          <label className="pp__jazyk-roletka">
            <span className="pp__sr-only">{ui.vyberteJazyk}</span>
            <span className="pp__jazyk-roletka-vnitr" aria-hidden="true">
              {vlajkaJazyka(props.lang)} {doporucitelUiTexty(props.lang).nazevJazyka}
              <b>▾</b>
            </span>
            <select
              className="pp__jazyk-select"
              value={props.lang}
              onChange={(e) => props.onLang(e.target.value as GuideLang)}
            >
              {POPTAVKA_JAZYKY.map((l) => (
                <option key={l} value={l}>
                  {vlajkaJazyka(l)} {doporucitelUiTexty(l).nazevJazyka}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="pp__btn pp__btn--hlavni" onClick={props.onDale}>
            {props.daleText}
          </button>
        </div>
      </div>
    </main>
  );
}
