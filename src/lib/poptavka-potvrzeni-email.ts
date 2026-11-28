import { OSTRA_ADRESA_ZALOHA } from './verejna-adresa';

const OSTRA_ASSET = OSTRA_ADRESA_ZALOHA;

function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function odstavceHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((blok) => blok.trim())
    .filter(Boolean)
    .map((blok) => {
      const vnitr = esc(blok).replaceAll('\n', '<br>');
      return `<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#e8dfc8;text-align:justify;">${vnitr}</p>`;
    })
    .join('');
}

/** Hezký HTML mail s potvrzením (nebo NEJDE) poptávky. */
export function htmlZpravaPoptavkyHostovi(opts: {
  predmet: string;
  text: string;
  jmeno?: string;
  termin?: string;
  apartman?: string;
  cena?: string;
}): string {
  const hlavicka = `${OSTRA_ASSET}/email/hlavicka-tip.jpg`;
  const logo = `${OSTRA_ASSET}/pruvodce/va-logo-192.png`;
  const serif = "Georgia,'Times New Roman',serif";
  const sans = 'Arial,Helvetica,sans-serif';
  const radkySouhrn: string[] = [];
  if (opts.termin) radkySouhrn.push(`<div><span style="color:#b7aa98;">Termín</span><br><strong style="color:#efe6d8;">${esc(opts.termin)}</strong></div>`);
  if (opts.apartman) radkySouhrn.push(`<div style="margin-top:10px;"><span style="color:#b7aa98;">Apartmán</span><br><strong style="color:#efe6d8;">${esc(opts.apartman)}</strong></div>`);
  if (opts.cena) radkySouhrn.push(`<div style="margin-top:10px;"><span style="color:#b7aa98;">Cena</span><br><strong style="color:#c9a84c;">${esc(opts.cena)}</strong></div>`);

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
          <tr>
            <td style="padding:18px 24px 6px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="${logo}" width="40" height="40" alt="" style="display:block;border-radius:50%;border:0;">
                  </td>
                  <td style="vertical-align:middle;font-family:${sans};">
                    <div style="color:#c9a84c;font-size:15px;font-weight:700;">VIVIEN Apartments</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 24px 6px;font-family:${serif};text-align:center;">
              <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:400;color:#c9a84c;">${esc(opts.predmet)}</h1>
            </td>
          </tr>
          ${
            radkySouhrn.length
              ? `<tr><td style="padding:12px 24px;font-family:${sans};font-size:15px;line-height:1.45;">
              <div style="background:#15110e;border:1px solid #3d342a;border-radius:10px;padding:14px 16px;">${radkySouhrn.join('')}</div>
            </td></tr>`
              : ''
          }
          <tr>
            <td style="padding:8px 24px 8px;">
              ${odstavceHtml(opts.text)}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 28px;font-family:${sans};font-size:14px;line-height:1.45;color:#b7aa98;">
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
