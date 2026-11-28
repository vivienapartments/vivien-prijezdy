import { adresaKlub, OSTRA_ADRESA_ZALOHA } from './verejna-adresa';
import {
  htmlZpravaPoptavkyHostovi,
  POPTAVKA_EMAIL_VERZE_VYCHOZI,
} from './poptavka-potvrzeni-email';

const OSTRA_ASSET = OSTRA_ADRESA_ZALOHA;

/** Odkaz na obecnou poptávku (5 % na první přímý pobyt). */
export function odkazObecnePoptavky(base?: string): string {
  const root = (base || adresaKlub()).replace(/\/$/, '');
  return `${root}/poptavka`;
}

/** Schválený text pozvánky k poptávce (28. 11. 2026). Odkaz se doplní při odeslání. */
export function textPozvankyPoptavky(odkaz: string): string {
  return [
    'Dobrý den,',
    '',
    'děkujeme za Váš zájem o ubytování ve VIVIEN Apartments.',
    '',
    'Zasíláme Vám odkaz na náš poptávkový formulář, ve kterém si můžete jednoduše vybrat požadovaný termín pobytu a zjistit jeho cenu.',
    '',
    'Na svůj první přímý pobyt u nás získáte 5 % slevu.',
    '',
    'Stačí vybrat termín a odeslat poptávku. My ji prověříme a následně se Vám ozveme s dalším postupem k dokončení rezervace.',
    '',
    odkaz,
    '',
    'Budeme se těšit na Vaši návštěvu.',
    '',
    'Nikol a rodina VIVIEN',
  ].join('\n');
}

/** Nadpis v mailu. Navazuje na pozdější „Potvrzení termínu“. */
export function nadpisPozvankyPoptavky(): string {
  return 'Poptávka termínu';
}

export function predmetPozvankyPoptavky(testMode: boolean): string {
  return testMode
    ? '[TEST] VIVIEN Apartments, poptávka termínu'
    : 'VIVIEN Apartments, poptávka termínu';
}

/**
 * Tělo HTML mailu (bez odkazu a podpisu). Odkaz je ve zlatém tlačítku.
 * Stejný obsah jako WhatsApp, jen bez surového URL.
 */
export function textPozvankyProEmail(): string {
  return [
    'Dobrý den,',
    '',
    'děkujeme za Váš zájem o ubytování ve VIVIEN Apartments.',
    '',
    'Zasíláme Vám odkaz na náš poptávkový formulář, ve kterém si můžete jednoduše vybrat požadovaný termín pobytu a zjistit jeho cenu.',
    '',
    'Stačí vybrat termín a odeslat poptávku. My ji prověříme a následně se Vám ozveme s dalším postupem k dokončení rezervace.',
    '',
    'Budeme se těšit na Vaši návštěvu.',
  ].join('\n');
}

export type PozvankaSlevaVerze = 1 | 2 | 3;
export type PozvankaKlubVerze = 1 | 2 | 3 | 4;

/** Text o Klubu (28. 11. 2026). Oddělený od slevy na první pobyt. */
export function textKlubuPozvanky(): {
  uvod: string;
  stred: string;
  zaver: string;
} {
  return {
    uvod: 'A první návštěvou naše společná cesta nekončí.',
    stred:
      'Po svém prvním pobytu získáte osobní kartu VIVIEN Klubu, se kterou budete mít při dalších přímých rezervacích výhodnější ceny.',
    zaver: 'Už od dalšího pobytu můžete využívat 5 % klubovou slevu.',
  };
}

/** Jak ukázat slevu na první přímý pobyt (bez „Výhoda“). Pořád 5 %, ne parametr procent. */
export function infoBoxSlevyPozvanky(
  verze: PozvankaSlevaVerze = 1,
): { lab: string; val: string } | null {
  if (verze === 1) {
    return { lab: '', val: '5 % sleva na první přímý pobyt' };
  }
  if (verze === 2) {
    return { lab: 'První přímý pobyt', val: '5 % sleva' };
  }
  return null;
}

