import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import type { Session } from 'next-auth';
import { headers } from 'next/headers';
import { validateAzureB2CToken } from '@/lib/tokenValidator';

/**
 * Generic JWT token decoder
 * Decodes JWT payload without verification (trust model)
 * Returns null if token is malformed
 */
export function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    let payload = parts[1];

    // Add Base64 padding if needed
    switch (payload.length % 4) {
      case 2: payload += '=='; break;
      case 3: payload += '='; break;
    }

    const payloadBytes = Buffer.from(payload, 'base64');
    return JSON.parse(payloadBytes.toString('utf8'));
  } catch (error) {
    console.error('[AUTH] JWT decode failed:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 * @param token - JWT token string
 * @param bufferSeconds - Optional buffer in seconds (default: 0)
 * @returns true if token is expired or invalid
 */
export function isTokenExpired(token: string, bufferSeconds: number = 0): boolean {
  const payload = decodeJWT(token);
  if (!payload || typeof payload.exp !== 'number') {
    return true;
  }

  // exp is in seconds, Date.now() is in milliseconds
  return Date.now() >= (payload.exp - bufferSeconds) * 1000;
}

/**
 * Decodes a Bearer token and extracts the user ID
 * Uses trust model - assumes token is already validated
 */
export function decodeTokenUserId(token: string): string | null {
  const payload = decodeJWT(token);
  if (!payload) {
    return null;
  }

  return (payload.sub as string) || (payload.oid as string) || null;
}

/**
 * Extracts User ID from Bearer Token (WebView) or NextAuth Session (Browser)
 * For use in API Routes with Request object
 *
 * Mode Detection: Automatic based on Bearer Token
 * - If Bearer Token present: WebView Mode (validates against Azure B2C)
 * - Otherwise: Browser Mode (NextAuth Session)
 *
 * Token Validation:
 * - WebView: Full cryptographic validation against Azure B2C JWKS
 *   - Signature verification
 *   - Issuer validation (Azure B2C tenant)
 *   - Audience validation (client ID)
 *   - Expiration check
 * - Browser: Full validation via NextAuth
 */
export async function getUserId(req: Request): Promise<string | null> {
  // Priority 1: Bearer Token (WebView Mode - validated against Azure B2C)
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    // Validate token cryptographically against Azure B2C
    const validationResult = await validateAzureB2CToken(token);

    if (validationResult.valid && validationResult.userId) {
      return validationResult.userId;
    }

    // Log validation failure for debugging
    if (!validationResult.valid) {
      console.warn('[AUTH] Bearer token validation failed:', validationResult.error);
    }

    // Don't fall through to session - invalid Bearer token should fail
    return null;
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

/**
 * Extracts User ID from Bearer Token (WebView) or NextAuth Session (Browser)
 * For use in Server Components where headers() is available
 *
 * This is similar to getUserId() but designed for Server Components
 * For API Routes, use getUserId(req) instead
 *
 * Mode Detection: Automatic based on Bearer Token
 * - If Bearer Token present: WebView Mode (validates against Azure B2C)
 * - Otherwise: Browser Mode (NextAuth Session)
 *
 * Token Validation:
 * - WebView: Full cryptographic validation against Azure B2C JWKS
 * - Browser: Full validation via NextAuth
 */
export async function getServerUserId(): Promise<string | null> {
  // Priority 1: Bearer token (WebView Mode - validated against Azure B2C)
  try {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Validate token cryptographically against Azure B2C
      const validationResult = await validateAzureB2CToken(token);

      if (validationResult.valid && validationResult.userId) {
        return validationResult.userId;
      }

      // Log validation failure for debugging
      if (!validationResult.valid) {
        console.warn('[SERVER AUTH] Bearer token validation failed:', validationResult.error);
      }

      // Don't fall through to session - invalid Bearer token should fail
      return null;
    }
  } catch (error) {
    console.error('[SERVER AUTH] Bearer token validation error:', error);
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