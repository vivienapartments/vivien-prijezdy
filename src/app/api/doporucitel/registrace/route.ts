import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store' };

/**
 * Otevřená registrace je vypnutá.
 * Doporučitel vzniká jen z pozvánky v přehledu → vyplnění → vaše schválení.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      duvod: 'pozvanka',
      hlaska: 'Nové karty zakládáme jen z pozvánky. Požádejte VIVIEN o odkaz.',
    },
    { status: 403, headers: noStore },
  );
}
