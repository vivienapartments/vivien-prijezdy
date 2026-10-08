import nodemailer from 'nodemailer';
import apartmanyJson from '@/data/apartmany.json';
import { apartmentTitle, wifiHesloProApt } from './i18n';
import { kodZahradyProApt, loadSecrets, type GuideSecrets } from './secrets';
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

type AptRow = { id: AptId; nazev: { cs: string; en: string }; wifi: { ssid: string }; navod_na_zahradu?: boolean };

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

const greetNeutral: LText = {
  cs: 'Dobrý den,',
  en: 'Hello,',
  de: 'Guten Tag,',
  pl: 'Dzień dobry,',
  uk: 'Добрий день,',
  'zh-Hant': '您好，',
};

const subjectL: LText = {
  cs: 'Váš osobní průvodce příjezdem · VIVIEN',
  en: 'Your personal arrival guide · VIVIEN',
  de: 'Ihr persönlicher Anreiseleitfaden · VIVIEN',
  pl: 'Wasza osobista instrukcja przyjazdu · VIVIEN',
  uk: 'Ваш особистий гід приїзду · VIVIEN',
  'zh-Hant': '您的個人入住指南 · VIVIEN',
};

const introL: LText = {
  cs: 'Připravili jsme pro vás osobní průvodce příjezdem. Otevřete odkaz níže. Hesla a praktické kroky jsou uvnitř.',
  en: 'We prepared a personal arrival guide for you. Open the link below. Passwords and practical steps are inside.',
  de: 'Wir haben einen persönlichen Anreiseleitfaden für Sie vorbereitet. Öffnen Sie den Link unten. Passwörter und praktische Schritte finden Sie darin.',
  pl: 'Przygotowaliśmy dla Was osobistą instrukcję przyjazdu. Otwórzcie link poniżej. Hasła i praktyczne kroki są w środku.',
  uk: 'Ми підготували для вас особистий гід приїзду. Відкрийте посилання нижче. Паролі та практичні кроки всередині.',
  'zh-Hant': '我們為您準備了個人入住指南。請開啟下方連結。密碼與實用步驟都在裡面。',
};

const stayL: LText = {
  cs: 'Váš pobyt',
  en: 'Your stay',
  de: 'Ihr Aufenthalt',
  pl: 'Wasze pobyty',
  uk: 'Ваше перебування',
  'zh-Hant': '您的住宿',
};

const openGuideL: LText = {
  cs: 'Otevřít průvodce příjezdem',
  en: 'Open the arrival guide',
  de: 'Anreiseleitfaden öffnen',
  pl: 'Otwórz instrukcję przyjazdu',
  uk: 'Відкрити гід приїзду',
  'zh-Hant': '開啟抵達指南',
};

const carL: LText = {
  cs: 'Přijedete autem? Napište nám SMS',
  en: 'Arriving by car? Send us a text message',
  de: 'Reisen Sie mit dem Auto an? Schreiben Sie uns eine SMS',
  pl: 'Przyjeżdżacie samochodem? Napiszcie SMS',
  uk: 'Приїжджаєте автомобілем? Напишіть нам SMS',
  'zh-Hant': '開車抵達？請傳簡訊給我們',
};

const carLeadL: LText = {
  cs: 'Parkovací stání vám zajistíme, jen když nám co nejdříve pošlete SMS nebo zprávu na číslo +420 777 702 272. Nejlépe hned teď. Uveďte v ní:',
  en: 'We can only reserve a parking space if you send a text message to +420 777 702 272 as soon as possible. Ideally right now. Please include:',
  de: 'Einen Stellplatz können wir nur sichern, wenn Sie uns so bald wie möglich eine SMS an +420 777 702 272 senden. Am besten sofort. Bitte geben Sie an:',
  pl: 'Miejsce parkingowe zapewnimy tylko, gdy jak najszybciej wyślecie SMS na +420 777 702 272. Najlepiej od razu. Podajcie:',
  uk: 'Паркувальне місце забезпечимо, лише якщо якнайшвидше надішлете SMS на +420 777 702 272. Найкраще зараз. Вкажіть:',
  'zh-Hant': '請儘快傳簡訊至 +420 777 702 272，我們才能保留車位。最好現在就傳。請寫明：',
};

const carPoints: LText[] = [
  {
    cs: 'že máte zájem o parkovací stání,',
    en: 'that you would like a parking space,',
    de: 'dass Sie einen Stellplatz wünschen,',
    pl: 'że chcecie miejsce parkingowe,',
    uk: 'що хочете паркувальне місце,',
    'zh-Hant': '您需要停車位，',
  },
  {
    cs: 'telefonní číslo, ze kterého budete otevírat bránu parkoviště,',
    en: 'the phone number you will use to open the car park gate,',
    de: 'die Telefonnummer, von der aus Sie das Parkplatztor öffnen werden,',
    pl: 'numer telefonu, z którego otworzycie bramę parkingu,',
    uk: 'номер телефону, з якого відкриватимете браму парковки,',
    'zh-Hant': '用來開停車場大門的電話號碼，',
  },
  {
    cs: 'registrační značku (SPZ) vašeho auta.',
    en: "your car's licence plate number.",
    de: 'das Kennzeichen Ihres Autos.',
    pl: 'numer rejestracyjny Waszego auta.',
    uk: 'реєстраційний номер вашого авто.',
    'zh-Hant': '您的車牌號碼。',
  },
];

