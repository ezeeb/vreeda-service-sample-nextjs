import connectToDatabase from "@/lib/mongodb"
import UserContext from "@/models/UserContext"
import AzureADB2CProvider from "next-auth/providers/azure-ad-b2c";
import { isTokenExpired } from "@/lib/auth";

/**
 * Refresh Azure B2C access token using refresh token
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function refreshAccessToken(token: any) {
    try {
        console.log('[NextAuth Token Refresh] Starting token refresh...');
        console.log('[NextAuth Token Refresh] Token expires at:', new Date(token.expiresAt).toISOString());
        console.log('[NextAuth Token Refresh] Current time:', new Date().toISOString());

        const tenantName = process.env.AZURE_AD_B2C_TENANT_NAME!;
        const userFlow = process.env.AZURE_AD_B2C_PRIMARY_USER_FLOW!;
        const clientId = process.env.AZURE_AD_B2C_CLIENT_ID!;
        const clientSecret = process.env.AZURE_AD_B2C_CLIENT_SECRET!;

        const url = `https://${tenantName}.b2clogin.com/${tenantName}.onmicrosoft.com/${userFlow}/oauth2/v2.0/token`;

        console.log('[NextAuth Token Refresh] Calling Azure B2C token endpoint:', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'refresh_token',
                refresh_token: token.refreshToken,
                scope: `${clientId} offline_access openid`,
            }),
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            console.error('[NextAuth Token Refresh] ❌ Failed with status:', response.status);
            console.error('[NextAuth Token Refresh] Error details:', refreshedTokens);
            throw new Error(`Token refresh failed: ${refreshedTokens.error_description || response.statusText}`);
        }

        const newExpiresAt = Date.now() + refreshedTokens.expires_in * 1000;
        console.log('[NextAuth Token Refresh] ✅ Success!');
        console.log('[NextAuth Token Refresh] New token expires at:', new Date(newExpiresAt).toISOString());
        console.log('[NextAuth Token Refresh] Token lifetime:', refreshedTokens.expires_in, 'seconds');

        return {
            ...token,
            idToken: refreshedTokens.id_token,
            accessToken: refreshedTokens.access_token,
            expiresAt: newExpiresAt,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
        };
    } catch (error) {
        console.error('[NextAuth Token Refresh] ❌ Exception occurred:', error);

        return {
            ...token,
            error: 'RefreshAccessTokenError',
        };
    }
}

export const authOptions = {
    session: {
        strategy: "jwt" as const,
    },
    providers: [
        AzureADB2CProvider({
        clientId: process.env.AZURE_AD_B2C_CLIENT_ID!,
        clientSecret: process.env.AZURE_AD_B2C_CLIENT_SECRET!,
        tenantId: process.env.AZURE_AD_B2C_TENANT_NAME!,
        primaryUserFlow: process.env.AZURE_AD_B2C_PRIMARY_USER_FLOW,
        authorization: {
            params: {
                scope: process.env.AZURE_AD_B2C_CLIENT_ID! + " offline_access openid",
                prompt: "login", // Force the login screen
            },
        },
        profile(profile) {
          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: null,
          }
        },
        }),
    ],
    callbacks: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async jwt({ token, account, profile }: any) {
            // Initial sign in - store tokens and expiration
            if (account) {
                const expiresAt = Date.now() + account.expires_in * 1000;
                console.log('[NextAuth JWT] Initial sign-in detected');
                console.log('[NextAuth JWT] Token lifetime:', account.expires_in, 'seconds');
                console.log('[NextAuth JWT] Token expires at:', new Date(expiresAt).toISOString());

                token.id = profile.id;
                // Store ID Token for ConsentService OAuth2 flow (id_token_hint parameter)
                token.idToken = account.id_token;
                token.accessToken = account.access_token;
                // Store Refresh Token for session refresh
                token.refreshToken = account.refresh_token;
                // Store token expiration time (expires_in is in seconds)
                token.expiresAt = expiresAt;
                return token;
            }

            const now = Date.now();

            // Check both access token expiration time and ID token directly
            const accessTokenExpired = now >= token.expiresAt;
            const idTokenExpired = token.idToken ? isTokenExpired(token.idToken) : false;

            // Token is still valid
            if (!accessTokenExpired && !idTokenExpired) {
                return token;
            }

            // Token has expired, try to refresh it
            if (accessTokenExpired) {
                console.log('[NextAuth JWT] ⚠️ Access token expired, triggering refresh...');
                console.log('[NextAuth JWT] Token expired at:', new Date(token.expiresAt).toISOString());
            }
            if (idTokenExpired) {
                console.log('[NextAuth JWT] ⚠️ ID token expired, triggering refresh...');
            }
            console.log('[NextAuth JWT] Current time:', new Date(now).toISOString());
            return refreshAccessToken(token);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async session({ session, token }: any) {
            // Add ID Token to session for OAuth2 flow
            session.idToken = token.idToken;
            session.accessToken = token.accessToken;
            session.user.id = token.sub;

            // Pass error to session so the client can handle it
            if (token.error) {
                session.error = token.error;
            }

            return session;
        },
    },
    events: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async signIn({ user }: any) {
            // Connect to MongoDB
            await connectToDatabase();

            // Create UserContext if it doesn't exist (without tokens)
            // Tokens will be stored via OAuth2 flow in /api/consent/callback
            if (user?.id) {
                try {
                    await UserContext.findOneAndUpdate(
                        { userId: user.id },
                        {
                            userId: user.id,
                            updatedAt: new Date(),
                        },
                        { upsert: true, new: true }
                    );
                } catch (error) {
                    console.error("[NextAuth] Error updating UserContext:", error);
                }
            }
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
};