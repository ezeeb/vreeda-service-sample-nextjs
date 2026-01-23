import connectToDatabase from "@/lib/mongodb";
import UserContext from "@/models/UserContext";

/**
 * Central business logic for checking OAuth2 grant status
 * Used by both API routes and Server Components
 *
 * @param userId - The user ID to check grant status for
 * @returns "active" if grant is valid, "needs renewal" otherwise
 */
export async function checkGrantStatus(userId: string | null): Promise<"active" | "needs renewal"> {
  if (!userId) {
    return "needs renewal";
  }

  try {
    await connectToDatabase();

    const userContext = await UserContext.findOne({ userId });

    if (!userContext) {
      return "needs renewal";
    }

    const { apiAccessTokens } = userContext;

    if (!apiAccessTokens?.accessToken || !apiAccessTokens?.refreshToken) {
      return "needs renewal";
    }

    const now = new Date();
    const accessTokenExpired =
      apiAccessTokens.accessTokenExpiration && new Date(apiAccessTokens.accessTokenExpiration) <= now;
    const refreshTokenExpired =
      apiAccessTokens.refreshTokenExpiration && new Date(apiAccessTokens.refreshTokenExpiration) <= now;

    if (accessTokenExpired || refreshTokenExpired) {
      return "needs renewal";
    }

    return "active";
  } catch (error) {
    console.error('Grant status check failed:', error instanceof Error ? error.message : String(error));
    return "needs renewal";
  }
}
