import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import Google from "next-auth/providers/google";


import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
    accessToken?: string | null;
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    DiscordProvider,

     Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/youtube.force-ssl",
        },
      },
    }),
    /**
     * ...add more providers here.
     * 
     * 
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    session: async ({ session, user }) => {
      // When using PrismaAdapter, we need to get the access token from the Account table
      const account = await db.account.findFirst({
        where: {
          userId: user.id,
          provider: "google",
        },
        select: {
          access_token: true,
          refresh_token: true,
          expires_at: true,
          providerAccountId: true,
        },
      });

      // Check if token is expired and refresh if needed
      let accessToken = account?.access_token;
      
      if (account?.expires_at && account.expires_at * 1000 < Date.now()) {
        console.log('Access token expired, attempting refresh...');
        
        if (account.refresh_token) {
          try {
            // Refresh the access token
            const response = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                grant_type: 'refresh_token',
                refresh_token: account.refresh_token,
              }),
            });

            const data = await response.json() as {
              access_token?: string;
              expires_in?: number;
              error?: string;
            };

            if (data.access_token) {
              // Update the account with new access token
              await db.account.update({
                where: {
                  provider_providerAccountId: {
                    provider: "google",
                    providerAccountId: account.providerAccountId,
                  },
                },
                data: {
                  access_token: data.access_token,
                  expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
                },
              });
              
              accessToken = data.access_token;
              console.log('Access token refreshed successfully');
            } else {
              console.error('Failed to refresh token:', data.error);
              // Clear the invalid token
              accessToken = null;
            }
          } catch (error) {
            console.error('Error refreshing access token:', error);
            // Clear the invalid token on error
            accessToken = null;
          }
        } else {
          console.log('No refresh token available');
          accessToken = null;
        }
      }

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
        },
        accessToken,
      };
    },
    jwt: ({ token, account }) => {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
} satisfies NextAuthConfig;


