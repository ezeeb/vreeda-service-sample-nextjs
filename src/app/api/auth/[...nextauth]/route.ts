import connectToDatabase from "@/lib/mongodb"
import UserContext from "@/models/UserContext"
import NextAuth from "next-auth"
import AzureADB2CProvider from "next-auth/providers/azure-ad-b2c";

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
            if (account) {
                token.id = profile.id;
                // Store ID Token for ConsentService OAuth2 flow (id_token_hint parameter)
                token.idToken = account.id_token;
                // Store Refresh Token for session refresh
                token.refreshToken = account.refresh_token;
            }
            return token;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async session({ session, token }: any) {
            // Add ID Token to session for OAuth2 flow
            session.idToken = token.idToken;
            session.user.id = token.sub;

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

// @ts-expect-error - next-auth v4 compatibility with Next.js 15
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };