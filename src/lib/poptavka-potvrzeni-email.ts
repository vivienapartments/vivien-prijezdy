import { randomBytes } from 'crypto';
import { adresaKlub, OSTRA_ADRESA_ZALOHA } from './verejna-adresa';

const OSTRA_ASSET = OSTRA_ADRESA_ZALOHA;

/** Majitel 28. 11. 2026: verze 4 (box vedle sebe + telefon). */
export const POPTAVKA_EMAIL_VERZE_VYCHOZI = 4 as PoptavkaEmailVerze;

export type PoptavkaEmailVerze = 1 | 2 | 3 | 4;

function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function odstavceHtml(text: string, align: 'justify' | 'center' = 'justify'): string {
  return text
    .split(/\n\s*\n/)
    .map((blok) => blok.trim())
    .filter(Boolean)
    .map((blok) => {
      const vnitr = esc(blok).replaceAll('\n', '<br>');
      return `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#e8dfc8;text-align:${align};">${vnitr}</p>`;
    })
    .join('');
}

function souhrnBox(
  opts: { termin?: string; apartman?: string; cena?: string },
  sans: string,
  layout: 'sloupec' | 'rada',
): string {
  const polozky: { lab: string; val: string; zlata?: boolean }[] = [];
  if (opts.termin) polozky.push({ lab: 'Termín', val: opts.termin });
  if (opts.apartman) polozky.push({ lab: 'Apartmán', val: opts.apartman });
  if (opts.cena) polozky.push({ lab: 'Cena', val: opts.cena, zlata: true });
  if (!polozky.length) return '';

  if (layout === 'rada') {
    const bunky = polozky
      .map(
        (p, i) => `<td style="width:33%;vertical-align:top;padding:${i === 0 ? '0 8px 0 0' : i === polozky.length - 1 ? '0 0 0 8px' : '0 8px'};font-family:${sans};font-size:13px;line-height:1.4;text-align:center;">
        <div style="color:#b7aa98;margin-bottom:4px;">${esc(p.lab)}</div>
        <div style="color:${p.zlata ? '#c9a84c' : '#efe6d8'};font-size:15px;font-weight:700;">${esc(p.val)}</div>
      </td>`,
      )
      .join('');
    return `<tr><td style="padding:8px 20px 4px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#15110e;border:1px solid #3d342a;border-radius:10px;">
        <tr><td style="padding:14px 10px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${bunky}</tr></table></td></tr>
      </table>
    </td></tr>`;
  }

  const radky = polozky
    .map(
      (p, i) => `<div style="${i ? 'margin-top:12px;' : ''}">
      <span style="color:#b7aa98;font-size:13px;">${esc(p.lab)}</span><br>
      <strong style="color:${p.zlata ? '#c9a84c' : '#efe6d8'};font-size:16px;font-weight:700;">${esc(p.val)}</strong>
    </div>`,
    )
    .join('');
  return `<tr><td style="padding:10px 24px;font-family:${sans};line-height:1.45;">
    <div style="background:#15110e;border:1px solid #3d342a;border-radius:10px;padding:16px 18px;">${radky}</div>
  </td></tr>`;
}

/**
 * Hezký HTML mail potvrzení / NEJDE.
 * Fotka nese značku. Bez druhého loga + jména pod sebou.
 * Fakta (termín, apartmán, cena) jsou v boxu. Tělo je krátké, bez opakování.
 */
