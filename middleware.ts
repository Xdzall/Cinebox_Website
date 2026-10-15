import { NextResponse, type NextRequest } from 'next/server';
import { getAuthConfig, verifySessionToken, SESSION_COOKIE } from './lib/auth';

// Routes reachable without a session: the login page and the endpoints it calls.
const PUBLIC_PATHS = new Set(['/login', '/api/auth/login', '/api/auth/logout']);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const config = getAuthConfig();
  const authenticated = config ? await verifySessionToken(config, request.cookies.get(SESSION_COOKIE)?.value) : false;
  if (authenticated) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  if (pathname !== '/') loginUrl.searchParams.set('next', `${pathname}${search}`);
  const response = NextResponse.redirect(loginUrl);
  // Drop a stale or tampered cookie so the browser stops sending it.
  if (request.cookies.has(SESSION_COOKIE)) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  // Everything except Next.js build assets and the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
