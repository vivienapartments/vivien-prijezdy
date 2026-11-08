import { NIKOL_PHONE, odkazRezervaceWeb } from '@/lib/constants';
import { t, toTelHref } from '@/lib/i18n';
import {
  expiredCta,
  expiredHelp,
  expiredNadpis,
  expiredVeta1,
  expiredVeta2,
  expiredZavolat,
} from '@/lib/texts';
import type { GuideLang } from '@/lib/types';
import './guide.scss';

export function Expired({ lang = 'cs' }: { lang?: GuideLang }) {
  const tel = NIKOL_PHONE.replace(/ /g, '\u00a0');
  return (
    <main className="pv pv-expired">
      <div className="pv-expired__karta">
        <div
          className="pv-expired__foto"
          role="img"
          aria-label="VIVIEN Apartments"
        />
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
          <p>{t(expiredVeta1, lang)}</p>
          <p>{t(expiredVeta2, lang)}</p>
          <a
            className="pv-expired__cta"
            href={odkazRezervaceWeb(lang)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t(expiredCta, lang)}
            <span className="pv-expired__sipka" aria-hidden="true">
              ↗
            </span>
          </a>
          <p className="pv-expired__help">{t(expiredHelp, lang)}</p>
          <a className="pv-expired__tel" href={toTelHref(NIKOL_PHONE)}>
            {t(expiredZavolat, lang)} · {tel}
          </a>
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
