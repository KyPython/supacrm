import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected route patterns — adjust if your app uses different paths
const PROTECTED_MATCHERS = [
  '/dashboard/:path*',
  '/contacts/:path*',
  '/companies/:path*',
  '/deals/:path*',
  '/files/:path*',
  '/tasks/:path*',
];

// Common cookie names used by Supabase/clients. If your setup writes a
// different cookie name, add it here.
const KNOWN_TOKEN_COOKIES = [
  'sb:token',
  'sb-access-token',
  'supabase-auth-token',
  'supabase-session',
  '__Host-supabase-auth-token',
  'sb_access_token',
  'access_token',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow next internals and public files through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Only apply server-side redirect on configured protected routes
  const isProtected = PROTECTED_MATCHERS.some((p) => {
    // simple startsWith check for common pattern '/foo/:path*'
    const base = p.replace('/:path*', '');
    return pathname === base || pathname.startsWith(base + '/');
  });

  if (!isProtected) return NextResponse.next();

  // Look for any known auth cookie
  const cookies = req.cookies;
  let hasAuth = false;
  for (const name of KNOWN_TOKEN_COOKIES) {
    const c = cookies.get(name);
    if (c && c.value) {
      hasAuth = true;
      break;
    }
  }

  if (!hasAuth) {
    // Server-side redirect to /login avoids client-side router/RSC races
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    // preserve original path for optional post-login redirect
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: PROTECTED_MATCHERS,
};
