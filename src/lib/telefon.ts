export type TelefonUlozeny = {
  /** Jak se číslo uloží. Buď +420…, nebo původní text, když tvar neznáme. */
  ulozeny: string;
  /** Číslice pro wa.me, bez plus. Když tlačítko nemá být, null. */
  wa: string | null;
};

function jePrazdnyMerge(s: string): boolean {
  return /^\(?\s*GUEST_?PHONE\s*\)?$/i.test(s) || s === '—' || s === '-' || s === '–';
}

/** GUEST_PHONE z Better Hotelu. Prázdné pole je null. Neznámý tvar se uloží, jak je, bez tlačítka. */
export function normalizujTelefon(raw: string | null | undefined): TelefonUlozeny | null {
  const trimmed = (raw || '').trim().replace(/\s+/g, ' ');
  if (!trimmed || jePrazdnyMerge(trimmed)) return null;

  const compact = trimmed.replace(/[\s()./-]/g, '');
  let digits = compact;
  let plus = false;
  if (digits.startsWith('+')) {
    plus = true;
    digits = digits.slice(1);
  } else if (digits.startsWith('00')) {
    plus = true;
    digits = digits.slice(2);
  }

  if (!/^\d+$/.test(digits)) return { ulozeny: trimmed, wa: null };

  if (!plus && digits.length === 9 && /^[67]/.test(digits)) {
    plus = true;
    digits = `420${digits}`;
  } else if (!plus && digits.startsWith('420') && digits.length === 12) {
    plus = true;
  }

  if (plus && digits.length >= 8 && digits.length <= 15) {
    return { ulozeny: `+${digits}`, wa: digits };
  }
  return { ulozeny: trimmed, wa: null };
}

/** Čitelné číslo do přehledu. Na dva řádky se lámat nesmí. */
export function textTelefonu(ulozeny: string): string {
  const m = ulozeny.match(/^\+(\d+)$/);
  if (!m) return ulozeny;
  const d = m[1];
  if (d.startsWith('420') && d.length === 12) {
    const n = d.slice(3);
    return `+420 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  }
  if (d.startsWith('49') && d.length >= 11 && d.length <= 15) {
    return `+49 ${d.slice(2)}`;
  }
  return `+${d}`;
}
