/** Počet nocí z příjezdu a odjezdu (YYYY-MM-DD). Odjezd musí být po příjezdu. */
export function nightsBetween(arrivalYmd: string, departureYmd: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(arrivalYmd) || !/^\d{4}-\d{2}-\d{2}$/.test(departureYmd)) {
    return null;
  }
  const [ay, am, ad] = arrivalYmd.split('-').map(Number);
  const [dy, dm, dd] = departureYmd.split('-').map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const d = Date.UTC(dy, dm - 1, dd);
  const diff = Math.round((d - a) / 86_400_000);
  return diff > 0 ? diff : null;
}

/** d.m.rrrr → YYYY-MM-DD */
export function parseCzechDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
