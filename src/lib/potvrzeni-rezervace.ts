import { radkyZTela } from './bh-interni';
import { parseCzechDate } from './dates';
import type { DoplnekRezervace } from './rezervace-rucne';
import { aptZTextu } from './vivien-data';

const LABELY = [
  'rezervace na jméno',
  'jméno a příjmení',
  'jméno',
  'klient',
  'guest name',
  'booking name',
  'name',
  'datum příjezdu',
  'arrival date',
  'datum odjezdu',
  'departure date',
  'accommodation type',
  'počet hostů',
  'number of guests',
  'number of nights',
  'reservation number',
  'e-mail',
  'email',
  'telefon',
  'phone',
  'příjezd',
  'prijezd',
  'arrival',
  'odjezd',
  'departure',
  'typ ubytování',
  'ubytování',
  'pokoj',
  'apartmán',
  'accommodation',
  'room',
  'počet nocí',
  'nocí',
  'nights',
  'počet osob',
  'počet hostů',
  'guests',
  'rezervace',
  'číslo rezervace',
  'reservation',
];

export function jePotvrzeniPredmet(subject: string): boolean {
  return /potvrzen[ií]\s+rezervace/i.test(subject) || /reservation\s+confirmation/i.test(subject);
}

function srovnejPomlcky(s: string): string {
  return s.replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-');
}

/** Výzva k vyplnění check-inu. Není to hotový check-in s kódy. Čeština i angličtina. */
export function jeVyzvaCheckinu(subject: string): boolean {
  return /online check-in/i.test(srovnejPomlcky(subject));
}

function dekodujHref(raw: string): string {
  return raw
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

function cistyOdkaz(raw: string): string {
  return dekodujHref(raw).replace(/[),.;]+$/, '').trim();
}

