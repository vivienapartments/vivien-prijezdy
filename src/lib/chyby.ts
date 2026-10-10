export type ChybaKod =
  | 'chybi_blok'
  | 'chybi_email'
  | 'spatny_email'
  | 'neznamy_apartman'
  | 'spatne_datum'
  | 'odjezd_pred_prijezdem'
  | 'chybi_osoby'
  | 'noci_nesedi'
  | 'nedoveryhodny_odesilatel'
  | 'chybi_pin'
  | 'smtp_chyba'
  | 'nedoruceno';

export type Duvod = { kod: ChybaKod; veta: string };

const VETY: Record<ChybaKod, string> = {
  chybi_blok: 'E-mail neobsahuje blok VIVIEN-DATA. Zkontrolujte šablonu v Better Hotelu.',
  chybi_email: 'Host nemá vyplněný e-mail.',
  spatny_email: 'E-mail hosta má špatný tvar: „…“.',
  neznamy_apartman: 'Neznámý název apartmánu: „…“.',
  spatne_datum: 'Datum příjezdu nebo odjezdu je ve špatném tvaru.',
  odjezd_pred_prijezdem: 'Odjezd je dřív než příjezd.',
  chybi_osoby: 'Chybí počet osob, poplatek je bez částky.',
  noci_nesedi: 'Počet nocí nesedí s daty. Použijí se data.',
  nedoveryhodny_odesilatel: 'E-mail nepřišel od Better Hotelu nebo nesedí KLIC.',
  chybi_pin:
    'V e-mailu z Better Hotelu chybí PIN apartmánu. Doplňte ho v BH a klikněte na Odeslat znovu, nebo ho zadejte v Opravit a odeslat.',
  smtp_chyba: 'E-mail se nepodařilo odeslat (chyba serveru). Zkusí se znovu při dalším běhu, nejvýš 3×.',
  nedoruceno: 'E-mail se vrátil jako nedoručitelný: „…“.',
};

const VYHRADA = new Set<ChybaKod>(['chybi_osoby', 'noci_nesedi']);

export function jeVyhrada(kod: ChybaKod): boolean {
  return VYHRADA.has(kod);
}

export function jeBlokujici(kod: ChybaKod): boolean {
  return !jeVyhrada(kod);
}

function detailNebo(detail: string | undefined, max = 80): string {
  const s = (detail || '').replace(/\s+/g, ' ').trim();
  if (!s) return '…';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export function duvod(kod: ChybaKod, detail?: string): Duvod {
  if (kod === 'spatny_email') {
    return { kod, veta: `E-mail hosta má špatný tvar: „${detailNebo(detail)}“.` };
  }
  if (kod === 'neznamy_apartman') {
    return { kod, veta: `Neznámý název apartmánu: „${detailNebo(detail, 60)}“.` };
  }
  if (kod === 'nedoruceno') {
    return { kod, veta: `E-mail se vrátil jako nedoručitelný: „${detailNebo(detail, 160)}“.` };
  }
  return { kod, veta: VETY[kod] };
}

/** Překlep domény, který má tvar e-mailu, ale nedoručí se. */
const PREKLEP_DOMENY = new Set([
  'gmial.com',
  'gmal.com',
  'gamil.com',
  'gnail.com',
  'gamil.cz',
  'seznam.con',
  'seznam.czz',
  'email.czz',
]);

export function problemEmailu(raw: string): 'chybi' | 'spatny' | null {
  const s = raw.trim();
  if (!s) return 'chybi';
  const m = s.match(/[^\s<>"]+@[^\s<>"]+/);
  const email = (m ? m[0] : s).replace(/[.,;]+$/, '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'spatny';
  const domain = email.split('@')[1]?.toLowerCase() || '';
  if (!domain.includes('.') || PREKLEP_DOMENY.has(domain)) return 'spatny';
  return null;
}
