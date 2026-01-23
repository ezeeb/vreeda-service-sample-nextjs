import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-config";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { createOAuth2Client } from '@/lib/oauth2Client';
import { storePKCEVerifier } from '@/lib/pkceStore';
import { getUserId, isTokenExpired } from "@/lib/auth";

/**
 * OAuth2 Authorization Endpoint
 * Initiates the OAuth2 Authorization Code Flow with PKCE
 *
 * Supports two authentication modes:
 * 1. Browser Mode:
 *    - NextAuth session provides ID token (auto-refreshed by jwt() callback)
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
 * Token Refresh (Browser Mode):
 * - The jwt() callback in auth-config.ts automatically refreshes expired tokens
 * - No manual refresh logic needed in this endpoint
 *
 * Flow:
 * 1. Check user authentication (NextAuth session or Bearer token)
 * 2. Extract ID Token and detect mode (Browser vs WebView)
 * 3. Validate ID Token is present and valid
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
      // Browser Mode: Get ID token from session
      // The jwt() callback in auth-config.ts automatically refreshes expired tokens
      const session: Session | null = await getServerSession(authOptions);

      // Check if session has refresh error (token refresh failed)
      if (session?.error === 'RefreshAccessTokenError') {
        const errorUrl = new URL('/auth-error', req.url);
        errorUrl.searchParams.set('message', 'Your session has expired and could not be refreshed.');
        errorUrl.searchParams.set('action', 'logout_required');
        return NextResponse.redirect(errorUrl);
      }

      idToken = (session as Session & { idToken?: string })?.idToken || null;

      // Sanity check: Verify ID token is valid
      // This should never happen as jwt() callback already handles refresh
      if (idToken && isTokenExpired(idToken, 60)) {
        console.error('[Consent Authorize] ID Token expired despite refresh - this should not happen');
        const errorUrl = new URL('/auth-error', req.url);
        errorUrl.searchParams.set('message', 'Failed to obtain a valid ID token.');
        errorUrl.searchParams.set('action', 'logout_required');
        return NextResponse.redirect(errorUrl);
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
