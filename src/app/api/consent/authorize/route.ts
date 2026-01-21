import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-config";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { createOAuth2Client } from '@/lib/oauth2Client';
import { storePKCEVerifier } from '@/lib/pkceStore';
import { getUserId } from "@/lib/auth";

/**
 * Decode JWT token payload (without verification)
 * Returns null if token is malformed
 */
function decodeJWT(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;

  // exp is in seconds, Date.now() is in milliseconds
  // Add 60 second buffer to ensure token is still valid during consent flow
  return Date.now() >= (payload.exp - 60) * 1000;
}

/**
 * OAuth2 Authorization Endpoint
 * Initiates the OAuth2 Authorization Code Flow with PKCE
 *
 * Supports two authentication modes:
 * 1. Browser Mode:
 *    - NextAuth session provides ID token
 *    - Redirects to ConsentService with id_token_hint query parameter
 *    - Full UI (with AppBar, Footer, Logout button)
 * 2. WebView Mode:
 *    - Authorization: Bearer header provides ID token (set by app)
 *    - Redirects to ConsentService with id_token_hint query parameter + is_webview=true
 *    - Minimal UI (transparent background, no AppBar/Footer)
 *
 * Both modes use identical OAuth2 flow (redirect to ConsentService with id_token_hint).
 * Only authentication source differs (session vs. bearer token).
 * UI mode is determined by is_webview query parameter.
 *
 * Flow:
 * 1. Check user authentication (NextAuth session or Bearer token)
 * 2. Extract ID Token and detect mode (Browser vs WebView)
 * 3. Validate ID Token expiration (Browser Mode only):
 *    - If expired: Automatically refresh using Azure B2C refresh token
 *    - If refresh fails: Return error with logout suggestion
 *    - If refresh succeeds: Continue with new ID token
 * 4. Generate PKCE challenge + random state
 * 5. Store code verifier in MongoDB
 * 6. Redirect to ConsentService authorization URL with id_token_hint (+ is_webview if WebView mode)
 */
export async function GET(req: Request) {
  try {
    // Check user authentication
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please login first" },
        { status: 401 }
      );
    }

    // Extract ID Token and determine mode
    // Priority 1: Bearer Token (WebView Mode - the Bearer token IS the ID token)
    // Priority 2: NextAuth Session (Browser Mode)
    let idToken: string | null = null;
    let isWebView = false;

    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // WebView Mode: Bearer token is the ID token from Azure B2C
      idToken = authHeader.substring(7);
      isWebView = true; // Request from VREEDA App
    } else {
      // Browser Mode: Get ID token from session and check validity
      let session: Session | null = await getServerSession(authOptions);

      // Check if session has refresh error (token refresh failed)
      if (session?.error === 'RefreshAccessTokenError') {
        const errorUrl = new URL('/auth-error', req.url);
        errorUrl.searchParams.set('message', 'Your session has expired and could not be refreshed.');
        errorUrl.searchParams.set('action', 'logout_required');
        return NextResponse.redirect(errorUrl);
      }

      idToken = (session as Session & { idToken?: string })?.idToken || null;

      // Check if ID token is expired
      if (idToken && isTokenExpired(idToken)) {
        console.log('[Consent Authorize] ID Token expired, triggering refresh...');

        // Force NextAuth to refresh the token by getting a fresh session
        // This will trigger the jwt() callback which checks expiration and refreshes
        session = await getServerSession(authOptions);

        // Check again if refresh worked
        if (session?.error === 'RefreshAccessTokenError') {
          const errorUrl = new URL('/auth-error', req.url);
          errorUrl.searchParams.set('message', 'Your session has expired and could not be refreshed.');
          errorUrl.searchParams.set('action', 'logout_required');
          return NextResponse.redirect(errorUrl);
        }

        idToken = (session as Session & { idToken?: string })?.idToken || null;

        // Verify token is now valid
        if (!idToken || isTokenExpired(idToken)) {
          const errorUrl = new URL('/auth-error', req.url);
          errorUrl.searchParams.set('message', 'Failed to obtain a valid ID token.');
          errorUrl.searchParams.set('action', 'logout_required');
          return NextResponse.redirect(errorUrl);
        }

        console.log('[Consent Authorize] ID Token successfully refreshed');
      }

      isWebView = false; // Request from browser
    }

    if (!idToken) {
      return NextResponse.json(
        { error: "ID Token not found. Please authenticate with Azure B2C." },
        { status: 400 }
      );
    }

    // Create OAuth2 client
    const oauth2Client = createOAuth2Client();

    // Generate PKCE challenge (S256 method)
    const pkce = oauth2Client.generatePKCEChallenge();

    // Store PKCE code verifier in MongoDB (returns random state value)
    const state = await storePKCEVerifier(pkce.codeVerifier);

    // Build authorization URL with id_token_hint and redirect
    // Both Browser and WebView modes use id_token_hint query parameter
    // Pass isWebView parameter to determine UI mode (minimal vs full UI)
    const authorizationUrl = oauth2Client.getAuthorizationUrl(idToken, state, pkce, isWebView);

    return NextResponse.redirect(authorizationUrl);

  } catch (error) {
    console.error('OAuth2 authorization failed:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to initiate OAuth2 flow" },
      { status: 500 }
    );
  }
}
