import nodemailer from 'nodemailer';
import apartmanyJson from '@/data/apartmany.json';
import type { GuideSecrets } from './secrets';
import type { AptId, GuideLang, LText } from './types';

export type GuestEmailInput = {
  lang: GuideLang;
  apt: AptId;
  prijezd: string;
  odjezd: string;
  noci: number | null;
  osob: number | null;
  osloveni: string | null;
  guideUrl: string;
  intendedTo: string;
  secrets?: GuideSecrets;
  /** src loga v HTML (cid:… při odeslání, https při náhledu) */
  logoSrc?: string;
  /** src podpisu (vodorovné logo VA / VIVIEN) */
  podpisSrc?: string;
  /** Styl CTA tlačítka (A–E). Výchozí A = tmavá výplň, kulaté. */
  ctaStyle?: CtaStyle;
};

export type CtaStyle = 'A' | 'B' | 'C' | 'D' | 'E';

/** Veřejné logo na ostrém webu (náhled HTML). */
export const LOGO_PUBLIC_URL = 'https://vivienapartments.cz/images/logo-96.png';
export const LOGO_CID = 'vivien-logo';
/** Podpis: JPEG 400 px (2×), v HTML zobrazeno na 180 px kvůli ostrosti. */
export const PODPIS_CID = 'vivien-podpis';
export const PODPIS_WIDTH = 180;

/** Popisky variant pro výběr majitele. */
export const CTA_STYLE_LABELS: Record<CtaStyle, string> = {
  A: 'A · zlatá výplň, kulaté (na tmavém mailu)',
  B: 'B · jen obrys (bez plné výplně)',
  C: 'C · textový odkaz bez rámečku',
  D: 'D · úzký pruh, malá písmena',
  E: 'E · světlé pozadí, zlatý text',
};

type AptRow = { id: AptId; nazev: { cs: string; en: string } };

const apartmany = (apartmanyJson as { apartmany: AptRow[] }).apartmany;

function t(map: LText, lang: GuideLang): string {
  return (map[lang] || '').trim() || (map.en || '').trim() || (map.cs || '').trim();
}

function fmtYmd(ymd: string, lang: GuideLang): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  if (lang === 'cs') return `${d}. ${m}. ${y}`;
  if (lang === 'de') return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** CS: „Dobrý den pane Nováku,“ z OSLOVENI. Jiné jazyky: neutrální pozdrav. */
function greetingLine(lang: GuideLang, osloveni: string | null): string {
  if (lang === 'cs' && osloveni?.trim()) {
    const rest = osloveni
      .trim()
      .replace(/^Vážen[ýá]\s+/i, '')
      .replace(/[,.]+$/, '')
      .trim();
    return rest ? `Dobrý den ${rest},` : 'Dobrý den,';
  }
  return t(
    {
      cs: 'Dobrý den,',
      en: 'Hello,',
      de: 'Guten Tag,',
      pl: 'Dzień dobry,',
      uk: 'Добрий день,',
      'zh-Hant': '您好，',
    },
    lang,
  );
}

const subjectL: LText = {
  cs: 'Váš osobní průvodce příjezdem · VIVIEN',
  en: 'Your personal arrival guide · VIVIEN',
  de: 'Ihr persönlicher Anreiseleitfaden · VIVIEN',
  pl: 'Wasza osobista instrukcja przyjazdu · VIVIEN',
  uk: 'Ваш особистий гід приїзду · VIVIEN',
  'zh-Hant': '您的個人抵達指南 · VIVIEN',
};

const introL: LText = {
  cs: 'Připravili jsme pro vás osobní průvodce příjezdem. Otevřete ho tlačítkem níže.',
  en: 'We prepared a personal arrival guide for you. Open it with the button below.',
  de: 'Wir haben einen persönlichen Anreiseleitfaden für Sie vorbereitet. Öffnen Sie ihn über die Schaltfläche unten.',
  pl: 'Przygotowaliśmy dla Was osobistą instrukcję przyjazdu. Otwórzcie ją przyciskiem poniżej.',
  uk: 'Ми підготували для вас особистий гід приїзду. Відкрийте його кнопкою нижче.',
  'zh-Hant': '我們為您準備了個人抵達指南。請用下方按鈕開啟。',
};

