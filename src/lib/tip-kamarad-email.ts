import {
  tipEmailNadpis,
  tipEmailPaticka,
  tipEmailPredmet,
  tipEmailSleva,
  tipEmailTelo,
  tipEmailTlacitko,
} from './doporuceni-komplet-texty';
import { t } from './i18n';
import type { GuideLang } from './types';

const BASE =
  (typeof process !== 'undefined' &&
    (process.env.NEXT_PUBLIC_BASE_URL || process.env.PRUVODCE_BASE_URL)?.replace(/\/$/, '')) ||
  'https://vivien-prijezdy-six.vercel.app';

function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function slevaNbsp(htmlEscaped: string): string {
  return htmlEscaped.replace(/5\s*%/g, '5&nbsp;%');
}

export function predmetTipKamaradovi(lang: GuideLang): string {
  return t(tipEmailPredmet, lang);
}

export function fromTipKamaradovi(jmeno: string, smtpUser: string): string {
  const j = jmeno.trim() || 'VIVIEN';
  return `${j} přes VIVIEN Apartments <${smtpUser}>`;
}

export function textTipKamaradovi(lang: GuideLang, jmeno: string, odkaz: string): string {
  return [
    tipEmailNadpis(jmeno, lang),
    '',
    tipEmailTelo(lang),
    '',
    t(tipEmailSleva, lang),
    '',
    `${t(tipEmailTlacitko, lang)}: ${odkaz}`,
    '',
    tipEmailPaticka(jmeno, lang),
  ].join('\n');
}

export function htmlTipKamaradovi(
  lang: GuideLang,
  jmeno: string,
  odkaz: string,
  baseUrl: string = BASE,
): string {
  const base = baseUrl.replace(/\/$/, '') || BASE;
  const hlavicka = `${base}/email/hlavicka-tip.jpg`;
  const serif = "Georgia,'Times New Roman',serif";
  const sans = "Arial,Helvetica,sans-serif";
  const url = odkaz.trim().replaceAll('"', '%22');
  const nadpis = esc(tipEmailNadpis(jmeno, lang));
  const telo = esc(tipEmailTelo(lang));
  const sleva = slevaNbsp(esc(t(tipEmailSleva, lang)));
  const btn = esc(t(tipEmailTlacitko, lang));
  const paticka = esc(tipEmailPaticka(jmeno, lang));

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${nadpis}</title></head>
<body style="margin:0;padding:0;background:#0d0b0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0d0b0a;">
    <tr>
      <td align="center" style="padding:16px 10px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#1c1712;border:1px solid #3d342a;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:0;line-height:0;font-size:0;">
              <img src="${hlavicka}" width="560" alt="VIVIEN Apartments" style="display:block;width:100%;max-width:560px;height:auto;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px 8px;font-family:${serif};text-align:center;">
              <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:400;color:#c9a84c;">${nadpis}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 4px;font-family:${sans};font-size:16px;line-height:1.55;color:#e8dfc8;text-align:center;">
              ${telo}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 24px 8px;font-family:${sans};font-size:16px;line-height:1.45;color:#c9a84c;text-align:center;font-weight:700;">
              ${sleva}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 24px 10px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background:#c9a84c;border-radius:28px;">
                    <a href="${url}" style="display:inline-block;padding:13px 26px;font-family:${sans};font-size:16px;line-height:1.3;color:#1a1510;text-decoration:none;border-radius:28px;font-weight:700;">${btn}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 24px 28px;font-family:${sans};font-size:13px;line-height:1.45;color:#b7aa98;text-align:center;">
              ${paticka}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
