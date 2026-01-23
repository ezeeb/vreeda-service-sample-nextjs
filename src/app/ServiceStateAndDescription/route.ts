import { NextResponse } from "next/server";
import { decodeTokenUserId } from "@/lib/auth";
import { checkGrantStatus } from "@/lib/grant";

/**
 * ServiceStateAndDescription Endpoint
 *
 * Returns service metadata and user grant status for the Vreeda App (WebView).
 * Called by the app to display service information and check if user has granted device access.
 *
 * Authentication: Optional Bearer token from Azure B2C
 * - With token: Returns authenticated=true and grant status
 * - Without token: Returns authenticated=false and granted=false
 *
 * Response format matches ServiceDescriptionAndState type from vreeda-vreeli hooks/service.ts
 * Uses central business logic from @/lib/auth and @/lib/grant
 */
export async function GET(req: Request) {
  try {
    // Extract Bearer token from Authorization header (optional)
    const authHeader = req.headers.get('Authorization');
    let authenticated = false;
    let granted = false;

    // Only check authentication and grant status if Bearer token is provided
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Extract user ID from Bearer token using central auth logic
      const userId = decodeTokenUserId(token);

      if (userId) {
        authenticated = true;

        // Check grant status using central business logic
        const grantStatus = await checkGrantStatus(userId);
        granted = grantStatus === "active";
      }
    }

    // Service metadata
    const response = {
      description: {
        id: "vreeda-sample-nextjs",
        title: "Vreeda Sample Service (Next.js)",
        descriptionText: "Sample third-party service demonstrating OAuth2 device access integration with Vreeda IoT ecosystem.",
        descriptionLogo: "/logo.png", // Relative URL - app will resolve against service base URL
        descriptionHtmlFragment: "/description_html_fragment.html", // Optional: URL to HTML fragment for service description
        homeUrl: "/", // Relative URL
        accessGrantUrl: "/api/consent/authorize", // Deprecated - use getAccessGrantUrl
        getAccessGrantUrl: "/api/consent/authorize", // Returns authorization URI for InAppBrowser
        redirectUrl: "/consent-success", // Final redirect URL after successful consent (WebView waits for this)
        revokeGrantUrl: "/api/consent/revoke", // Revoke grant endpoint
        secureGrant: false, // Uses OAuth2 with PKCE
      },
      state: {
        authenticated: authenticated, // User is authenticated (has valid Bearer token from app)
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
