/** Úkol na kartě hosta, na který má upozornění skočit. */
export type UkolUpozorneni = 'brana' | 'potvrzeni' | 'doklady';

/** Odkaz do přehledu na konkrétní kartu a volitelný úkol. */
export function odkazKarty(
  id: string,
  ukol?: UkolUpozorneni | null,
  opts?: { prani?: string | null },
): string {
  const cislo = encodeURIComponent(id);
  const base = `/prehled#${cislo}`;
  if (opts?.prani) return `${base}?prani=${encodeURIComponent(opts.prani)}`;
  if (ukol === 'doklady') return `${base}?zprava=doklady`;
  if (ukol === 'brana' || ukol === 'potvrzeni') return `${base}?ukol=${ukol}`;
  return base;
}

function queryZUrl(url: string): string {
  const raw = (url || '').trim();
  if (!raw) return '';
  const hash = raw.includes('#') ? raw.slice(raw.indexOf('#') + 1) : '';
  const qHash = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const predHash = raw.split('#')[0] || '';
  const qPred = predHash.includes('?') ? predHash.slice(predHash.indexOf('?') + 1) : '';
  return [qHash, qPred].filter(Boolean).join('&');
}

/** Z `?zprava=doklady` v hashi nebo query (odkaz z upozornění). */
export function zpravaZUpozorneniUrl(url: string): string | null {
  const m = queryZUrl(url).match(/(?:^|&)zprava=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Z `?ukol=brana` / potvrzeni, nebo zprava=doklady → doklady. */
export function ukolZUpozorneniUrl(url: string): UkolUpozorneni | null {
  const q = queryZUrl(url);
  const m = q.match(/(?:^|&)ukol=(brana|potvrzeni|doklady)\b/);
  if (m) return m[1] as UkolUpozorneni;
  if (zpravaZUpozorneniUrl(url) === 'doklady') return 'doklady';
  return null;
}
