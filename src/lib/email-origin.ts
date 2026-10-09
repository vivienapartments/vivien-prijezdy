export type OriginInput = {
  from: string;
  authenticationResults?: string | null;
  body: string;
  bhKlic: string;
  majitelPreposilaZ: string;
};

export type OriginResult =
  | { ok: true; path: 1 | 2 }
  | { ok: false; reason: string };

function extractEmail(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

function domainOf(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1) : '';
}

function authPassForDomain(header: string | null | undefined, domain: string): boolean {
  if (!header) return false;
  const h = header.toLowerCase();
  const d = domain.toLowerCase();
  const dkim = h.includes('dkim=pass') && h.includes(d);
  const spf = h.includes('spf=pass') && h.includes(d);
  return dkim || spf;
}

function extractKlic(body: string): string | null {
  // BH často posílá HTML: <p>KLIC:hodnota</p> bez nových řádků.
  const text = body
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  const m = text.match(/\bKLIC\s*:\s*(\S+)/i);
  return m ? m[1].trim().replace(/&nbsp;/gi, '') : null;
}

export function verifyEmailOrigin(input: OriginInput): OriginResult {
  const fromEmail = extractEmail(input.from);
  const fromDomain = domainOf(fromEmail);
  const majitel = extractEmail(input.majitelPreposilaZ);
  const auth = input.authenticationResults ?? null;
  const klic = extractKlic(input.body);

  if (fromDomain === 'better-hotel.com' || fromDomain.endsWith('.better-hotel.com')) {
    if (!input.bhKlic) {
      return { ok: false, reason: 'Chybí BH_KLIC v env' };
    }
    if (!klic || klic !== input.bhKlic) {
      return { ok: false, reason: 'KLIC nesedí nebo chybí (cesta BH)' };
    }
    // Chybí-li hlavička, spoléhej na KLIC. Když je a neprojde, odmítni.
    if (auth && !authPassForDomain(auth, 'better-hotel.com')) {
      return { ok: false, reason: 'Authentication-Results neprošel pro better-hotel.com' };
    }
    return { ok: true, path: 1 };
  }

  if (fromEmail === majitel) {
    const majitelDomain = domainOf(majitel);
    // Chybí-li Authentication-Results (časté u Seznam IMAP), spoléhej na From.
    // Když hlavička je a neprojde, odmítni.
    if (auth && !authPassForDomain(auth, majitelDomain)) {
      return { ok: false, reason: 'Přeposlání bez platného SPF/DKIM majitele' };
    }
    if (klic && input.bhKlic && klic !== input.bhKlic) {
      return { ok: false, reason: 'KLIC u přeposlání nesedí' };
    }
    return { ok: true, path: 2 };
  }

  return { ok: false, reason: 'Neznámý odesílatel' };
}
