// middleware-enhanced.ts - Enhanced middleware with observability
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateRequestId } from './src/lib/logger';

const PROTECTED_MATCHERS = [
  '/dashboard/:path*',
  '/contacts/:path*',
  '/companies/:path*',
  '/deals/:path*',
  '/files/:path*',
  '/tasks/:path*',
];

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
  const startTime = Date.now();
  const requestId = generateRequestId();
  const { pathname } = req.nextUrl;

  // Create response with observability headers
  const response = NextResponse.next();
  
  // Add correlation headers
  response.headers.set('X-Request-ID', requestId);
  response.headers.set('X-Response-Time', '0'); // Will be updated
  
  // Allow next internals and public files through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return response;
  }

  // Check if route is protected
  const isProtected = PROTECTED_MATCHERS.some((p) => {
    const base = p.replace('/:path*', '');
    return pathname === base || pathname.startsWith(base + '/');
  });

  if (!isProtected) {
    const duration = Date.now() - startTime;
    response.headers.set('X-Response-Time', duration.toString());
    
    // Log public route access
    logMiddlewareEvent({
      type: 'public_route_access',
      request_id: requestId,
      pathname,
      duration_ms: duration,
      user_agent: req.headers.get('user-agent') || 'unknown',
    });
    
    return response;
  }

  // Check authentication
  const cookies = req.cookies;
  let hasAuth = false;
  let authCookieName = '';
  
  for (const name of KNOWN_TOKEN_COOKIES) {
    const c = cookies.get(name);
    if (c && c.value) {
      hasAuth = true;
      authCookieName = name;
      break;
    }
  }

  const duration = Date.now() - startTime;

  if (!hasAuth) {
    // Log unauthorized access attempt
    logMiddlewareEvent({
      type: 'unauthorized_access',
      request_id: requestId,
      pathname,
      duration_ms: duration,
      user_agent: req.headers.get('user-agent') || 'unknown',
      redirect_to: '/login',
    });

    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Log successful authentication
  logMiddlewareEvent({
    type: 'authenticated_access',
    request_id: requestId,
    pathname,
    duration_ms: duration,
    auth_cookie: authCookieName,
    user_agent: req.headers.get('user-agent') || 'unknown',
  });

  response.headers.set('X-Response-Time', duration.toString());
  return response;
}

// Helper to log middleware events (structured JSON)
function logMiddlewareEvent(event: Record<string, any>): void {
  if (typeof window === 'undefined') {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'supacrm-middleware',
      environment: process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV,
      ...event,
    }));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
