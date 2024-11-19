import connectToDatabase from "@/lib/mongodb"
import UserContext from "@/models/UserContext"
import NextAuth, { AuthOptions } from "next-auth"

import AzureADB2CProvider from "next-auth/providers/azure-ad-b2c";

export const authOptions: AuthOptions = {
    session: {
        strategy: "jwt",
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
        async jwt({ token, account, profile }) {
          //console.log("jwt callback: ", token, account, profile)
          if (account) {
            token.id = profile.id
            token.accessToken = account.access_token;
          }
          return token;
        },
        async session({ session, token }) {
          //console.log("session callback: ", session, token)

          session.accessToken = token.accessToken;
          session.user.id = token.sub
    
          return session;
        },
      },
    events: {
      async signIn({user, account, profile}) {
        //console.log("signIn callback: ", user, account, profile)

        //Connect to MongoDB
        await connectToDatabase();
    
        // Create or update the UserContext
        if (user && user?.id) {
          try {
            const updatedContext = await UserContext.findOneAndUpdate(
              { userId: user.id }, // Match user by email
              {
                userId: user.id,
                apiAccessTokens: {
                  accessToken: account.access_token || "",
                  refreshToken: account.refresh_token || "",
                  accessTokenExpiration: account.expires_at
                    ? new Date(account.expires_at * 1000)
                    : undefined,
                  refreshTokenExpiration: account.refresh_token_expires_in
                    ? new Date(Date.now() + account.refresh_token_expires_in * 1000)
                    : undefined,
                },
                updatedAt: new Date(),
              },
              { upsert: true, new: true }
            );
            //console.log("UserContext created/updated:", updatedContext);
          } catch (error) {
            console.error("Error updating UserContext:", error);
          }
        }
      }
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };