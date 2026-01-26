import crypto from 'crypto';
import UserContext from '@/models/UserContext';
import connectToDatabase from '@/lib/mongodb';

/**
 * Store a PKCE code verifier with a random state value
 * @param userId - User ID to associate PKCE state with
 * @param codeVerifier - PKCE code verifier to store
 * @returns state - Random state value for CSRF protection
 */
export async function storePKCEVerifier(userId: string, codeVerifier: string): Promise<string> {
  await connectToDatabase();

  const state = crypto.randomBytes(32).toString('base64url');

  await UserContext.findOneAndUpdate(
    { userId },
    {
      $push: {
        pkceStates: {
          state,
          codeVerifier,
          createdAt: new Date()
        }
      }
    },
    { upsert: true }
  );

  return state;
}

/**
 * Retrieve and delete a PKCE code verifier by state value
 */
export async function retrievePKCEVerifier(state: string): Promise<string | null> {
  await connectToDatabase();

  const userContext = await UserContext.findOne({
    'pkceStates.state': state
  });

  if (!userContext || !userContext.pkceStates) {
    return null;
  }

  const pkceEntry = userContext.pkceStates.find(entry => entry.state === state);
  if (!pkceEntry) {
    return null;
  }

  // Remove the used PKCE state
  await UserContext.updateOne(
    { userId: userContext.userId },
    { $pull: { pkceStates: { state } } }
  );

  return pkceEntry.codeVerifier;
}

/**
 * Cleanup expired PKCE states (older than 5 minutes)
 */
export async function cleanupExpiredPKCEStates(): Promise<number> {
  await connectToDatabase();

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const result = await UserContext.updateMany(
    { 'pkceStates.createdAt': { $lt: fiveMinutesAgo } },
    { $pull: { pkceStates: { createdAt: { $lt: fiveMinutesAgo } } } }
  );

  return result.modifiedCount;
}
