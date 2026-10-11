import nodemailer from 'nodemailer';
import apartmanyJson from '@/data/apartmany.json';
import { ceskyVokativ, narodnostKod } from './osloveni';
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
  /** Křestní jméno z BH (GUEST_NAME). */
  jmeno?: string | null;
  /** Národnost z BH, třeba CZE nebo SVK. Bez ní se české jméno neskloňuje. */
  narodnost?: string | null;
  guideUrl: string;
  intendedTo: string;
  secrets?: GuideSecrets;
  /** src loga v HTML (cid:… při odeslání, https při náhledu) */
  logoSrc?: string;
  /** src podpisu (vodorovné logo VA / VIVIEN) */
  podpisSrc?: string;
};

/** Veřejné logo na ostrém webu (náhled HTML). */
export const LOGO_PUBLIC_URL = 'https://vivienapartments.cz/images/logo-96.png';
export const LOGO_CID = 'vivien-logo';
/** Podpis: PNG 400 px (2×) s průhledným pozadím, v HTML na 180 px. */
export const PODPIS_CID = 'vivien-podpis';
export const PODPIS_WIDTH = 180;

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

/**
 * Pozdrav z křestního jména (GUEST_NAME).
 * OSLOVENI (pane/paní/Herr) nepoužíváme: BH občas splete rod.
 * Čeština: vždy čárka po „Dobrý den“. CZE jen 5. pád ze slovníku, jinak bez jména.
 * SVK: jméno v 1. pádu. Ostatní jazyky beze změny.
 * Bez jména → neutrální „Dobrý den,“ / „Guten Tag,“.
 */
