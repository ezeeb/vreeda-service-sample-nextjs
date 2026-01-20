import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import UserContext from "@/models/UserContext";
import { getUserId } from "@/lib/auth";

export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) {
    console.error('User granted check: No user ID found');
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const userContext = await UserContext.findOne({ userId });

    if (!userContext) {
      return NextResponse.json({ granted: false, message: "User context not found" }, { status: 404 });
    }

    const { apiAccessTokens } = userContext;

    if (!apiAccessTokens?.accessToken || !apiAccessTokens?.refreshToken) {
      return NextResponse.json({ granted: false, message: "Tokens are missing" }, { status: 401 });
    }

    const now = new Date();
    const accessTokenExpired =
      apiAccessTokens.accessTokenExpiration && new Date(apiAccessTokens.accessTokenExpiration) <= now;
    const refreshTokenExpired =
      apiAccessTokens.refreshTokenExpiration && new Date(apiAccessTokens.refreshTokenExpiration) <= now;

    if (accessTokenExpired || refreshTokenExpired) {
      return NextResponse.json({ granted: false, message: "Tokens are expired" }, { status: 401 });
    }

    return NextResponse.json({ granted: true, message: "Access granted" }, { status: 200 });
  } catch (error) {
    console.error('User granted check failed:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Failed to validate user context" }, { status: 500 });
  }
}
