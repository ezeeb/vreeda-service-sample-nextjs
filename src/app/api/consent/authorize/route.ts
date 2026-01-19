import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { createOAuth2Client } from '@/lib/oauth2Client';
import { storePKCEVerifier } from '@/lib/pkceStore';

/**
 * OAuth2 Authorization Endpoint
 * Initiates the OAuth2 Authorization Code Flow with PKCE
 *
 * Flow:
 * 1. Check user authentication (NextAuth session)
 * 2. Extract ID Token from session
 * 3. Generate PKCE challenge + random state
 * 4. Store code verifier in MongoDB (via PKCE store)
 * 5. Redirect user to ConsentService /connect/authorize
 */
export async function GET() {
  try {
    // Check user authentication
    const session: Session | null = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Please login first" },
        { status: 401 }
      );
    }

    // Extract ID Token from session (stored by NextAuth callbacks)
    const idToken = (session as Session & { idToken?: string }).idToken;
    if (!idToken) {
      return NextResponse.json(
        { error: "ID Token not found in session" },
        { status: 400 }
      );
    }

    // Create OAuth2 client
    const oauth2Client = createOAuth2Client();

    // Generate PKCE challenge (S256 method)
    const pkce = oauth2Client.generatePKCEChallenge();

    // Store PKCE code verifier in MongoDB (returns random state value)
    const state = await storePKCEVerifier(pkce.codeVerifier);

    // Build authorization URL with id_token_hint query parameter
    const authorizationUrl = oauth2Client.getAuthorizationUrl(idToken, state, pkce);

    // Redirect user to ConsentService
    return NextResponse.redirect(authorizationUrl);

  } catch (error) {
    console.error('OAuth2 authorization failed:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to initiate OAuth2 flow" },
      { status: 500 }
    );
  }
}
