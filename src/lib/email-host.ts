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

/** Co průvodce je (cesta + zásadní info). */
const introBodyL: LText = {
  // CS: po oslovení s čárkou malé písmeno (pravopis dopisu)
  cs: 'připravili jsme pro vás krátkého průvodce příjezdem. Najdete v něm cestu k nám, parkování, bránu, Wi-Fi a kódy. Ať víte, kam jet a co dělat po příjezdu.',
  en: 'We prepared a short arrival guide for you. You will find the way to us, parking, the gate, Wi-Fi and codes. So you know where to go and what to do after arrival.',
  de: 'wir haben für Sie einen kurzen Anreiseleitfaden vorbereitet. Darin finden Sie den Weg zu uns, Parken, Tor, WLAN und Codes. Damit Sie wissen, wohin Sie fahren und was nach der Ankunft zu tun ist.',
  pl: 'przygotowaliśmy dla Was krótką instrukcję przyjazdu. Znajdziecie w niej drogę do nas, parking, bramę, Wi-Fi i kody. Żebyście wiedzieli, dokąd jechać i co robić po przyjeździe.',
  uk: 'ми підготували для вас короткий гід приїзду. У ньому шлях до нас, паркування, брама, Wi-Fi та коди. Щоб ви знали, куди їхати і що робити після прибуття.',
  'zh-Hant': '我們為您準備了一份簡短的抵達指南。您會找到前往我們這裡的路線、停車、大門、Wi-Fi 與密碼。讓您知道怎麼來、抵達後該做什麼。',
};

