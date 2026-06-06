import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authorizeCredentials } from "@/lib/auth-credentials";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register");
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");
      const isPublicProposal = nextUrl.pathname.startsWith("/p/");

      if (isApiAuth || isPublicProposal) return true;

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/opportunities", nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      return true;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        return authorizeCredentials(
          credentials.email as string,
          credentials.password as string,
        );
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
};