export function greetingLine(
  lang: GuideLang,
  jmeno: string | null | undefined,
  narodnost?: string | null,
): string {
  const generic = t(
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
  const name = (jmeno || '').trim();
  if (lang === 'cs') {
    if (!name) return 'Dobrý den,';
    const kod = narodnostKod(narodnost);
    if (kod === 'SVK') return `Dobrý den, ${name},`;
    if (kod !== 'CZE') return 'Dobrý den,';
    const vok = ceskyVokativ(name);
    if (!vok) return 'Dobrý den,';
    return `Dobrý den, ${vok},`;
  }
  if (!name) return generic;
  const prefix = generic.replace(/[,，]\s*$/u, '');
  if (lang === 'zh-Hant') return `${prefix}${name}，`;
  return `${prefix} ${name},`;
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

/** Nad tlačítkem. Čas příjezdu, ať host nečeká před domem. */
const casPrijezduL: LText = {
  cs: 'Nejdůležitější je, abyste nám napsali, v kolik dorazíte. Apartmán vám předáme osobně a nebudete na nás čekat. Stačí SMS nebo WhatsApp na +420 777 702 272.',
  en: 'The most important thing is that you write to us with the time you will arrive. We hand the apartment over in person and you will not be waiting for us. An SMS or WhatsApp to +420 777 702 272 is enough.',
  de: 'Das Wichtigste ist, dass Sie uns schreiben, um wie viel Uhr Sie ankommen. Wir übergeben das Apartment persönlich und Sie warten nicht auf uns. Eine SMS oder WhatsApp an +420 777 702 272 genügt.',
  pl: 'Najważniejsze jest, żebyście napisali, o której dojedziecie. Apartament przekażemy osobiście i nie będziecie na nas czekać. Wystarczy SMS albo WhatsApp na +420 777 702 272.',
  uk: 'Найважливіше, щоб ви написали, о котрій приїдете. Апартаменти передамо особисто, і вам не доведеться на нас чекати. Досить SMS або WhatsApp на +420 777 702 272.',
  'zh-Hant': '最重要的是請告訴我們您幾點到。公寓由我們當面交接，您不必等我們。傳簡訊或 WhatsApp 到 +420 777 702 272 即可。',
};

const casSmsL: LText = {
  cs: 'Napsat SMS',
  en: 'Send an SMS',
  de: 'SMS schreiben',
  pl: 'Napisz SMS',
  uk: 'Написати SMS',
  'zh-Hant': '傳送簡訊',
};

const casWhatsappL: LText = {
  cs: 'Napsat na WhatsApp',
  en: 'Message on WhatsApp',
  de: 'Auf WhatsApp schreiben',
  pl: 'Napisz na WhatsApp',
  uk: 'Написати у WhatsApp',
  'zh-Hant': '用 WhatsApp 傳訊',
};

/** CTA nápověda (v HTML tučně). */
const introOpenL: LText = {
  cs: 'Otevřete ho tlačítkem níže.',
  en: 'Open it with the button below.',
  de: 'Öffnen Sie ihn über die Schaltfläche unten.',
  pl: 'Otwórzcie ją przyciskiem poniżej.',
  uk: 'Відкрийте його кнопкою нижче.',
  'zh-Hant': '請用下方按鈕開啟。',
};

const stayL: LText = {
  cs: 'Váš pobyt',
  en: 'Your stay',
  de: 'Ihr Aufenthalt',
  pl: 'Wasz pobyt',
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
  cs: 'Kdyby cokoli nefungovalo, volejte na +420 777 702 272. V případě, že se nedovoláte, zavolejte Nikol.',
  en: 'If anything does not work, call +420 777 702 272. If you cannot get through, call Nikol.',
  de: 'Wenn etwas nicht funktioniert, rufen Sie +420 777 702 272 an. Wenn Sie uns nicht erreichen, rufen Sie Nikol an.',
  pl: 'Gdyby cokolwiek nie działało, zadzwońcie na +420 777 702 272. Jeśli się nie dodzwonicie, zadzwońcie do Nikol.',
  uk: 'Якщо щось не працює, телефонуйте на +420 777 702 272. Якщо не додзвонитеся, зателефонуйте Nikol.',
  'zh-Hant': '如果有任何問題，請撥 +420 777 702 272。若打不通，請打給 Nikol。',
};

const familyL: LText = {
  cs: 'Nikol a rodina VIVIEN',
  en: 'Nikol & the VIVIEN family',
  de: 'Nikol und Familie VIVIEN',
  pl: 'Nikol i rodzina VIVIEN',
  uk: 'Nikol і родина VIVIEN',
  'zh-Hant': 'Nikol 與 VIVIEN 全家',
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
  cs: 'Další tipy na pobyt najdete na {{WEB}}. Kam na jídlo, kam na výlet, co se děje ve městě a poznávací hra po Budějovicích.',
  en: 'More tips for your stay are on {{WEB}}. Where to eat, where to go for a day out, what is on in town, and the Budweis discovery game.',
  de: 'Weitere Tipps für Ihren Aufenthalt finden Sie auf {{WEB}}. Wohin zum Essen, wohin auf einen Ausflug, was in der Stadt läuft, und das Budweiser Entdeckungsspiel.',
  pl: 'Kolejne wskazówki na pobyt znajdziecie na {{WEB}}. Gdzie zjeść, gdzie na wycieczkę, co się dzieje w mieście i gra odkrywcza po Budziejowicach.',
  uk: 'Інші поради на перебування знайдете на {{WEB}}. Куди на їжу, куди на виїзд, що відбувається в місті та пізнавальна гра Будейовицями.',
  'zh-Hant': '更多住宿提示請見 {{WEB}}。去哪吃飯、去哪一日遊、城裡近期活動，以及布杰約維采探索遊戲。',
};

const psApartmanyL: LText = {
  cs: 'P.S. Máme pět apartmánů, každý s jinou atmosférou. Spousta hostů o tom neví. Až budete plánovat další pobyt, můžete si vybrat podle nálady. {{QUIZ}}',
  en: 'P.S. We have five apartments, each with a different atmosphere. Many guests do not know that. When you plan another stay, you can choose by mood. {{QUIZ}}',
  de: 'P.S. Wir haben fünf Apartments, jedes mit einer anderen Atmosphäre. Viele Gäste wissen das nicht. Wenn Sie den nächsten Aufenthalt planen, können Sie nach Stimmung wählen. {{QUIZ}}',
  pl: 'P.S. Mamy pięć apartamentów, każdy z inną atmosferą. Wielu gości o tym nie wie. Gdy będziecie planować kolejny pobyt, możecie wybrać według nastroju. {{QUIZ}}',
  uk: 'P.S. У нас пʼять апартаментів, кожен зі своєю атмосферою. Багато гостей про це не знають. Коли плануватимете наступне перебування, можете обрати за настроєм. {{QUIZ}}',
  'zh-Hant': 'P.S. 我們有五間公寓，各有不同氛圍。很多客人不知道這件事。下次規劃住宿時，可以依心情挑選。{{QUIZ}}',
};

const psCtaL: LText = {
  cs: 'Který apartmán by vám seděl?',
  en: 'Which apartment would suit you?',
  de: 'Welches Apartment würde zu Ihnen passen?',
  pl: 'Który apartament by Wam pasował?',
  uk: 'Які апартаменти вам підійдуть?',
  'zh-Hant': '哪間公寓適合您？',
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

/** Číslo v mailu: tel odkaz, nowrap a nedělitelné mezery, ať se nezalomí. */
function telAnchor(display: string, bold: boolean): string {
  const digits = display.replace(/\D/g, '');
  const shown = display.trim().replace(/ /g, '\u00a0');
  const weight = bold ? 'font-weight:700;' : '';
  return `<a href="tel:+${digits}" style="color:#e8d5a3;text-decoration:underline;text-underline-offset:0.12em;${weight}white-space:nowrap;">${shown}</a>`;
}

function withPhones(text: string): string {
  return escapeHtml(text).replace(/\+420 \d{3} \d{3} \d{3}/g, (m) => telAnchor(m, true));
}

function msgButton(href: string, label: string, serif: string): string {
  return `<a href="${escapeAttr(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:8px 14px;border:1px solid #c9a84c;border-radius:999px;color:#f5efe3;font-family:${serif};font-size:14px;line-height:1.2;text-decoration:none;white-space:nowrap;">${escapeHtml(label)}</a>`;
}

/** Zlaté kulaté tlačítko. Jediný schválený vzhled. */
function ctaHtml(opts: { href: string; label: string; serif: string }): string {
  const href = escapeAttr(opts.href);
  const label = escapeHtml(opts.label);
  const f = opts.serif;

  return `<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;"><tr>
    <td align="center" style="background:#c9a84c;border-radius:28px;text-align:center;">
      <a href="${href}" style="display:inline-block;padding:12px 22px;font-family:${f};font-size:15px;line-height:1.25;color:#1c1712;text-decoration:none;font-weight:400;border-radius:28px;text-align:center;white-space:nowrap;">${label}</a>
    </td>
  </tr></table>`;
}

export function buildGuestEmail(input: GuestEmailInput): { subject: string; html: string; text: string } {
  const lang = input.lang;
  const apt = aptRow(input.apt);
  const greeting = greetingLine(lang, input.jmeno, input.narodnost);
  const nociLabel = input.noci == null ? 'XXX' : String(input.noci);
  const osobLabel = input.osob == null ? 'XXX' : String(input.osob);
  const term = `${fmtYmd(input.prijezd, lang)} – ${fmtYmd(input.odjezd, lang)}`.replace('–', '-');

  const testMode = (process.env.TEST_REZIM ?? '1') !== '0';
  const subjectBase = t(subjectL, lang);
  const subject = testMode ? `[TEST] ${subjectBase}` : subjectBase;
  const logoSrc = input.logoSrc || LOGO_PUBLIC_URL;
  const podpisSrc = input.podpisSrc || '';
  const serif = "Georgia,'Times New Roman',serif";
  const sazba =
    'text-align:justify;text-justify:inter-word;hyphens:auto;-webkit-hyphens:auto;-ms-hyphens:auto;';

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
                <tr><td style="padding:0 0 22px;font-family:${serif};font-size:17px;line-height:1.55;color:#e8dfc8;">
                  <div lang="${escapeAttr(lang)}" style="${sazba}">${escapeHtml(t(introBodyL, lang))}</div>
                  <div style="padding-top:26px;"><strong style="color:#f5efe3;font-weight:700;">${escapeHtml(t(introOpenL, lang))}</strong></div>
                </td></tr>
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
                  <td style="padding:0 0 18px;">
                    <div lang="${escapeAttr(lang)}" style="padding:12px 14px;background:#2a221c;border:1px solid #c9a84c;border-radius:8px;font-family:${serif};font-size:16px;line-height:1.5;color:#f5efe3;${sazba}">
                      ${withPhones(t(casPrijezduL, lang))}
                      <div style="padding-top:12px;text-align:left;">
                        ${msgButton('sms:+420777702272', t(casSmsL, lang), serif)}
                        ${msgButton('https://wa.me/420777702272', t(casWhatsappL, lang), serif)}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:8px 0 22px;">
                    ${cta}
                  </td>
                </tr>
                <tr>
                  <td lang="${escapeAttr(lang)}" style="padding:18px 0 0;border-top:1px solid #3d342a;font-family:${serif};font-size:15px;line-height:1.55;color:#cbbba8;${sazba}">
                    ${withPhones(t(helpL, lang))}
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 0 0;font-family:${serif};font-size:15px;line-height:1.55;color:#cbbba8;">
                    <div style="margin:0 0 4px;">${escapeHtml(t(closingL, lang))}</div>
                    <div style="margin:0 0 2px;font-size:17px;color:#f5efe3;"><strong>${escapeHtml(t(familyL, lang))}</strong></div>
                    <div style="margin:0 0 14px;">${telAnchor('+420 702 153 573', false)}</div>
                    ${
                      podpisSrc
                        ? `<img src="${escapeAttr(podpisSrc)}" width="${PODPIS_WIDTH}" alt="VIVIEN Apartments" style="display:block;width:${PODPIS_WIDTH}px;max-width:100%;height:auto;border:0;" />`
                        : ''
                    }
                  </td>
                </tr>
                <tr>
                  <td lang="${escapeAttr(lang)}" style="padding:22px 0 0;border-top:1px solid #3d342a;font-family:${serif};font-size:14px;line-height:1.55;color:#cbbba8;${sazba}">
                    ${webTipHtml(lang)}
                  </td>
                </tr>
                <tr>
                  <td lang="${escapeAttr(lang)}" style="padding:16px 0 0;font-family:${serif};font-size:14px;line-height:1.55;color:#cbbba8;${sazba}">
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
    t(casPrijezduL, lang),
    '',
    `${t(openGuideL, lang)}: ${input.guideUrl}`,
    '',
    t(helpL, lang),
    '',
    t(closingL, lang),
    t(familyL, lang),
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
  const podpisPath = path.join(process.cwd(), 'assets', 'email', 'logo-podpis.png');
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
        filename: 'logo-podpis.png',
        content: fs.readFileSync(podpisPath),
        cid: PODPIS_CID,
        contentDisposition: 'inline',
      },
    ],
  });

  return { to, messageId: info.messageId };
}
