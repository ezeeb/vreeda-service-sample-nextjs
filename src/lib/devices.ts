import connectToDatabase from "@/lib/mongodb";
import UserContext from "@/models/UserContext";
import { listDevices } from '@/lib/vreedaApiClient';
import { DevicesResponse } from '@/types/vreedaApi';

/**
 * Central business logic for fetching devices
 * Used by both API routes and Server Components
 *
 * @param userId - The user ID to fetch devices for
 * @returns DevicesResponse or null if user is not authenticated or grant is not active
 * @throws Error if there's a technical issue (but returns null for auth/grant issues)
 */
export async function getDevices(userId: string | null): Promise<DevicesResponse | null> {
  if (!userId) {
    return null;
  }

  try {
    await connectToDatabase();

    const userContext = await UserContext.findOne({ userId });
    if (!userContext) {
      return null;
    }

    const { apiAccessTokens } = userContext;
    if (!apiAccessTokens?.accessToken || !apiAccessTokens?.refreshToken) {
      return null;
    }

    // Check if tokens are expired
    const now = new Date();
    const accessTokenExpired =
      apiAccessTokens.accessTokenExpiration && new Date(apiAccessTokens.accessTokenExpiration) <= now;
    const refreshTokenExpired =
      apiAccessTokens.refreshTokenExpiration && new Date(apiAccessTokens.refreshTokenExpiration) <= now;

    if (accessTokenExpired || refreshTokenExpired) {
      return null;
    }

    // Fetch devices from VREEDA API
    const devices = await listDevices(apiAccessTokens.accessToken);
    return devices;
  } catch (error) {
    console.error('getDevices failed:', error instanceof Error ? error.message : String(error));
    throw error; // Re-throw to allow caller to handle
  }
}
