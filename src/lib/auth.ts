import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import type { Session } from 'next-auth';

/**
 * Extracts User ID from Bearer Token (WebView) or NextAuth Session (Browser)
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
  // If Bearer Token present, it's WebView → no session check needed
  try {
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Decode JWT without validation (trust model)
      const parts = token.split('.');
      if (parts.length === 3) {
        let payload = parts[1];

        // Add Base64 padding
        switch (payload.length % 4) {
          case 2: payload += '=='; break;
          case 3: payload += '='; break;
        }

        const payloadBytes = Buffer.from(payload, 'base64');
        const tokenPayload = JSON.parse(payloadBytes.toString('utf8'));

        // Extract User ID from standard claims
        const userId = tokenPayload.sub || tokenPayload.oid || null;
        if (userId) {
          return userId; // WebView Mode: User ID found, done!
        }
      }
    }
  } catch (error) {
    console.error('[AUTH] Bearer token decode failed:', error);
  }

  // Priority 2: NextAuth Session (Browser Mode - fallback)
  // Only if no Bearer Token was present
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