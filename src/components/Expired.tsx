import { NIKOL_PHONE } from '@/lib/constants';
import { doporuceniTexty } from '@/lib/doporuceni-texty';
import { t, toTelHref } from '@/lib/i18n';
import {
  expiredCta,
  expiredDopis,
  expiredHelp,
  expiredMost,
  expiredNadpis,
  expiredPodpis,
  expiredPoznamka,
  expiredZavolat,
} from '@/lib/texts';
import type { GuideLang } from '@/lib/types';
import { ExpiredDoporuceni } from './ExpiredDoporuceni';
import { PridejNaPlochu } from './PridejNaPlochu';
import './guide.scss';

export function Expired({
  lang = 'cs',
  token,
}: {
  lang?: GuideLang;
  /** Podepsaný token průvodce. Bez něj jde obecná poptávka a bez bloku doporučení. */
  token?: string;
}) {
  const tel = NIKOL_PHONE.replace(/ /g, '\u00a0');
  const poptavkaHref = token ? `/poptavka?t=${encodeURIComponent(token)}` : '/poptavka';
  const d = doporuceniTexty(lang);

  return (
    <main className="pv pv-expired">
      <div className="pv-expired__karta">
        <div className="pv-expired__foto" role="img" aria-label="VIVIEN Apartments" />
        <div className="pv-expired__telo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="pv-expired__logo"
            src="/pruvodce/va-logo-192.png"
            width={72}
            height={72}
            alt="VIVIEN Apartments"
          />
          <h1>{t(expiredNadpis, lang)}</h1>
          <p className="pv-expired__dopis">{t(expiredDopis, lang)}</p>
          <p className="pv-expired__podpis">{t(expiredPodpis, lang)}</p>

          <div className="pv-expired__celek pv-expired__celek--vas">
            <p className="pv-expired__nad-male">{d.nadVas}</p>
            <p className="pv-expired__most">{t(expiredMost, lang)}</p>
            <a className="pv-expired__cta" href={poptavkaHref}>
              {t(expiredCta, lang)}
              <span className="pv-expired__sipka" aria-hidden="true">
                ↗
              </span>
            </a>
          </div>

          {token ? <ExpiredDoporuceni lang={lang} token={token} /> : null}

          <hr className="pv-expired__oddel" aria-hidden="true" />
          <p className="pv-expired__help">{t(expiredHelp, lang)}</p>
          <a className="pv-expired__tel" href={toTelHref(NIKOL_PHONE)}>
            {t(expiredZavolat, lang)} · {tel}
          </a>
          <p className="pv-expired__poznamka">{t(expiredPoznamka, lang)}</p>
          <div className="pv-expired__plocha">
            <PridejNaPlochu lang={lang} jenMobil tichy nazev="VIVIEN průvodce" shortNazev="VIVIEN" />
          </div>
          <div className="pv-expired__znacka" aria-label="VIVIEN Apartments">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="pv-expired__znacka-logo"
              src="/pruvodce/va-logo-192.png"
              width={36}
              height={36}
              alt=""
            />
            <span className="pv-expired__znacka-text">VIVIEN&nbsp;APARTMENTS</span>
          </div>
        </div>
      </div>
    </main>
  );
}
