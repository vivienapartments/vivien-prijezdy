import apartmanyJson from '@/data/apartmany.json';
import { terminKratky, terminText } from './prehled';
import type { RezervaceRecord } from './store';

type AptRow = { id: string; nazev: { cs: string } };
const apartmany = (apartmanyJson as { apartmany: AptRow[] }).apartmany;

export type VizitkaSoubor = {
  /** ASCII název, ať ho starší telefon přijme. */
  soubor: string;
  /** Název s diakritikou pro novější telefon. */
  souborUtf: string;
  telo: string;
};

function escapeVCard(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\r\n|\n|\r/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

function cislice(s: string): string {
  return s.replace(/\D/g, '');
}

/** Upravený tvar +předvolbačíslo. Nejisté číslo zůstane, jak je uložené. */
function telProVizitku(ulozeny: string | null): string | null {
  const raw = (ulozeny || '').trim();
  if (!raw) return null;
  const compact = raw.replace(/[\s()./\\\-–—]/g, '');
  if (/^\+\d{8,15}$/.test(compact)) return compact;
  if (/^\d{8,15}$/.test(compact)) return `+${compact}`;
  return raw;
}

function nazevApartmanu(id: string | null): string {
  if (!id) return '';
  const a = apartmany.find((x) => x.id === id);
  return a ? `${a.nazev.cs} (${id})` : id;
}

function jmenoKontaktu(rec: RezervaceRecord): string {
  const jmeno = (rec.jmeno || '').trim() || rec.rezervace;
  const casti = [jmeno];
  if (rec.apartman) casti.push(rec.apartman);
  const termin = terminKratky(rec.prijezd, rec.odjezd);
  if (termin) casti.push(termin);
  return casti.join(' · ');
}

/** Celý text je křestní jméno. Příjmení necháváme prázdné, ať ho telefon nedá na další řádek. */
function poleN(text: string): string {
  return `;${escapeVCard(text)};;;`;
}

function telefony(rec: RezervaceRecord): string[] {
  const hlavni = telProVizitku(rec.telefon);
  const druhy = telProVizitku(rec.telefonRezervace);
  const vysledek: string[] = [];
  if (hlavni) vysledek.push(hlavni);
  if (druhy && cislice(druhy) !== cislice(hlavni || '')) vysledek.push(druhy);
  if (!vysledek.length && druhy) vysledek.push(druhy);
  return vysledek;
}

function emailHosta(rec: RezervaceRecord): string | null {
  const email = (rec.emailHosta || '').trim();
  if (!email || !email.includes('@')) return null;
  return email;
}

function nazvySouboru(zobrazeni: string): { soubor: string; souborUtf: string } {
  const zaklad = zobrazeni.replace(/[. ]+$/g, '');
  const souborUtf = `${zaklad}.vcf`;
  const ascii = zaklad
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[^A-Za-z0-9. -]+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .replace(/\s+/g, '-');
  return { soubor: `${ascii || 'kontakt'}.vcf`, souborUtf };
}

/** vCard 3.0. Null, když host nemá žádný telefon. Nikam se neukládá. */
export function sestavVizitku(rec: RezervaceRecord): VizitkaSoubor | null {
  const cisla = telefony(rec);
  if (!cisla.length) return null;

  const fn = jmenoKontaktu(rec);
  const poznamka = [nazevApartmanu(rec.apartman), terminText(rec.prijezd, rec.odjezd), `#${rec.rezervace}`]
    .filter(Boolean)
    .map((cast) => escapeVCard(cast))
    .join('\\n');
  const radky = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${poleN(fn)}`,
    `FN:${escapeVCard(fn)}`,
    ...cisla.map((tel) => `TEL;TYPE=CELL:${tel}`),
  ];
  const email = emailHosta(rec);
  if (email) radky.push(`EMAIL:${escapeVCard(email)}`);
  radky.push(`NOTE:${poznamka}`);
  radky.push('END:VCARD');

  return { ...nazvySouboru(fn), telo: `${radky.join('\r\n')}\r\n` };
}
