import { NextResponse } from 'next/server';
import { overDokladToken } from '@/lib/doklad-odkaz';
import { sestavHtmlDokladu } from '@/lib/doklad-sestav';
import { createProcessStore } from '@/lib/store';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token: raw } = await ctx.params;
  const token = decodeURIComponent(String(raw || '').trim());
  const over = overDokladToken(token);
  if (!over.ok) {
    const msg =
      over.reason === 'expired'
        ? 'Tento odkaz na doklad už neplatí. Napište nám na info@vivienapartments.cz.'
        : 'Odkaz na doklad není platný.';
    return new NextResponse(`<!DOCTYPE html><html lang="cs"><body><p>${msg}</p></body></html>`, {
      status: over.reason === 'expired' ? 410 : 400,
      headers: { ...noStore, 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const store = createProcessStore();
  const rec = await store.getRezervace(over.payload.r);
  if (!rec) {
    return new NextResponse(
      `<!DOCTYPE html><html lang="cs"><body><p>Doklad se nepodařilo najít.</p></body></html>`,
      { status: 404, headers: { ...noStore, 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  const origin = new URL(req.url).origin;
  const html = await sestavHtmlDokladu(rec, {
    typ: over.payload.typ,
    lang: over.payload.lang,
    odberatel: over.payload.odberatel,
    castka: over.payload.castka,
    bezHosta: over.payload.bezHosta === true,
    bezEmailu: over.payload.bezEmailu === true,
    bezPoznamky: over.payload.bezPoznamky === true,
    zpusobUhrady: over.payload.zpusobUhrady,
    logoUrl: `${origin}/pruvodce/va-logo-faktura.png`,
  });

  return new NextResponse(html, {
    status: 200,
    headers: { ...noStore, 'Content-Type': 'text/html; charset=utf-8' },
  });
}
