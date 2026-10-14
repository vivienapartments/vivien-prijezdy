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

/** Výzva k vyplnění check-inu. Není to hotový check-in s kódy. */
export function jeVyzvaCheckinu(subject: string): boolean {
  return /online check-in/i.test(subject);
}

function dekodujHref(raw: string): string {
  return raw
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

/** Skutečná adresa odkazu z HTML. Viditelný text odkazu se neukládá. */
export function odkazCheckinuZVyzvy(html: string, text = ''): string | null {
  const zdroj = html || text;
  const kotvy: { href: string; text: string }[] = [];
  const re = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(zdroj))) {
    const href = dekodujHref(m[1] || m[2] || '').replace(/[),.;]+$/, '');
    const napis = m[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^https:\/\//i.test(href)) kotvy.push({ href, text: napis });
  }
  const podleNapisu = kotvy.find((k) => /online\s*check-?\s*in/i.test(k.text) || /#\s*\d{4,}/.test(k.text));
  if (podleNapisu) return podleNapisu.href;
  const podleAdresy = kotvy.find((k) => /check-?in|onlinecheck/i.test(k.href));
  return podleAdresy?.href || null;
}

export function cisloZeSubjectu(subject: string): string | null {
  const m = subject.match(/(?:rezervace|reservation)\s+(\d{4,})/i);
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
