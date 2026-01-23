import connectToDatabase from "@/lib/mongodb";
import UserContext from "@/models/UserContext";

// Configuration type matching UserContext model
interface Configuration {
  devices?: string[];
  [key: string]: unknown; // Allow additional fields if needed
}

/**
 * Central business logic for fetching selected devices configuration
 * Used by both API routes and Server Components
 *
 * @param userId - The user ID to fetch configuration for
 * @returns Array of selected device IDs, or empty array if user is not authenticated
 * @throws Error if there's a technical issue
 */
export async function getSelectedDevices(userId: string | null): Promise<string[]> {
  if (!userId) {
    return [];
  }

  try {
    await connectToDatabase();

    const userContext = await UserContext.findOne({ userId });
    if (!userContext) {
      return [];
    }

    return userContext.configuration?.devices || [];
  } catch (error) {
    console.error('getSelectedDevices failed:', error instanceof Error ? error.message : String(error));
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Central business logic for getting user configuration
 * Used by API routes
 *
 * @param userId - The user ID to fetch configuration for
 * @returns User configuration object, or empty object if not found
 * @throws Error if there's a technical issue
 */
export async function getUserConfiguration(userId: string | null): Promise<Configuration> {
  if (!userId) {
    throw new Error('Unauthorized');
  }

  await connectToDatabase();

  const userContext = await UserContext.findOne({ userId });
  if (!userContext) {
    throw new Error('User context not found');
  }

  return userContext.configuration || {};
}

/**
 * Central business logic for updating user configuration
 * Used by API routes
 *
 * @param userId - The user ID to update configuration for
 * @param configuration - The configuration object to set
 * @returns Updated configuration object
 * @throws Error if there's a technical issue
 */
export async function updateUserConfiguration(
  userId: string | null,
  configuration: Configuration
): Promise<Configuration> {
  if (!userId) {
    throw new Error('Unauthorized');
  }

  if (!configuration || typeof configuration !== "object") {
    throw new Error('Invalid or missing configuration');
  }

  await connectToDatabase();

  const updatedContext = await UserContext.findOneAndUpdate(
    { userId },
    {
      $set: { configuration },
      $currentDate: { updatedAt: true },
    },
    { upsert: true, new: true }
  );

  return updatedContext.configuration || {};
}
