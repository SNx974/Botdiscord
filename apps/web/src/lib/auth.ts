import type { AuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "./db";

export const authOptions: AuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const discordProfile = profile as { id: string; username: string; avatar: string | null; email?: string };
        const avatarUrl = discordProfile.avatar
          ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
          : null;

        const user = await prisma.user.upsert({
          where: { discordId: discordProfile.id },
          create: {
            discordId: discordProfile.id,
            username: discordProfile.username,
            email: discordProfile.email ?? null,
            avatarUrl,
          },
          update: {
            username: discordProfile.username,
            avatarUrl,
          },
        });

        token.dbUserId = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.dbUserId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
