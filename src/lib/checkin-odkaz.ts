/** Prázdné pole odkaz smaže. Jinak jen odkaz, který začíná https://. */
export function zkontrolujCheckinOdkaz(raw: string): { ok: true; url: string | null } | { ok: false } {
  const s = raw.trim();
  if (!s) return { ok: true, url: null };
  if (!/^https:\/\//i.test(s)) return { ok: false };
  return { ok: true, url: s };
}
