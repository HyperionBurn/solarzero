import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isApiAuth = pathname.startsWith("/api/auth");
  const isPublicProposal = pathname.startsWith("/p/");

  // Allow API auth routes and public proposal pages through without auth
  if (isApiAuth || isPublicProposal) return;

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
