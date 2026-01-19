import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import UserContext from "@/models/UserContext";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { createOAuth2Client } from "@/lib/oauth2Client";

export async function DELETE() {
  const session: Session | null = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id; // Extract user ID
  if (!userId) {
    return NextResponse.json({ error: "User ID not found in session" }, { status: 400 });
  }
  
  try {
    await connectToDatabase();

    // Retrieve user context to get refresh token
    const userContext = await UserContext.findOne({ userId });

    if (!userContext) {
      console.error("User revoke: User context not found for user:", userId);
      return NextResponse.json({ error: "User context not found" }, { status: 404 });
    }

    // Revoke refresh token with ConsentService (if exists)
    if (userContext.apiAccessTokens?.refreshToken) {
      try {
        const oauth2Client = createOAuth2Client();
        await oauth2Client.revokeToken(userContext.apiAccessTokens.refreshToken);
      } catch (error) {
        // Log error but continue with deletion (RFC 7009: revocation should always succeed)
        console.error(`Token revocation failed for user ${userId}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Delete the user's context
    await UserContext.deleteOne({ userId });

    // Trigger logout (if applicable, handle this client-side)
    return NextResponse.json({ message: "User revoked and logged out" }, { status: 200 });
  } catch (error) {
    console.error("User revoke failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Failed to revoke user" }, { status: 500 });
  }
}
