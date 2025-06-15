import { NextResponse, type NextRequest } from 'next/server';
import { API_BASE_URL } from './lib/constants';

async function verifyToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  // 인증이 필요없는 경로들
  if (pathname.startsWith('/login') || 
      pathname.startsWith('/register') ||
      pathname.startsWith('/api/files') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/sitemap') ||
      pathname.startsWith('/robots')) {
    return NextResponse.next();
  }

  console.log(`[Middleware] Checking auth for: ${pathname}`);

  // 토큰 확인
  const cookieToken = request.cookies.get('auth_token')?.value;
  const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const token = cookieToken || headerToken;

  console.log(`[Middleware] Cookie token exists: ${!!cookieToken}`);
  console.log(`[Middleware] Header token exists: ${!!headerToken}`);
  console.log(`[Middleware] Final token exists: ${!!token}`);

  if (!token) {
    console.log(`[Middleware] No token found, redirecting to login`);
    const redirectUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(
      new URL(`/login?redirectUrl=${redirectUrl}`, request.url),
    );
  }

  // 토큰 검증
  console.log(`[Middleware] Verifying token...`);
  const isValid = await verifyToken(token);
  console.log(`[Middleware] Token valid: ${isValid}`);
  
  if (!isValid) {
    console.log(`[Middleware] Invalid token, redirecting to login`);
    const redirectUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(
      new URL(`/login?redirectUrl=${redirectUrl}`, request.url),
    );
  }

  console.log(`[Middleware] Auth successful for: ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/chat/:id',
    '/api/:path*',

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|login|register).*)',
  ],
};