const wifiL: LText = {
  cs: 'WiFi v apartmánu',
  en: 'WiFi in the apartment',
  de: 'WLAN in der Wohnung',
  pl: 'WiFi w apartamencie',
  uk: 'WiFi в апартаментах',
  'zh-Hant': '公寓 WiFi',
};

const gardenL: LText = {
  cs: 'Kód na zahradu',
  en: 'Garden code',
  de: 'Gartencode',
  pl: 'Kod do ogrodu',
  uk: 'Код до саду',
  'zh-Hant': '花園密碼',
};

const contactL: LText = {
  cs: 'Když něco nefunguje, zavolejte Nikol: +420 702 153 573',
  en: 'If something does not work, call Nikol: +420 702 153 573',
  de: 'Wenn etwas nicht funktioniert, rufen Sie Nikol an: +420 702 153 573',
  pl: 'Jeśli coś nie działa, zadzwońcie do Nikol: +420 702 153 573',
  uk: 'Якщо щось не працює, зателефонуйте Nikol: +420 702 153 573',
  'zh-Hant': '若有問題，請致電 Nikol：+420 702 153 573',
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

function showsGardenCode(apt: AptId): boolean {
  return Boolean(aptRow(apt).navod_na_zahradu);
}

export function buildGuestEmail(input: GuestEmailInput): { subject: string; html: string; text: string } {
  const lang = input.lang;
  const secrets = input.secrets ?? loadSecrets();
  const apt = aptRow(input.apt);
  const name = apartmentTitle(apt.nazev, lang);
  const greeting =
    lang === 'cs' && input.osloveni?.trim() ? input.osloveni.trim() : t(greetNeutral, lang);

  const nociLabel = input.noci == null ? 'XXX' : String(input.noci);
  const osobLabel = input.osob == null ? 'XXX' : String(input.osob);
  const term = `${fmtYmd(input.prijezd, lang)} → ${fmtYmd(input.odjezd, lang)}`;
  const wifiPass = wifiHesloProApt(secrets, input.apt);
  const garden = showsGardenCode(input.apt) ? kodZahradyProApt(secrets, input.apt) : null;

  const testMode = (process.env.TEST_REZIM ?? '1') !== '0';
  const subjectBase = t(subjectL, lang);
  const subject = testMode ? `[TEST] ${subjectBase}` : subjectBase;

  const pointsHtml = carPoints.map((p) => `<li>${escapeHtml(t(p, lang))}</li>`).join('');
  const pointsText = carPoints.map((p) => `- ${t(p, lang)}`).join('\n');

  const banner = testMode
    ? `<p style="background:#fff3cd;border:1px solid #c9a84c;padding:12px 14px;"><strong>${escapeHtml(t(testBannerL, lang))}</strong> ${escapeHtml(input.intendedTo)}</p>`
    : '';

  const gardenHtml = garden
    ? `<h3 style="font-family:Georgia,serif;font-weight:500;">${escapeHtml(t(gardenL, lang))}</h3><p><strong>${escapeHtml(garden)}</strong></p>`
    : '';
  const gardenText = garden ? `\n${t(gardenL, lang)}: ${garden}\n` : '';

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<body style="margin:0;padding:0;background:#faf7f2;color:#3a3228;font-family:Arial,Helvetica,sans-serif;line-height:1.55;">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px 40px;">
    ${banner}
    <p>${escapeHtml(greeting)}</p>
    <p>${escapeHtml(t(introL, lang))}</p>
    <h2 style="font-family:Georgia,serif;font-weight:500;font-size:22px;color:#1c1712;">${escapeHtml(t(stayL, lang))}</h2>
    <p>${escapeHtml(name)}<br/>${escapeHtml(term)}<br/>${escapeHtml(nociLabel)} · ${escapeHtml(osobLabel)}</p>
    <p style="margin:28px 0;">
      <a href="${escapeAttr(input.guideUrl)}" style="display:inline-block;background:#8b6914;color:#fff;text-decoration:none;padding:14px 22px;font-weight:700;">${escapeHtml(t(openGuideL, lang))}</a>
    </p>
    <p style="font-size:14px;word-break:break-all;"><a href="${escapeAttr(input.guideUrl)}">${escapeHtml(input.guideUrl)}</a></p>
    <h3 style="font-family:Georgia,serif;font-weight:500;">${escapeHtml(t(carL, lang))}</h3>
    <p>${escapeHtml(t(carLeadL, lang))}</p>
    <ul>${pointsHtml}</ul>
    <h3 style="font-family:Georgia,serif;font-weight:500;">${escapeHtml(t(wifiL, lang))}</h3>
    <p>SSID: <strong>${escapeHtml(apt.wifi.ssid)}</strong><br/>${escapeHtml(wifiPass)}</p>
    ${gardenHtml}
    <p>${escapeHtml(t(contactL, lang))}</p>
  </div>
</body>
</html>`;

  const text = [
    testMode ? `${t(testBannerL, lang)} ${input.intendedTo}` : '',
    greeting,
    '',
    t(introL, lang),
    '',
    t(stayL, lang),
    name,
    term,
    `${nociLabel} · ${osobLabel}`,
    '',
    t(openGuideL, lang),
    input.guideUrl,
    '',
    t(carL, lang),
    t(carLeadL, lang),
    pointsText,
    '',
    t(wifiL, lang),
    `SSID: ${apt.wifi.ssid}`,
    wifiPass,
    gardenText,
    t(contactL, lang),
  ]
    .filter((x) => x !== '')
    .join('\n');

  return { subject, html, text };
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
