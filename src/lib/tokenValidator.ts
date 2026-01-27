import jwt, { JwtPayload, VerifyOptions } from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';

/**
 * Azure B2C Token Validator
 * Validates Bearer tokens cryptographically against Azure B2C JWKS
 */

// JWKS client with caching (singleton)
let jwksClientInstance: JwksClient | null = null;

/**
 * Get or create the JWKS client for Azure B2C
 * Uses caching to avoid fetching keys on every request
 */
function getJwksClient(): JwksClient {
  if (jwksClientInstance) {
    return jwksClientInstance;
  }

  const tenantName = process.env.AZURE_AD_B2C_TENANT_NAME;
  const userFlow = process.env.AZURE_AD_B2C_PRIMARY_USER_FLOW;

  if (!tenantName || !userFlow) {
    throw new Error('Azure B2C configuration missing: AZURE_AD_B2C_TENANT_NAME or AZURE_AD_B2C_PRIMARY_USER_FLOW');
  }

  // Azure B2C JWKS URL
  const jwksUri = `https://${tenantName}.b2clogin.com/${tenantName}.onmicrosoft.com/${userFlow}/discovery/v2.0/keys`;

  jwksClientInstance = jwksClient({
    jwksUri,
    cache: true,
    cacheMaxAge: 600000, // 10 minutes
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  console.log('[TokenValidator] JWKS client initialized:', jwksUri);
  return jwksClientInstance;
}

/**
 * Get signing key from JWKS
 */
function getSigningKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = getJwksClient();

    if (!header.kid) {
      reject(new Error('No kid in token header'));
      return;
    }

    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        reject(err);
        return;
      }

      if (!key) {
        reject(new Error('No signing key found'));
        return;
      }

      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  userId: string | null;
  error?: string;
  payload?: JwtPayload;
}

/**
 * Validate a Bearer token against Azure B2C
 *
 * Validates:
 * - Signature (using JWKS public keys)
 * - Issuer (must be Azure B2C tenant)
 * - Audience (must match client ID)
 * - Expiration (must not be expired)
 *
 * @param token - JWT token string (without "Bearer " prefix)
 * @returns Validation result with userId if valid
 */
export async function validateAzureB2CToken(token: string): Promise<TokenValidationResult> {
  const tenantName = process.env.AZURE_AD_B2C_TENANT_NAME;
  const userFlow = process.env.AZURE_AD_B2C_PRIMARY_USER_FLOW;
  const clientId = process.env.AZURE_AD_B2C_CLIENT_ID;

  if (!tenantName || !userFlow || !clientId) {
    return {
      valid: false,
      userId: null,
      error: 'Azure B2C configuration missing',
    };
  }

  // Expected issuer from Azure B2C
  const expectedIssuer = `https://${tenantName}.b2clogin.com/${tenantName}.onmicrosoft.com/${userFlow}/v2.0/`;

  try {
    // Decode header to get kid
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header) {
      return {
        valid: false,
        userId: null,
        error: 'Invalid token format',
      };
    }

    // Get signing key from JWKS
    const signingKey = await getSigningKey(decoded.header);

    // Verify token
    const verifyOptions: VerifyOptions = {
      algorithms: ['RS256'],
      issuer: expectedIssuer,
      audience: clientId,
      clockTolerance: 60, // 60 seconds tolerance for clock skew
    };

    const payload = jwt.verify(token, signingKey, verifyOptions) as JwtPayload;

    // Extract user ID (sub or oid claim)
    const userId = payload.sub || payload.oid;
    if (!userId || typeof userId !== 'string') {
      return {
        valid: false,
        userId: null,
        error: 'No user ID in token',
      };
    }

    return {
      valid: true,
      userId,
      payload,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log specific error types for debugging
    if (error instanceof jwt.TokenExpiredError) {
      console.warn('[TokenValidator] Token expired:', error.expiredAt);
      return { valid: false, userId: null, error: 'Token expired' };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      console.warn('[TokenValidator] JWT error:', errorMessage);
      return { valid: false, userId: null, error: `JWT error: ${errorMessage}` };
    }

    if (error instanceof jwt.NotBeforeError) {
      console.warn('[TokenValidator] Token not yet valid:', error.date);
      return { valid: false, userId: null, error: 'Token not yet valid' };
    }

    console.error('[TokenValidator] Validation failed:', errorMessage);
    return {
      valid: false,
      userId: null,
      error: errorMessage,
    };
  }
}

/**
 * Clear JWKS cache (useful for testing or key rotation)
 */
export function clearJwksCache(): void {
  jwksClientInstance = null;
  console.log('[TokenValidator] JWKS cache cleared');
}
