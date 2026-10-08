import { NIKOL_PHONE } from '@/lib/constants';
import { t, toTelHref } from '@/lib/i18n';
import { expiredHelp, expiredTexts } from '@/lib/texts';
import type { GuideLang } from '@/lib/types';

export function Expired({ lang = 'cs' }: { lang?: GuideLang }) {
  return (
    <main className="pv" style={{ paddingTop: '3rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}>
        {t(expiredTexts, lang)}
      </h1>
      <p>
        {t(expiredHelp, lang)}{' '}
        <a className="pv-phone" href={toTelHref(NIKOL_PHONE)}>
          {NIKOL_PHONE}
        </a>
      </p>
    </main>
  );
}
