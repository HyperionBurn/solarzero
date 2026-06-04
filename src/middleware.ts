import { type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { default: NextAuth } = await import("next-auth");
  const { authConfig } = await import("@/lib/auth.config");

  const { auth } = NextAuth(authConfig);

  const authResult = await auth(async (req) => {
    const isLoggedIn = !!req.auth;
    const pathname = req.nextUrl.pathname;

    const isAuthPage =
      pathname.startsWith("/login") || pathname.startsWith("/register");
    const isApiAuth = pathname.startsWith("/api/auth");
    const isPublicProposal = pathname.startsWith("/p/");
    const isApiRegister =
      pathname === "/api/auth/register" && req.method === "POST";

    if (isApiAuth || isPublicProposal) return;

    if (isApiRegister) {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { redis } = await import("@/lib/redis");
      const { getClientIp } = await import("@/lib/rate-limit");

      const registerRateLimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, "60 s"),
        analytics: true,
        prefix: "ratelimit:register",
      });

      const ip = getClientIp(req.headers);
      const { success } = await registerRateLimit.limit(ip);
      if (!success) {
        return Response.json(
          { error: "Too many registration attempts. Please try again later." },
          { status: 429 }
        );
      }
    }

    if (isAuthPage && !isLoggedIn) {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { redis } = await import("@/lib/redis");
      const { getClientIp } = await import("@/lib/rate-limit");

      const loginRateLimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "60 s"),
        analytics: true,
        prefix: "ratelimit:login",
      });

      const ip = getClientIp(req.headers);
      const { success } = await loginRateLimit.limit(ip);
      if (!success) {
        return Response.redirect(
          new URL("/login?error=rate_limited", req.nextUrl)
        );
      }
    }

    if (isAuthPage) {
      if (isLoggedIn) {
        return Response.redirect(new URL("/map", req.nextUrl));
      }
      return;
    }

    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(pathname);
      return Response.redirect(
        new URL(`/login?callbackUrl=${callbackUrl}`, req.nextUrl)
      );
    }
  });

  return authResult;
}

export const config = {
  matcher: ["/((?!monitoring|_next/static|_next/image|favicon.ico).*)"],
};
