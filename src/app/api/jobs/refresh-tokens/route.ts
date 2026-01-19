import connectToDatabase from "@/lib/mongodb";
import UserContext from "@/models/UserContext";
import { NextResponse } from "next/server";
import { createOAuth2Client } from "@/lib/oauth2Client";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const apiKey = url.searchParams.get("key");

  if (apiKey !== process.env.API_REFRESH_TOKENS_JOB_KEY) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    // Refresh tokens expiring in the next 2 minutes
    // (ConsentService tokens have 5 minute lifetime)
    const threshold = new Date();
    threshold.setMinutes(threshold.getMinutes() + 2);

    const usersToRefresh = await UserContext.find({
      "apiAccessTokens.accessTokenExpiration": { $lt: threshold },
    });

    // Create OAuth2 client for ConsentService
    const oauth2Client = createOAuth2Client();

    for (const user of usersToRefresh) {
      try {
        // Skip if refresh token is missing
        if (!user.apiAccessTokens?.refreshToken) {
          console.warn(`Token refresh: No refresh token for user ${user.userId}, skipping`);
          continue;
        }

        // Call ConsentService to refresh the token
        const tokenResponse = await oauth2Client.refreshAccessToken(
          user.apiAccessTokens.refreshToken
        );

        // Calculate new token expiration times
        const accessTokenExpiration = new Date(Date.now() + tokenResponse.expires_in * 1000);
        // Refresh token lifetime: 30 days (TPS Integration Guide)
        const refreshTokenExpiration = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Update the user context with new tokens
        // IMPORTANT: ConsentService rotates refresh tokens (old token is invalidated)
        await UserContext.findByIdAndUpdate(user._id, {
          $set: {
            "apiAccessTokens.accessToken": tokenResponse.access_token,
            "apiAccessTokens.refreshToken": tokenResponse.refresh_token, // New refresh token!
            "apiAccessTokens.accessTokenExpiration": accessTokenExpiration,
            "apiAccessTokens.refreshTokenExpiration": refreshTokenExpiration,
          },
          $currentDate: { updatedAt: true },
        });
      } catch (error) {
        console.error(`Token refresh failed for user ${user.userId}:`, error instanceof Error ? error.message : String(error));
      }
    }
    return NextResponse.json({ success: true, message: "Token refresh completed successfully." });
  } catch (error) {
    console.error("Token refresh job failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, message: "Failed to refresh tokens." }, { status: 500 });
  }
}