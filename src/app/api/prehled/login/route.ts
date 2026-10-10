import { NextResponse } from 'next/server';
import {
  PREHLED_COOKIE,
  PREHLED_MAX_AGE_SEC,
  hesloSedí,
  loginPovolen,
  signSession,
  zapisNeuspesnyLogin,
} from '@/lib/admin-auth';

export const runtime = 'nodejs';

function ipZadosti(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || 'local';
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = ipZadosti(request);
  if (!loginPovolen(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Příliš mnoho pokusů. Zkuste to za 15 minut.' },
      { status: 429, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (!process.env.ADMIN_HESLO?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'V nastavení chybí ADMIN_HESLO.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const body = (await request.json().catch(() => null)) as { heslo?: string } | null;
  const heslo = typeof body?.heslo === 'string' ? body.heslo : '';
  if (!hesloSedí(heslo)) {
    zapisNeuspesnyLogin(ip);
    return NextResponse.json(
      { ok: false, error: 'Špatné heslo.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  res.cookies.set(PREHLED_COOKIE, signSession(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PREHLED_MAX_AGE_SEC,
  });
  return res;
}