/** CTA nápověda (v HTML tučně). */
const introOpenL: LText = {
  cs: 'Otevřete ho tlačítkem níže.',
  en: 'Open it with the button below.',
  de: 'Öffnen Sie ihn über die Schaltfläche unten.',
  pl: 'Otwórzcie go przyciskiem poniżej.',
  uk: 'Відкрийте його кнопкою нижче.',
  'zh-Hant': '請用下方按鈕開啟。',
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

/** Úplně na konci mailu: odkaz na veřejný web ({{WEB}} = URL podle jazyka). */
const webTipL: LText = {
  cs: 'Ještě víc tipů na pobyt najdete na {{WEB}}: kam na jídlo, kam na výlet, co podniknout, co se děje ve městě a poznávací hra po Budějovicích.',
  en: 'More tips for your stay are on {{WEB}}: where to eat, day trips, things to do, what is on in town, and the Budweis discovery game.',
  de: 'Noch mehr Tipps für Ihren Aufenthalt finden Sie auf {{WEB}}: Essen, Ausflüge, Unternehmungen, was in der Stadt läuft und das Budweiser Entdeckungsspiel.',
  pl: 'Więcej wskazówek na pobyt znajdziecie na {{WEB}}: gdzie zjeść, wycieczki, co robić, co się dzieje w mieście i gra odkrywcza po Budziejowicach.',
  uk: 'Ще більше порад на перебування на {{WEB}}: куди на їжу, виїзди, що робити, що відбувається в місті та пізнавальна гра Будейовицями.',
  'zh-Hant': '更多住宿小提示請見 {{WEB}}：去哪吃飯、一日遊、城裡活動、近期活動，以及布杰約維采探索遊戲。',
};

const psApartmanyL: LText = {
  cs: 'P.S. Máme pět apartmánů, každý s jinou atmosférou. Spousta hostů o tom neví. Až budete plánovat další pobyt, můžete si vybrat podle nálady: {{QUIZ}}',
  en: 'P.S. We have five apartments, each with a different atmosphere. Many guests do not know that. When you plan another stay, you can choose by mood: {{QUIZ}}',
  de: 'P.S. Wir haben fünf Apartments, jedes mit einer anderen Atmosphäre. Viele Gäste wissen das nicht. Wenn Sie den nächsten Aufenthalt planen, können Sie nach Stimmung wählen: {{QUIZ}}',
  pl: 'P.S. Mamy pięć apartamentów, każdy z inną atmosferą. Wielu gości o tym nie wie. Gdy będziecie planować kolejny pobyt, możecie wybrać według nastroju: {{QUIZ}}',
  uk: 'P.S. У нас пʼять апартаментів, кожні з іншою атмосферою. Багато гостей про це не знають. Коли плануватимете наступне перебування, можете обрати за настроєм: {{QUIZ}}',
  'zh-Hant': 'P.S. 我們有五間公寓，各有不同氛圍。很多客人不知道這件事。下次規劃住宿時，可以依心情挑選：{{QUIZ}}',
};

const psCtaL: LText = {
  cs: 'Který apartmán by vám seděl',
  en: 'Which apartment would suit you',
  de: 'Welches Apartment würde zu Ihnen passen',
  pl: 'Który apartament by Wam pasował',
  uk: 'Які апартаменти вам підійдуть',
  'zh-Hant': '哪間公寓適合您',
};

function publicSiteUrl(lang: GuideLang): string {
  const base = 'https://vivienapartments.cz';
  if (lang === 'cs') return `${base}/`;
  if (lang === 'zh-Hant') return `${base}/zh/`;
  if (lang === 'en' || lang === 'de' || lang === 'pl' || lang === 'uk' || lang === 'es' || lang === 'fr' || lang === 'it') {
    return `${base}/${lang}/`;
  }
  return `${base}/`;
}

function quizUrl(lang: GuideLang): string {
  const base = publicSiteUrl(lang).replace(/\/$/, '');
  return `${base}/discover-your-atmosphere`;
}

function webTipPlain(lang: GuideLang): string {
  return t(webTipL, lang).replace(/\{\{WEB\}\}/g, publicSiteUrl(lang).replace(/\/$/, ''));
}

function webTipHtml(lang: GuideLang): string {
  const url = publicSiteUrl(lang);
  const label = url.replace(/^https:\/\//, '').replace(/\/$/, '');
  const [before = '', after = ''] = t(webTipL, lang).split('{{WEB}}');
  return `${escapeHtml(before)}<a href="${escapeAttr(url)}" style="color:#e8d5a3;text-decoration:underline;font-weight:700;">${escapeHtml(label)}</a>${escapeHtml(after)}`;
}

function psApartmanyPlain(lang: GuideLang): string {
  return t(psApartmanyL, lang).replace(/\{\{QUIZ\}\}/g, `${t(psCtaL, lang)} (${quizUrl(lang)})`);
}

function psApartmanyHtml(lang: GuideLang): string {
  const href = quizUrl(lang);
  const cta = t(psCtaL, lang);
  const [before = '', after = ''] = t(psApartmanyL, lang).split('{{QUIZ}}');
  return `${escapeHtml(before)}<a href="${escapeAttr(href)}" style="color:#e8d5a3;text-decoration:underline;font-weight:700;">${escapeHtml(cta)}</a>${escapeHtml(after)}`;
}

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
                <tr><td style="padding:0 0 22px;font-family:${serif};font-size:17px;line-height:1.55;color:#e8dfc8;">${escapeHtml(t(introBodyL, lang))}<br/><br/><strong style="color:#f5efe3;font-weight:700;">${escapeHtml(t(introOpenL, lang))}</strong></td></tr>
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
                <tr>
                  <td style="padding:22px 0 0;border-top:1px solid #3d342a;font-family:${serif};font-size:14px;line-height:1.55;color:#cbbba8;">
                    ${webTipHtml(lang)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0 0;font-family:${serif};font-size:14px;line-height:1.55;color:#cbbba8;">
                    ${psApartmanyHtml(lang)}
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
    t(introBodyL, lang),
    t(introOpenL, lang),
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
    '',
    webTipPlain(lang),
    '',
    psApartmanyPlain(lang),
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

  const fs = await import('fs');
  const logoPath = path.join(process.cwd(), 'assets', 'email', 'logo.png');
  const podpisPath = path.join(process.cwd(), 'assets', 'email', 'logo-podpis.jpg');
  if (!fs.existsSync(logoPath) || !fs.existsSync(podpisPath)) {
    throw new Error(
      `Chybí e-mailové logo v serverless balíčku (${logoPath} / ${podpisPath})`,
    );
  }

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
        content: fs.readFileSync(logoPath),
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
      {
        filename: 'logo-podpis.jpg',
        content: fs.readFileSync(podpisPath),
        cid: PODPIS_CID,
        contentDisposition: 'inline',
      },
    ],
  });

  return { to, messageId: info.messageId };
}
