import { NIKOL_PHONE, PARKING_OWNER_PHONE } from './constants';
import {
  radek1Nadpis,
  radek1Pod,
  radek1Tlacitko,
  radek2Nadpis,
  radek2Pod,
  radek2Tlacitko,
  radek3Nadpis,
  radek3Pod,
  radek3Tlacitko,
  vyhodyUvod,
} from './doporuceni-komplet-texty';
import { t, toTelHref } from './i18n';
import {
  expiredDopis,
  expiredNadpis,
  expiredPodpis,
  expiredZaloha,
  expiredZavolat,
} from './texts';
import type { GuideLang, LText } from './types';

import {
  klubBookingPodekovani5,
  klubDoUrovneSablona,
  klubNejvyssiUroven,
  klubOtevritKartu,
  klubPodekovaniUvod,
  klubRadek1Nadpis,
  klubRadek1PodPred,
  klubRadek1PodZa,
  klubRadek2Nadpis,
  klubRadek2Pod,
  klubRadek3Nadpis,
  klubRadek3Pod,
  klubTimtoUrovniPred,
  klubVaseUrovenPred,
  klubZapocitali,
  vyplnSablonu,
} from './klub-podekovani-texty';
import { OSTRA_ADRESA_ZALOHA, opravVerejnyOdkaz } from './verejna-adresa';

/** Volitelný klubový blok pod oddělovací čárou (jen když je klub zapnutý). */
export type PodekovaniKlubEmail = {
  odkazKarty: string;
  jmeno: string;
  urovenId: string;
  urovenNazev: string;
  slevaPct: number;
  jeFirma?: boolean;
  /** Úroveň se tímto pobytem změnila. */
  urovenNova?: boolean;
  /** Host přes Booking / Airbnb – bez „započítali“. */
  booking?: boolean;
  dalsiNazev?: string | null;
  dalsiPct?: number | null;
  chybiKc?: number | null;
  /** 0–100 vyplnění pruhu. */
  pruhPct?: number;
};

/** Obrázky v e-mailu přes stálou vercel.app, dokud běží i club. */
const OSTRA_ASSET = OSTRA_ADRESA_ZALOHA;

/** Předmět e-mailu po odjezdu. Schváleno majitelem 22. 11. 2026, oprava en/fi 23. 11. */
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
  fi: 'VIVIEN · Kiitos vierailustanne',
  fr: 'VIVIEN · Merci de votre visite',
  it: 'VIVIEN · Grazie della visita',
  pt: 'VIVIEN · Obrigado pela vossa visita',
};

/** Starší tlačítko (v e-mailu už není). */
export const TLACITKO_PODEKOVANI: LText = {
  cs: 'Využít výhody',
  en: 'Use your benefits',
  de: 'Vorteile nutzen',
  pl: 'Skorzystajcie z korzyści',
  uk: 'Скористатися перевагами',
  'zh-Hant': '使用您的優惠',
  es: 'Aprovechar las ventajas',
  fr: 'Profiter des avantages',
  it: 'Usufruire dei vantaggi',
  pt: 'Aproveitar as vantagens',
  sv: 'Använd förmånerna',
  hu: 'Előnyök igénybevétele',
  da: 'Brug fordelene',
  fi: 'Käytä etuja',
};

