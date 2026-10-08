import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');

  if (process.env.NODE_ENV === 'production' && request.nextUrl.pathname.startsWith('/nahled')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
