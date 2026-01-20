import { headers } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { decodeTokenUserId } from '@/lib/auth';
import type { Session } from 'next-auth';

/**
 * Server-side function to get user ID from Server Components
 * Checks both Bearer token (WebView) and NextAuth session (Browser)
 *
 * For use in Server Components where headers() is available
 * For API Routes, use getUserId(req) from @/lib/auth instead
 */
export async function getServerUserId(): Promise<string | null> {
  // Priority 1: Bearer token (WebView Mode)
  try {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const userId = decodeTokenUserId(token);
      if (userId) {
        return userId;
      }
    }
  } catch (error) {
    console.error('[SERVER AUTH] Bearer token decode failed:', error);
  }

  // Priority 2: NextAuth Session (Browser Mode)
  try {
    const session: Session | null = await getServerSession(authOptions);
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch (error) {
    console.error('[SERVER AUTH] Session validation failed:', error);
  }

  return null;
}
