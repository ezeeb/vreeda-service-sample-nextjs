import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import UserContext from "@/models/UserContext";

/**
 * ServiceStateAndDescription Endpoint
 *
 * Returns service metadata and user grant status for the Vreeda App (WebView).
 * Called by the app to display service information and check if user has granted device access.
 *
 * Authentication: Bearer token from Azure B2C (user's access token from app)
 *
 * Response format matches ServiceDescriptionAndState type from vreeda-vreeli hooks/service.ts
 */
export async function GET(req: Request) {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Extract user ID from Azure B2C token (decode JWT without validation)
    // The app already validated the token, we just need the user ID
    let userId: string | null = null;
    try {
      // Decode JWT payload (second part) without validation
      const parts = token.split('.');
      if (parts.length === 3) {
        let payload = parts[1];

        // Add padding if needed for Base64 decoding
        switch (payload.length % 4) {
          case 2: payload += "=="; break;
          case 3: payload += "="; break;
        }
        const payloadBytes = Buffer.from(payload, 'base64');
        const payloadJson = payloadBytes.toString('utf8');
        const tokenPayload = JSON.parse(payloadJson);

        // Extract user ID from standard claims
        // Azure B2C uses "sub" or "oid" (object ID)
        userId = tokenPayload.sub || tokenPayload.oid || null;
      }
    } catch (error) {
      console.error('[ServiceStateAndDescription] Failed to decode Bearer token:', error);
      // Continue without user ID - granted will be false
    }

    // Check grant status for this specific user
    let granted = false;

    // Only check grant status if we have a user ID
    if (userId) {
      try {
        await connectToDatabase();

        const userContext = await UserContext.findOne({ userId });

        if (userContext?.apiAccessTokens) {
          const now = new Date();
          const accessTokenValid = !userContext.apiAccessTokens.accessTokenExpiration ||
                                   new Date(userContext.apiAccessTokens.accessTokenExpiration) > now;
          const refreshTokenValid = !userContext.apiAccessTokens.refreshTokenExpiration ||
                                    new Date(userContext.apiAccessTokens.refreshTokenExpiration) > now;

          granted = accessTokenValid || refreshTokenValid;
        }
      } catch (error) {
        console.error('[ServiceStateAndDescription] Error checking grant status:', error);
        // Continue with granted = false
      }
    }

    // Service metadata
    const response = {
      description: {
        id: "vreeda-sample-nextjs",
        title: "Vreeda Sample Service (Next.js)",
        descriptionText: "Sample third-party service demonstrating OAuth2 device access integration with Vreeda IoT ecosystem.",
        descriptionLogo: "/logo.png", // Relative URL - app will resolve against service base URL
        descriptionHtmlFragment: undefined, // Optional: URL to HTML fragment for service description
        homeUrl: "/", // Relative URL
        getAccessGrantUrl: "/api/consent/authorize", // Initiates OAuth2 flow
        accessGrantUrl: undefined, // Deprecated - use getAccessGrantUrl
        redirectUrl: "/", // Where to redirect after grant
        revokeGrantUrl: "/api/consent/revoke", // Revoke grant endpoint
        secureGrant: true, // Uses OAuth2 with PKCE
      },
      state: {
        authenticated: true, // User is authenticated (has valid Bearer token from app)
        granted: granted, // User has granted device access via OAuth2 flow
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('ServiceStateAndDescription error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to retrieve service state" },
      { status: 500 }
    );
  }
}
