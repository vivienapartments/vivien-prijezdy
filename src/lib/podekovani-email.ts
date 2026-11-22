import { doporuceniTexty } from './doporuceni-texty';
import { expiredVyhodyTexty } from './expired-vyhody-texty';
import { t } from './i18n';
import { plochaPridej } from './plocha-texty';
import { expiredCta, expiredDopis, expiredNadpis, expiredPodpis } from './texts';
import type { GuideLang, LText } from './types';

const BASE =
  (typeof process !== 'undefined' &&
    (process.env.NEXT_PUBLIC_BASE_URL || process.env.PRUVODCE_BASE_URL)?.replace(/\/$/, '')) ||
  'https://vivien-prijezdy-six.vercel.app';

/** Předmět e-mailu po odjezdu. Schváleno majitelem 22. 11. 2026. */
export const PREDMET_PODEKOVANI: Record<GuideLang, string> = {
  cs: 'VIVIEN · Děkujeme za návštěvu',
  en: 'VIVIEN · Thank you for your visit',
  de: 'VIVIEN · Danke für Ihren Besuch',
  pl: 'VIVIEN · Dziękujemy za wizytę',
  uk: 'VIVIEN · Дякуємо за візит',
  'zh-Hant': 'VIVIEN · 感謝您的光臨',
  sv: 'VIVIEN · Tack för ert besök',
  es: 'VIVIEN · Gracias por su visita',
  hu: 'VIVIEN · Köszönjük a látogatást',
  da: 'VIVIEN · Tak for besøget',
  fr: 'VIVIEN · Merci de votre visite',
  it: 'VIVIEN · Grazie della visita',
  pt: 'VIVIEN · Obrigado pela vossa visita',
};

/** Zlaté tlačítko v e-mailu. */
export const TLACITKO_PODEKOVANI: LText = {
  cs: 'Otevřít vaše výhody',
  en: 'Open your benefits',
  de: 'Ihre Vorteile öffnen',
  pl: 'Otwórzcie swoje korzyści',
  uk: 'Відкрити ваші переваги',
  'zh-Hant': '開啟您的優惠',
  sv: 'Öppna era förmåner',
  es: 'Abrir sus ventajas',
  hu: 'Előnyeik megnyitása',
  da: 'Åbn jeres fordele',
  fr: 'Ouvrir vos avantages',
  it: 'Aprire i vostri vantaggi',
  pt: 'Abrir as vossas vantagens',
};

function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function jazyk(lang: GuideLang | null): GuideLang {
  return lang && lang in PREDMET_PODEKOVANI ? lang : 'en';
}

export function predmetPodekovani(lang: GuideLang | null): string {
  return PREDMET_PODEKOVANI[jazyk(lang)];
}

export function tlacitkoPodekovani(lang: GuideLang | null): string {
  return t(TLACITKO_PODEKOVANI, jazyk(lang));
}

/** Prostý text (textová část e-mailu). */
export function textPodekovaniEmail(lang: GuideLang | null, odkaz: string): string {
  const l = jazyk(lang);
  const v = expiredVyhodyTexty(l);
  const d = doporuceniTexty(l);
  const btn = tlacitkoPodekovani(l);
  return [
    t(expiredNadpis, l),
    '',
    t(expiredDopis, l),
    '',
    t(expiredPodpis, l),
    '',
    `1. ${t(expiredCta, l)}. ${v.radek1Pod}`,
    `2. ${v.radek3Nadpis}. ${d.otazka}`,
    `3. ${t(plochaPridej, l)}. ${v.radek2Pod}`,
    '',
    `${btn}:`,
    odkaz.trim(),
  ].join('\n');
}

function radekVyhody(cislo: number, nad: string, pod: string, serif: string): string {
  return `<tr>
  <td style="padding:10px 0;border-bottom:1px solid #3d342a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td width="44" valign="top" style="padding-right:12px;">
          <div style="width:36px;height:36px;border-radius:18px;background:#2a241c;border:1px solid #c9a84c;text-align:center;line-height:36px;color:#c9a84c;font-family:${serif};font-size:15px;font-weight:700;">${cislo}</div>
        </td>
        <td valign="middle" style="font-family:${serif};">
          <div style="color:#f5efe3;font-size:16px;line-height:1.35;">${esc(nad)}</div>
          <div style="color:#c9a84c;font-size:14px;line-height:1.4;padding-top:3px;">${esc(pod)}</div>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

/**
 * HTML e-mail jako stránka po odjezdu (tmavé pozadí, fotka, logo, 3 výhody, zlaté tlačítko).
 * Tabulky kvůli Outlooku. Absolutní URL obrázků.
 */
export function htmlPodekovaniEmail(
  lang: GuideLang | null,
  odkaz: string,
  baseUrl: string = BASE,
): string {
  const l = jazyk(lang);
  const base = baseUrl.replace(/\/$/, '') || BASE;
  const foto = `${base}/pruvodce/zahrada-po-odjezdu.jpg`;
  const logo = `${base}/pruvodce/va-logo-192.png`;
  const nadpis = esc(t(expiredNadpis, l));
  const dopis = esc(t(expiredDopis, l));
  const podpis = esc(t(expiredPodpis, l));
  const v = expiredVyhodyTexty(l);
  const d = doporuceniTexty(l);
  const btn = esc(tlacitkoPodekovani(l));
  const url = odkaz.trim().replaceAll('"', '%22');
  const serif = "Georgia,'Times New Roman',serif";
  const plocha = t(plochaPridej, l);

  const vyhody = [
    radekVyhody(1, t(expiredCta, l), v.radek1Pod, serif),
    radekVyhody(2, v.radek3Nadpis, d.otazka, serif),
    radekVyhody(3, plocha, v.radek2Pod, serif),
  ].join('');

  return `<!DOCTYPE html>
<html lang="${l}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${nadpis}</title></head>
<body style="margin:0;padding:0;background:#0d0b0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0d0b0a;">
    <tr>
      <td align="center" style="padding:16px 10px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#1a1510;border:1px solid #3d342a;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:0;line-height:0;font-size:0;">
              <img src="${foto}" width="560" alt="VIVIEN Apartments" style="display:block;width:100%;max-width:560px;height:auto;border:0;">
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:-33px;">
                <tr>
                  <td align="center" style="width:66px;height:66px;border-radius:33px;background:#c9a84c;padding:3px;">
                    <img src="${logo}" width="60" height="60" alt="VIVIEN" style="display:block;width:60px;height:60px;border-radius:30px;border:0;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px 8px;font-family:${serif};text-align:center;">
              <h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:400;color:#c9a84c;">${nadpis}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 4px;font-family:${serif};font-size:16px;line-height:1.55;color:#e8dfc8;text-align:justify;">
              ${dopis}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 24px 18px;font-family:${serif};font-size:18px;font-style:italic;color:#c9a84c;text-align:center;">
              ${podpis}
            </td>
          </tr>
          <tr>
            <td style="padding:4px 24px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${vyhody}
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 24px 28px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background:#c9a84c;border-radius:28px;">
                    <a href="${url}" style="display:inline-block;padding:13px 26px;font-family:${serif};font-size:16px;line-height:1.3;color:#1a1510;text-decoration:none;border-radius:28px;font-weight:700;">${btn}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
