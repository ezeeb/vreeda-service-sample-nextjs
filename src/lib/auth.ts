import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import type { Session } from 'next-auth';

/**
 * Decodes a Bearer token and extracts the user ID
 * Uses trust model - assumes token is already validated
 */
export function decodeTokenUserId(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    let payload = parts[1];

    // Add Base64 padding
    switch (payload.length % 4) {
      case 2: payload += '=='; break;
      case 3: payload += '='; break;
    }

    const payloadBytes = Buffer.from(payload, 'base64');
    const tokenPayload = JSON.parse(payloadBytes.toString('utf8'));

    return tokenPayload.sub || tokenPayload.oid || null;
  } catch (error) {
    console.error('[AUTH] Bearer token decode failed:', error);
    return null;
  }
}

/**
 * Extracts User ID from Bearer Token (WebView) or NextAuth Session (Browser)
 * For use in API Routes with Request object
 *
 * Mode Detection: Automatic based on Bearer Token
 * - If Bearer Token present: WebView Mode (fast, no session check)
 * - Otherwise: Browser Mode (NextAuth Session)
 *
 * Token Validation:
 * - WebView: Trust Model - Token already validated by app, we only decode for User ID
 * - Browser: Full validation via NextAuth
 */
export async function getUserId(req: Request): Promise<string | null> {
  // Priority 1: Bearer Token (WebView Mode - fast)
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const userId = decodeTokenUserId(token);
    if (userId) {
      return userId;
    }
  }

  // Priority 2: NextAuth Session (Browser Mode - fallback)
  try {
    const session: Session | null = await getServerSession(authOptions);
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch (error) {
    console.error('[AUTH] Session validation failed:', error);
  }

  return null;
}