function hostOdkazu(href: string): string {
  try {
    return new URL(href).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Web, obrázek a logo se jako odkaz na check-in neberou. */
function beremeOdkaz(href: string, napis = ''): boolean {
  if (!/^https:\/\//i.test(href)) return false;
  const host = hostOdkazu(href);
  if (!host) return false;
  if (host === 'vivienapartments.cz' || host.endsWith('.vivienapartments.cz')) return false;
  if (/\.(png|jpe?g|gif|webp|svg|ico)(\?|$)/i.test(href)) return false;
  if (/\/logo/i.test(href) || /\blogo\b/i.test(napis)) return false;
  return true;
}

type Kotva = { href: string; text: string };

function kotvyZHtml(zdroj: string): Kotva[] {
  const kotvy: Kotva[] = [];
  const re = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(zdroj))) {
    const href = cistyOdkaz(m[1] || m[2] || '');
    const napis = m[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (href) kotvy.push({ href, text: napis });
  }
  return kotvy;
}

function volneOdkazy(zdroj: string): string[] {
  const bezTagu = zdroj.replace(/<[^>]+>/g, ' ');
  const out: string[] = [];
  const re = /https:\/\/[^\s<>"']+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bezTagu))) {
    const href = cistyOdkaz(m[0]);
    if (href) out.push(href);
  }
  return out;
}

/**
 * Věta, za kterou Better Hotel dává odkaz. Čeština je z ostré výzvy.
 * Anglická je předmět výzvy, když se objeví v těle, a věta se stejným smyslem.
 */
const VETY_ODKAZU = [
  /odkaz pro vypln[eě]n[ií]\s+najdete zde/i,
  /your online check-in\s*[-–—]\s*required to receive access/i,
  /you(?:'ll| will)? find the link[^.]{0,80}?here/i,
  /the link[^.]{0,80}?can be found here/i,
];

function textSAdresami(zdroj: string): string {
  return zdroj
    .replace(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>/gi, (_, a: string, b: string) => ` ${cistyOdkaz(a || b || '')} `)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

function odkazZaVetou(zdroj: string): string | null {
  const text = textSAdresami(zdroj);
  let od = -1;
  for (const veta of VETY_ODKAZU) {
    const m = veta.exec(text);
    if (m && (od < 0 || m.index < od)) od = m.index + m[0].length;
  }
  if (od < 0) return null;
  const re = /https:\/\/[^\s<>"']+/gi;
  re.lastIndex = od;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > od + 500) return null;
    const href = cistyOdkaz(m[0]);
    if (beremeOdkaz(href)) return href;
  }
  return null;
}

function jeMev(href: string): boolean {
  const host = hostOdkazu(href);
  return host === 'mev.im' || host.endsWith('.mev.im');
}

/** Skutečná adresa odkazu. Viditelný text odkazu se neukládá. */
export function odkazCheckinuZVyzvy(html: string, text = ''): string | null {
  const zdroj = `${html}\n${text}`;
  const kotvy = kotvyZHtml(html || text);
  const podleNapisu = kotvy.find(
    (k) => beremeOdkaz(k.href, k.text) && (/online\s*check-?\s*in/i.test(k.text) || /#\s*\d{4,}/.test(k.text)),
  );
  if (podleNapisu) return podleNapisu.href;

  const vsechny = [...kotvy.map((k) => k.href), ...volneOdkazy(zdroj)];
  const mev = vsechny.find((href) => beremeOdkaz(href) && jeMev(href));
  if (mev) return mev;

  const podleAdresy = vsechny.find((href) => beremeOdkaz(href) && /check-?in|onlinecheck/i.test(href));
  if (podleAdresy) return podleAdresy;

  return odkazZaVetou(zdroj);
}

export function cisloZeSubjectu(subject: string): string | null {
  const s = srovnejPomlcky(subject);
  const m = s.match(/(?:rezervace|reservation)\s*(?:no\.?|č\.|#|:)?\s*#?\s*(\d{4,})/i);
  return m ? m[1] : null;
}

/** Číslo z předmětu, nebo z textu odkazu „#120260xxx / online checkin“. */
export function cisloZVyzvy(subject: string, html = '', text = ''): string | null {
  const zeSubjectu = cisloZeSubjectu(subject);
  if (zeSubjectu) return zeSubjectu;
  const m = `${html}\n${text}`.match(/#\s*(\d{4,})/);
  return m ? m[1] : null;
}

function radky(html: string, text: string): string[] {
  const zHtml = html ? radkyZTela(html, '') : [];
  const zText = text ? radkyZTela('', text) : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of [...zHtml, ...zText]) {
    const ciste = line.replace(/^(>\s*)+/, '').trim();
    if (!ciste || seen.has(ciste)) continue;
    seen.add(ciste);
    out.push(ciste);
  }
  return out;
}

function jeLabel(line: string): boolean {
  const low = line.toLowerCase().replace(/:$/, '');
  return LABELY.includes(low);
}

function najdi(lines: string[], labels: string[]): string | null {
  const serazene = [...labels].sort((a, b) => b.length - a.length);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const low = line.toLowerCase();
    for (const label of serazene) {
      if (low === label || low === `${label}:`) {
        const next = lines[i + 1];
        if (next && !jeLabel(next)) return next.replace(/:$/, '').trim();
      }
      const uvod = `${label}:`;
      if (low.startsWith(uvod)) {
        const val = line.slice(label.length + 1).trim();
        if (val && !jeLabel(val)) return val;
      }
    }
  }
  return null;
}

/** Název ubytování z předmětu. Do jména hosta se nikdy neukládá. */
export function jmenoUbytovaniZeSubjectu(subject: string): string | null {
  const m = subject.match(
    /(?:rezervace|reservation)\s+\d{4,}\s*,\s*(.+?)\s*:\s*(?:potvrzen|reservation\s+confirmation)/i,
  );
  const j = m?.[1]?.replace(/\s+/g, ' ').trim();
  return j || null;
}

/** Špatně přečtené jméno: v předmětu je název ubytování, ne host. */
export function jeSpatneJmenoPotvrzeni(jmeno: string | null | undefined, subject = ''): boolean {
  const j = (jmeno || '').replace(/\s+/g, ' ').trim();
  if (!j) return false;
  if (/vivien apartmen/i.test(j) && /atmosphere/i.test(j)) return true;
  const u = jmenoUbytovaniZeSubjectu(subject);
  return Boolean(u && j.toLowerCase() === u.toLowerCase());
}

function datum(raw: string | null): string | null {
  if (!raw) return null;
  const bezMezer = raw.replace(/\s+/g, '');
  const primo = parseCzechDate(bezMezer) || parseCzechDate(bezMezer.replace(/\//g, '.'));
  if (primo) return primo;
  const m = raw.match(/(\d{1,2})\s*[./]\s*(\d{1,2})\s*[./]\s*(\d{4})/);
  return m ? parseCzechDate(`${m[1]}.${m[2]}.${m[3]}`) : null;
}

function celeCislo(raw: string | null): number | null {
  if (!raw) return null;
  const m = raw.match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return n > 0 ? n : null;
}

/** Potvrzení rezervace z Better Hotelu. Co chybí, zůstane prázdné a je v `chybi`. */
export function parsujPotvrzeni(subject: string, html = '', text = ''): (DoplnekRezervace & { chybi: string[] }) | null {
  if (!jePotvrzeniPredmet(subject)) return null;
  const lines = radky(html, text);
  const zeSubjectu = cisloZeSubjectu(subject);
  const zTela = (najdi(lines, ['číslo rezervace', 'reservation number', 'rezervace', 'reservation']) || '').match(/(\d{4,})/);
  const rezervace = zeSubjectu || (zTela ? zTela[1] : '');
  const jmeno = najdi(lines, [
    'rezervace na jméno',
    'jméno a příjmení',
    'booking name',
    'guest name',
    'jméno',
    'klient',
    'name',
  ]);
  const email = najdi(lines, ['e-mail', 'email']);
  const telefon = najdi(lines, ['telefon', 'phone']);
  const prijezd = datum(najdi(lines, ['datum příjezdu', 'arrival date', 'příjezd', 'prijezd', 'arrival', 'check-in']));
  const odjezd = datum(najdi(lines, ['datum odjezdu', 'departure date', 'odjezd', 'departure', 'check-out']));
  const ubytovani = najdi(lines, ['typ ubytování', 'accommodation type', 'ubytování', 'apartmán', 'accommodation', 'pokoj', 'room']);
  const apartman = aptZTextu(ubytovani);
  const osob = celeCislo(najdi(lines, ['počet hostů', 'number of guests', 'počet osob', 'guests', 'persons']));
  const noci = celeCislo(najdi(lines, ['počet nocí', 'number of nights', 'nights', 'nocí']));
  const chybi: string[] = [];
  if (!jmeno) chybi.push('jméno');
  if (!telefon || !/\d/.test(telefon)) chybi.push('telefon');
  if (!apartman) chybi.push('apartmán');
  if (!prijezd) chybi.push('příjezd');
  if (!odjezd) chybi.push('odjezd');

  return {
    rezervace,
    jmeno,
    email: email && /@/.test(email) ? email : null,
    telefon: telefon && /\d/.test(telefon) ? telefon : null,
    apartman,
    prijezd,
    odjezd,
    osob,
    noci,
    chybi,
  };
}
