/**
 * Čas příjezdu z přehledu. Majitel píše 1630 nebo 1800, uloží se 16:30.
 * Prázdné pole čas smaže.
 */
export function normalizujCasPrijezdu(
  vstup: string,
): { ok: true; cas: string | null } | { ok: false } {
  const surovy = vstup.trim();
  if (!surovy) return { ok: true, cas: null };
  const bezMezer = surovy.replace(/\s+/g, '').replace('.', ':');
  let hodiny = '';
  let minuty = '';
  if (/^\d{3,4}$/.test(bezMezer)) {
    minuty = bezMezer.slice(-2);
    hodiny = bezMezer.slice(0, -2);
  } else {
    const casti = /^(\d{1,2}):(\d{2})$/.exec(bezMezer);
    if (!casti) return { ok: false };
    hodiny = casti[1];
    minuty = casti[2];
  }
  const h = Number(hodiny);
  const m = Number(minuty);
  if (h > 23 || m > 59) return { ok: false };
  return { ok: true, cas: `${String(h).padStart(2, '0')}:${minuty}` };
}