const stayL: LText = {
  cs: 'Váš pobyt',
  en: 'Your stay',
  de: 'Ihr Aufenthalt',
  pl: 'Wasze pobyty',
  uk: 'Ваше перебування',
  'zh-Hant': '您的住宿',
};

const datesL: LText = {
  cs: 'Termín',
  en: 'Dates',
  de: 'Zeitraum',
  pl: 'Termin',
  uk: 'Термін',
  'zh-Hant': '日期',
};

const nightsL: LText = {
  cs: 'Počet nocí',
  en: 'Nights',
  de: 'Nächte',
  pl: 'Liczba nocy',
  uk: 'Кількість ночей',
  'zh-Hant': '晚數',
};

const guestsL: LText = {
  cs: 'Počet osob',
  en: 'Guests',
  de: 'Personen',
  pl: 'Liczba osób',
  uk: 'Кількість осіб',
  'zh-Hant': '人數',
};

const openGuideL: LText = {
  cs: 'Otevřít průvodce',
  en: 'Open the guide',
  de: 'Leitfaden öffnen',
  pl: 'Otwórz instrukcję',
  uk: 'Відкрити гід',
  'zh-Hant': '開啟指南',
};

/** Problém: nejdřív majitel, pak Nikol (číslo v podpisu). */
const helpL: LText = {
  cs: 'Když něco nefunguje, volejte nejdřív +420 777 702 272. Když se nedovoláte, volejte Nikol.',
  en: 'If something does not work, call +420 777 702 272 first. If you cannot reach us, call Nikol.',
  de: 'Wenn etwas nicht funktioniert, rufen Sie zuerst +420 777 702 272 an. Wenn Sie uns nicht erreichen, rufen Sie Nikol an.',
  pl: 'Jeśli coś nie działa, zadzwońcie najpierw pod +420 777 702 272. Jeśli nie możecie się dodzwonić, zadzwońcie do Nikol.',
  uk: 'Якщо щось не працює, телефонуйте спочатку на +420 777 702 272. Якщо не додзвонитеся, телефонуйте Nikol.',
  'zh-Hant': '若有問題，請先致電 +420 777 702 272。若聯絡不到，請致電 Nikol。',
};

const closingL: LText = {
  cs: 'S pozdravem',
  en: 'Kind regards',
  de: 'Mit freundlichen Grüßen',
  pl: 'Z pozdrowieniami',
  uk: 'З повагою',
  'zh-Hant': '此致',
};

