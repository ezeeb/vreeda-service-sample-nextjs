import crypto from 'crypto';
import PKCEState from '@/models/PKCEState';
import connectToDatabase from '@/lib/mongodb';

/**
 * PKCE Store - Temporary storage for PKCE code verifiers during OAuth2 flow
 *
 * Uses MongoDB with TTL index for automatic cleanup after 5 minutes.
 * Multi-instance safe for production deployments.
 */

/**
 * Store a PKCE code verifier with a random state value
 * @param codeVerifier - PKCE code verifier to store
 * @returns state - Random state value for CSRF protection
 */
export async function storePKCEVerifier(codeVerifier: string): Promise<string> {
  await connectToDatabase();

  // Generate random state value (32 bytes = 256 bits)
  const state = crypto.randomBytes(32).toString('base64url');

  // Store in MongoDB (TTL index will auto-delete after 5 minutes)
  await PKCEState.create({
    state,
    codeVerifier,
    createdAt: new Date()
  });

  return state;
}

/**
 * Retrieve and delete a PKCE code verifier by state value
 * @param state - State value from OAuth2 callback
 * @returns codeVerifier - PKCE code verifier, or null if not found/expired
 */
export async function retrievePKCEVerifier(state: string): Promise<string | null> {
  await connectToDatabase();

  // Find and delete in one operation (atomic)
  const pkceState = await PKCEState.findOneAndDelete({ state });

  if (!pkceState) {
    return null;
  }

  return pkceState.codeVerifier;
}

/**
 * Cleanup expired PKCE states (normally handled by TTL index)
 * This is a manual fallback if TTL index is disabled
 */
export async function cleanupExpiredPKCEStates(): Promise<number> {
  await connectToDatabase();

  // Delete all states older than 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const result = await PKCEState.deleteMany({
    createdAt: { $lt: fiveMinutesAgo }
  });

  return result.deletedCount;
}
