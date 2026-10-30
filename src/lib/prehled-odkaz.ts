/** Z `?zprava=doklady` v hashi nebo query (odkaz z upozornění). */
export function zpravaZUpozorneniUrl(url: string): string | null {
  const raw = (url || '').trim();
  if (!raw) return null;
  const hash = raw.includes('#') ? raw.slice(raw.indexOf('#') + 1) : '';
  const qHash = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const mHash = qHash.match(/(?:^|&)zprava=([^&]+)/);
  if (mHash) return decodeURIComponent(mHash[1]);
  const predHash = raw.split('#')[0] || '';
  const m = predHash.match(/[?&]zprava=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