function infoHtmlPrvniSlevy(slevaVerze: PozvankaSlevaVerze): string | null {
  if (slevaVerze !== 3) return null;
  return `<tr><td style="padding:8px 24px;font-family:Arial,Helvetica,sans-serif;">
    <div style="background:#15110e;border:1px solid #3d342a;border-radius:10px;padding:18px 16px;text-align:center;">
      <div style="color:#c9a84c;font-size:36px;line-height:1.1;font-weight:700;font-family:Georgia,'Times New Roman',serif;">5&nbsp;%</div>
      <div style="margin-top:8px;color:#efe6d8;font-size:16px;line-height:1.4;">sleva na první přímý pobyt</div>
    </div>
  </td></tr>`;
}

/** Nápisy na stříbrnou kartu (bez jména hosta, karta ještě není). */
export function napisyNaKartuPozvanky(): [string, string, string, string] {
  return [
    'Máte možnost se zapojit',
    'Po prvním pobytu vaše karta',
    'Výhody za další pobyty',
    'Společná cesta teprve začíná',
  ];
}

/**
 * Klasická kreditní velikost (340×196), stříbrný blank jako v poděkování.
 * Na podkladu už je VIVIEN CLUB. Druhý nápis Klub/CLUB sem nedáváme.
 */
function htmlKartickaPozvanky(napis: string): string {
  const blank = `${OSTRA_ASSET}/email/karticka-stribrny-web-blank.png`;
  const serif = "Georgia,'Times New Roman',serif";
  const w = 340;
  const h = 196;
  const n = napis
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  return `<table role="presentation" width="${w}" cellspacing="0" cellpadding="0" style="width:100%;max-width:${w}px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 13px 28px rgba(28,23,18,0.28);">
  <tr>
    <td background="${blank}" bgcolor="#c9ced4" width="${w}" height="${h}" valign="middle" style="width:${w}px;height:${h}px;background-image:url('${blank}');background-size:cover;background-position:center;background-repeat:no-repeat;border-radius:16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;height:${h}px;">
        <tr>
          <td width="36%" style="font-size:0;line-height:0;">&nbsp;</td>
          <td valign="middle" style="padding:36px 16px 22px 6px;text-align:right;color:#1c1712;">
            <div style="font-family:${serif};font-size:22px;line-height:1.15;font-weight:500;">${n}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/**
 * Čtyři verze: karta dole + krátký text o Klubu.
 * Hlavní CTA zůstává nahoře (Vybrat termín).
 */
export function htmlBlokKlubuPozvanky(verze: PozvankaKlubVerze = 1): string {
  const t = textKlubuPozvanky();
  const napisy = napisyNaKartuPozvanky();
  const sans = 'Arial,Helvetica,sans-serif';
  const serif = "Georgia,'Times New Roman',serif";
  const napis = napisy[verze - 1] || napisy[0];
  const karta = htmlKartickaPozvanky(napis);

  if (verze === 1) {
    return `<tr><td style="padding:8px 24px 4px;font-family:${sans};text-align:center;">
      <p style="margin:0 0 12px;font-family:${serif};font-size:15px;line-height:1.45;font-style:italic;color:#c9a84c;">${t.uvod}</p>
      ${karta}
    </td></tr>`;
  }

  if (verze === 2) {
    return `<tr><td style="padding:8px 24px 4px;font-family:${sans};text-align:center;">
      ${karta}
      <p style="margin:14px 0 0;font-size:15px;line-height:1.5;color:#e8dfc8;">${t.stred}</p>
    </td></tr>`;
  }

  if (verze === 3) {
    return `<tr><td style="padding:8px 24px 4px;font-family:${sans};text-align:center;">
      <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#cbbba8;">${t.stred}</p>
      ${karta}
    </td></tr>`;
  }

  /* Verze 4 (schváleno): úvod + karta. Bez věty o klubové slevě (první sleva už je nahoře). */
  return `<tr><td style="padding:8px 24px 2px;font-family:${sans};text-align:center;">
    <p style="margin:0 0 10px;font-family:${serif};font-size:16px;line-height:1.4;color:#c9a84c;">${t.uvod}</p>
    ${karta}
  </td></tr>`;
}

/** Majitel 28. 11. 2026: klub verze 4 (karta + úvod, bez klubové slevy v textu). */
export const POPTAVKA_POZVANKA_KLUB_VYCHOZI = 4 as PozvankaKlubVerze;

export type PozvankaFinalVerze = 1 | 2 | 3;

/** Stříbrný box první slevy (barva jako karta, ne zlato). */
function infoHtmlSlevaStribrna(final: PozvankaFinalVerze): string {
  const sans = 'Arial,Helvetica,sans-serif';
  const serif = "Georgia,'Times New Roman',serif";
  if (final === 1) {
    /* Plný stříbrný pruh jako karta. */
    return `<tr><td style="padding:8px 24px;font-family:${sans};">
      <div style="background:#c9ced4;border-radius:12px;padding:14px 16px;text-align:center;box-shadow:0 8px 20px rgba(28,23,18,0.25);">
        <div style="color:#1c1712;font-size:17px;line-height:1.35;font-weight:700;">5&nbsp;% sleva na první přímý pobyt</div>
      </div>
    </td></tr>`;
  }
  if (final === 2) {
    /* Tmavý box, stříbrný text. */
    return `<tr><td style="padding:8px 24px;font-family:${sans};">
      <div style="background:#15110e;border:1px solid #8a9098;border-radius:10px;padding:14px 16px;text-align:center;">
        <div style="color:#c9ced4;font-size:17px;line-height:1.35;font-weight:700;">5&nbsp;% sleva na první přímý pobyt</div>
      </div>
    </td></tr>`;
  }
  /* final 3: velké 5 % stříbrně. */
  return `<tr><td style="padding:8px 24px;font-family:${sans};">
    <div style="background:#15110e;border:1px solid #8a9098;border-radius:10px;padding:16px;text-align:center;">
      <div style="color:#c9ced4;font-size:34px;line-height:1.1;font-weight:700;font-family:${serif};">5&nbsp;%</div>
      <div style="margin-top:6px;color:#d5dae0;font-size:15px;line-height:1.4;">sleva na první přímý pobyt</div>
    </div>
  </td></tr>`;
}

function patickaPozvanky(final: PozvankaFinalVerze, telefon = '+420 604 692 573'): string {
  const sans = 'Arial,Helvetica,sans-serif';
  const serif = "Georgia,'Times New Roman',serif";
  const tel = telefon.trim();
  const telHref = `tel:${tel.replace(/[^\d+]/g, '')}`;
  const telNbsp = tel.replaceAll(' ', '&nbsp;');

  if (final === 1) {
    /* Jedna řádka: Zavolejte · číslo, podpis tiše. */
    return `<tr><td style="padding:18px 24px 6px;font-family:${sans};font-size:14px;line-height:1.45;color:#b7aa98;text-align:center;">
      Zavolejte
      <a href="${telHref}" style="color:#c9ced4;text-decoration:none;white-space:nowrap;font-weight:700;margin-left:6px;">${telNbsp}</a>
    </td></tr>
    <tr><td style="padding:6px 24px 24px;font-family:${serif};font-size:15px;font-style:italic;color:#8a7f72;text-align:center;">
      Nikol a rodina VIVIEN
    </td></tr>`;
  }
  if (final === 2) {
    /* Číslo velké stříbrné, podpis pod ním. */
    return `<tr><td style="padding:18px 24px 4px;font-family:${sans};text-align:center;">
      <a href="${telHref}" style="color:#c9ced4;text-decoration:none;white-space:nowrap;font-size:18px;font-weight:700;">${telNbsp}</a>
    </td></tr>
    <tr><td style="padding:8px 24px 24px;font-family:${serif};font-size:15px;font-style:italic;color:#b7aa98;text-align:center;">
      Nikol a rodina VIVIEN
    </td></tr>`;
  }
  /* final 3: Napište nebo zavolejte, číslo, podpis stříbrný. */
  return `<tr><td style="padding:16px 24px 2px;font-family:${sans};font-size:13px;line-height:1.4;color:#8a7f72;text-align:center;">
    Napište nebo zavolejte
  </td></tr>
  <tr><td style="padding:2px 24px 6px;font-family:${sans};text-align:center;">
    <a href="${telHref}" style="color:#c9ced4;text-decoration:none;white-space:nowrap;font-size:16px;font-weight:700;">${telNbsp}</a>
  </td></tr>
  <tr><td style="padding:8px 24px 24px;font-family:${serif};font-size:15px;font-style:italic;color:#c9ced4;text-align:center;">
    Nikol a rodina VIVIEN
  </td></tr>`;
}

/** Klubový blok pro finále: úvod stříbrně + karta 4. */
function htmlBlokKlubuFinal(): string {
  const t = textKlubuPozvanky();
  const napis = napisyNaKartuPozvanky()[3];
  const sans = 'Arial,Helvetica,sans-serif';
  const serif = "Georgia,'Times New Roman',serif";
  const karta = htmlKartickaPozvanky(napis);
  return `<tr><td style="padding:8px 24px 2px;font-family:${sans};text-align:center;">
    <p style="margin:0 0 10px;font-family:${serif};font-size:16px;line-height:1.4;color:#c9ced4;">${t.uvod}</p>
    ${karta}
  </td></tr>`;
}

/**
 * Tři finální vzhledy pozvánky: stříbrná sleva + karta + učesaná patička.
 * Zlato zůstává hlavně u nadpisu a tlačítka.
 */
export function htmlPozvankaPoptavkyFinal(
  odkaz?: string,
  final: PozvankaFinalVerze = 3,
): string {
  const url = (odkaz || odkazObecnePoptavky()).trim();
  return htmlZpravaPoptavkyHostovi({
    predmet: predmetPozvankyPoptavky(false),
    nadpis: nadpisPozvankyPoptavky(),
    text: textPozvankyProEmail(),
    infoBox: null,
    infoHtml: infoHtmlSlevaStribrna(final),
    tlacitko: {
      text: 'Vybrat termín ›',
      url,
    },
    poTlacitkuHtml: htmlBlokKlubuFinal(),
    patickaHtml: patickaPozvanky(final),
    verze: POPTAVKA_EMAIL_VERZE_VYCHOZI,
  });
}

/** Ostré odesílání / výchozí: finále 3 (velké 5 %, Napište nebo zavolejte). */
export function htmlPozvankaPoptavky(
  odkaz?: string,
  slevaVerze: PozvankaSlevaVerze = 1,
  klubVerze: PozvankaKlubVerze = POPTAVKA_POZVANKA_KLUB_VYCHOZI,
  finalVerze?: PozvankaFinalVerze,
): string {
  if (finalVerze) {
    return htmlPozvankaPoptavkyFinal(odkaz, finalVerze);
  }
  /* Bez final = finální vzhled 3 (stříbrná sleva + karta 4). */
  if (klubVerze === POPTAVKA_POZVANKA_KLUB_VYCHOZI && slevaVerze === 1) {
    return htmlPozvankaPoptavkyFinal(odkaz, 3);
  }
  const url = (odkaz || odkazObecnePoptavky()).trim();
  const infoHtml = infoHtmlPrvniSlevy(slevaVerze);
  const info = infoHtml ? null : infoBoxSlevyPozvanky(slevaVerze);
  return htmlZpravaPoptavkyHostovi({
    predmet: predmetPozvankyPoptavky(false),
    nadpis: nadpisPozvankyPoptavky(),
    text: textPozvankyProEmail(),
    infoBox: info,
    infoHtml,
    tlacitko: {
      text: 'Vybrat termín ›',
      url,
    },
    poTlacitkuHtml: htmlBlokKlubuPozvanky(klubVerze),
    verze: POPTAVKA_EMAIL_VERZE_VYCHOZI,
  });
}
