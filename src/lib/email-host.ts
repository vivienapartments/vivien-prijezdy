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
  cs: 'Připravili jsme pro vás osobní průvodce příjezdem. Parkování, WiFi, brána i další kroky jsou v odkazu níže.',
  en: 'We prepared a personal arrival guide for you. Parking, WiFi, the gate and the other steps are in the link below.',
  de: 'Wir haben einen persönlichen Anreiseleitfaden für Sie vorbereitet. Parken, WLAN, Tor und die weiteren Schritte finden Sie im Link unten.',
  pl: 'Przygotowaliśmy dla Was osobistą instrukcję przyjazdu. Parking, WiFi, brama i kolejne kroki są w linku poniżej.',
  uk: 'Ми підготували для вас особистий гід приїзду. Паркування, WiFi, брама та інші кроки є в посиланні нижче.',
  'zh-Hant': '我們為您準備了個人抵達指南。停車、WiFi、大門與其他步驟都在下方連結中。',
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
  cs: 'Otevřít průvodce příjezdem',
  en: 'Open the arrival guide',
  de: 'Anreiseleitfaden öffnen',
  pl: 'Otwórz instrukcję przyjazdu',
  uk: 'Відкрити гід приїзду',
  'zh-Hant': '開啟抵達指南',
};

const linkHintL: LText = {
  cs: 'Když tlačítko nefunguje, zkopírujte odkaz:',
  en: 'If the button does not work, copy this link:',
  de: 'Wenn die Schaltfläche nicht funktioniert, kopieren Sie diesen Link:',
  pl: 'Jeśli przycisk nie działa, skopiujcie ten link:',
  uk: 'Якщо кнопка не працює, скопіюйте це посилання:',
  'zh-Hant': '若按鈕無法使用，請複製此連結：',
};

const contactL: LText = {
  cs: 'Když potřebujete pomoci, volejte Nikol: +420 702 153 573',
  en: 'If you need help, call Nikol: +420 702 153 573',
  de: 'Wenn Sie Hilfe brauchen, rufen Sie Nikol an: +420 702 153 573',
  pl: 'Jeśli potrzebujecie pomocy, zadzwońcie do Nikol: +420 702 153 573',
  uk: 'Якщо потрібна допомога, телефонуйте Nikol: +420 702 153 573',
  'zh-Hant': '如需協助，請致電 Nikol：+420 702 153 573',
};

const testBannerL: LText = {
  cs: 'TESTOVACÍ REŽIM. Tento e-mail by šel hostovi na:',
  en: 'TEST MODE. This email would go to the guest at:',
  de: 'TESTMODUS. Diese E-Mail ginge an den Gast:',
  pl: 'TRYB TESTOWY. Ten e-mail poszedłby do gościa na:',
  uk: 'ТЕСТОВИЙ РЕЖИМ. Цей лист пішов би гостю на:',
  'zh-Hant': '測試模式。這封信原本會寄給房客：',
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

  const nameCs = apt.nazev.cs;
  const nameEn = apt.nazev.en;
  const nameHtml =
    lang === 'cs'
      ? `<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.35;color:#1c1712;">${escapeHtml(nameCs)}</div>
         <div style="font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.35;color:#8b6914;margin-top:4px;">${escapeHtml(nameEn)}</div>`
      : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.35;color:#1c1712;">${escapeHtml(nameEn)}</div>`;

  const nameText = lang === 'cs' ? `${nameCs}\n${nameEn}` : nameEn;

  const banner = testMode
    ? `<tr><td style="padding:0 0 20px;">
        <div style="background:#fff8e8;border:1px solid #c9a84c;border-radius:6px;padding:12px 14px;font-size:14px;color:#3a3228;">
          <strong>${escapeHtml(t(testBannerL, lang))}</strong> ${escapeHtml(input.intendedTo)}
        </div>
      </td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="${escapeAttr(lang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subjectBase)}</title>
</head>
<body style="margin:0;padding:0;background:#faf7f2;color:#3a3228;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf7f2;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e8dfc8;border-radius:10px;">
          <tr>
            <td style="padding:28px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#3a3228;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${banner}
                <tr><td style="padding:0 0 16px;">${escapeHtml(greeting)}</td></tr>
                <tr><td style="padding:0 0 22px;">${escapeHtml(t(introL, lang))}</td></tr>
                <tr>
                  <td style="padding:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#8b6914;font-weight:700;">
                    ${escapeHtml(t(stayL, lang))}
                  </td>
                </tr>
                <tr><td style="padding:0 0 16px;">${nameHtml}</td></tr>
                <tr>
                  <td style="padding:0 0 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf7f2;border-radius:8px;">
                      <tr>
                        <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#3a3228;">
                          <div style="margin:0 0 8px;"><span style="color:#8b6914;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(t(datesL, lang))}</span><br/><strong>${escapeHtml(term)}</strong></div>
                          <div style="margin:0 0 8px;"><span style="color:#8b6914;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(t(nightsL, lang))}</span><br/><strong>${escapeHtml(nociLabel)}</strong></div>
                          <div style="margin:0;"><span style="color:#8b6914;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(t(guestsL, lang))}</span><br/><strong>${escapeHtml(osobLabel)}</strong></div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:8px 0 10px;">
                    <a href="${escapeAttr(input.guideUrl)}" style="display:inline-block;background:#8b6914;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:6px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;">
                      ${escapeHtml(t(openGuideL, lang))}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0 22px;font-size:13px;color:#6a5f52;">
                    ${escapeHtml(t(linkHintL, lang))}<br/>
                    <a href="${escapeAttr(input.guideUrl)}" style="color:#8b6914;word-break:break-all;">${escapeHtml(input.guideUrl)}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 0 0;border-top:1px solid #efe6d4;font-size:14px;color:#3a3228;">
                    ${escapeHtml(t(contactL, lang))}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    testMode ? `${t(testBannerL, lang)} ${input.intendedTo}` : '',
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
    t(openGuideL, lang),
    input.guideUrl,
    '',
    t(contactL, lang),
  ]
    .filter((line) => line !== '')
    .join('\n');

  return { subject, html, text };
}

export async function sendGuestEmail(opts: {
  input: GuestEmailInput;
  toOverride?: string;
}): Promise<{ to: string; messageId?: string }> {
  const testMode = (process.env.TEST_REZIM ?? '1') !== '0';
  const majitel = process.env.MAJITEL_EMAIL?.trim();
  if (!majitel) throw new Error('MAJITEL_EMAIL chybí');

  const intended = opts.input.intendedTo;
  const to = testMode || opts.toOverride ? majitel : intended;
  const built = buildGuestEmail(opts.input);

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

  const info = await transporter.sendMail({
    from: `VIVIEN Apartments <${user}>`,
    to,
    bcc: testMode ? undefined : majitel,
    subject: built.subject,
    text: built.text,
    html: built.html,
  });

  return { to, messageId: info.messageId };
}
