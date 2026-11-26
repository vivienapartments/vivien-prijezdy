/** Termín pro kartu klubu: „01.–05. 06. 2026“ (dny a měsíce s nulou). */

const APT_CS: Record<string, string> = {
  V1: 'Jemná harmonie',
  V2: 'Zlatá rovnováha',
  V3: 'Večerní elegance',
  V4: 'Ušlechtilý kontrast',
  V5: 'Pohodlí v tlumených tónech',
};

function dd(n: number): string {
  return String(n).padStart(2, '0');
}

export function nazevApartmanuCs(apt: string | null | undefined): string {
  const id = String(apt || '').trim().toUpperCase();
  return APT_CS[id] || (apt || 'Apartmán');
}

export function formatTerminKlub(prijezd: string, odjezd: string): string {
  const a = (prijezd || '').slice(0, 10);
  const b = (odjezd || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a)) return '';
  const d1 = Number(a.slice(8, 10));
  const m1 = Number(a.slice(5, 7));
  const y1 = Number(a.slice(0, 4));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b)) return `${dd(d1)}. ${dd(m1)}. ${y1}`;
  const d2 = Number(b.slice(8, 10));
  const m2 = Number(b.slice(5, 7));
  const y2 = Number(b.slice(0, 4));
  if (y1 === y2 && m1 === m2) return `${dd(d1)}.–${dd(d2)}. ${dd(m1)}. ${y1}`;
  if (y1 === y2) return `${dd(d1)}. ${dd(m1)}. – ${dd(d2)}. ${dd(m2)}. ${y1}`;
  return `${dd(d1)}. ${dd(m1)}. ${y1} – ${dd(d2)}. ${dd(m2)}. ${y2}`;
}

export function nadpisPobytuKlub(
  prijezd: string,
  odjezd: string,
  apt: string | null | undefined,
  castkaKc?: number | null,
): string {
  const termin = formatTerminKlub(prijezd, odjezd);
  const nazev = nazevApartmanuCs(apt);
  const cast =
    typeof castkaKc === 'number' && castkaKc > 0
      ? ` · ${castkaKc.toLocaleString('cs-CZ')} Kč`
      : '';
  return termin ? `${termin} · ${nazev}${cast}` : nazev;
}
