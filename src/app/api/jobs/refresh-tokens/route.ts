import connectToDatabase from "@/lib/mongodb";
import UserContext from "@/models/UserContext";
import { NextResponse } from "next/server";

export interface AzureB2CRefreshResponse {
  access_token: string; // The new access token
  refresh_token: string; // The new refresh token (optional, may not always be returned)
  expires_in: number; // Expiration time for the access token, in seconds
  refresh_token_expires_in?: number; // Expiration time for the refresh token, in seconds (optional)
  id_token?: string; // New ID token, if requested
  scope?: string; // The scopes associated with the tokens
  token_type: string; // Type of the token, typically "Bearer"
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const apiKey = url.searchParams.get("key");

  if (apiKey !== process.env.API_REFRESH_TOKENS_JOB_KEY) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Token refresh job triggered...");
    await connectToDatabase();

    const threshold = new Date();
    threshold.setMinutes(threshold.getMinutes() + 5); // Refresh tokens expiring in the next 5 minutes

    const usersToRefresh = await UserContext.find({
      "apiAccessTokens.accessTokenExpiration": { $lt: threshold },
    });

    for (const user of usersToRefresh) {
      try {
        // Call Azure AD B2C to refresh the token
        const response = await fetch(
          `https://${process.env.AZURE_AD_B2C_TENANT_NAME}.b2clogin.com/${process.env.AZURE_AD_B2C_TENANT_NAME}.onmicrosoft.com/${process.env.AZURE_AD_B2C_PRIMARY_USER_FLOW}/oauth2/v2.0/token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.AZURE_AD_B2C_CLIENT_ID!,
              client_secret: process.env.AZURE_AD_B2C_CLIENT_SECRET!,
              grant_type: "refresh_token",
              refresh_token: user.apiAccessTokens.refreshToken,
            }).toString(),
          }
        );

        if (!response.ok) {
          console.error(`Failed to refresh token for user ${user.userId}`);
          continue;
        }

        const data = await response.json() as AzureB2CRefreshResponse;

        // Update the user context with new tokens
        await UserContext.findByIdAndUpdate(user._id, {
          $set: {
            "apiAccessTokens.accessToken": data.access_token,
            "apiAccessTokens.refreshToken": data.refresh_token || user.apiAccessTokens.refreshToken, // Keep old one if not provided
            "apiAccessTokens.accessTokenExpiration": new Date(
              Date.now() + data.expires_in * 1000
            ),
            "apiAccessTokens.refreshTokenExpiration": new Date(Date.now() + data.refresh_token_expires_in * 1000)|| user.apiAccessTokens.refreshTokenExpiration, // Update if necessary
          },
          $currentDate: { updatedAt: true },
        });

        console.log(`Successfully refreshed token for user ${user.userId}`);
      } catch (error) {
        console.error(`Error refreshing token for user ${user.userId}`, error);
      }
    }
    console.log("Token refresh job completed successfully.");
    return NextResponse.json({ success: true, message: "Token refresh completed successfully." });
  } catch (error) {
    console.error("Error in token refresh job:", error);
    return NextResponse.json({ success: false, message: "Failed to refresh tokens." }, { status: 500 });
  }
}