export function htmlZpravaPoptavkyHostovi(opts: {
  /** Předmět ve schránce (title). */
  predmet: string;
  /** Nadpis v mailu. Když chybí, vezme se z předmětu bez „VIVIEN Apartments, “. */
  nadpis?: string;
  text: string;
  jmeno?: string;
  termin?: string;
  apartman?: string;
  cena?: string;
  verze?: PoptavkaEmailVerze;
  telefonHostum?: string;
}): string {
  const verze = opts.verze ?? POPTAVKA_EMAIL_VERZE_VYCHOZI;
  const hlavicka = `${OSTRA_ASSET}/email/hlavicka-tip.jpg`;
  const serif = "Georgia,'Times New Roman',serif";
  const sans = 'Arial,Helvetica,sans-serif';
  const nadpis =
    (opts.nadpis || '').trim() ||
    opts.predmet.replace(/^\[TEST\]\s*/i, '').replace(/^VIVIEN Apartments,?\s*/i, '').trim() ||
    'Potvrzení termínu';

  const jmeno = (opts.jmeno || '').trim();
  const pozdravNadpis = jmeno ? `${esc(jmeno)},` : esc(nadpis);

  const radaVivien =
    verze === 2
      ? `<tr><td style="padding:16px 24px 0;font-family:${sans};text-align:center;font-size:12px;letter-spacing:0.14em;color:#c9a84c;text-transform:uppercase;">VIVIEN Apartments</td></tr>`
      : '';

  const nadpisBlok =
    verze === 3
      ? `<tr><td style="padding:20px 24px 4px;font-family:${serif};text-align:center;">
          <h1 style="margin:0;font-size:28px;line-height:1.25;font-weight:400;color:#c9a84c;">${pozdravNadpis}</h1>
          <div style="margin-top:8px;font-family:${sans};font-size:14px;color:#b7aa98;">${esc(nadpis)}</div>
        </td></tr>`
      : `<tr><td style="padding:${verze === 2 ? '10px' : '22px'} 24px 6px;font-family:${serif};text-align:center;">
          <h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:400;color:#c9a84c;">${esc(nadpis)}</h1>
        </td></tr>`;

  const layoutSouhrn = verze === 4 ? 'rada' : 'sloupec';
  /* Verze 4 má delší text: vlevo, ať e-mail neroztáhne mezery. */
  const textAlign = verze === 4 || verze === 2 ? 'left' : verze === 3 || verze === 1 ? 'center' : 'justify';

  const tel = (opts.telefonHostum || '+420 604 692 573').trim();
  const telHref = `tel:${tel.replace(/[^\d+]/g, '')}`;
  const telNbsp = esc(tel).replaceAll(' ', '&nbsp;');
  const telefonBlok =
    verze === 4
      ? `<tr><td style="padding:4px 24px 8px;font-family:${sans};font-size:15px;line-height:1.5;color:#b7aa98;text-align:center;">
          Napište nebo zavolejte<br>
          <a href="${telHref}" style="color:#c9a84c;text-decoration:none;white-space:nowrap;font-weight:700;">${telNbsp}</a>
        </td></tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.predmet)}</title></head>
<body style="margin:0;padding:0;background:#0d0b0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0d0b0a;">
    <tr>
      <td align="center" style="padding:16px 10px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#1c1712;border:1px solid #c9a84c;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:0;line-height:0;font-size:0;">
              <img src="${hlavicka}" width="560" alt="VIVIEN Apartments" style="display:block;width:100%;max-width:560px;height:auto;border:0;">
            </td>
          </tr>
          ${radaVivien}
          ${nadpisBlok}
          ${souhrnBox({ termin: opts.termin, apartman: opts.apartman, cena: opts.cena }, sans, layoutSouhrn)}
          <tr>
            <td style="padding:12px 24px 4px;">
              ${odstavceHtml(opts.text, textAlign)}
            </td>
          </tr>
          ${telefonBlok}
          <tr>
            <td style="padding:8px 24px 26px;font-family:${serif};font-size:16px;font-style:italic;color:#c9a84c;text-align:center;">
              Nikol a rodina VIVIEN
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function predmetPotvrzeniPoptavky(testMode: boolean): string {
  return testMode ? '[TEST] VIVIEN Apartments, potvrzení termínu' : 'VIVIEN Apartments, potvrzení termínu';
}

export function predmetNejdePoptavky(testMode: boolean): string {
  return testMode ? '[TEST] VIVIEN Apartments, termín' : 'VIVIEN Apartments, termín';
}

export function nadpisPotvrzeniPoptavky(): string {
  return 'Potvrzení termínu';
}

export function nadpisNejdePoptavky(): string {
  return 'K vašemu termínu';
}

/**
 * Tělo e-mailu potvrzení (verze 4). Fakta jsou v boxu.
 * Podpis „Nikol a rodina VIVIEN“ je v patičce šablony, sem ho nedáváme.
 * Text schválil majitel 28. 11. 2026.
 */
export function textPotvrzeniProEmail(krestni: string): string {
  const j = krestni.trim() || 'hosté';
  return (
    `Dobrý den, ${j},\n\n` +
    `s radostí potvrzujeme Vaši rezervaci ve VIVIEN Apartments.\n\n` +
    `Před příjezdem Vás ještě poprosíme o dokončení online check-inu. Jakmile jej vyplníte, automaticky Vám zašleme osobního příjezdového průvodce, ve kterém najdete všechny potřebné informace k pobytu.\n\n` +
    `Těšíme se na setkání s Vámi.`
  );
}

export function textNejdeProEmail(krestni: string, navrh: string): string {
  const j = krestni.trim();
  const pozdrav = j ? `Dobrý den, ${j},` : 'Dobrý den,';
  const n = navrh.trim();
  if (n) {
    return `${pozdrav}\n\nděkujeme za poptávku. Tento termín už bohužel nemáme volný. Můžeme nabídnout ${n}. Napište nám, jestli by vám to vyhovovalo.`;
  }
  return `${pozdrav}\n\nděkujeme za poptávku. Tento termín je bohužel už obsazený. Rádi najdeme jiný, stačí napsat, kdy by se vám hodilo.`;
}

export function novyPotvrzeniToken(): string {
  return randomBytes(16).toString('base64url');
}

export function odkazPotvrzeniPoptavky(token: string, base?: string): string {
  const root = (base || adresaKlub()).replace(/\/$/, '');
  return `${root}/poptavka/potvrzeni/${encodeURIComponent(token)}`;
}

/** Starý WhatsApp text + odkaz na hezkou stránku. */
export function textPotvrditSOdkazemNaStranku(zprava: string, url: string): string {
  const t = zprava.trim();
  const u = url.trim();
  if (!u) return t;
  return `${t}\n\n${u}`;
}