function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** 5 % se v HTML nesmí zlomit. */
function slevaNbsp(htmlEscaped: string): string {
  return htmlEscaped.replace(/5\s*%/g, '5&nbsp;%');
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

/** Odhlášení z dalších e-mailů. Úplný konec dopisu, malé šedé. */
export const ODHLASENI_EMAIL: Record<GuideLang, string> = {
  cs: 'Nechcete od nás další e-maily? Stačí odpovědět NE.',
  en: 'Don’t want more e-mails from us? Just reply NO.',
  de: 'Möchten Sie keine weiteren E-Mails von uns? Antworten Sie einfach mit NEIN.',
  pl: 'Nie chcecie od nas więcej e-maili? Wystarczy odpowiedzieć NIE.',
  uk: 'Не бажаєте більше листів від нас? Достатньо відповісти НІ.',
  'zh-Hant': '不想再收到我們的電子郵件？回覆「NE」即可。',
  es: '¿No quiere más correos nuestros? Basta con responder NO.',
  fr: 'Vous ne souhaitez plus de nos e-mails ? Répondez simplement NON.',
  it: 'Non volete più e-mail da noi? Basta rispondere NO.',
  pt: 'Não querem mais e-mails nossos? Basta responder NÃO.',
  sv: 'Vill ni inte ha fler e-post från oss? Svara bara NEJ.',
  hu: 'Nem szeretne tőlünk több e-mailt? Egyszerűen válaszoljon NEM.',
  da: 'Vil I ikke have flere e-mails fra os? Svar blot NEJ.',
  fi: 'Ettekö halua enää sähköposteja meiltä? Vastatkaa vain EI.',
};

export function textOdhlaseniEmail(lang: GuideLang | null): string {
  const l = jazyk(lang);
  return ODHLASENI_EMAIL[l] || ODHLASENI_EMAIL.en;
}

/** Z odkazu průvodce `…/{token}` udělá odkaz na poptávku věrného hosta. */
export function odkazPoptavkaVernost(odkazPruvodce: string): string {
  const raw = opravVerejnyOdkaz(odkazPruvodce.trim());
  try {
    const u = new URL(raw);
    const cast = u.pathname.replace(/^\//, '').split('/')[0] || '';
    if (!cast || cast === 'poptavka') return raw;
    return `${u.origin}/poptavka?t=${encodeURIComponent(cast)}`;
  } catch {
    return raw;
  }
}

/** Prostý text (textová část e-mailu). */
export function textPodekovaniEmail(
  lang: GuideLang | null,
  odkaz: string,
  odkazDoporucit?: string,
  odkazPlocha?: string,
  odkazRezervovat?: string,
  klub?: PodekovaniKlubEmail | null,
): string {
  const l = jazyk(lang);
  const url = opravVerejnyOdkaz(odkaz.trim());
  const urlRez = opravVerejnyOdkaz(odkazRezervovat || odkazPoptavkaVernost(url));
  const urlDop = opravVerejnyOdkaz(odkazDoporucit || `${url}#doporucit`);
  const urlPlo = opravVerejnyOdkaz(
    odkazPlocha || `${url}${url.includes('?') ? '&' : '?'}plocha=1`,
  );
  const radky: string[] = [
    t(expiredNadpis, l),
    '',
    t(expiredDopis, l),
    '',
    t(expiredPodpis, l),
    '',
  ];
  if (klub) {
    if (klub.booking) {
      radky.push(t(klubBookingPodekovani5, l), '');
    } else {
      radky.push(t(klubZapocitali, l));
      const urovenRadek = klub.urovenNova
        ? `${t(klubTimtoUrovniPred, l)} ${klub.urovenNazev}.`
        : `${t(klubVaseUrovenPred, l)} ${klub.urovenNazev}.`;
      radky.push(urovenRadek, '', klub.jmeno, '');
    }
    if (klub.dalsiNazev && klub.chybiKc != null && klub.dalsiPct != null) {
      radky.push(
        vyplnSablonu(t(klubDoUrovneSablona, l), {
          nazev: klub.dalsiNazev,
          pct: klub.dalsiPct,
          kc: klub.chybiKc.toLocaleString('cs-CZ'),
        }),
        '',
      );
    } else if (!klub.dalsiNazev) {
      radky.push(t(klubNejvyssiUroven, l), '');
    }
    radky.push(
      t(klubPodekovaniUvod, l),
      '',
      `1. ${t(klubRadek1Nadpis, l)}. ${t(klubRadek1PodPred, l)} ${klub.slevaPct} ${t(klubRadek1PodZa, l)}`,
      urlRez,
      `2. ${t(klubRadek2Nadpis, l)}. ${t(klubRadek2Pod, l)}`,
      urlDop,
      `3. ${t(klubRadek3Nadpis, l)}. ${t(klubRadek3Pod, l)}`,
      urlPlo,
      '',
      t(klubOtevritKartu, l),
      opravVerejnyOdkaz(klub.odkazKarty),
      '',
    );
  } else {
    radky.push(
      t(vyhodyUvod, l),
      '',
      `1. ${t(radek1Nadpis, l)}. ${t(radek1Pod, l)}`,
      urlRez,
      `2. ${t(radek2Nadpis, l)}. ${t(radek2Pod, l)}`,
      urlDop,
      `3. ${t(radek3Nadpis, l)}. ${t(radek3Pod, l)}`,
      urlPlo,
      '',
    );
  }
  radky.push(
    `${t(expiredZavolat, l)}: ${NIKOL_PHONE}`,
    `${t(expiredZaloha, l)}: ${PARKING_OWNER_PHONE}`,
    '',
    textOdhlaseniEmail(l),
  );
  return radky.join('\n');
}

function telNbsp(s: string): string {
  return esc(s).replace(/ /g, '&nbsp;');
}

function tlacitkoTelefonu(
  ikonaUrl: string,
  popis: string,
  cislo: string,
  sans: string,
): string {
  const href = toTelHref(cislo);
  return `<td width="50%" valign="top" style="padding:4px;">
  <a href="${href}" style="text-decoration:none;display:block;border:1px solid #c9a84c;border-radius:12px;background:#15110e;padding:12px 8px;text-align:center;">
    <img src="${ikonaUrl}" width="22" height="22" alt="" style="display:block;margin:0 auto 6px;width:22px;height:22px;border:0;">
    <div style="font-family:${sans};color:#cbbba8;font-size:13px;line-height:1.3;">${esc(popis)}</div>
    <div style="font-family:${sans};color:#c9a84c;font-size:14px;line-height:1.35;font-weight:700;padding-top:3px;white-space:nowrap;">${telNbsp(cislo)}</div>
  </a>
</td>`;
}

function radekVyhody(
  ikonaUrl: string,
  nad: string,
  pod: string,
  tlacitko: string,
  odkaz: string,
  sans: string,
): string {
  return `<tr>
  <td style="padding:0;">
    <a href="${odkaz}" style="text-decoration:none;display:block;padding:12px 0;border-bottom:1px solid #3d342a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td width="48" valign="middle" style="padding-right:10px;">
            <img src="${ikonaUrl}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;border:1px solid #6b5a3a;border-radius:10px;background:#15110e;">
          </td>
          <td valign="middle" style="font-family:${sans};text-align:left;">
            <div style="color:#f5efe3;font-size:15px;line-height:1.25;font-weight:700;white-space:nowrap;">${slevaNbsp(esc(nad))}</div>
            <div style="color:#cbbba8;font-size:13px;line-height:1.3;padding-top:2px;white-space:nowrap;">${slevaNbsp(esc(pod))}</div>
          </td>
          <td width="92" valign="middle" align="right" style="padding-left:8px;">
            <span style="display:inline-block;min-width:84px;padding:7px 10px;background:#c9a84c;color:#1a1510;font-family:${sans};font-size:13px;line-height:1.2;font-weight:700;border-radius:18px;text-align:center;white-space:nowrap;">${esc(tlacitko)}</span>
          </td>
        </tr>
      </table>
    </a>
  </td>
</tr>`;
}

function klubHtmlBlok(
  l: GuideLang,
  klub: PodekovaniKlubEmail,
  asset: string,
  sans: string,
  serif: string,
  urlRez: string,
  urlDop: string,
  urlPlo: string,
  ikKal: string,
  ikDarek: string,
  ikTel: string,
): string {
  const partner = Boolean(klub.jeFirma);
  const karticka = `${asset}/email/karticka-${esc(klub.urovenId)}${partner ? '-partner' : ''}.png`;
  const urlKarta = opravVerejnyOdkaz(klub.odkazKarty).replaceAll('"', '%22');
  let urovenHtml: string;
  if (klub.booking) {
    urovenHtml = `<p style="margin:0;font-family:${sans};font-size:15px;line-height:1.45;color:#e8dfc8;text-align:center;">${slevaNbsp(esc(t(klubBookingPodekovani5, l)))}</p>`;
  } else {
    const zlaty = klub.urovenNova
      ? `${esc(t(klubTimtoUrovniPred, l))} ${esc(klub.urovenNazev)}.`
      : `${esc(t(klubVaseUrovenPred, l))} ${esc(klub.urovenNazev)}.`;
    urovenHtml = `<p style="margin:0;font-family:${sans};font-size:15px;line-height:1.45;color:#e8dfc8;text-align:center;">${esc(t(klubZapocitali, l))}<br><span style="color:#c9a84c;font-weight:700;">${zlaty}</span></p>`;
  }
  let pruhHtml = '';
  if (klub.dalsiNazev && klub.chybiKc != null && klub.dalsiPct != null) {
    const text = vyplnSablonu(t(klubDoUrovneSablona, l), {
      nazev: klub.dalsiNazev,
      pct: klub.dalsiPct,
      kc: klub.chybiKc.toLocaleString('cs-CZ'),
    });
    const pctBar = Math.max(4, Math.min(100, Math.round(klub.pruhPct ?? 50)));
    pruhHtml = `<p style="margin:14px 0 6px;font-family:${sans};font-size:13px;color:#cbbba8;text-align:center;">${slevaNbsp(esc(text))}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 8px;"><tr><td style="background:#3d342a;border-radius:4px;height:8px;">
<table role="presentation" width="${pctBar}%" cellspacing="0" cellpadding="0"><tr><td style="background:#c9a84c;height:8px;border-radius:4px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr></table>`;
  } else if (!klub.dalsiNazev) {
    pruhHtml = `<p style="margin:14px 0 8px;font-family:${sans};font-size:13px;color:#cbbba8;text-align:center;">${esc(t(klubNejvyssiUroven, l))}</p>`;
  }
  const pod1 = `${t(klubRadek1PodPred, l)} ${klub.slevaPct} ${t(klubRadek1PodZa, l)}`;
  const vyhody = [
    radekVyhody(ikKal, t(klubRadek1Nadpis, l), pod1, '›', urlRez, sans),
    radekVyhody(ikDarek, t(klubRadek2Nadpis, l), t(klubRadek2Pod, l), '›', urlDop, sans),
    radekVyhody(ikTel, t(klubRadek3Nadpis, l), t(klubRadek3Pod, l), '›', urlPlo, sans),
  ].join('');
  return `
<tr><td style="padding:12px 24px 4px;"><div style="border-top:1px solid #3d342a;height:1px;font-size:0;">&nbsp;</div></td></tr>
<tr><td style="padding:14px 24px 8px;">${urovenHtml}</td></tr>
<tr><td style="padding:8px 24px 0;text-align:center;">
  <img src="${karticka}" width="520" alt="VIVIEN Klub" style="display:block;width:100%;max-width:520px;height:auto;border:0;margin:0 auto;border-radius:14px;">
  <div style="font-family:${serif};font-size:16px;color:#e8dfc8;padding-top:8px;">${esc(klub.jmeno)}</div>
</td></tr>
<tr><td style="padding:4px 24px 4px;">${pruhHtml}</td></tr>
<tr><td style="padding:10px 24px 4px;font-family:${serif};font-size:16px;font-style:italic;color:#e8dfc8;text-align:center;">${esc(t(klubPodekovaniUvod, l))}</td></tr>
<tr><td style="padding:4px 16px 8px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${vyhody}</table></td></tr>
<tr><td style="padding:10px 24px 6px;text-align:center;">
  <a href="${urlKarta}" style="display:inline-block;background:#c9a84c;color:#1a1510;font-family:${sans};font-size:16px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:22px;">${esc(t(klubOtevritKartu, l))}</a>
</td></tr>`;
}

/**
 * HTML e-mail po odjezdu: hlavička-jpg, 3 klikací řádky.
 * S `klub` přibude kartička PNG a tlačítko na kartu (PROMPT-PODEKOVANI-KLUB).
 * Obrázky vždy z ostré produkce.
 */
export function htmlPodekovaniEmail(
  lang: GuideLang | null,
  odkaz: string,
  _baseUrl?: string,
  odkazDoporucit?: string,
  odkazPlocha?: string,
  odkazRezervovat?: string,
  klub?: PodekovaniKlubEmail | null,
): string {
  const l = jazyk(lang);
  const asset = OSTRA_ASSET;
  const hlavicka = `${asset}/email/hlavicka-po-odjezdu.jpg`;
  const ikKal = `${asset}/email/ikona-kalendar.png`;
  const ikDarek = `${asset}/email/ikona-darek.png`;
  const ikTel = `${asset}/email/ikona-telefon.png`;
  const ikHovor = `${asset}/email/ikona-hovor.png`;
  const nadpis = esc(t(expiredNadpis, l));
  const dopis = slevaNbsp(esc(t(expiredDopis, l)));
  const podpis = esc(t(expiredPodpis, l));
  const uvod = esc(t(vyhodyUvod, l));
  const url = opravVerejnyOdkaz(odkaz.trim());
  const urlRez = opravVerejnyOdkaz(odkazRezervovat || odkazPoptavkaVernost(url)).replaceAll(
    '"',
    '%22',
  );
  const urlDop = opravVerejnyOdkaz(odkazDoporucit || `${url}#doporucit`).replaceAll('"', '%22');
  const urlPlo = opravVerejnyOdkaz(
    odkazPlocha || (klub ? klub.odkazKarty : `${url}${url.includes('?') ? '&' : '?'}plocha=1`),
  ).replaceAll('"', '%22');
  const serif = "Georgia,'Times New Roman',serif";
  const sans = "Arial,Helvetica,sans-serif";
  const kontakty = `<tr>${tlacitkoTelefonu(ikHovor, t(expiredZavolat, l), NIKOL_PHONE, sans)}${tlacitkoTelefonu(ikHovor, t(expiredZaloha, l), PARKING_OWNER_PHONE, sans)}</tr>`;

  const klubBlok = klub
    ? klubHtmlBlok(l, klub, asset, sans, serif, urlRez, urlDop, urlPlo, ikKal, ikDarek, ikTel)
    : '';
  const klasickeVyhody = klub
    ? ''
    : `<tr>
            <td style="padding:6px 24px 10px;font-family:${serif};font-size:16px;font-style:italic;color:#e8dfc8;text-align:center;">
              ${uvod}
            </td>
          </tr>
          <tr>
            <td style="padding:4px 16px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${[
                  radekVyhody(ikKal, t(radek1Nadpis, l), t(radek1Pod, l), t(radek1Tlacitko, l), urlRez, sans),
                  radekVyhody(ikDarek, t(radek2Nadpis, l), t(radek2Pod, l), t(radek2Tlacitko, l), urlDop, sans),
                  radekVyhody(ikTel, t(radek3Nadpis, l), t(radek3Pod, l), t(radek3Tlacitko, l), urlPlo, sans),
                ].join('')}
              </table>
            </td>
          </tr>`;

  return `<!DOCTYPE html>
<html lang="${l}">
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
              <h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:400;color:#c9a84c;">${nadpis}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 4px;font-family:${sans};font-size:16px;line-height:1.55;color:#e8dfc8;text-align:center;">
              ${dopis}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 24px 6px;font-family:${serif};font-size:18px;font-style:italic;color:#c9a84c;text-align:center;">
              ${podpis}
            </td>
          </tr>
          ${klasickeVyhody}
          ${klubBlok}
          <tr>
            <td style="padding:16px 20px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${kontakty}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 22px;font-family:${sans};font-size:12px;line-height:1.45;color:#8a7f72;text-align:center;">
              ${esc(textOdhlaseniEmail(l))}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
