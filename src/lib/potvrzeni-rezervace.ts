import { radkyZTela } from './bh-interni';
import { parseCzechDate } from './dates';
import type { DoplnekRezervace } from './rezervace-rucne';
import { aptZTextu } from './vivien-data';

const LABELY = [
  'jméno a příjmení',
  'jméno',
  'klient',
  'guest name',
  'name',
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
  return /potvrzen[ií]\s+rezervace/i.test(subject);
}

function radky(subject: string, html: string, text: string): string[] {
  return radkyZTela(html, `${subject}\n${text}`).map((line) => line.replace(/^(>\s*)+/, '').trim()).filter(Boolean);
}

function jeLabel(line: string): boolean {
  const low = line.toLowerCase().replace(/:$/, '');
  return LABELY.includes(low);
}

function najdi(lines: string[], labels: string[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const low = line.toLowerCase();
    for (const label of labels) {
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

function datum(raw: string | null): string | null {
  if (!raw) return null;
  const primo = parseCzechDate(raw.replace(/\s+/g, ''));
  if (primo) return primo;
  const m = raw.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
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
  const lines = radky(subject, html, text);
  const zeSubjectu = (subject.match(/rezervace\s+(\d{4,})/i) || [])[1] || null;
  const jmenoZeSubjectu = (subject.match(/rezervace\s+\d{4,}\s*,\s*(.+?)\s*:\s*potvrzen/i) || [])[1]?.trim() || null;
  const zTela = (najdi(lines, ['číslo rezervace', 'rezervace', 'reservation']) || '').match(/(\d{4,})/);
  const rezervace = zeSubjectu || (zTela ? zTela[1] : '');
  const jmeno = najdi(lines, ['jméno a příjmení', 'jméno', 'klient', 'guest name', 'name']) || jmenoZeSubjectu;
  const email = najdi(lines, ['e-mail', 'email']);
  const telefon = najdi(lines, ['telefon', 'phone']);
  const prijezd = datum(najdi(lines, ['příjezd', 'prijezd', 'arrival', 'check-in']));
  const odjezd = datum(najdi(lines, ['odjezd', 'departure', 'check-out']));
  const ubytovani = najdi(lines, ['typ ubytování', 'ubytování', 'pokoj', 'apartmán', 'accommodation', 'room']);
  const apartman = aptZTextu(ubytovani);
  const osob = celeCislo(najdi(lines, ['počet osob', 'počet hostů', 'guests']));
  const noci = celeCislo(najdi(lines, ['počet nocí', 'nocí', 'nights']));
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
