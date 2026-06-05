import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { normalizeEnvKeys, cleanEnvValue } from "./env";

normalizeEnvKeys("NEXTAUTH_URL", "NEXTAUTH_SECRET");

export const { auth, handlers } = NextAuth({
  ...authConfig,
  trustHost: true,
  secret: cleanEnvValue(process.env.NEXTAUTH_SECRET) || undefined,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
      }
      return session;
    },
  },
});
