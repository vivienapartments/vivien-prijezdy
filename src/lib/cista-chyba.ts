/** Text chyby na kontrolní stránku. Heslo ani adresa schránky tam nepatří. */
export function cistaChyba(raw: string): string {
  return raw
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, 'schránka')
    .replace(/\b(pass|password|heslo|token)\b\s*[:=]\s*\S+/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}