function aptRow(id: AptId): AptRow {
  return apartmany.find((a) => a.id === id) ?? apartmany[0];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

/** CTA pro tmavý e-mail (table + a). */
function ctaHtml(opts: {
  href: string;
  label: string;
  style: CtaStyle;
  serif: string;
}): string {
  const href = escapeAttr(opts.href);
  const label = escapeHtml(opts.label);
  const f = opts.serif;

  if (opts.style === 'C') {
    return `<a href="${href}" style="font-family:${f};font-size:17px;line-height:1.5;color:#c9a84c;text-decoration:underline;font-weight:400;">${label}</a>`;
  }

  if (opts.style === 'B') {
    return `<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;"><tr>
      <td align="center" style="border:1px solid #c9a84c;border-radius:28px;background:#1c1712;text-align:center;">
        <a href="${href}" style="display:inline-block;padding:11px 22px;font-family:${f};font-size:15px;line-height:1.25;color:#c9a84c;text-decoration:none;font-weight:400;border-radius:28px;text-align:center;white-space:nowrap;">${label}</a>
      </td>
    </tr></table>`;
  }

  if (opts.style === 'D') {
    return `<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;"><tr>
      <td align="center" style="background:#c9a84c;border-radius:2px;text-align:center;">
        <a href="${href}" style="display:inline-block;padding:10px 18px;font-family:${f};font-size:13px;letter-spacing:0.06em;line-height:1.25;color:#1c1712;text-decoration:none;font-weight:400;text-transform:uppercase;text-align:center;white-space:nowrap;">${label}</a>
      </td>
    </tr></table>`;
  }

  if (opts.style === 'E') {
    return `<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;"><tr>
      <td align="center" style="background:#2a221c;border:1px solid #4a3f32;border-radius:8px;text-align:center;">
        <a href="${href}" style="display:inline-block;padding:12px 20px;font-family:${f};font-size:15px;line-height:1.25;color:#e8d5a3;text-decoration:none;font-weight:400;border-radius:8px;text-align:center;white-space:nowrap;">${label}</a>
      </td>
    </tr></table>`;
  }

  // A · zlatá výplň na tmavém mailu, kulaté (kratší text + nowrap = 1 řádek na mobilu)
  return `<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;"><tr>
    <td align="center" style="background:#c9a84c;border-radius:28px;text-align:center;">
      <a href="${href}" style="display:inline-block;padding:12px 22px;font-family:${f};font-size:15px;line-height:1.25;color:#1c1712;text-decoration:none;font-weight:400;border-radius:28px;text-align:center;white-space:nowrap;">${label}</a>
    </td>
  </tr></table>`;
}

export function buildGuestEmail(input: GuestEmailInput): { subject: string; html: string; text: string } {
  const lang = input.lang;
  const apt = aptRow(input.apt);
  const greeting = greetingLine(lang, input.osloveni);
  const nociLabel = input.noci == null ? 'XXX' : String(input.noci);
  const osobLabel = input.osob == null ? 'XXX' : String(input.osob);
  const term = `${fmtYmd(input.prijezd, lang)} – ${fmtYmd(input.odjezd, lang)}`.replace('–', '-');

  const testMode = (process.env.TEST_REZIM ?? '1') !== '0';
  const subjectBase = t(subjectL, lang);
  const subject = testMode ? `[TEST] ${subjectBase}` : subjectBase;
  const logoSrc = input.logoSrc || LOGO_PUBLIC_URL;
  const podpisSrc = input.podpisSrc || '';
  const ctaStyle: CtaStyle = input.ctaStyle || 'A';
  const serif = "Georgia,'Times New Roman',serif";

  const nameCs = apt.nazev.cs;
  const nameEn = apt.nazev.en;
  const nameHtml =
    lang === 'cs'
      ? `<div style="font-family:${serif};font-size:22px;line-height:1.35;color:#f5efe3;">${escapeHtml(nameCs)}</div>
         <div style="font-family:${serif};font-size:18px;line-height:1.35;color:#c9a84c;margin-top:4px;">${escapeHtml(nameEn)}</div>`
      : `<div style="font-family:${serif};font-size:22px;line-height:1.35;color:#f5efe3;">${escapeHtml(nameEn)}</div>`;

  const nameText = lang === 'cs' ? `${nameCs}\n${nameEn}` : nameEn;
  const cta = ctaHtml({
    href: input.guideUrl,
    label: t(openGuideL, lang),
    style: ctaStyle,
    serif,
  });

  const html = `<!DOCTYPE html>
<html lang="${escapeAttr(lang)}" style="background:#1c1712;">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${escapeHtml(subjectBase)}</title>
</head>
<body style="margin:0;padding:0;background:#1c1712;color:#e8dfc8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#1c1712;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#241e18;border:1px solid #3d342a;border-radius:10px;">
          <tr>
            <td style="padding:28px 28px 8px;font-family:${serif};font-size:17px;line-height:1.55;color:#e8dfc8;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding:0 0 22px;">
                    <img src="${escapeAttr(logoSrc)}" width="96" height="96" alt="VIVIEN Apartments" style="display:block;width:96px;height:auto;border:0;" />
                  </td>
                </tr>
                <tr><td style="padding:0 0 16px;font-family:${serif};font-size:20px;line-height:1.4;color:#f5efe3;">${escapeHtml(greeting)}</td></tr>
                <tr><td style="padding:0 0 22px;font-family:${serif};font-size:17px;line-height:1.55;color:#e8dfc8;">${escapeHtml(t(introL, lang))}</td></tr>
                <tr>
                  <td style="padding:0 0 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#2a221c;border-radius:8px;">
                      <tr>
                        <td style="padding:16px 16px 14px;font-family:${serif};font-size:16px;line-height:1.5;color:#e8dfc8;">
                          <div style="margin:0 0 10px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#c9a84c;font-weight:700;">
                            ${escapeHtml(t(stayL, lang))}
                          </div>
                          <div style="margin:0 0 14px;">${nameHtml}</div>
                          <div style="margin:0 0 8px;"><span style="color:#c9a84c;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(t(datesL, lang))}</span><br/><strong style="color:#f5efe3;">${escapeHtml(term)}</strong></div>
                          <div style="margin:0 0 8px;"><span style="color:#c9a84c;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(t(nightsL, lang))}</span><br/><strong style="color:#f5efe3;">${escapeHtml(nociLabel)}</strong></div>
                          <div style="margin:0;"><span style="color:#c9a84c;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(t(guestsL, lang))}</span><br/><strong style="color:#f5efe3;">${escapeHtml(osobLabel)}</strong></div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:8px 0 22px;">
                    ${cta}
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 0 0;border-top:1px solid #3d342a;font-family:${serif};font-size:15px;line-height:1.55;color:#cbbba8;">
                    ${escapeHtml(t(helpL, lang)).replace(
                      /\+420 777 702 272/g,
                      '<a href="tel:+420777702272" style="color:#e8d5a3;text-decoration:none;font-weight:700;">+420 777 702 272</a>',
                    )}
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 0 0;font-family:${serif};font-size:15px;line-height:1.55;color:#cbbba8;">
                    <div style="margin:0 0 4px;">${escapeHtml(t(closingL, lang))}</div>
                    <div style="margin:0 0 2px;font-size:17px;color:#f5efe3;"><strong>Nikol</strong></div>
                    <div style="margin:0 0 14px;"><a href="tel:+420702153573" style="color:#e8d5a3;text-decoration:none;">+420 702 153 573</a></div>
                    ${
                      podpisSrc
                        ? `<img src="${escapeAttr(podpisSrc)}" width="${PODPIS_WIDTH}" alt="VIVIEN Apartments" style="display:block;width:${PODPIS_WIDTH}px;max-width:100%;height:auto;border:0;" />`
                        : ''
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:24px;line-height:24px;font-size:0;background:#241e18;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    greeting,
    '',
    t(introL, lang),
    '',
    t(stayL, lang),
    nameText,
    '',
    `${t(datesL, lang)}: ${term}`,
    `${t(nightsL, lang)}: ${nociLabel}`,
    `${t(guestsL, lang)}: ${osobLabel}`,
    '',
    `${t(openGuideL, lang)}: ${input.guideUrl}`,
    '',
    t(helpL, lang),
    '',
    t(closingL, lang),
    'Nikol',
    '+420 702 153 573',
  ].join('\n');

  return { subject, html, text };
}

export async function sendGuestEmail(opts: {
  input: GuestEmailInput;
  toOverride?: string;
}): Promise<{ to: string; messageId?: string }> {
  const path = await import('path');
  const testMode = (process.env.TEST_REZIM ?? '1') !== '0';
  const majitel = process.env.MAJITEL_EMAIL?.trim();
  if (!majitel) throw new Error('MAJITEL_EMAIL chybí');

  const intended = opts.input.intendedTo;
  const to = testMode || opts.toOverride ? majitel : intended;
  const built = buildGuestEmail({
    ...opts.input,
    logoSrc: `cid:${LOGO_CID}`,
    podpisSrc: `cid:${PODPIS_CID}`,
  });

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_HESLO?.trim();
  if (!user || !pass || pass.startsWith('SEM_NAPIS')) {
    throw new Error('SMTP_USER / SMTP_HESLO nejsou vyplněné');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.seznam.cz',
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  const logoPath = path.join(process.cwd(), 'assets', 'email', 'logo.png');
  const podpisPath = path.join(process.cwd(), 'assets', 'email', 'logo-podpis.jpg');

  const info = await transporter.sendMail({
    from: `VIVIEN Apartments <${user}>`,
    to,
    bcc: testMode ? undefined : majitel,
    subject: built.subject,
    text: built.text,
    html: built.html,
    attachments: [
      {
        filename: 'logo.png',
        path: logoPath,
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
      {
        filename: 'logo-podpis.jpg',
        path: podpisPath,
        cid: PODPIS_CID,
        contentDisposition: 'inline',
      },
    ],
  });

  return { to, messageId: info.messageId };
}
