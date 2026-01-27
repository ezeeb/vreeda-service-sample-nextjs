import jwt, { JwtPayload, VerifyOptions } from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';

/**
 * Azure B2C Token Validator
 * Validates Bearer tokens cryptographically against Azure B2C JWKS
 * Uses OpenID Connect Discovery to fetch issuer and JWKS URI dynamically
 */

// Cached OIDC configuration
interface OidcConfig {
  issuer: string;
  jwks_uri: string;
}

let cachedOidcConfig: OidcConfig | null = null;
let jwksClientInstance: JwksClient | null = null;

/**
 * Fetch OpenID Connect configuration from Azure B2C discovery endpoint
 * Caches the result for subsequent calls
 */
async function getOidcConfig(): Promise<OidcConfig> {
  if (cachedOidcConfig) {
    return cachedOidcConfig;
  }

  const tenantName = process.env.AZURE_AD_B2C_TENANT_NAME;
  const userFlow = process.env.AZURE_AD_B2C_PRIMARY_USER_FLOW;

  if (!tenantName || !userFlow) {
    throw new Error('Azure B2C configuration missing: AZURE_AD_B2C_TENANT_NAME or AZURE_AD_B2C_PRIMARY_USER_FLOW');
  }

  // OpenID Connect Discovery URL
  const discoveryUrl = `https://${tenantName}.b2clogin.com/${tenantName}.onmicrosoft.com/${userFlow}/v2.0/.well-known/openid-configuration`;

  const response = await fetch(discoveryUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch OIDC config: ${response.status} ${response.statusText}`);
  }

  const config = await response.json();

  cachedOidcConfig = {
    issuer: config.issuer,
    jwks_uri: config.jwks_uri,
  };

  return cachedOidcConfig;
}

/**
 * Get or create the JWKS client using the JWKS URI from OIDC discovery
 */
async function getJwksClient(): Promise<JwksClient> {
  if (jwksClientInstance) {
    return jwksClientInstance;
  }

  const oidcConfig = await getOidcConfig();

  jwksClientInstance = jwksClient({
    jwksUri: oidcConfig.jwks_uri,
    cache: true,
    cacheMaxAge: 600000, // 10 minutes
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  return jwksClientInstance;
}

/**
 * Get signing key from JWKS
 */
async function getSigningKey(header: jwt.JwtHeader): Promise<string> {
  const client = await getJwksClient();

  if (!header.kid) {
    throw new Error('No kid in token header');
  }

  return new Promise((resolve, reject) => {
    client.getSigningKey(header.kid!, (err, key) => {
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
 * - Signature (using JWKS public keys from OIDC discovery)
 * - Issuer (from OIDC discovery)
 * - Audience (must match configured app client IDs)
 * - Expiration (must not be expired)
 *
 * @param token - JWT token string (without "Bearer " prefix)
 * @returns Validation result with userId if valid
 */
export async function validateAzureB2CToken(token: string): Promise<TokenValidationResult> {
  const webViewAudience = process.env.WEB_VIEW_AUDIENCE;

  if (!webViewAudience) {
    return {
      valid: false,
      userId: null,
      error: 'WEB_VIEW_AUDIENCE environment variable not configured',
    };
  }

  // Parse allowed audiences (comma-separated list of app client IDs)
  const allowedAudiences = webViewAudience.split(',').map(a => a.trim()).filter(a => a.length > 0);

  try {
    // Get OIDC configuration (issuer, jwks_uri)
    const oidcConfig = await getOidcConfig();

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
      issuer: oidcConfig.issuer,
      audience: allowedAudiences,
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
 * Clear cached OIDC config and JWKS client (useful for testing or config changes)
 */
export function clearCache(): void {
  cachedOidcConfig = null;
  jwksClientInstance = null;
}
