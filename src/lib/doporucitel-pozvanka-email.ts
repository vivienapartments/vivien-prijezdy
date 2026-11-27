import { OSTRA_ADRESA_ZALOHA } from './verejna-adresa';

const OSTRA_ASSET = OSTRA_ADRESA_ZALOHA;

function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** HTML pozvánka doporučitele (fotka + zlaté tlačítko). Stejná stránka jako odkaz z WhatsAppu. */
export function htmlPozvankaDoporucitele(odkaz: string): string {
  const hlavicka = `${OSTRA_ASSET}/email/hlavicka-tip.jpg`;
  const logo = `${OSTRA_ASSET}/pruvodce/va-logo-192.png`;
  const serif = "Georgia,'Times New Roman',serif";
  const sans = 'Arial,Helvetica,sans-serif';
  const url = odkaz.trim().replaceAll('"', '%22');

  return `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Doporučení VIVIEN</title></head>
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
              <h1 style="margin:0;font-size:26px;line-height:1.3;font-weight:400;color:#c9a84c;">Doporučení VIVIEN</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 4px;font-family:${sans};font-size:16px;line-height:1.55;color:#e8dfc8;text-align:left;">
              Dobrý den,
            </td>
          </tr>
          <tr>
            <td style="padding:4px 24px 8px;font-family:${sans};font-size:16px;line-height:1.55;color:#e8dfc8;text-align:justify;">
              děkujeme, že chcete doporučovat apartmány VIVIEN. Klepněte na tlačítko a vyplňte o sobě údaje. Pak vám pošleme vaši kartu s odkazem pro vaše klienty.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 24px 12px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background:#c9a84c;border-radius:28px;">
                    <a href="${url}" style="display:inline-block;padding:13px 26px;font-family:${sans};font-size:16px;line-height:1.3;color:#1a1510;text-decoration:none;border-radius:28px;font-weight:700;">Vyplnit údaje ›</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 28px;font-family:${sans};font-size:13px;line-height:1.45;color:#b7aa98;text-align:center;">
              Když tlačítko nejde, otevřete odkaz v prohlížeči:<br>
              <span style="color:#c9a84c;word-break:break-all;">${esc(odkaz)}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function textPozvankaDoporucitele(odkaz: string): string {
  return [
    'Dobrý den,',
    '',
    'děkujeme, že chcete doporučovat apartmány VIVIEN. Klepněte na odkaz a vyplňte o sobě údaje. Pak vám pošleme vaši kartu s odkazem pro vaše klienty.',
    '',
    odkaz,
    '',
    'S pozdravem',
    'VIVIEN Apartments',
  ].join('\n');
}

export function predmetPozvankaDoporucitele(testMode: boolean): string {
  return testMode ? '[TEST] Doporučení VIVIEN' : 'Doporučení VIVIEN';
}

/** Po schválení: odkaz na hotovou kartu. */
export function htmlKartaDoporuciteleSchvalena(jmeno: string, odkazKarta: string): string {
  const hlavicka = `${OSTRA_ASSET}/email/hlavicka-tip.jpg`;
  const serif = "Georgia,'Times New Roman',serif";
  const sans = 'Arial,Helvetica,sans-serif';
  const url = odkazKarta.trim().replaceAll('"', '%22');
  const kdo = esc(jmeno.trim() || 'Dobrý den');

  return `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vaše karta VIVIEN Club</title></head>
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
            <td style="padding:22px 24px 8px;font-family:${serif};text-align:center;">
              <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:400;color:#c9a84c;">Vaše karta je připravená</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 4px;font-family:${sans};font-size:16px;line-height:1.55;color:#e8dfc8;text-align:left;">
              Dobrý den, ${kdo},
            </td>
          </tr>
          <tr>
            <td style="padding:4px 24px 8px;font-family:${sans};font-size:16px;line-height:1.55;color:#e8dfc8;text-align:justify;">
              schválili jsme vás jako doporučitele. Klepněte na tlačítko a otevřete svou kartu. Na ní najdete odkaz pro vaše klienty.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 24px 12px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background:#c9a84c;border-radius:28px;">
                    <a href="${url}" style="display:inline-block;padding:13px 26px;font-family:${sans};font-size:16px;line-height:1.3;color:#1a1510;text-decoration:none;border-radius:28px;font-weight:700;">Otevřít kartu ›</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 28px;font-family:${sans};font-size:13px;line-height:1.45;color:#b7aa98;text-align:center;">
              Když tlačítko nejde:<br>
              <span style="color:#c9a84c;word-break:break-all;">${esc(odkazKarta)}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function textKartaDoporuciteleSchvalena(jmeno: string, odkazKarta: string): string {
  return [
    `Dobrý den, ${jmeno.trim() || ''},`.trim(),
    '',
    'schválili jsme vás jako doporučitele. Tady je odkaz na vaši kartu:',
    odkazKarta,
    '',
    'S pozdravem',
    'VIVIEN Apartments',
  ].join('\n');
}
