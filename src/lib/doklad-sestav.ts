import apartmanyJson from '@/data/apartmany.json';
import {
  htmlDokladuSQr,
  sestavDokladZRezervace,
  type JazykDokladu,
  type OdberatelDokladu,
  type TypDokladu,
} from './faktura-doklad';
import type { RezervaceRecord } from './store';
import type { AptId } from './types';

type AptRow = { id: AptId; nazev: { cs: string; en: string } };
const apartmany = (apartmanyJson as { apartmany: AptRow[] }).apartmany;

function nazevApartmanu(id: AptId | null, lang: JazykDokladu): string {
  if (!id) return '';
  const apt = apartmany.find((a) => a.id === id);
  if (!apt) return id;
  return lang === 'cs' ? apt.nazev.cs : apt.nazev.en;
}

export async function sestavHtmlDokladu(
  rec: RezervaceRecord,
  opts: {
    typ: TypDokladu;
    lang: JazykDokladu;
    odberatel: OdberatelDokladu;
    castka?: number;
    vystaveno?: string;
    splatnost?: string;
    bezHosta?: boolean;
    bezEmailu?: boolean;
    bezPoznamky?: boolean;
    poznamkaDokladu?: string | null;
    logoUrl: string;
  },
): Promise<string> {
  const jeDen = (raw?: string) => (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined);
  const doklad = sestavDokladZRezervace(rec, {
    typ: opts.typ,
    lang: opts.lang,
    odberatel: opts.odberatel,
    bezHosta: opts.bezHosta === true,
    bezEmailu: opts.bezEmailu === true,
    bezPoznamky: opts.bezPoznamky === true,
    poznamkaDokladu: opts.poznamkaDokladu,
    cenaPobytu: opts.castka,
    vystaveno: jeDen(opts.vystaveno),
    splatnost: jeDen(opts.splatnost),
    apartmanNazev: nazevApartmanu(rec.apartman, opts.lang),
    logoUrl: opts.logoUrl,
  });
  return htmlDokladuSQr(doklad);
}
