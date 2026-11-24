import { tokenPoplatku } from './poplatek';
import { createToken } from './token';
import { sendGuestEmail } from './email-host';
import type { RezervaceRecord } from './store';
import { adresaPrujezd } from './verejna-adresa';

function baseUrl(): string {
  const lokalne = (process.env.PRUVODCE_BASE_URL || '').trim();
  if (lokalne.includes('127.0.0.1') || lokalne.includes('localhost')) {
    return lokalne.replace(/\/$/, '') || 'http://127.0.0.1:3000';
  }
  return adresaPrujezd();
}

export function odkazNaPruvodce(rec: RezervaceRecord): string | null {
  if (!rec.apartman || !rec.prijezd || !rec.odjezd || !rec.jazyk) return null;
  const token = createToken({
    r: rec.rezervace,
    a: rec.apartman,
    p: rec.prijezd,
    d: rec.odjezd,
    o: rec.osob ?? undefined,
    l: rec.jazyk,
    i: rec.accessPin ?? undefined,
    f: tokenPoplatku(rec.poplatek),
  });
  return `${baseUrl()}/${token}`;
}

export async function posliPruvodce(
  rec: RezervaceRecord,
  jmenoDoPozdravu?: string | null,
): Promise<{ messageId?: string }> {
  if (!rec.emailHosta || !rec.apartman || !rec.prijezd || !rec.odjezd || !rec.jazyk) {
    throw new Error('Chybí údaje pro odeslání');
  }
  const url = odkazNaPruvodce(rec);
  if (!url) throw new Error('Chybí údaje pro odkaz');
  return sendGuestEmail({
    input: {
      lang: rec.jazyk,
      apt: rec.apartman,
      prijezd: rec.prijezd,
      odjezd: rec.odjezd,
      noci: rec.noci,
      osob: rec.osob,
      osloveni: null,
      jmeno: jmenoDoPozdravu ?? null,
      narodnost: rec.narodnost,
      guideUrl: url,
      intendedTo: rec.emailHosta,
    },
  });
}
