import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-config";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { createOAuth2Client } from '@/lib/oauth2Client';
import { storePKCEVerifier } from '@/lib/pkceStore';
import { getUserId } from "@/lib/auth";

/**
 * OAuth2 Authorization Endpoint
 * Initiates the OAuth2 Authorization Code Flow with PKCE
 *
 * Supports two authentication modes:
 * 1. Browser Mode:
 *    - NextAuth session provides ID token
 *    - Redirects to ConsentService with id_token_hint query parameter
 * 2. WebView Mode:
 *    - Authorization: Bearer header provides ID token (set by app)
 *    - Redirects to ConsentService with id_token_hint query parameter
 *
 * Both modes work identically (redirect to ConsentService with id_token_hint).
 * Only authentication source differs (session vs. bearer token).
 *
 * Flow:
 * 1. Check user authentication (NextAuth session or Bearer token)
 * 2. Extract ID Token
 * 3. Generate PKCE challenge + random state
 * 4. Store code verifier in MongoDB
 * 5. Redirect to ConsentService authorization URL with id_token_hint
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

    // Extract ID Token
    // Priority 1: Bearer Token (WebView Mode - the Bearer token IS the ID token)
    // Priority 2: NextAuth Session (Browser Mode)
    let idToken: string | null = null;

    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // WebView Mode: Bearer token is the ID token from Azure B2C
      idToken = authHeader.substring(7);
    } else {
      // Browser Mode: Get ID token from session
      const session: Session | null = await getServerSession(authOptions);
      idToken = (session as Session & { idToken?: string })?.idToken || null;
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
    const authorizationUrl = oauth2Client.getAuthorizationUrl(idToken, state, pkce);

    return NextResponse.redirect(authorizationUrl);

  } catch (error) {
    console.error('OAuth2 authorization failed:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to initiate OAuth2 flow" },
      { status: 500 }
    );
  }
}
