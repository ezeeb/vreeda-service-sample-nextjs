import crypto from 'crypto';

/**
 * OAuth2 Client for ConsentService Integration
 *
 * Implements OAuth2 Authorization Code Flow with PKCE (RFC 7636)
 * Browser Mode: Uses id_token_hint query parameter for user authentication
 */

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  consentServiceUrl: string;
  redirectUri: string;
  scopes: string[];
}

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;      // Seconds (300 = 5 minutes)
  token_type: 'Bearer';
  scope: string;
}

export interface IntrospectionResponse {
  active: boolean;
  scope?: string;
  client_id?: string;
  exp?: number;
}

/**
 * OAuth2 Client for ConsentService
 */
export class OAuth2Client {
  private config: OAuth2Config;

  constructor(config: OAuth2Config) {
    this.config = config;
  }

  /**
   * Generate PKCE code verifier and challenge (S256 method)
   * @returns PKCE challenge with verifier, challenge, and method
   */
  generatePKCEChallenge(): PKCEChallenge {
    // Generate 32-byte random code verifier (RFC 7636 requires 43-128 characters)
    const codeVerifier = crypto.randomBytes(32).toString('base64url');

    // Generate SHA-256 hash of code verifier
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256'
    };
  }

  /**
   * Build authorization URL for Browser Mode
   * @param idToken - ID Token from Azure B2C (for id_token_hint parameter)
   * @param state - Random state for CSRF protection
   * @param pkce - PKCE challenge
   * @returns Authorization URL
   */
  getAuthorizationUrl(idToken: string, state: string, pkce: PKCEChallenge): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: pkce.codeChallengeMethod,
      id_token_hint: idToken  // Browser Mode: ID Token as query parameter
    });

    return `${this.config.consentServiceUrl}/connect/authorize?${params}`;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * @param code - Authorization code from callback
   * @param codeVerifier - PKCE code verifier
   * @returns Token response with access token and refresh token
   */
  async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code_verifier: codeVerifier
    });

    const response = await fetch(`${this.config.consentServiceUrl}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'unknown_error' }));
      throw new OAuth2Error(
        errorData.error || 'token_exchange_failed',
        errorData.error_description || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - Current refresh token
   * @returns Token response with new access token and refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    const response = await fetch(`${this.config.consentServiceUrl}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'unknown_error' }));
      throw new OAuth2Error(
        errorData.error || 'token_refresh_failed',
        errorData.error_description || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Revoke refresh token
   * @param refreshToken - Refresh token to revoke
   */
  async revokeToken(refreshToken: string): Promise<void> {
    const params = new URLSearchParams({
      token: refreshToken,
      token_type_hint: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    const response = await fetch(`${this.config.consentServiceUrl}/connect/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    // RFC 7009: Revocation endpoint always returns 200 OK
    if (!response.ok) {
      console.warn('Token revocation returned non-200 status:', response.status);
    }
  }

  /**
   * Introspect access token
   * @param token - Access token to introspect
   * @returns Introspection response
   */
  async introspectToken(token: string): Promise<IntrospectionResponse> {
    const params = new URLSearchParams({
      token,
      token_type_hint: 'access_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    const response = await fetch(`${this.config.consentServiceUrl}/connect/introspect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!response.ok) {
      throw new OAuth2Error(
        'introspection_failed',
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  }
}

/**
 * OAuth2 Error class
 */
export class OAuth2Error extends Error {
  constructor(
    public code: string,
    public description?: string,
    public uri?: string
  ) {
    super(description || code);
    this.name = 'OAuth2Error';
  }
}

/**
 * Create OAuth2 client instance from environment variables
 */
export function createOAuth2Client(): OAuth2Client {
  const config: OAuth2Config = {
    clientId: process.env.OAUTH2_CLIENT_ID!,
    clientSecret: process.env.OAUTH2_CLIENT_SECRET!,
    consentServiceUrl: process.env.OAUTH2_CONSENT_SERVICE_URL!,
    redirectUri: process.env.OAUTH2_REDIRECT_URI!,
    scopes: (process.env.OAUTH2_SCOPES || 'devices:read devices:control').split(' ')
  };

  // Validate configuration
  if (!config.clientId || !config.clientSecret || !config.consentServiceUrl || !config.redirectUri) {
    throw new Error('Missing required OAuth2 configuration. Check environment variables.');
  }

  return new OAuth2Client(config);
}
