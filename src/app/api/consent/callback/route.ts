import { NextRequest, NextResponse } from "next/server";
import { createOAuth2Client } from '@/lib/oauth2Client';
import { retrievePKCEVerifier } from '@/lib/pkceStore';
import connectToDatabase from '@/lib/mongodb';
import UserContext from '@/models/UserContext';
import { getUserId } from "@/lib/auth";

/**
 * OAuth2 Callback Endpoint
 * Handles the OAuth2 Authorization Code callback from ConsentService
 *
 * Flow:
 * 1. Extract authorization code + state from query parameters
 * 2. Retrieve PKCE code verifier from MongoDB (via state)
 * 3. Exchange authorization code for access + refresh tokens
 * 4. Store tokens in UserContext (MongoDB)
 * 5. PKCE state is automatically deleted by retrievePKCEVerifier
 * 6. Redirect to home page (App detects homeUrl and navigates to Home Screen)
 *
 * Note: This endpoint is part of the OAuth2 browser flow and typically
 * requires a NextAuth session. Bearer token authentication is supported
 * but unusual for callback scenarios.
 */
export async function GET(req: NextRequest) {
  // Get base URL for redirects (ngrok-aware)
  const baseUrl = process.env.NEXTAUTH_URL || req.url;

  try {

    // Check user authentication
    const userId = await getUserId(req);
    if (!userId) {
      console.error('OAuth2 callback: No user ID found');
      return NextResponse.redirect(
        new URL('/api/auth/signin', baseUrl)
      );
    }

    // Extract query parameters
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth2 errors (user denied consent, etc.)
    if (error) {
      console.error('OAuth2 callback error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/?error=${error}&error_description=${errorDescription}`, baseUrl)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('OAuth2 callback: Missing code or state parameter');
      return NextResponse.json(
        { error: "Missing code or state parameter" },
        { status: 400 }
      );
    }

    // Retrieve PKCE code verifier from MongoDB (atomic find-and-delete)
    const codeVerifier = await retrievePKCEVerifier(state);
    if (!codeVerifier) {
      console.error('OAuth2 callback: Invalid or expired state parameter');
      return NextResponse.json(
        { error: "Invalid or expired state parameter" },
        { status: 400 }
      );
    }

    // Create OAuth2 client and exchange authorization code for tokens
    const oauth2Client = createOAuth2Client();
    const tokenResponse = await oauth2Client.exchangeCodeForTokens(code, codeVerifier);

    // Calculate token expiration times
    const accessTokenExpiration = new Date(Date.now() + tokenResponse.expires_in * 1000);
    // Refresh token lifetime: 30 days (from TPS Integration Guide)
    const refreshTokenExpiration = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Store tokens in UserContext
    await connectToDatabase();

    await UserContext.findOneAndUpdate(
      { userId },
      {
        userId,
        apiAccessTokens: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          accessTokenExpiration,
          refreshTokenExpiration,
        },
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Redirect to home page
    // - Browser Mode: Shows home page with granted access
    // - WebView Mode: App detects homeUrl redirect and navigates to Home Screen
    return NextResponse.redirect(new URL('/', baseUrl));

  } catch (error) {
    console.error('OAuth2 callback failed:', error instanceof Error ? error.message : String(error));
    return NextResponse.redirect(
      new URL('/?error=oauth_callback_failed', baseUrl)
    );
  }
}
