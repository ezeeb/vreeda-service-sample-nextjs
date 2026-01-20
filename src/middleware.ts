import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to detect WebView mode based on Authorization header
 *
 * If a Bearer token is present, it's WebView mode (app sends tokens)
 * If no Bearer token, it's Browser mode (NextAuth uses cookies)
 *
 * Sets a cookie that can be read both server-side and client-side
 */
export function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const isWebView = authHeader?.startsWith('Bearer ');

  const response = NextResponse.next();

  // Set cookie to indicate WebView mode
  if (isWebView) {
    response.cookies.set('x-vreeda-webview', 'true', {
      path: '/',
      sameSite: 'strict',
      // Don't set httpOnly so client can read it
      httpOnly: false,
    });
  } else {
    // Remove cookie in Browser mode
    response.cookies.delete('x-vreeda-webview');
  }

  return response;
}

// Run middleware on all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
