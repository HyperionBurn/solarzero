import { auth } from "@/lib/auth";
import { loginRateLimit, registerRateLimit, getClientIp } from "@/lib/rate-limit";

export default auth(async (req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isApiAuth = pathname.startsWith("/api/auth");
  const isPublicProposal = pathname.startsWith("/p/");
  const isApiRegister = pathname === "/api/auth/register" && req.method === "POST";

  // Allow API auth routes and public proposal pages through without auth
  if (isApiAuth || isPublicProposal) return;

  // Rate limit registration endpoint
  if (isApiRegister) {
    const ip = getClientIp(req.headers);
    const { success } = await registerRateLimit.limit(ip);
    if (!success) {
      return Response.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }
  }

  // Rate limit login page access (brute force protection)
  if (isAuthPage && !isLoggedIn) {
    const ip = getClientIp(req.headers);
    const { success } = await loginRateLimit.limit(ip);
    if (!success) {
      return Response.redirect(new URL("/login?error=rate_limited", req.nextUrl));
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
    return Response.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
